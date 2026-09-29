import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { createHash } from 'node:crypto'
import { getFirestore } from 'firebase-admin/firestore'
import { GEMINI_API_KEY, TIMEOUT_FUNCIONES_IA_SEGUNDOS, conModeloDeRespaldo } from './geminiClient'
import { ORIGENES_PERMITIDOS, autorizar, consumirCuotaIA } from './seguridad'

// ================================
// RESUMEN DE UNA NORMA (Biblioteca Legal)
//
// Al abrir una norma, se resume su PDF oficial de El Peruano (no solo la
// sumilla del listado). El PDF se lee en el servidor y se le pasa entero a
// Gemini, que lee PDFs directamente (texto y escaneos).
//
// Todos los usuarios ven las mismas normas, así que el resumen se genera
// una sola vez por norma y se guarda en Firestore (resumenes_norma): las
// siguientes aperturas no gastan Gemini ni el cupo diario del usuario.
// ================================

const ORIGEN_EL_PERUANO = 'https://busquedas.elperuano.pe'
const MAX_BYTES_PDF = 15 * 1024 * 1024

export interface ResumenNorma {
  resumen: string
  puntosClave: string[]
  aQuienAplica: string
  vigencia: string
}

// Misma resolución que resolverUrlPdfNorma (index.ts): la URL guardada
// apunta a la página visor; el PDF real está en /api/archivo/file/...
async function descargarPdfNorma(urlWrapper: string): Promise<Buffer> {
  const cabeceras = { 'User-Agent': 'Mozilla/5.0 (compatible; LexitAI-Bot/1.0)' }
  const visor = await fetch(urlWrapper, { headers: cabeceras })
  if (!visor.ok) throw new Error(`El Peruano respondió ${visor.status}`)
  const match = /\/api\/archivo\/file\/[^"'\\ ]*/.exec(await visor.text())
  if (!match) throw new Error('No se encontró el PDF de esta norma')

  const archivo = await fetch(`${ORIGEN_EL_PERUANO}${match[0]}`, { headers: cabeceras })
  if (!archivo.ok) throw new Error(`El Peruano respondió ${archivo.status} al pedir el PDF`)
  const buffer = Buffer.from(await archivo.arrayBuffer())
  if (buffer.length > MAX_BYTES_PDF) throw new Error('El PDF de esta norma es demasiado grande para resumirlo')
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error('El archivo de esta norma no es un PDF')
  return buffer
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

function normalizarResumen(crudo: unknown): ResumenNorma {
  const r = (crudo ?? {}) as Record<string, unknown>
  const puntos = Array.isArray(r.puntosClave) ? r.puntosClave.map(texto).filter(Boolean).slice(0, 6) : []
  return {
    resumen: texto(r.resumen),
    puntosClave: puntos,
    aQuienAplica: texto(r.aQuienAplica),
    vigencia: texto(r.vigencia)
  }
}

export const resumirNormaIA = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [GEMINI_API_KEY], timeoutSeconds: TIMEOUT_FUNCIONES_IA_SEGUNDOS, memory: '512MiB' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const uid = await autorizar(req, res)
    if (!uid) return

    const { urlWrapper, titulo } = req.body as { urlWrapper?: string; titulo?: string }
    if (typeof urlWrapper !== 'string' || !urlWrapper.startsWith(`${ORIGEN_EL_PERUANO}/`) || urlWrapper.length > 500) {
      res.status(400).json({ error: 'urlWrapper inválida' })
      return
    }

    try {
      const cacheRef = getFirestore()
        .collection('resumenes_norma')
        .doc(createHash('sha256').update(urlWrapper).digest('hex'))
      const cache = await cacheRef.get()
      if (cache.exists) {
        res.json(cache.get('resultado'))
        return
      }

      if (!(await consumirCuotaIA(uid, res))) return

      const pdf = await descargarPdfNorma(urlWrapper)
      const nombre = typeof titulo === 'string' ? titulo.slice(0, 300) : ''

      const prompt = `
    Eres un abogado experto en derecho peruano. Adjunto está el PDF oficial
    (Diario Oficial El Peruano) de la norma${nombre ? ` "${nombre}"` : ''}.

    Resúmela para un abogado en ejercicio, usando SOLO lo que dice el PDF.
    No inventes números de norma, fechas, montos ni plazos: si algo no
    aparece en el PDF, déjalo como cadena vacía.

    Responde SOLO en JSON con esta estructura:
    {
      "resumen": "2 a 4 frases: qué dispone la norma y con qué finalidad",
      "puntosClave": ["disposiciones concretas más importantes (máximo 5), una frase cada una"],
      "aQuienAplica": "a quién se dirige o afecta, en una frase",
      "vigencia": "desde cuándo rige o plazos relevantes, si el PDF lo dice"
    }
  `

      const result = await conModeloDeRespaldo(
        model => model.generateContent([
          { inlineData: { mimeType: 'application/pdf', data: pdf.toString('base64') } },
          { text: prompt }
        ]),
        { json: true }
      )
      const clean = result.response.text().replace(/```json|```/g, '').trim()
      const resultado = normalizarResumen(JSON.parse(clean))
      if (!resultado.resumen) throw new Error('La IA no devolvió un resumen')

      await cacheRef.set({ resultado, urlWrapper, creadoEn: new Date().toISOString() })
      res.json(resultado)
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en resumirNormaIA:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)
