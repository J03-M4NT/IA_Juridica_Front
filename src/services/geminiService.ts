import { postFuncion } from './functionsClient'

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
}

export async function chatEditarContratoIA(
  textoContrato: string,
  historialChat: MensajeChatEdicion[],
  respuestaUsuario?: string
): Promise<ResultadoChatEdicion> {
  const response = await postFuncion('chatEdicionContratoIA', { textoContrato, historialChat, respuestaUsuario })

  const data = await response.json() as Partial<ResultadoChatEdicion> & { error?: string }
  if (!response.ok || !data.tipo || !data.mensaje) {
    throw new Error(data.error ?? 'No se pudo continuar la conversación con la IA')
  }

  return {
    tipo: data.tipo,
    mensaje: data.mensaje,
    ...(data.textoModificado !== undefined ? { textoModificado: data.textoModificado } : {})
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
}

export async function sugerirCambiosContrato(textoContrato: string): Promise<SugerenciaCambio[]> {
  const response = await postFuncion('generarSugerenciasContrato', { textoContrato })

  const data = await response.json() as { sugerencias?: SugerenciaCambio[]; error?: string }
  if (!response.ok || !data.sugerencias) {
    throw new Error(data.error ?? 'No se pudieron generar las sugerencias')
  }

  return data.sugerencias
}
