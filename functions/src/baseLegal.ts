// =========================
// BASE LEGAL DE LAS SUGERENCIAS DEL ANÁLISIS (Análisis de Contratos)
// Cada sugerencia del análisis de riesgos se contrasta con la base jurídica
// (Pinecone): se buscan los artículos relacionados, con los mismos filtros
// que el chat de Consultas (sin índices del PDF, sin comentarios de
// doctrina, solo texto de ley), y UNA llamada a Gemini decide, sugerencia
// por sugerencia, si alguno la sustenta DIRECTAMENTE. Si ninguno lo hace,
// la sugerencia va sin cita: se prefiere no citar a forzar una cita.
//
// Nunca rompe el análisis: ante cualquier fallo, las sugerencias se
// devuelven tal cual, sin base legal.
// =========================
import { Pinecone } from '@pinecone-database/pinecone'
import * as logger from 'firebase-functions/logger'
import { conModeloDeRespaldo } from './geminiClient'
import {
  PINECONE_API_KEY,
  PINECONE_HOST,
  PINECONE_INDEX,
  SCORE_MINIMO_RELEVANCIA,
  buscarEnPineconeInterno,
  dedupeFragmentos,
  esIndiceDelDocumento,
  recortarAnexosDelArticulo,
  sufijoDeArticulo,
  tieneEncabezadoDeArticulo,
  type FragmentoResultado
} from './consultarLexit'

export { PINECONE_API_KEY }

export interface BaseLegal {
  documento: string
  articulo?: number
  sufijo?: string
  texto: string
}

interface AnotacionConTexto {
  clausula: string
  explicacion: string
}

const MAX_ANOTACIONES_CON_BASE = 60
const CANDIDATOS_POR_ANOTACION = 3
const BUSQUEDAS_EN_PARALELO = 8
const MAX_CARACTERES_FRAGMENTO = 700

async function buscarCandidatos(idx: ReturnType<Pinecone['index']>, anotacion: AnotacionConTexto): Promise<FragmentoResultado[]> {
  const consulta = `${anotacion.clausula}. ${anotacion.explicacion}`.slice(0, 400)
  const encontrados = dedupeFragmentos(await buscarEnPineconeInterno(idx, consulta, 6))
  return encontrados
    .filter(f => f.score >= SCORE_MINIMO_RELEVANCIA && !esIndiceDelDocumento(f.texto) && f.numeroArticulo !== undefined && tieneEncabezadoDeArticulo(f))
    .slice(0, CANDIDATOS_POR_ANOTACION)
    .map(f => {
      const sufijo = sufijoDeArticulo(f)
      return { ...f, texto: recortarAnexosDelArticulo(f), ...(sufijo ? { sufijoArticulo: sufijo } : {}) }
    })
}

function etiqueta(f: FragmentoResultado): string {
  return `${f.nombreDocumento} - Artículo ${f.numeroArticulo ?? ''}°${f.sufijoArticulo ? `-${f.sufijoArticulo}` : ''}`
}

export async function asignarBaseLegal<T extends AnotacionConTexto>(anotaciones: T[]): Promise<(T & { baseLegal?: BaseLegal })[]> {
  if (anotaciones.length === 0) return anotaciones
  try {
    const idx = new Pinecone({ apiKey: PINECONE_API_KEY.value() }).index(PINECONE_INDEX, PINECONE_HOST)
    const objetivo = anotaciones.slice(0, MAX_ANOTACIONES_CON_BASE)
    const candidatos: FragmentoResultado[][] = objetivo.map(() => [])

    let siguiente = 0
    const trabajador = async () => {
      while (siguiente < objetivo.length) {
        const i = siguiente++
        const anotacion = objetivo[i]
        if (!anotacion) continue
        try {
          candidatos[i] = await buscarCandidatos(idx, anotacion)
        } catch (err) {
          logger.warn(`⚠️ Base legal: búsqueda fallida para la anotación ${i}:`, (err as Error).message)
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(BUSQUEDAS_EN_PARALELO, objetivo.length) }, trabajador))

    const conCandidatos = objetivo
      .map((anotacion, i) => ({ anotacion, i, fragmentos: candidatos[i] ?? [] }))
      .filter(x => x.fragmentos.length > 0)
    if (conCandidatos.length === 0) return anotaciones

    const prompt = [
      'Eres un abogado peruano. Para cada ANOTACIÓN de un análisis de contrato, decide si alguno de sus ARTÍCULOS candidatos (de la base jurídica) es la norma que la SUSTENTA DIRECTAMENTE: la que regula lo que la anotación advierte o propone cambiar.',
      '',
      'Reglas:',
      '- Elige un artículo solo si realmente regula ese punto. Compartir palabras no basta.',
      '- Si ninguno la sustenta directamente, responde null. Es preferible no citar a forzar una cita.',
      '- Como máximo un artículo por anotación.',
      '',
      ...conCandidatos.flatMap(({ anotacion, i, fragmentos }) => [
        `ANOTACIÓN ${i}: cláusula "${anotacion.clausula}" — ${anotacion.explicacion}`,
        ...fragmentos.map((f, k) => `  [${k + 1}] ${etiqueta(f)}: ${f.texto.slice(0, MAX_CARACTERES_FRAGMENTO)}`),
        ''
      ]),
      'Responde solo JSON: [{"anotacion": número, "articulo": número del candidato (1, 2...) o null}]'
    ].join('\n')

    const result = await conModeloDeRespaldo(model => model.generateContent(prompt), { json: true })
    const datos: unknown = JSON.parse(result.response.text())
    const lista: unknown[] = Array.isArray(datos)
      ? datos
      : (datos && typeof datos === 'object' ? (Object.values(datos).find(Array.isArray) as unknown[] | undefined) ?? [] : [])

    const elegido = new Map<number, number>()
    for (const item of lista) {
      if (!item || typeof item !== 'object') continue
      const { anotacion, articulo } = item as { anotacion?: unknown; articulo?: unknown }
      if (typeof anotacion === 'number' && typeof articulo === 'number') elegido.set(anotacion, articulo)
    }

    let citadas = 0
    const resultado = anotaciones.map((anotacion, i) => {
      const numero = elegido.get(i)
      const fragmento = numero !== undefined ? candidatos[i]?.[numero - 1] : undefined
      if (!fragmento) return anotacion
      citadas++
      return {
        ...anotacion,
        baseLegal: {
          documento: fragmento.nombreDocumento,
          ...(fragmento.numeroArticulo !== undefined ? { articulo: fragmento.numeroArticulo } : {}),
          ...(fragmento.sufijoArticulo ? { sufijo: fragmento.sufijoArticulo } : {}),
          texto: fragmento.texto
        }
      }
    })
    logger.info(`⚖️ Base legal: ${citadas} de ${anotaciones.length} sugerencias con artículo que las sustenta`)
    return resultado
  } catch (err) {
    logger.warn('⚠️ No se pudo asignar base legal; las sugerencias van sin cita:', (err as Error).message)
    return anotaciones
  }
}
