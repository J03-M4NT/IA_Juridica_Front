import { defineStore } from 'pinia'
import type { ChatSession } from '@google/generative-ai'
import { iniciarChatJuridico, enviarMensajeChat } from '../services/geminiService'
import { getErrorMessage } from '../utils/errors'
import { buscarEnPinecone } from '../services/pineconeService'

interface Mensaje {
  contenido: string
  esIA: boolean
  timestamp: Date
  referencias?: string[]
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
}

// ChatSession se mantiene fuera del estado de Pinia para evitar
// problemas de reactividad con objetos no serializables.
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
let currentChatSession: ChatSession | null = null

export const useConsultasStore = defineStore('consultas', {
  state: (): ConsultasState => ({
    pregunta: '',
    respuesta: '',
    referencias: [],
    loading: false,
    error: '',
    mensajes: [],
    usandoPinecone: false,
    fragmentosEncontrados: 0
  }),

  actions: {
    iniciarSesion() {
      if (this.mensajes.length > 0) return
      currentChatSession = iniciarChatJuridico()
      this.mensajes.push({
        contenido: [
          '**Hola, soy Lexit**, tu asistente jurídica especializada en derecho peruano.',
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

      this.mensajes.push({
        contenido: pregunta,
        esIA: false,
        timestamp: new Date()
      })

      try {
        if (!currentChatSession) {
          currentChatSession = iniciarChatJuridico()
        }

        // =========================
        // BUSCAR CONTEXTO EN PINECONE
        // =========================
        let contexto = ''
        try {
          const fragmentos = await buscarEnPinecone(pregunta)

          if (fragmentos.length > 0) {
            this.usandoPinecone = true
            this.fragmentosEncontrados = fragmentos.length
            contexto = [
              '\n\n---',
              'CONTEXTO LEGAL DE LA BASE DE DATOS JURÍDICA:',
              fragmentos.join('\n\n'),
              '---\n'
            ].join('\n')

            console.log(`📚 Pinecone: ${fragmentos.length} fragmentos encontrados`)
          }
        } catch {
          console.log('⚠️ Pinecone no disponible, usando solo Gemini')
        }

        // =========================
        // ENVIAR A GEMINI CON CONTEXTO
        // =========================
        const preguntaConContexto = contexto
          ? `${contexto}\nPREGUNTA DEL USUARIO: ${pregunta}`
          : pregunta

        const respuestaIA = await enviarMensajeChat(
          currentChatSession,
          preguntaConContexto
        )

        if (respuestaIA) {
          // Agregar indicador si se usó Pinecone
          const indicadorPinecone = this.usandoPinecone
            ? `\n\n---\n*📚 Respuesta basada en ${this.fragmentosEncontrados} documento(s) de la base jurídica*`
            : ''

          this.mensajes.push({
            contenido: respuestaIA + indicadorPinecone,
            esIA: true,
            timestamp: new Date(),
            referencias: []
          })
          this.mensajes = [...this.mensajes]
          this.respuesta = respuestaIA
        } else {
          throw new Error('La respuesta de la IA está vacía')
        }

      } catch (err) {
        const message = getErrorMessage(err)
        console.error('Error al consultar la IA:', err)

        this.mensajes.push({
          contenido: `**Error al consultar la IA jurídica**\n\n${message}`,
          esIA: true,
          timestamp: new Date(),
          referencias: []
        })
        this.mensajes = [...this.mensajes]
        this.error = `Error al consultar la IA jurídica: ${message}`
      } finally {
        this.loading = false
      }
    },

    limpiar() {
      this.pregunta = ''
      this.respuesta = ''
      this.referencias = []
      this.error = ''
      this.mensajes = []
      this.usandoPinecone = false
      this.fragmentosEncontrados = 0
      currentChatSession = null
    }
  }
})
