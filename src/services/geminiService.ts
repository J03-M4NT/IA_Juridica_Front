const FUNCTIONS_URL = 'https://us-central1-lexit-ai.cloudfunctions.net'

// ================================
// 4. MODIFICAR PLANTILLA
// (delegado a la Cloud Function modificarPlantillaIA — antes llamaba a
// Gemini directo desde el navegador con la API key expuesta en el bundle)
// ================================
export async function modificarPlantilla(
  textoPlantilla: string,
  instruccion: string
): Promise<string> {
  const response = await fetch(`${FUNCTIONS_URL}/modificarPlantillaIA`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ textoPlantilla, instruccion })
  })

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
  const response = await fetch(`${FUNCTIONS_URL}/resumirNormasDelDiaIA`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ normas })
  })

  const data = await response.json() as Partial<ResumenNormasDelDia> & { error?: string }
  if (!response.ok || !data.resumen) {
    throw new Error(data.error ?? 'No se pudo generar el resumen de normas del día')
  }

  return { resumen: data.resumen, destacadas: data.destacadas ?? [] }
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
  const response = await fetch(`${FUNCTIONS_URL}/generarSugerenciasContrato`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ textoContrato })
  })

  const data = await response.json() as { sugerencias?: SugerenciaCambio[]; error?: string }
  if (!response.ok || !data.sugerencias) {
    throw new Error(data.error ?? 'No se pudieron generar las sugerencias')
  }

  return data.sugerencias
}
