import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { GEMINI_API_KEY, TIMEOUT_FUNCIONES_IA_SEGUNDOS, conModeloDeRespaldo } from './geminiClient'
import { ORIGENES_PERMITIDOS, MAX_CARACTERES_DOCUMENTO, autorizar, consumirCuotaIA } from './seguridad'
import { asignarBaseLegal, PINECONE_API_KEY } from './baseLegal'
import { parsearJsonTolerante } from './geminiTools'

// =========================
// COMPARAR VERSIONES DE UN CONTRATO: explicación de los cambios
// El front ya hizo la parte determinística (cláusulas, emparejamiento y
// diff por palabras) y manda SOLO las cláusulas que cambiaron. Aquí la IA
// explica cada cambio (resumen, a quién favorece, riesgo y recomendación)
// y la base jurídica aporta la norma solo si un artículo lo sustenta
// directamente (asignarBaseLegal); si no, la cita queda vacía.
// =========================

const MAX_CAMBIOS = 60
const MAX_CARACTERES_CLAUSULA = 12_000
const MAX_CARACTERES_TITULO = 200
const CAMBIOS_POR_LLAMADA = 20
const TIPOS = new Set(['modificada', 'agregada', 'eliminada'])
const NIVELES = new Set(['alto', 'medio', 'bajo'])
const FAVORECE = new Set(['parte_a', 'parte_b', 'neutral', 'no_determinable'])

interface CambioEntrada {
  id: string
  tipo: 'modificada' | 'agregada' | 'eliminada'
  titulo: string
  antes: string
  despues: string
}

interface ExplicacionCambio {
  id: string
  resumen: string
  favorece: 'parte_a' | 'parte_b' | 'neutral' | 'no_determinable'
  nivel: 'alto' | 'medio' | 'bajo'
  recomendacion: string
  norma: string
}

/** Valida la estructura, el tamaño y el número de cláusulas recibidas. Devuelve el error o la lista limpia. */
function validarCambios(crudo: unknown): { error: string } | { cambios: CambioEntrada[] } {
  if (!Array.isArray(crudo) || crudo.length === 0) return { error: 'Falta la lista de cambios' }
  if (crudo.length > MAX_CAMBIOS) return { error: `Demasiadas cláusulas con cambios (máximo ${MAX_CAMBIOS})` }

  const cambios: CambioEntrada[] = []
  const ids = new Set<string>()
  let total = 0
  for (const item of crudo) {
    if (!item || typeof item !== 'object') return { error: 'Formato de cambio inválido' }
    const c = item as Record<string, unknown>
    if (typeof c.id !== 'string' || !/^[\w-]{1,60}$/.test(c.id) || ids.has(c.id)) return { error: 'Identificador de cambio inválido' }
    if (typeof c.tipo !== 'string' || !TIPOS.has(c.tipo)) return { error: 'Tipo de cambio inválido' }
    if (typeof c.titulo !== 'string' || c.titulo.length > MAX_CARACTERES_TITULO) return { error: 'Título de cláusula inválido' }
    if (typeof c.antes !== 'string' || typeof c.despues !== 'string') return { error: 'Texto de cláusula inválido' }
    if (c.antes.length > MAX_CARACTERES_CLAUSULA || c.despues.length > MAX_CARACTERES_CLAUSULA) {
      return { error: 'Una cláusula es demasiado larga para compararla' }
    }
    if (!c.antes.trim() && !c.despues.trim()) return { error: 'Cláusula sin texto' }
    total += c.antes.length + c.despues.length
    ids.add(c.id)
    cambios.push({ id: c.id, tipo: c.tipo as CambioEntrada['tipo'], titulo: c.titulo, antes: c.antes, despues: c.despues })
  }
  if (total > MAX_CARACTERES_DOCUMENTO) return { error: 'Los cambios son demasiado extensos para analizarlos de una vez' }
  return { cambios }
}

function construirPrompt(cambios: CambioEntrada[], nombreParteA: string, nombreParteB: string): string {
  const bloques = cambios.map(c => [
    `### CAMBIO ${c.id} — ${c.tipo.toUpperCase()} — ${c.titulo}`,
    c.tipo !== 'agregada' ? `ANTES:\n${c.antes}` : 'ANTES: (no existía)',
    c.tipo !== 'eliminada' ? `DESPUÉS:\n${c.despues}` : 'DESPUÉS: (se eliminó)'
  ].join('\n'))

  return [
    'Eres un abogado peruano que revisa los cambios entre dos versiones del mismo contrato.',
    `Parte A = ${nombreParteA || 'la primera parte que aparece en el contrato'}. Parte B = ${nombreParteB || 'la otra parte'}.`,
    '',
    'Para CADA cambio de abajo devuelve:',
    '- "resumen": qué cambió, en una o dos frases claras (no repitas el texto completo).',
    '- "favorece": "parte_a", "parte_b", "neutral" o "no_determinable" (si no se puede inferir con el texto).',
    '- "nivel": riesgo del cambio para quien firma: "alto", "medio" o "bajo".',
    '- "recomendacion": qué hacer, en una frase (aceptar, negociar, pedir aclaración, etc.).',
    'No cites normas ni artículos (se agregan aparte desde la base jurídica). No inventes datos que no estén en el texto.',
    '',
    ...bloques,
    '',
    'Responde SOLO JSON: {"partes": {"a": "nombre de la parte A", "b": "nombre de la parte B"}, "explicaciones": [{"id": "...", "resumen": "...", "favorece": "...", "nivel": "...", "recomendacion": "..."}]}'
  ].join('\n')
}

function limpiarExplicacion(crudo: unknown, idsValidos: Set<string>): Omit<ExplicacionCambio, 'norma'> | null {
  if (!crudo || typeof crudo !== 'object') return null
  const e = crudo as Record<string, unknown>
  if (typeof e.id !== 'string' || !idsValidos.has(e.id)) return null
  if (typeof e.resumen !== 'string' || !e.resumen.trim()) return null
  return {
    id: e.id,
    resumen: e.resumen.trim().slice(0, 1200),
    favorece: typeof e.favorece === 'string' && FAVORECE.has(e.favorece) ? e.favorece as ExplicacionCambio['favorece'] : 'no_determinable',
    nivel: typeof e.nivel === 'string' && NIVELES.has(e.nivel) ? e.nivel as ExplicacionCambio['nivel'] : 'medio',
    recomendacion: typeof e.recomendacion === 'string' ? e.recomendacion.trim().slice(0, 600) : ''
  }
}

export const explicarCambiosContratoIA = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [GEMINI_API_KEY, PINECONE_API_KEY], timeoutSeconds: TIMEOUT_FUNCIONES_IA_SEGUNDOS },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const uid = await autorizar(req, res)
    if (!uid) return

    try {
      const validacion = validarCambios((req.body as { cambios?: unknown })?.cambios)
      if ('error' in validacion) {
        res.status(400).json({ error: validacion.error })
        return
      }
      const { cambios } = validacion

      // Una comparación = una unidad del cupo diario, aunque se haga en varias llamadas
      if (!(await consumirCuotaIA(uid, res))) return

      const explicaciones: Omit<ExplicacionCambio, 'norma'>[] = []
      let partes = { a: '', b: '' }
      for (let i = 0; i < cambios.length; i += CAMBIOS_POR_LLAMADA) {
        const lote = cambios.slice(i, i + CAMBIOS_POR_LLAMADA)
        const ids = new Set(lote.map(c => c.id))
        const pedir = async () => {
          const r = await conModeloDeRespaldo(model => model.generateContent(construirPrompt(lote, partes.a, partes.b)), { json: true })
          return parsearJsonTolerante(r.response.text()) as { partes?: { a?: unknown; b?: unknown }; explicaciones?: unknown }
        }
        let datos: Awaited<ReturnType<typeof pedir>>
        try {
          datos = await pedir()
        } catch (err) {
          if (!(err instanceof SyntaxError)) throw err
          logger.warn('⚠️ explicarCambiosContratoIA: JSON inválido de la IA, se reintenta una vez')
          datos = await pedir()
        }
        if (!partes.a && typeof datos.partes?.a === 'string') {
          partes = { a: datos.partes.a.slice(0, 120), b: typeof datos.partes.b === 'string' ? datos.partes.b.slice(0, 120) : '' }
        }
        for (const crudo of Array.isArray(datos.explicaciones) ? datos.explicaciones : []) {
          const limpia = limpiarExplicacion(crudo, ids)
          if (limpia && !explicaciones.some(e => e.id === limpia.id)) explicaciones.push(limpia)
        }
      }

      // Norma peruana solo si un artículo de la base jurídica la sustenta
      const porId = new Map(cambios.map(c => [c.id, c]))
      const conBase = await asignarBaseLegal(explicaciones.map(e => ({
        ...e,
        clausula: `${porId.get(e.id)?.titulo ?? ''}: ${(porId.get(e.id)?.despues || porId.get(e.id)?.antes || '').slice(0, 200)}`,
        explicacion: e.resumen
      })))

      const respuesta: ExplicacionCambio[] = conBase.map(e => ({
        id: e.id,
        resumen: e.resumen,
        favorece: e.favorece,
        nivel: e.nivel,
        recomendacion: e.recomendacion,
        norma: e.baseLegal
          ? `${e.baseLegal.articulo !== undefined ? `Artículo ${e.baseLegal.articulo}°${e.baseLegal.sufijo ? `-${e.baseLegal.sufijo}` : ''} — ` : ''}${e.baseLegal.documento}`
          : ''
      }))

      logger.info(`🔀 Comparar versiones: ${respuesta.length} de ${cambios.length} cambios explicados`)
      res.json({ partes, explicaciones: respuesta })
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en explicarCambiosContratoIA:', error.message)
      res.status(500).json({ error: 'No se pudo generar la explicación de los cambios. Intenta de nuevo.' })
    }
  }
)
