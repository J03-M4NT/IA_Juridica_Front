import type { FragmentoResultado } from './pineconeService'

import { postFuncion } from './functionsClient'

export interface MensajeHistorialLexit {
  esIA: boolean
  contenido: string
}

export interface ConsultaLexitResultado {
  respuesta: string
  usandoPinecone: boolean
  fragmentosEncontrados: number
  fragmentos: FragmentoResultado[]
}

interface OpcionesConsultaLexit {
  textoDocumentoAdjunto?: string | undefined
  nombreDocumentoAdjunto?: string | undefined
  esSolicitudAnalisis?: boolean
  // Especialización de Consultas: limita la búsqueda y las respuestas a
  // esa rama del derecho.
  especialidad?: string
}

// Reemplaza a iniciarChatJuridico/enviarMensajeChatStream: toda la
// orquestación (saludo, búsqueda en Pinecone, guardrails, contrato
// adjunto) ahora vive en la Cloud Function `consultarLexit`, para no
// exponer la API key de Gemini en el navegador.
export async function consultarLexit(
  pregunta: string,
  historialMensajes: MensajeHistorialLexit[],
  opciones?: OpcionesConsultaLexit
): Promise<ConsultaLexitResultado> {
  const response = await postFuncion('consultarLexit', {
    pregunta,
    historialMensajes,
    textoDocumentoAdjunto: opciones?.textoDocumentoAdjunto,
    nombreDocumentoAdjunto: opciones?.nombreDocumentoAdjunto,
    esSolicitudAnalisis: opciones?.esSolicitudAnalisis ?? false,
    ...(opciones?.especialidad ? { especialidad: opciones.especialidad } : {})
  })

  const data = await response.json() as Partial<ConsultaLexitResultado> & { error?: string }
  if (!response.ok || !data.respuesta) {
    // Bloqueo de Gemini por "RECITATION" (cita literal demasiado larga):
    // la Cloud Function ya lo resuelve, esto es solo un respaldo para no
    // mostrarle al usuario el error técnico en inglés.
    if (/RECITATION/i.test(data.error ?? '')) {
      throw new Error('La respuesta incluía una cita muy extensa de un texto legal y el filtro de seguridad de la IA la detuvo. Intenta pedir que te explique el artículo con sus palabras o pregunta por un punto específico.')
    }
    throw new Error(data.error ?? 'No se pudo consultar a la IA jurídica')
  }

  return {
    respuesta: data.respuesta,
    usandoPinecone: data.usandoPinecone ?? false,
    fragmentosEncontrados: data.fragmentosEncontrados ?? 0,
    fragmentos: data.fragmentos ?? []
  }
}
