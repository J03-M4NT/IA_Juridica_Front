import { defineStore } from 'pinia'
import { getErrorMessage } from '../utils/errors'
import type { FragmentoResultado } from '../services/pineconeService'
import { consultarLexit } from '../services/consultaLexitService'
import { guardarSesion, obtenerHistorial, eliminarSesion, type SesionConsulta } from '../services/historialService'
import { useAuthStore } from './auth'

export interface Mensaje {
  contenido: string
  esIA: boolean
  timestamp: Date
  referencias?: string[]
  fuentes?: FragmentoResultado[]
}

// El documento adjunto ahora vive en analisis-contratos-store.ts — se
// re-exporta el tipo acá porque historialService.ts lo sigue importando
// desde este archivo.
export type { ArchivoAdjunto } from './analisis-contratos-store'

// Chat jurídico general — sin documentos adjuntos. El análisis de un
// contrato subido vive aparte, en analisis-contratos-store.ts.
interface ConsultasState {
  pregunta: string
  respuesta: string
  referencias: string[]
  loading: boolean
  error: string
  mensajes: Mensaje[]
  usandoPinecone: boolean
  fragmentosEncontrados: number
  sesionActualId: string | null
  historialSesiones: SesionConsulta[]
  // Especialización elegida en el chat (ver constants/especialidades.ts);
  // null = General (toda la base jurídica).
  especialidad: string | null
}

// Ritmo del efecto "escribiéndose" al mostrar la respuesta (ver
// enviarConsulta). Antes eran 2 caracteres cada 20ms (~100 car/seg) — para
// una respuesta larga (2000-4000 caracteres) eso eran hasta 40 segundos de
// espera artificial, aparte de lo que tardara Gemini en responder de
// verdad. Ahora son ~530 car/seg (~5x más rápido) — sigue viéndose como
// que "escribe", pero una respuesta de 4000 caracteres tarda ~7.5s en vez
// de 40s.
const CARACTERES_POR_TICK = 8
const INTERVALO_TICK_MS = 15

function esperar(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const useConsultasStore = defineStore('consultas', {
  state: (): ConsultasState => ({
    pregunta: '',
    respuesta: '',
    referencias: [],
    loading: false,
    error: '',
    mensajes: [],
    usandoPinecone: false,
    fragmentosEncontrados: 0,
    sesionActualId: null,
    historialSesiones: [],
    especialidad: null
  }),

  actions: {
    iniciarSesion() {
      if (this.mensajes.length > 0) return
      this.mensajes.push({
        contenido: [
          '**Hola, soy LexIT**, tu asistente jurídica especializada en derecho peruano.',
          '',
          'Puedo ayudarte a:',
          '- Explicar conceptos legales en lenguaje claro',
          '- Orientarte sobre normas legales peruanas',
          '- Buscar en mi base de datos jurídica',
          '',
          'Para revisar un contrato, usa la sección **Análisis de Contratos**.',
          '',
          'Recuerda que mis respuestas son orientativas. Para casos concretos, consulta siempre con un abogado.',
          '',
          '¿En qué puedo ayudarte hoy?'
        ].join('\n'),
        esIA: true,
        timestamp: new Date()
      })
    },

    async enviarConsulta(pregunta: string) {
      this.loading = true
      this.error = ''
      this.respuesta = ''
      this.referencias = []
      this.usandoPinecone = false
      this.fragmentosEncontrados = 0

      // Historial ANTES de este turno (excluye el saludo inicial de
      // iniciarSesion, que nunca se le manda a Gemini) — es lo que la
      // Cloud Function usa para rehidratar la sesión de chat.
      const historialMensajes = this.mensajes
        .slice(1)
        .map(m => ({ esIA: m.esIA, contenido: m.contenido }))

      this.mensajes.push({
        contenido: pregunta,
        esIA: false,
        timestamp: new Date()
      })

      let mensajeIA: Mensaje | null = null

      try {
        // Se muestra de inmediato (vacío) y se va llenando con el efecto
        // "escribiéndose", para que no aparezca de golpe al terminar.
        this.mensajes.push({
          contenido: '',
          esIA: true,
          timestamp: new Date(),
          referencias: []
        })
        this.mensajes = [...this.mensajes]

        // Importante: se toma la referencia LEYENDO de vuelta el array
        // (this.mensajes[...]), no el objeto recién creado más arriba. Ese
        // objeto crudo deja de ser "el mismo" que ve Vue una vez insertado
        // en el estado reactivo de Pinia — mutar sus propiedades directamente
        // no dispara ningún re-render por trozo, solo el objeto que devuelve
        // el array reactivo sí lo hace.
        mensajeIA = this.mensajes[this.mensajes.length - 1]!

        // Toda la orquestación (saludo/trivial, búsqueda en Pinecone con
        // priorización de fuente primaria, dedupe, guardrails de 3 partes,
        // anti-alucinación) vive en la Cloud Function consultarLexit — ver
        // consultarLexit.ts.
        const resultado = await consultarLexit(pregunta, historialMensajes, {
          ...(this.especialidad ? { especialidad: this.especialidad } : {})
        })

        this.usandoPinecone = resultado.usandoPinecone
        this.fragmentosEncontrados = resultado.fragmentosEncontrados

        // Efecto "escribiéndose" sobre la respuesta completa (no llega en
        // streaming desde el backend).
        let mostrado = ''
        for (let i = 0; i < resultado.respuesta.length; i += CARACTERES_POR_TICK) {
          mostrado += resultado.respuesta.slice(i, i + CARACTERES_POR_TICK)
          mensajeIA.contenido = mostrado
          await esperar(INTERVALO_TICK_MS)
        }

        mensajeIA.fuentes = resultado.fragmentos
        this.respuesta = resultado.respuesta

      } catch (err) {
        const message = getErrorMessage(err)
        console.error('Error al consultar la IA:', err)
        const contenidoError = `**Error al consultar la IA jurídica**\n\n${message}`

        // Si ya se había mostrado el mensaje "escribiéndose", se convierte
        // en el mensaje de error en vez de agregar uno nuevo (evitaría un
        // globo vacío seguido de otro con el error).
        if (mensajeIA) {
          mensajeIA.contenido = contenidoError
        } else {
          this.mensajes.push({
            contenido: contenidoError,
            esIA: true,
            timestamp: new Date(),
            referencias: []
          })
        }
        this.mensajes = [...this.mensajes]
        this.error = `Error al consultar la IA jurídica: ${message}`

      } finally {
        const auth = useAuthStore()
        if (auth.user?.uid) {
          if (!this.sesionActualId) {
            this.sesionActualId = Date.now().toString()
            const primerUserMsg = this.mensajes.find(m => !m.esIA)
            const titulo = primerUserMsg ? primerUserMsg.contenido.substring(0, 30) + (primerUserMsg.contenido.length > 30 ? '...' : '') : 'Nueva Consulta'

            this.historialSesiones.unshift({
              id: this.sesionActualId,
              titulo,
              fechaActualizacion: new Date(),
              mensajes: [...this.mensajes],
              archivoAdjunto: null
            })
          } else {
            const session = this.historialSesiones.find(s => s.id === this.sesionActualId)
            if (session) {
              session.mensajes = [...this.mensajes]
              session.fechaActualizacion = new Date()
            }
          }

          const session = this.historialSesiones.find(s => s.id === this.sesionActualId)
          if (session) {
             guardarSesion(auth.user.uid, session.id, session.titulo, session.mensajes, null).catch(console.error)
          }
        }

        this.loading = false
      }

    },

    async cargarHistorial() {
      const auth = useAuthStore()
      if (auth.user?.uid) {
        try {
          this.historialSesiones = await obtenerHistorial(auth.user.uid)
        } catch (error) {
          console.error('Error cargando historial', error)
        }
      }
    },

    cargarSesion(id: string) {
      const session = this.historialSesiones.find(s => s.id === id)
      if (session) {
        this.sesionActualId = id
        this.mensajes = [...session.mensajes]
      }
    },

    nuevaSesion() {
      this.limpiar()
      this.iniciarSesion()
    },

    // Borra la conversación en Firestore y la quita del historial. Si era
    // la que estaba abierta, se empieza una nueva en su lugar.
    async borrarSesion(id: string) {
      const auth = useAuthStore()
      if (!auth.user?.uid) return
      await eliminarSesion(auth.user.uid, id)
      this.historialSesiones = this.historialSesiones.filter(s => s.id !== id)
      if (this.sesionActualId === id) this.nuevaSesion()
    },

    limpiar() {
      this.pregunta = ''
      this.respuesta = ''
      this.referencias = []
      this.error = ''
      this.mensajes = []
      this.usandoPinecone = false
      this.fragmentosEncontrados = 0
      this.sesionActualId = null
    }
  }
})
