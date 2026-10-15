import { postFuncion } from './functionsClient'

// =========================
// PANORAMA DEL DÍA (Cloud Function obtenerPanoramaDia)
// BCRP, SMV, Congreso y El Peruano, armados en el servidor y guardados por
// día; se reutilizan como máximo una hora.
// =========================

export interface ValorConAnterior { valor: number; fecha: string; anterior: number | null }
export interface PuntoSerie { fecha: string; valor: number }

export interface HechoSmv {
  empresa: string
  expediente: string
  tipo: string
  sector: string
  descripcion: string
  hora: string
  documentos: string[]
}

export interface ProyectoLey {
  numero: string
  titulo: string
  estado: string
  fecha: string
  proponente: string
  autores: string
  enlace: string
}

export interface NormaResumen { titulo: string; sector: string; sumilla: string; urlPdf: string }

export interface IndiceBvl { nombre: string; valor: number; variacion: number; fecha: string }

export interface Panorama {
  fecha: string
  actualizadoEn: string
  bcrp: {
    dolarCompra: ValorConAnterior | null
    dolarVenta: ValorConAnterior | null
    euroVenta: ValorConAnterior | null
    tasaReferencia: ValorConAnterior | null
    historicoDolar: PuntoSerie[]
  } | null
  smv: HechoSmv[] | null
  senado: { total: number; proyectos: ProyectoLey[] } | null
  diputados: { total: number; proyectos: ProyectoLey[] } | null
  elPeruano: {
    fecha: string | null
    total: number
    totalAnterior: number | null
    sbs: NormaResumen[]
    sbsAnterior: number | null
  } | null
  bvl?: {
    indices: IndiceBvl[]
    suben: number
    bajan: number
    montoSoles: number
    montoDolares: number
    operaciones: number
    montoAccionesSoles: number
  } | null
  fuentesConError: string[]
  anterior: { fecha: string; smv: number | null; senado: number | null; diputados: number | null } | null
}

export async function obtenerPanorama(actualizar = false): Promise<Panorama> {
  const response = await postFuncion('obtenerPanoramaDia', actualizar ? { actualizar: true } : {})
  const data = await response.json().catch(() => ({})) as Partial<Panorama> & { error?: string }
  if (!response.ok || !data.fecha) throw new Error(data.error ?? 'No se pudo cargar el panorama del día.')
  return data as Panorama
}
