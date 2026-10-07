import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'

// =========================
// ESPECIALIZACIONES (áreas del derecho) Y CATÁLOGO DE NORMAS
//
// - Cada documento subido desde Admin lleva un "area" (las carpetas del
//   compartido: Derecho Penal, Civil, Tributario, Comercial). En Consultas
//   el usuario elige una especialización y la búsqueda se limita a ella.
// - Los códigos subidos antes de que existieran las áreas no tienen ese
//   campo: se reconocen por su tipoDocumento (TIPOS_POR_AREA). La
//   Constitución entra en todas.
// - normas_indexadas (Firestore): un documento por norma subida, con su
//   nombre y área. Sirve para reconocer la norma cuando la pregunta la
//   nombra ("artículo 5 de la Ley de Conciliación", "Ley 29571").
// Mantener sincronizado con src/constants/especialidades.ts (functions/
// no puede importar archivos del front).
// =========================

export const AREAS = ['derecho-penal', 'derecho-civil', 'derecho-tributario', 'derecho-comercial'] as const
export type Area = typeof AREAS[number]

export const NOMBRE_AREA: Record<Area, string> = {
  'derecho-penal': 'Derecho Penal',
  'derecho-civil': 'Derecho Civil',
  'derecho-tributario': 'Derecho Tributario',
  'derecho-comercial': 'Derecho Comercial'
}

export function esArea(valor: unknown): valor is Area {
  return typeof valor === 'string' && (AREAS as readonly string[]).includes(valor)
}

const TIPOS_POR_AREA: Record<Area, string[]> = {
  'derecho-penal': ['codigo-penal', 'constitucion'],
  'derecho-civil': ['codigo-civil', 'constitucion'],
  'derecho-tributario': ['codigo-tributario', 'constitucion'],
  'derecho-comercial': ['constitucion']
}

// Filtro de Pinecone para una especialización: documentos con ese área, o
// códigos antiguos (sin área) que pertenecen a ella por su tipo.
export function filtroDeArea(area: Area): Record<string, unknown> {
  return {
    $or: [
      { area: { $eq: area } },
      { tipoDocumento: { $in: TIPOS_POR_AREA[area] } }
    ]
  }
}

// =========================
// CATÁLOGO
// =========================
export const COLECCION_NORMAS = 'normas_indexadas'

export interface NormaIndexada {
  documentoId: string
  nombre: string
  tipo: string
  area?: Area
}

export async function registrarNorma(norma: NormaIndexada): Promise<void> {
  await getFirestore().collection(COLECCION_NORMAS).doc(norma.documentoId).set({
    nombre: norma.nombre,
    tipo: norma.tipo,
    ...(norma.area ? { area: norma.area } : {}),
    actualizadoEn: new Date().toISOString()
  }, { merge: true })
  catalogoEnCache = null
}

export async function olvidarNorma(documentoId: string): Promise<void> {
  await getFirestore().collection(COLECCION_NORMAS).doc(documentoId).delete()
  catalogoEnCache = null
}

// Se lee de Firestore como mucho cada 5 minutos por instancia.
const VIGENCIA_CATALOGO_MS = 5 * 60 * 1000
let catalogoEnCache: { leidoEn: number; normas: NormaIndexada[] } | null = null

async function leerCatalogo(): Promise<NormaIndexada[]> {
  if (catalogoEnCache && Date.now() - catalogoEnCache.leidoEn < VIGENCIA_CATALOGO_MS) return catalogoEnCache.normas
  try {
    const snap = await getFirestore().collection(COLECCION_NORMAS).get()
    const normas = snap.docs.map(d => ({
      documentoId: d.id,
      nombre: String(d.get('nombre') ?? ''),
      tipo: String(d.get('tipo') ?? ''),
      ...(esArea(d.get('area')) ? { area: d.get('area') as Area } : {})
    })).filter(n => n.nombre)
    catalogoEnCache = { leidoEn: Date.now(), normas }
    return normas
  } catch (err) {
    logger.warn('⚠️ No se pudo leer el catálogo de normas:', (err as Error).message)
    return catalogoEnCache?.normas ?? []
  }
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// "Ley de Conciliación (Ley N° 26872)" → título "ley de conciliacion" y
// número "26872". Se quitan prefijos genéricos ("texto unico ordenado del").
function clavesDeNorma(nombre: string): { titulo: string; numeros: string[] } {
  const numeros = [...nombre.matchAll(/\d{3,6}(?:-\d{2,4})?/g)].map(m => m[0])
  const titulo = normalizar(
    nombre
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\b(?:ley|decreto(?:\s+(?:legislativo|supremo|de\s+urgencia))?|d\.?\s*(?:leg|s)\.?)\s*(?:n\s*[°º.]*|nro\.?)?\s*[\d-]+/gi, ' ')
  ).replace(/^texto unico ordenado (?:de la |del )?/, '')
  return { titulo: titulo.split(' ').length >= 2 && titulo.length >= 10 ? titulo : '', numeros }
}

// Norma del catálogo que la pregunta nombra, si alguna. Por título ("ley de
// conciliación", "código procesal civil") o por número, cuando va con
// "ley/decreto" ("ley 26872") o tiene 5+ cifras ("29571"). Si varias
// coinciden, gana la de título más largo (la más específica).
export async function normaEnPregunta(pregunta: string): Promise<NormaIndexada | undefined> {
  const catalogo = await leerCatalogo()
  if (catalogo.length === 0) return undefined
  const texto = normalizar(pregunta)
  const numerosPedidos = new Set<string>([
    ...[...pregunta.matchAll(/(?:ley|decreto(?:\s+(?:legislativo|supremo|de\s+urgencia))?|d\.?\s*(?:leg|s)\.?)\s*(?:n\s*[°º.]*|nro\.?)?\s*(\d{3,6}(?:-\d{2,4})?)/gi)].map(m => m[1] ?? ''),
    ...[...pregunta.matchAll(/\b\d{5,6}\b/g)].map(m => m[0])
  ].filter(Boolean))

  let mejor: { norma: NormaIndexada; peso: number } | undefined
  for (const norma of catalogo) {
    const { titulo, numeros } = clavesDeNorma(norma.nombre)
    let peso = 0
    if (titulo && ` ${texto} `.includes(` ${titulo} `)) peso = titulo.length
    if (numeros.some(n => numerosPedidos.has(n))) peso = Math.max(peso, 1000)
    if (peso > 0 && (!mejor || peso > mejor.peso)) mejor = { norma, peso }
  }
  return mejor?.norma
}
