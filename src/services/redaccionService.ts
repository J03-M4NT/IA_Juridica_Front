import { postFuncion } from './functionsClient'

// =========================
// REDACCIÓN AVANZADA (Cloud Functions redactarDocumentoIA y sugerirRedaccionIA)
// =========================

export interface NormaVerificada {
  cita: string
  estado: 'encontrada' | 'no_encontrada'
  documento?: string
  extracto?: string
}

export interface BloqueDocumento {
  texto: string
  alineacion: 'izquierda' | 'derecha' | 'centro' | 'justificado'
  negrita: boolean
}

export interface DocumentoRedactado {
  tipo: string
  titulo: string
  bloques: BloqueDocumento[]
  normas: NormaVerificada[]
}

export interface SugerenciaRedaccion {
  sugerencia: string
  motivo: string
  normas: NormaVerificada[]
}

export class ErrorLimiteSugerencias extends Error {}

export async function redactarDocumento(pedido: string): Promise<DocumentoRedactado> {
  const response = await postFuncion('redactarDocumentoIA', { pedido })
  const data = await response.json().catch(() => ({})) as Partial<DocumentoRedactado> & { error?: string }
  if (!response.ok || !Array.isArray(data.bloques) || data.bloques.length === 0) {
    throw new Error(data.error ?? 'No se pudo redactar el documento. Intenta de nuevo.')
  }
  return {
    tipo: data.tipo ?? 'Documento',
    titulo: data.titulo ?? 'Documento',
    bloques: data.bloques,
    normas: data.normas ?? []
  }
}

export async function sugerirRedaccion(datos: {
  parrafo: string
  anterior: string
  siguiente: string
  tipoDocumento: string
}): Promise<SugerenciaRedaccion> {
  const response = await postFuncion('sugerirRedaccionIA', datos)
  const data = await response.json().catch(() => ({})) as Partial<SugerenciaRedaccion> & { error?: string }
  if (response.status === 429) throw new ErrorLimiteSugerencias(data.error ?? 'Llegaste al límite de sugerencias de hoy.')
  if (!response.ok) throw new Error(data.error ?? 'No se pudo revisar el párrafo.')
  return { sugerencia: data.sugerencia ?? '', motivo: data.motivo ?? '', normas: data.normas ?? [] }
}
