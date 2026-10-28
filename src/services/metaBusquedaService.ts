import { postFuncion } from './functionsClient'

// =========================
// META BÚSQUEDA (Cloud Function metaBusqueda)
// Información complementaria de fuentes oficiales de internet. Va aparte de
// la respuesta y las citas de LexIT: LexIT no puede verificar estas fuentes.
// =========================

export interface ResultadoMetaBusqueda {
  resumen: Array<{ texto: string; fuentes: number[] }>
  fuentes: Array<{ n: number; titulo: string; url: string; dominio: string }>
  consultas: string[]
  descartadas: number
  restantes: number
  limite: number
  diagnostico?: { modelo: string; ms: number; dominiosDescartados: string[]; textoCompleto: string }
}

export interface DirectorioMetaBusqueda {
  dominios: string[]
  sitiosPrioritarios: string[]
  palabrasClave: string[]
}

export type UsosOpciones = Record<'metaBusqueda' | 'razonamiento', { restantes: number; limite: number }>

async function llamar<T>(cuerpo: Record<string, unknown>): Promise<T> {
  const response = await postFuncion('metaBusqueda', cuerpo)
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'No se pudo completar la meta búsqueda')
  return data
}

export function metaBuscar(pregunta: string, opciones: { especialidad?: string; diagnostico?: boolean } = {}): Promise<ResultadoMetaBusqueda> {
  return llamar<ResultadoMetaBusqueda>({
    pregunta,
    ...(opciones.especialidad ? { especialidad: opciones.especialidad } : {}),
    ...(opciones.diagnostico ? { diagnostico: true } : {})
  })
}

// Cupos que le quedan hoy al usuario (no gasta nada)
export function leerUsosOpciones(): Promise<UsosOpciones> {
  return llamar<UsosOpciones>({ accion: 'usos' })
}

// Directorio de fuentes (solo admins)
export function leerDirectorio(): Promise<DirectorioMetaBusqueda> {
  return llamar<DirectorioMetaBusqueda>({ accion: 'directorio' })
}

export function guardarDirectorio(directorio: DirectorioMetaBusqueda): Promise<DirectorioMetaBusqueda> {
  return llamar<DirectorioMetaBusqueda>({ accion: 'directorio', directorio })
}
