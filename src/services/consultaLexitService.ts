import type { FragmentoResultado } from './pineconeService'

const FUNCTIONS_URL = 'https://us-central1-lexit-ai.cloudfunctions.net'

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
  const response = await fetch(`${FUNCTIONS_URL}/consultarLexit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pregunta,
      historialMensajes,
      textoDocumentoAdjunto: opciones?.textoDocumentoAdjunto,
      nombreDocumentoAdjunto: opciones?.nombreDocumentoAdjunto,
      esSolicitudAnalisis: opciones?.esSolicitudAnalisis ?? false
    })
  })

  const data = await response.json() as Partial<ConsultaLexitResultado> & { error?: string }
  if (!response.ok || !data.respuesta) {
    throw new Error(data.error ?? 'No se pudo consultar a la IA jurídica')
  }

  return {
    respuesta: data.respuesta,
    usandoPinecone: data.usandoPinecone ?? false,
    fragmentosEncontrados: data.fragmentosEncontrados ?? 0,
    fragmentos: data.fragmentos ?? []
  }
}
