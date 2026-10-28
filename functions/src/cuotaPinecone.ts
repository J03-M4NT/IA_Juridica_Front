// =========================
// TOPE MENSUAL DEL RERANKER (plan Starter de Pinecone: 500 usos al mes)
// Cada búsqueda D gasta un uso. Al llegar al tope, la búsqueda sigue sin
// reranker (solo la fusión, variante E, casi igual de buena en la
// evaluación), en vez de agotar la cuota y quedarse sin margen para pruebas.
// Se cuenta en Firestore consumoPinecone/{AAAA-MM}; los usos anteriores al
// contador (octubre de 2026: auditoría y evaluaciones) se suman a mano.
// =========================
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'

export const LIMITE_RERANK_MES = 450
const USOS_PREVIOS: Record<string, number> = { '2026-10': 115 }
const CACHE_MS = 60 * 1000

const mesActual = () => new Date().toISOString().slice(0, 7)
let enCache: { mes: string; leidoEn: number; usados: number } | null = null

export async function usosRerankDelMes(): Promise<{ mes: string; usados: number; limite: number }> {
  const mes = mesActual()
  if (enCache && enCache.mes === mes && Date.now() - enCache.leidoEn < CACHE_MS) return { mes, usados: enCache.usados, limite: LIMITE_RERANK_MES }
  const doc = await getFirestore().collection('consumoPinecone').doc(mes).get()
  const usados = (Number(doc.data()?.rerank) || 0) + (USOS_PREVIOS[mes] ?? 0)
  enCache = { mes, leidoEn: Date.now(), usados }
  return { mes, usados, limite: LIMITE_RERANK_MES }
}

export async function quedaRerank(): Promise<boolean> {
  try {
    return (await usosRerankDelMes()).usados < LIMITE_RERANK_MES
  } catch {
    // Si no se puede leer el contador, se intenta igual (el reranker tiene su propio respaldo)
    return true
  }
}

export function contarRerank(): void {
  const mes = mesActual()
  if (enCache?.mes === mes) enCache.usados++
  getFirestore().collection('consumoPinecone').doc(mes).set({ rerank: FieldValue.increment(1) }, { merge: true })
    .catch((err: unknown) => logger.warn('⚠️ No se pudo contar el uso del reranker:', (err as Error).message))
}
