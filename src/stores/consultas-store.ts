import { defineStore } from 'pinia'
import type { ChatSession } from '@google/generative-ai'
import { iniciarChatJuridico, enviarMensajeChat } from '../services/geminiService'
import { getErrorMessage } from '../utils/errors'

export interface Mensaje {
  contenido: string
  esIA: boolean
  timestamp: Date
  referencias?: string[]
}

export interface ChatGuardado {
  id: string
  titulo: string
  fechaCreacion: Date
  mensajes: Mensaje[]
}

interface ConsultasState {
  pregunta: string
  respuesta: string
  referencias: string[]
  loading: boolean
  error: string
  mensajes: Mensaje[]
  chatActivoId: string | null
  chatsGuardados: ChatGuardado[]
}

// ChatSession se mantiene fuera del estado de Pinia para evitar
// problemas de reactividad con objetos no serializables.
let currentChatSession: ChatSession | null = null

function generateChatId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

function loadChatsFromStorage(): ChatGuardado[] {
  const data = localStorage.getItem('lexit_chats')
  if (data) {
    try {
      const parsed = JSON.parse(data)
      return parsed.map((chat: any) => ({
        ...chat,
        fechaCreacion: new Date(chat.fechaCreacion),
        mensajes: chat.mensajes.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
      }))
    } catch {
      return []
    }
  }
  return []
}

function saveChatsToStorage(chats: ChatGuardado[]) {
  localStorage.setItem('lexit_chats', JSON.stringify(chats))
}

const mensajeBienvenida: Mensaje = {
  contenido: [
    '**Hola, soy LEXIT AI**, tu asistente jurídica especializada en derecho peruano.',
    '',
    'Puedo ayudarte a:',
    '- Interpretar cláusulas de contratos',
    '- Explicar conceptos legales en lenguaje claro',
    '- Identificar obligaciones y derechos en un contrato',
    '- Orientarte sobre normas legales peruanas',
    '',
    'Recuerda que mis respuestas son orientativas. Para casos concretos, consulta siempre con un abogado.',
    '',
    '¿En qué puedo ayudarte hoy?'
  ].join('\n'),
  esIA: true,
  timestamp: new Date()
}

export const useConsultasStore = defineStore('consultas', {
  state: (): ConsultasState => ({
    pregunta: '',
    respuesta: '',
    referencias: [],
    loading: false,
    error: '',
    mensajes: [],
    chatActivoId: null,
    chatsGuardados: loadChatsFromStorage()
  }),

  actions: {
    iniciarSesion() {
      // Si no hay chat activo, crear uno nuevo
      if (!this.chatActivoId) {
        if (this.chatsGuardados.length > 0) {
          const primerChat = this.chatsGuardados[0]
          if (primerChat) this.cargarChat(primerChat.id)
        } else {
          this.nuevoChat()
        }
      }
    },

    nuevoChat() {
      const newId = generateChatId()
      this.chatActivoId = newId
      this.mensajes = [{ ...mensajeBienvenida, timestamp: new Date() }]
      currentChatSession = iniciarChatJuridico()

      this.chatsGuardados.unshift({
        id: newId,
        titulo: 'Nuevo Chat',
        fechaCreacion: new Date(),
        mensajes: [...this.mensajes]
      })
      this.guardarCambios()
    },

    cargarChat(id: string) {
      const chat = this.chatsGuardados.find(c => c.id === id)
      if (chat) {
        this.chatActivoId = id
        this.mensajes = [...chat.mensajes]

        // Reconstruir el history para Gemini
        // Gemini espera: { role: 'user' | 'model', parts: [{ text: string }] }
        // Excluimos el mensaje de bienvenida
        const historyForGemini = this.mensajes.slice(1).map(m => ({
          role: m.esIA ? 'model' : 'user',
          parts: [{ text: m.contenido }]
        }))

        currentChatSession = iniciarChatJuridico(historyForGemini)
      }
    },

    eliminarChat(id: string) {
      this.chatsGuardados = this.chatsGuardados.filter(c => c.id !== id)
      this.guardarCambios()
      if (this.chatActivoId === id) {
        if (this.chatsGuardados.length > 0) {
          const primerChat = this.chatsGuardados[0]
          if (primerChat) this.cargarChat(primerChat.id)
        } else {
          this.nuevoChat()
        }
      }
    },

    guardarCambios() {
      if (this.chatActivoId) {
        const chatGuardado = this.chatsGuardados.find(c => c.id === this.chatActivoId)
        if (chatGuardado) {
          chatGuardado.mensajes = [...this.mensajes]

          // Generar un título si es el primer mensaje de usuario
          if (chatGuardado.titulo === 'Nuevo Chat' && this.mensajes.length > 1) {
            const primerMensajeUsuario = this.mensajes.find(m => !m.esIA)?.contenido
            if (primerMensajeUsuario) {
              chatGuardado.titulo = primerMensajeUsuario.substring(0, 30) + (primerMensajeUsuario.length > 30 ? '...' : '')
            }
          }
        }
      }
      saveChatsToStorage(this.chatsGuardados)
    },

    async enviarConsulta(pregunta: string) {
      if (!this.chatActivoId) this.nuevoChat()

      this.loading = true
      this.error = ''
      this.respuesta = ''
      this.referencias = []

      this.mensajes.push({
        contenido: pregunta,
        esIA: false,
        timestamp: new Date()
      })
      this.guardarCambios()

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
          this.guardarCambios()
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
        this.guardarCambios()
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
      this.chatActivoId = null
    }
  }
})
