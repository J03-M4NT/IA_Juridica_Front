import { postFuncion } from './functionsClient'
import { blobABase64 } from '../utils/imagenesOcr'

// =========================
// OCR DE CONTRATOS (Cloud Function extraerTextoContratoIA)
// Lee fotos y escaneos con Gemini, con una cuota mensual propia, aparte
// de la de consultas. Ver functions/src/ocrContratos.ts.
// =========================

export interface CupoOcr {
  restantes: number
  limite: number
  maxPaginas: number
}

export interface PaginaLeida {
  indice: number
  estado: 'ok' | 'fallo'
  texto: string
  dudosos: string[]
  calidad: 'buena' | 'regular' | 'mala'
  motivo: string
}

// Una página en pantalla. Sin imagen = PDF con texto (no pasó por Gemini).
export interface PaginaOcr {
  id: number
  imagen: Blob | null
  url: string
  estado: 'pendiente' | 'leyendo' | 'ok' | 'fallo'
  texto: string
  dudosos: string[]
  calidad: PaginaLeida['calidad']
  motivo: string
}

export interface ResultadoOcr {
  extraccionId: string | null
  paginas: PaginaLeida[]
  restantes: number
  limite: number
}

async function llamar<T>(cuerpo: Record<string, unknown>): Promise<T> {
  // Sin conexión con la función, fetch solo dice "Failed to fetch"
  const response = await postFuncion('extraerTextoContratoIA', cuerpo).catch((err: unknown) => {
    throw err instanceof TypeError
      ? new Error('No se pudo conectar con el servicio de lectura. Revisa tu conexión e inténtalo de nuevo.')
      : err
  })
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'No se pudo leer el documento. Inténtalo de nuevo.')
  return data
}

export const leerCupoOcr = () => llamar<CupoOcr>({ accion: 'cupo' })

// Con extraccionId (volver a subir páginas de una lectura ya cobrada) no se
// descuenta otra extracción
export async function extraerPaginas(paginas: Array<{ indice: number; imagen: Blob }>, extraccionId: string | null): Promise<ResultadoOcr> {
  const conDatos = await Promise.all(paginas.map(async p => ({ indice: p.indice, base64: await blobABase64(p.imagen) })))
  return llamar<ResultadoOcr>({ paginas: conDatos, ...(extraccionId ? { extraccionId } : {}) })
}
