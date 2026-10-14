import { postFuncion } from './functionsClient'
import type { CambioClausula } from '../utils/compararVersiones'

// =========================
// COMPARAR VERSIONES: explicación de los cambios con IA
// (Cloud Function explicarCambiosContratoIA). Solo se envían las cláusulas
// con cambios. Reintenta con espera creciente ante saturación (429/5xx),
// salvo cuando el 429 es el límite diario del usuario.
// =========================

export interface ExplicacionCambio {
  id: string
  resumen: string
  favorece: 'parte_a' | 'parte_b' | 'neutral' | 'no_determinable'
  nivel: 'alto' | 'medio' | 'bajo'
  recomendacion: string
  // "Artículo 1736° — Código Civil", o vacío si ningún artículo la sustenta
  norma: string
}

export interface ResultadoExplicaciones {
  partes: { a: string; b: string }
  explicaciones: ExplicacionCambio[]
}

const ESPERAS_MS = [1500, 4000]
const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function explicarCambios(cambios: CambioClausula[]): Promise<ResultadoExplicaciones> {
  const cuerpo = {
    cambios: cambios
      .filter(c => c.tipo !== 'sin_cambios')
      .map(c => ({ id: c.id, tipo: c.tipo, titulo: c.titulo.slice(0, 200), antes: c.textoOriginal, despues: c.textoModificado }))
  }

  for (let intento = 0; ; intento++) {
    const response = await postFuncion('explicarCambiosContratoIA', cuerpo)
    const data = await response.json().catch(() => ({})) as Partial<ResultadoExplicaciones> & { error?: string }

    if (response.ok && Array.isArray(data.explicaciones)) {
      return { partes: data.partes ?? { a: '', b: '' }, explicaciones: data.explicaciones }
    }

    const limiteDiario = response.status === 429 && /l[ií]mite/i.test(data.error ?? '')
    const reintentable = !limiteDiario && [429, 500, 502, 503, 504].includes(response.status)
    const espera = ESPERAS_MS[intento]
    if (!reintentable || espera === undefined) {
      throw new Error(data.error ?? 'No se pudo generar la explicación de los cambios.')
    }
    await esperar(espera)
  }
}
