import { defineStore } from 'pinia'
import type { ChatSession } from '@google/generative-ai'
import { iniciarChatJuridico, enviarMensajeChat } from '../services/geminiService'
import { getErrorMessage } from '../utils/errors'

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
}

// ChatSession se mantiene fuera del estado de Pinia para evitar
// problemas de reactividad con objetos no serializables.
let currentChatSession: ChatSession | null = null

export const useConsultasStore = defineStore('consultas', {
  state: (): ConsultasState => ({
    pregunta: '',
    respuesta: '',
    referencias: [],
    loading: false,
    error: '',
    mensajes: []
  }),

  actions: {
    iniciarSesion() {
      if (this.mensajes.length > 0) return
      currentChatSession = iniciarChatJuridico()
      this.mensajes.push({
        contenido: [
          '**Hola, soy Letsy**, tu asistente juridica especializada en derecho peruano.',
          '',
          'Puedo ayudarte a:',
          '- Interpretar clausulas de contratos',
          '- Explicar conceptos legales en lenguaje claro',
          '- Identificar obligaciones y derechos en un contrato',
          '- Orientarte sobre normas legales peruanas',
          '',
          'Recuerda que mis respuestas son orientativas. Para casos concretos, consulta siempre con un abogado.',
          '',
          '¿En que puedo ayudarte hoy?'
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

      this.mensajes.push({
        contenido: pregunta,
        esIA: false,
        timestamp: new Date()
      })

      try {
        if (!currentChatSession) {
          currentChatSession = iniciarChatJuridico()
        }

        const respuestaIA = await enviarMensajeChat(currentChatSession, pregunta)

        if (respuestaIA) {
          this.mensajes.push({
            contenido: respuestaIA,
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
          contenido: `**Error al consultar la IA juridica**\n\n${message}`,
          esIA: true,
          timestamp: new Date(),
          referencias: []
        })
        this.mensajes = [...this.mensajes]
        this.error = `Error al consultar la IA juridica: ${message}`
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
      currentChatSession = null
    }
  }
})
