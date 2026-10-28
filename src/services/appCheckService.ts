import { postFuncion } from './functionsClient'

// =========================
// APP CHECK (Cloud Function appCheckAdmin, solo admins)
// Conteos por día de las llamadas con token válido, sin token o inválido,
// y el modo: 'monitor' (solo cuenta) o 'exigir' (rechaza sin token válido).
// =========================

export type ModoAppCheck = 'monitor' | 'exigir'

export interface EstadoAppCheck {
  modo: ModoAppCheck
  tokenPropio: 'validos' | 'sinToken' | 'invalidos'
  dias: Array<{ fecha: string; validos: number; sinToken: number; invalidos: number }>
}

async function llamar(cuerpo: Record<string, unknown>): Promise<EstadoAppCheck> {
  const response = await postFuncion('appCheckAdmin', cuerpo)
  const data = await response.json().catch(() => ({})) as EstadoAppCheck & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'No se pudo leer el estado de App Check')
  return data
}

export const leerEstadoAppCheck = () => llamar({ accion: 'estado' })
export const cambiarModoAppCheck = (modo: ModoAppCheck) => llamar({ accion: 'modo', modo })
