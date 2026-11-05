import { postFuncion } from './functionsClient'

// =========================
// ERRORES DE PANTALLA (Cloud Functions reportarErrorFront y erroresAdmin)
// El boot src/boot/errores.ts manda los errores que no maneja nadie; el
// panel Admin › Errores los lista agrupados. Solo viaja el error técnico:
// nunca el texto de las consultas ni de los documentos.
// =========================

export type TipoError = 'vue' | 'ventana' | 'promesa'

export interface ReporteError {
  tipo: TipoError
  mensaje: string
  pila: string
  componente: string
  ruta: string
  entorno: 'produccion' | 'local'
}

export async function reportarError(reporte: ReporteError): Promise<void> {
  await postFuncion('reportarErrorFront', reporte)
}

export interface GrupoError {
  id: string
  tipo: TipoError
  mensaje: string
  pila: string
  componente: string
  veces: number
  personas: number
  estado: 'abierto' | 'resuelto'
  reabierto: boolean
  primeraVez: number | null // milisegundos
  ultimaVez: number | null
  rutas: Record<string, number>
  navegadores: Record<string, number>
  entornos: Partial<Record<'produccion' | 'local', number>>
}

export interface ResumenErrores {
  grupos: GrupoError[]
  dias: Array<{ fecha: string; total: number; produccion: number; local: number }>
}

async function llamar(cuerpo: Record<string, unknown>): Promise<ResumenErrores> {
  const response = await postFuncion('erroresAdmin', cuerpo)
  const data = await response.json().catch(() => ({})) as ResumenErrores & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'No se pudieron leer los errores')
  return data
}

export const leerErrores = () => llamar({ accion: 'listar' })
export const cambiarEstadoError = (id: string, estado: GrupoError['estado']) => llamar({ accion: 'estado', id, estado })
