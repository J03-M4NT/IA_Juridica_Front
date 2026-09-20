import { defineStore } from 'pinia'
import { getErrorMessage } from '../utils/errors'
import type { FragmentoResultado } from '../services/pineconeService'
import { consultarLexit } from '../services/consultaLexitService'
import { extraerTextoVisibleDeHtml, reemplazarEnHtml } from '../utils/htmlTexto'

interface Mensaje {
  contenido: string
  esIA: boolean
  timestamp: Date
  referencias?: string[]
  fuentes?: FragmentoResultado[]
}

interface ArchivoAdjunto {
  nombre: string
  // Siempre presente (plano) — para PDF es la única fuente; para Word se
  // DERIVA de html cada vez que este cambia (ver sincronizarTextoDesdeHtml),
  // así Gemini/Pinecone/sugerirCambiosContrato siguen funcionando igual
  // sin importar el tipo de documento adjunto.
  texto: string
  // Solo presente si el adjunto es un .docx — fuente de verdad real para
  // el panel "Editando"/"Documento final" y la descarga de ese documento.
  html?: string
  // true en cuanto se aplica una sugerencia o se edita el texto/html a
  // mano. Mientras siga en false, la descarga puede devolver el archivo
  // original tal cual en vez de reconstruirlo con la librería docx — ver
  // descargarDocumento() en ConsultasPage.vue.
  modificado: boolean
  // Solo presente si el adjunto es un .docx y se pudo detectar la fuente
  // real del tema del documento (ej. "Aptos") — ver detectarFuenteDelTema
  // en mammothExtractor.ts. Si no se detectó, exportToWord usa su propia
  // fuente de respaldo al reconstruir.
  fuenteDetectada?: string | undefined
  // Ruta en Firebase Storage del .docx original, una vez que terminó de
  // subirse (ver ConsultasPage.vue/procesarArchivo). Solo se setea para
  // adjuntos Word — habilita el botón "Abrir en Word". Ausente mientras la
  // subida está en curso o si falló.
  storagePathDocx?: string | undefined
}

// Toda acción que mute archivoAdjunto.html debe llamar esto como último
// paso, para que texto nunca quede desincronizado de html.
function sincronizarTextoDesdeHtml(adjunto: ArchivoAdjunto) {
  if (adjunto.html) adjunto.texto = extraerTextoVisibleDeHtml(adjunto.html)
}

interface ConsultasState {
  pregunta: string
  respuesta: string
  referencias: string[]
  loading: boolean
  error: string
  mensajes: Mensaje[]
  usandoPinecone: boolean
  fragmentosEncontrados: number
  archivoAdjunto: ArchivoAdjunto | null
  analisisPendiente: boolean
}

// Ritmo del efecto "escribiéndose" al mostrar la respuesta (ver
// enviarConsulta). Antes eran 2 caracteres cada 20ms (~100 car/seg) — para
// una respuesta larga de análisis de riesgos (2000-4000 caracteres) eso
// eran hasta 40 segundos de espera artificial, aparte de lo que tardara
// Gemini en responder de verdad. Ahora son ~530 car/seg (~5x más rápido) —
// sigue viéndose como que "escribe", pero una respuesta de 4000
// caracteres tarda ~7.5s en vez de 40s.
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
    archivoAdjunto: null,
    analisisPendiente: false
  }),

  actions: {
    iniciarSesion() {
      if (this.mensajes.length > 0) return
      this.mensajes.push({
        contenido: [
          '**Hola, soy LexIT**, tu asistente jurídica especializada en derecho peruano.',
          '',
          'Puedo ayudarte a:',
          '- Interpretar cláusulas de contratos',
          '- Explicar conceptos legales en lenguaje claro',
          '- Identificar obligaciones y derechos en un contrato',
          '- Orientarte sobre normas legales peruanas',
          '- Buscar en mi base de datos jurídica',
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
        // Si hay un PDF/Word recién adjuntado (analisisPendiente), es el
        // turno que dispara el análisis de riesgos formal — la Cloud
        // Function usa esto para decidir si agrega el bloque de formato
        // (Cláusula/Nivel de riesgo/Base legal/Sugerencia).
        const esSolicitudAnalisis = !!this.archivoAdjunto && this.analisisPendiente

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
        // anti-alucinación, contrato adjunto) vive ahora en la Cloud
        // Function consultarLexit — ver consultarLexit.ts. El texto del
        // adjunto se reenvía en CADA turno (no solo el primero), porque ya
        // no hay una sesión de Gemini persistida en el servidor que lo
        // "recuerde" entre llamadas.
        const resultado = await consultarLexit(pregunta, historialMensajes, {
          textoDocumentoAdjunto: this.archivoAdjunto?.texto,
          nombreDocumentoAdjunto: this.archivoAdjunto?.nombre,
          esSolicitudAnalisis
        })

        this.usandoPinecone = resultado.usandoPinecone
        this.fragmentosEncontrados = resultado.fragmentosEncontrados

        // Efecto "escribiéndose" — igual que antes, pero ahora sobre la
        // respuesta completa (ya no llega en streaming desde el backend).
        let mostrado = ''
        for (let i = 0; i < resultado.respuesta.length; i += CARACTERES_POR_TICK) {
          mostrado += resultado.respuesta.slice(i, i + CARACTERES_POR_TICK)
          mensajeIA.contenido = mostrado
          await esperar(INTERVALO_TICK_MS)
        }

        mensajeIA.fuentes = resultado.fragmentos
        this.respuesta = resultado.respuesta

        // Se consume solo tras un envío exitoso, para poder reintentar
        // con el mismo contrato si esta llamada falla.
        if (esSolicitudAnalisis) {
          this.analisisPendiente = false
        }

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
        this.loading = false
      }
    },

    adjuntarPdf(nombre: string, texto: string) {
      this.archivoAdjunto = { nombre, texto, modificado: false }
      this.analisisPendiente = true
    },

    adjuntarWord(nombre: string, html: string, fuenteDetectada?: string) {
      this.archivoAdjunto = { nombre, html, texto: extraerTextoVisibleDeHtml(html), modificado: false, fuenteDetectada }
      this.analisisPendiente = true
    },

    // Se llama cuando termina la subida a Storage del .docx original (ver
    // procesarArchivo en ConsultasPage.vue) — habilita el botón "Abrir en
    // Word". Comprueba que el adjunto no haya cambiado mientras la subida
    // estaba en curso (ej. el usuario adjuntó otro documento distinto).
    marcarStoragePathDocx(nombre: string, storagePath: string) {
      if (this.archivoAdjunto?.nombre !== nombre) return
      this.archivoAdjunto.storagePathDocx = storagePath
    },

    quitarAdjunto() {
      this.archivoAdjunto = null
      this.analisisPendiente = false
    },

    volverAAnalizar() {
      if (this.archivoAdjunto) {
        this.analisisPendiente = true
      }
    },

    // Aplica un cambio puntual (redline) sobre el texto del documento
    // adjunto. Devuelve false sin tocar nada si el fragmento exacto ya no
    // se encuentra (ej. Gemini no lo citó tal cual, o ya fue modificado por
    // otra sugerencia aplicada antes) — el llamador debe manejar ese caso
    // en vez de asumir que siempre funciona.
    aplicarCambioEnAdjunto(textoOriginal: string, textoSugerido: string): boolean {
      if (!this.archivoAdjunto) return false

      if (this.archivoAdjunto.html) {
        const resultado = reemplazarEnHtml(this.archivoAdjunto.html, textoOriginal, textoSugerido)
        if (!resultado.ok) return false
        this.archivoAdjunto.html = resultado.html
        this.archivoAdjunto.modificado = true
        sincronizarTextoDesdeHtml(this.archivoAdjunto)
        return true
      }

      if (!this.archivoAdjunto.texto.includes(textoOriginal)) return false
      this.archivoAdjunto.texto = this.archivoAdjunto.texto.replace(textoOriginal, textoSugerido)
      this.archivoAdjunto.modificado = true
      return true
    },

    // Reemplaza el texto completo del documento adjunto (edición manual
    // directa en el panel "Documento", camino PDF/texto plano). El
    // llamador es responsable de "flushear" cualquier edición pendiente
    // ANTES de leer/reemplazar este texto por otra vía (ej.
    // aplicarCambioEnAdjunto), para no pisar un cambio con una foto vieja
    // del texto — ver ConsultasPage.vue.
    actualizarTextoAdjunto(nuevoTexto: string) {
      if (!this.archivoAdjunto || this.archivoAdjunto.texto === nuevoTexto) return
      this.archivoAdjunto.texto = nuevoTexto
      this.archivoAdjunto.modificado = true
    },

    // Equivalente a actualizarTextoAdjunto, para el camino Word — la
    // edición manual debe preservar el markup real (listas, tablas,
    // negritas), no solo el texto plano.
    actualizarHtmlAdjunto(nuevoHtml: string) {
      if (!this.archivoAdjunto || this.archivoAdjunto.html === nuevoHtml) return
      this.archivoAdjunto.html = nuevoHtml
      this.archivoAdjunto.modificado = true
      sincronizarTextoDesdeHtml(this.archivoAdjunto)
    },

    limpiar() {
      this.pregunta = ''
      this.respuesta = ''
      this.referencias = []
      this.error = ''
      this.mensajes = []
      this.usandoPinecone = false
      this.fragmentosEncontrados = 0
      this.archivoAdjunto = null
      this.analisisPendiente = false
    }
  }
})
