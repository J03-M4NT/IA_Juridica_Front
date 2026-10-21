// =========================
// META BÚSQUEDA (Consultas): información complementaria de internet
// Función aparte de consultarLexit: no cambia la respuesta ni las citas de
// LexIT. Gemini busca en Google (grounding) y devuelve qué páginas respaldan
// cada frase; se conservan SOLO las frases respaldadas por páginas del
// directorio (por defecto, dominios .gob.pe, .gob y El Peruano). Lo demás se
// descarta. El resultado se muestra en una sección aparte que advierte que
// LexIT no puede verificar estas fuentes.
// Usa la misma clave de Gemini (secreto GEMINI_API_KEY), sin claves nuevas.
// Acciones: (por defecto) buscar · 'usos' (cupos que quedan) ·
// 'directorio' (leer/cambiar, solo admins) · diagnostico (solo admins).
// =========================
import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { getFirestore } from 'firebase-admin/firestore'
import { GEMINI_API_KEY, GEMINI_MODEL } from './geminiClient'
import { ORIGENES_PERMITIDOS, MAX_CARACTERES_MENSAJE, autorizar, esAdmin, excede } from './seguridad'
import { consumirOpcion, usosRestantes } from './cuotasExtra'

// Directorio por defecto (se cambia desde Admin, Firestore config/metaBusqueda)
export interface DirectorioMetaBusqueda {
  // Dominios permitidos: la página vale si su dominio es igual o termina en ".<dominio>"
  dominios: string[]
  // Sitios que se sugieren primero a la búsqueda
  sitiosPrioritarios: string[]
  // Palabras que orientan la búsqueda hacia documentos oficiales
  palabrasClave: string[]
}
const DIRECTORIO_POR_DEFECTO: DirectorioMetaBusqueda = {
  dominios: ['gob.pe', 'gob', 'elperuano.pe'],
  sitiosPrioritarios: [
    'spij.minjus.gob.pe', 'elperuano.pe', 'gob.pe', 'tc.gob.pe', 'pj.gob.pe', 'congreso.gob.pe',
    'sunat.gob.pe', 'sunarp.gob.pe', 'indecopi.gob.pe', 'sunafil.gob.pe', 'mef.gob.pe', 'gob.pe/mtpe'
  ],
  palabrasClave: ['texto oficial', 'decreto supremo', 'resolución', 'reglamento']
}

// Solo el modelo de siempre (el de geminiClient.ts, con la clave del equipo)
const MODELOS = [GEMINI_MODEL]
const TIEMPO_MAX_MS = 45_000

const limpiarLista = (v: unknown, max: number) => (Array.isArray(v) ? v : [])
  .filter((x): x is string => typeof x === 'string')
  .map(x => x.trim().toLowerCase())
  .filter(x => x && x.length <= 80)
  .slice(0, max)

async function leerDirectorio(): Promise<DirectorioMetaBusqueda> {
  try {
    const datos = (await getFirestore().collection('config').doc('metaBusqueda').get()).data()
    if (!datos) return DIRECTORIO_POR_DEFECTO
    const dominios = limpiarLista(datos.dominios, 50).filter(d => /^[a-z0-9.-]+$/.test(d))
    return {
      dominios: dominios.length ? dominios : DIRECTORIO_POR_DEFECTO.dominios,
      sitiosPrioritarios: limpiarLista(datos.sitiosPrioritarios, 30),
      palabrasClave: limpiarLista(datos.palabrasClave, 30)
    }
  } catch {
    return DIRECTORIO_POR_DEFECTO
  }
}

const dominioPermitido = (host: string, dominios: string[]) => dominios.some(d => host === d || host.endsWith(`.${d}`))

// Los enlaces de Google llegan como redirección: se obtiene la página real
async function urlReal(uri: string): Promise<string> {
  try {
    const r = await fetch(uri, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(5000) })
    return r.headers.get('location') ?? uri
  } catch {
    return uri
  }
}

const hostDe = (url: string) => {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, '') } catch { return '' }
}

interface RespuestaGemini {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    groundingMetadata?: {
      webSearchQueries?: string[]
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>
      groundingSupports?: Array<{ segment?: { startIndex?: number; text?: string }; groundingChunkIndices?: number[] }>
    }
  }>
  error?: { message?: string }
}

async function buscarConGemini(prompt: string): Promise<{ datos: RespuestaGemini; modelo: string }> {
  let ultimoError: Error | null = null
  for (const modelo of MODELOS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY.value() },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.2 }
        }),
        signal: AbortSignal.timeout(TIEMPO_MAX_MS)
      })
      const datos = await r.json().catch(() => ({})) as RespuestaGemini
      if (!r.ok) throw new Error(datos.error?.message ?? `HTTP ${r.status}`)
      return { datos, modelo }
    } catch (err) {
      ultimoError = err as Error
      logger.warn(`⏳ Meta búsqueda: ${modelo} falló (${ultimoError.message.slice(0, 160)})`)
    }
  }
  throw ultimoError ?? new Error('No se pudo buscar')
}

export interface ResultadoMetaBusqueda {
  // Frases respaldadas por páginas del directorio, con el número de sus fuentes
  resumen: Array<{ texto: string; fuentes: number[] }>
  fuentes: Array<{ n: number; titulo: string; url: string; dominio: string }>
  consultas: string[]
  descartadas: number
  restantes: number
  limite: number
  // Solo admins (diagnóstico)
  diagnostico?: { modelo: string; ms: number; dominiosDescartados: string[]; textoCompleto: string }
}

async function metaBuscar(pregunta: string, especialidad: string | undefined, directorio: DirectorioMetaBusqueda) {
  const prompt = [
    'Busca en internet información OFICIAL del Estado peruano que complemente esta consulta jurídica.',
    `Consulta: ${pregunta}`,
    ...(especialidad ? [`Rama del derecho: ${especialidad.replace(/-/g, ' ')}.`] : []),
    `Usa solo fuentes oficiales: sitios cuyo dominio termine en ${directorio.dominios.map(d => `.${d}`).join(', ')}. En tus búsquedas escribe literalmente "site:gob.pe" (así, en inglés).`,
    ...(directorio.sitiosPrioritarios.length ? [`Revisa primero estos sitios: ${directorio.sitiosPrioritarios.join(', ')}.`] : []),
    ...(directorio.palabrasClave.length ? [`Palabras útiles para buscar: ${directorio.palabrasClave.join(', ')}.`] : []),
    'No uses blogs, estudios de abogados, medios de prensa ni foros.',
    'Responde en español, en 3 a 6 frases breves y concretas, cada una basada en una fuente. Si la fuente nombra la norma o el documento oficial (número y fecha), menciónalo. No inventes datos que no estén en las fuentes.'
  ].join('\n')

  const inicio = Date.now()
  const { datos, modelo } = await buscarConGemini(prompt)
  const candidato = datos.candidates?.[0]
  const meta = candidato?.groundingMetadata
  const chunks = meta?.groundingChunks ?? []

  // Dominio real de cada página
  const paginas = await Promise.all(chunks.map(async c => {
    const uri = c.web?.uri ?? ''
    const url = uri ? await urlReal(uri) : ''
    const titulo = c.web?.title ?? ''
    const dominio = hostDe(url) || titulo.toLowerCase()
    return { titulo, url, dominio }
  }))
  const permitida = paginas.map(p => !!p.url && dominioPermitido(p.dominio, directorio.dominios))

  const textoCompleto = (candidato?.content?.parts ?? []).map(p => p.text ?? '').join('')

  // Numeración de las fuentes que se muestran (solo las permitidas; una
  // misma página llega a veces repetida: se numera una vez por dirección)
  const numeroPorUrl = new Map<string, number>()
  const fuentes: ResultadoMetaBusqueda['fuentes'] = []
  const numeroDe = (i: number) => {
    const p = paginas[i] ?? { titulo: '', url: '', dominio: '' }
    if (!numeroPorUrl.has(p.url)) {
      numeroPorUrl.set(p.url, fuentes.length + 1)
      fuentes.push({ n: fuentes.length + 1, titulo: p.titulo || p.dominio, url: p.url, dominio: p.dominio })
    }
    return numeroPorUrl.get(p.url) ?? 0
  }

  // Google marca el respaldo por trozos del texto (a veces corta antes de una
  // negrita). Se trabaja por frase completa: una frase se muestra si algún
  // trozo suyo está respaldado por una página permitida; las que solo tienen
  // respaldo de otras páginas, o ninguno, se descartan.
  const plano = (t: string) => t.replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
  const soportes = (meta?.groundingSupports ?? []).map(sp => ({ texto: plano(sp.segment?.text ?? ''), indices: sp.groundingChunkIndices ?? [] })).filter(sp => sp.texto.length >= 8)
  const frases = textoCompleto
    .split('\n')
    .map(l => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
    .flatMap(l => l.split(/(?<=[.;])\s+(?=[A-ZÁÉÍÓÚÑ¿(*])/))
    .map(f => f.replace(/\*\*|__/g, '').replace(/^\*\s*/, '').trim())
    .filter(f => f.length >= 12)
  const resumen: ResultadoMetaBusqueda['resumen'] = []
  for (const frase of frases) {
    const f = plano(frase)
    const indices = soportes
      .filter(sp => f.includes(sp.texto.slice(0, 40)) || sp.texto.includes(f.slice(0, 40)))
      .flatMap(sp => sp.indices)
      .filter(i => permitida[i])
    if (!indices.length || resumen.some(r => plano(r.texto) === f)) continue
    resumen.push({ texto: frase, fuentes: [...new Set(indices.map(numeroDe))] })
  }

  return {
    resumen,
    fuentes,
    consultas: meta?.webSearchQueries ?? [],
    descartadas: paginas.filter((_, i) => !permitida[i]).length,
    diagnostico: {
      modelo,
      ms: Date.now() - inicio,
      dominiosDescartados: [...new Set(paginas.filter((_, i) => !permitida[i]).map(p => p.dominio))],
      textoCompleto
    }
  }
}

export const metaBusqueda = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [GEMINI_API_KEY], timeoutSeconds: 120 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }
    const uid = await autorizar(req, res)
    if (!uid) return
    const body = (req.body ?? {}) as { accion?: unknown; pregunta?: unknown; especialidad?: unknown; diagnostico?: unknown; directorio?: Partial<Record<keyof DirectorioMetaBusqueda, unknown>> }

    try {
      // Cupos que le quedan hoy (no gasta nada)
      if (body.accion === 'usos') {
        res.json(await usosRestantes(uid))
        return
      }

      // Directorio: leer o cambiar (solo admins)
      if (body.accion === 'directorio') {
        if (!(await esAdmin(uid))) {
          res.status(403).json({ error: 'Solo un administrador puede realizar esta acción' })
          return
        }
        if (body.directorio) {
          const dominios = limpiarLista(body.directorio.dominios, 50).filter(d => /^[a-z0-9.-]+$/.test(d))
          if (!dominios.length) {
            res.status(400).json({ error: 'Indica al menos un dominio permitido (por ejemplo, gob.pe)' })
            return
          }
          await getFirestore().collection('config').doc('metaBusqueda').set({
            dominios,
            sitiosPrioritarios: limpiarLista(body.directorio.sitiosPrioritarios, 30),
            palabrasClave: limpiarLista(body.directorio.palabrasClave, 30),
            actualizadoPor: uid,
            actualizadoEn: new Date().toISOString()
          })
          logger.info(`📒 Directorio de meta búsqueda actualizado por admin ${uid}`)
        }
        res.json(await leerDirectorio())
        return
      }

      const pregunta = typeof body.pregunta === 'string' ? body.pregunta.trim() : ''
      if (!pregunta) {
        res.status(400).json({ error: 'Falta la pregunta' })
        return
      }
      if (excede(pregunta, MAX_CARACTERES_MENSAJE)) {
        res.status(413).json({ error: 'La pregunta es demasiado larga' })
        return
      }
      const cupo = await consumirOpcion(uid, 'metaBusqueda')
      if (!cupo.permitido) {
        res.status(429).json({ error: `Alcanzaste el límite de ${cupo.limite} meta búsquedas por día. Vuelve a intentarlo mañana.` })
        return
      }

      const especialidad = typeof body.especialidad === 'string' && /^[a-z-]{3,40}$/.test(body.especialidad) ? body.especialidad : undefined
      const { diagnostico, ...resultado } = await metaBuscar(pregunta, especialidad, await leerDirectorio())
      logger.info(`🌐 Meta búsqueda (${diagnostico.modelo}, ${diagnostico.ms} ms): ${resultado.resumen.length} frases, ${resultado.fuentes.length} fuentes oficiales, ${resultado.descartadas} páginas descartadas`)
      const respuesta: ResultadoMetaBusqueda = {
        ...resultado,
        restantes: cupo.restantes,
        limite: cupo.limite,
        ...(body.diagnostico === true && await esAdmin(uid) ? { diagnostico } : {})
      }
      res.json(respuesta)
    } catch (err) {
      logger.error('❌ Error en meta búsqueda:', (err as Error).message)
      res.status(500).json({ error: 'No se pudo completar la meta búsqueda. Inténtalo de nuevo.' })
    }
  }
)
