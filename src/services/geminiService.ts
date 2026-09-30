import { postFuncion } from './functionsClient'

// ================================
// ASISTENTE DE CONTRATOS (Gestión de Contratos)
// (Cloud Function recomendarPlantillaIA: interpreta lo que el usuario
// describe y recomienda plantillas reales de contract_templates)
// ================================
export interface RespuestaAsistenteContratos {
  mensaje: string
  plantillas: string[] // ids de contract_templates, la más adecuada primero
}

export async function recomendarPlantilla(
  mensaje: string,
  historial: { esIA: boolean; contenido: string }[]
): Promise<RespuestaAsistenteContratos> {
  const response = await postFuncion('recomendarPlantillaIA', { mensaje, historial })

  const data = await response.json() as Partial<RespuestaAsistenteContratos> & { error?: string }
  if (!response.ok || !data.mensaje) {
    throw new Error(data.error ?? 'No se pudo consultar al asistente de contratos')
  }

  return { mensaje: data.mensaje, plantillas: data.plantillas ?? [] }
}

// ================================
// 4. MODIFICAR PLANTILLA
// (delegado a la Cloud Function modificarPlantillaIA — antes llamaba a
// Gemini directo desde el navegador con la API key expuesta en el bundle)
// ================================
export async function modificarPlantilla(
  textoPlantilla: string,
  instruccion: string
): Promise<string> {
  const response = await postFuncion('modificarPlantillaIA', { textoPlantilla, instruccion })

  const data = await response.json() as { textoModificado?: string; error?: string }
  if (!response.ok || data.textoModificado === undefined) {
    throw new Error(data.error ?? 'No se pudo modificar la plantilla')
  }

  return data.textoModificado
}

// ================================
// 5b. RESUMEN DE NORMAS DEL DÍA
// (delegado a la Cloud Function resumirNormasDelDiaIA — mismo motivo)
// ================================
export interface ResumenNormasDelDia {
  resumen: string
  destacadas: { titulo: string; razon: string }[]
}

export async function resumirNormasDelDia(
  normas: { titulo: string; sumilla: string }[]
): Promise<ResumenNormasDelDia> {
  const response = await postFuncion('resumirNormasDelDiaIA', { normas })

  const data = await response.json() as Partial<ResumenNormasDelDia> & { error?: string }
  if (!response.ok || !data.resumen) {
    throw new Error(data.error ?? 'No se pudo generar el resumen de normas del día')
  }

  return { resumen: data.resumen, destacadas: data.destacadas ?? [] }
}

// ================================
// 5c. CHAT CONVERSACIONAL PARA COMPLETAR/EDITAR UN CONTRATO
// (delegado a la Cloud Function chatEdicionContratoIA — la IA analiza el
// contrato, pregunta un dato a la vez, y al final devuelve el contrato
// completo actualizado)
// ================================
export interface MensajeChatEdicion {
  esIA: boolean
  contenido: string
}

export interface ResultadoChatEdicion {
  tipo: 'pregunta' | 'documento_final'
  mensaje: string
  textoModificado?: string
  // Con formato "cambios" (plantillas Word): reemplazos puntuales para
  // aplicar sobre el Word original, en vez del contrato reescrito.
  cambios?: { antes: string; despues: string }[]
}

export async function chatEditarContratoIA(
  textoContrato: string,
  historialChat: MensajeChatEdicion[],
  respuestaUsuario?: string,
  opciones: { formato?: 'cambios' } = {}
): Promise<ResultadoChatEdicion> {
  const response = await postFuncion('chatEdicionContratoIA', { textoContrato, historialChat, respuestaUsuario, ...opciones })

  const data = await response.json() as Partial<ResultadoChatEdicion> & { error?: string }
  if (!response.ok || !data.tipo || !data.mensaje) {
    throw new Error(data.error ?? 'No se pudo continuar la conversación con la IA')
  }

  return {
    tipo: data.tipo,
    mensaje: data.mensaje,
    ...(data.textoModificado !== undefined ? { textoModificado: data.textoModificado } : {}),
    ...(Array.isArray(data.cambios) ? { cambios: data.cambios } : {})
  }
}

// ================================
// 6. SUGERENCIAS DE CAMBIOS (redline) PARA UN CONTRATO
// (delegado a la Cloud Function generarSugerenciasContrato — mismo motivo)
// ================================
export interface SugerenciaCambio {
  id: string
  tipo: 'cambio' | 'riesgo'
  clausula: string
  textoOriginal: string
  textoSugerido: string
  explicacion: string
  nivel?: 'alto' | 'medio' | 'bajo'
  // Artículo de la base jurídica que sustenta directamente la sugerencia.
  // Solo viene cuando existe uno; si no, la sugerencia va sin cita.
  baseLegal?: {
    documento: string
    articulo?: number
    sufijo?: string
    texto: string
  }
}

export async function sugerirCambiosContrato(textoContrato: string): Promise<SugerenciaCambio[]> {
  const response = await postFuncion('generarSugerenciasContrato', { textoContrato })

  const data = await response.json() as { sugerencias?: SugerenciaCambio[]; error?: string }
  if (!response.ok || !data.sugerencias) {
    throw new Error(data.error ?? 'No se pudieron generar las sugerencias')
  }

  return data.sugerencias
}
