import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { defineSecret } from 'firebase-functions/params'
import { Pinecone } from '@pinecone-database/pinecone'
import * as logger from 'firebase-functions/logger'
import * as cheerio from 'cheerio'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { ORIGENES_PERMITIDOS, MAX_CARACTERES_MENSAJE, autorizar, consumirCuotaIA, excede } from './seguridad'

// Prueba de concepto aislada (edición quirúrgica de .docx) — ver
// editarDocxPoc.ts para el porqué de que viva en su propio archivo.
export { editarParrafoDocxPoc } from './editarDocxPoc'

// Orquestación del chat jurídico (saludo/Pinecone/guardrails/contrato
// adjunto) y las llamadas puntuales a Gemini que antes se hacían desde el
// navegador con la API key expuesta en el bundle — ver consultarLexit.ts
// y geminiTools.ts.
export { consultarLexit } from './consultarLexit'
export { generarSugerenciasContrato, modificarPlantillaIA, resumirNormasDelDiaIA, chatEdicionContratoIA } from './geminiTools'
export { obtenerUrlFirmadaDocumento } from './documentosTemporales'

if (getApps().length === 0) {
  initializeApp()
}

// ================================
// NORMAS DEL DÍA (El Peruano)
// ================================
const URL_NORMAS_EL_PERUANO = 'https://diariooficial.elperuano.pe/Normas/LoadNormasLegales?Length=0&X-Requested-With=XMLHttpRequest'

interface NormaDelDia {
  id: string
  sector: string
  titulo: string
  fecha: string
  sumilla: string
  urlDetalle: string
  urlPdf: string
}

function parsearNormasHTML(html: string): NormaDelDia[] {
  const $ = cheerio.load(html)
  const normas: NormaDelDia[] = []

  $('article.edicionesoficiales_articulos').each((_, el) => {
    const sector = $(el).find('h4').first().text().trim()

    const enlaceTitulo = $(el).find('h5 a').first()
    const titulo = enlaceTitulo.text().trim()
    const urlDetalle = enlaceTitulo.attr('href') ?? ''

    const idMatch = urlDetalle.match(/([A-Z0-9-]+)$/i)
    const id = idMatch?.[1] ?? urlDetalle

    const parrafos = $(el).find('.ediciones_texto p')
    const fecha = parrafos.eq(0).find('b').first().text().replace('Fecha:', '').trim()
    const sumilla = parrafos.eq(1).text().trim()

    const urlPdf = $(el).find('a.buttonaction')
      .filter((_, a) => $(a).text().trim().toLowerCase().includes('descarga individual'))
      .first()
      .attr('href') ?? ''

    if (titulo) {
      normas.push({ id, sector, titulo, fecha, sumilla, urlDetalle, urlPdf })
    }
  })

  return normas
}

async function obtenerYGuardarNormasDelDia(): Promise<{ fechaId: string; total: number }> {
  const response = await fetch(URL_NORMAS_EL_PERUANO, {
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'text/html',
      'User-Agent': 'Mozilla/5.0 (compatible; LexitAI-Bot/1.0)'
    }
  })

  if (!response.ok) {
    throw new Error(`El Peruano respondió ${response.status}`)
  }

  const html = await response.text()
  const normas = parsearNormasHTML(html)

  const fechaId = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // De madrugada El Peruano todavía no publicó la edición del día y
  // devuelve la lista vacía. Si se guardara, ese documento vacío pasaría
  // a ser "el más reciente" y la Biblioteca Legal se vería sin normas
  // hasta la mañana — mejor no tocar nada y seguir mostrando la anterior.
  if (normas.length === 0) {
    logger.info(`ℹ️ El Peruano aún no publica normas para ${fechaId}, se conserva la última edición`)
    return { fechaId, total: 0 }
  }

  const db = getFirestore()
  await db.collection('normas_diarias').doc(fechaId).set({
    fecha: fechaId,
    normas,
    actualizadoEn: new Date().toISOString()
  })

  logger.info(`✅ Guardadas ${normas.length} normas del ${fechaId}`)
  return { fechaId, total: normas.length }
}

// Corre sola cada 3 horas (hora Perú). El Peruano sigue publicando normas
// (incluyendo ediciones extraordinarias) a lo largo del día, así que una
// sola corrida diaria se quedaba desactualizada. No necesitas llamarla.
export const scrapearNormasDiarias = onSchedule(
  { schedule: '0 */3 * * *', timeZone: 'America/Lima' },
  async () => {
    try {
      await obtenerYGuardarNormasDelDia()
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en scrapearNormasDiarias:', error.message, error.stack)
    }
  }
)

// Si la última actualización fue hace menos que esto, el botón
// "Actualizar" devuelve lo guardado en vez de volver a scrapear — así
// nadie puede usar la función para bombardear El Peruano ni Firestore.
const ESPERA_MINIMA_SCRAPING_MS = 10 * 60 * 1000

// Versión manual (HTTP) — la usa el botón "Actualizar" de la Biblioteca
// Legal, disponible para cualquier usuario con sesión.
export const scrapearNormasDiariasManual = onRequest(
  { cors: ORIGENES_PERMITIDOS },
  async (req, res) => {
    const uid = await autorizar(req, res)
    if (!uid) return

    try {
      const fechaId = new Date().toISOString().slice(0, 10)
      const guardado = await getFirestore().collection('normas_diarias').doc(fechaId).get()
      const actualizadoEn = guardado.get('actualizadoEn') as string | undefined
      if (actualizadoEn && Date.now() - new Date(actualizadoEn).getTime() < ESPERA_MINIMA_SCRAPING_MS) {
        const normas = (guardado.get('normas') as unknown[] | undefined) ?? []
        res.json({ success: true, fechaId, total: normas.length, reciente: true })
        return
      }

      const resultado = await obtenerYGuardarNormasDelDia()
      res.json({ success: true, ...resultado })
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en scrapearNormasDiariasManual:', error.message, error.stack)
      res.status(500).json({ error: error.message })
    }
  }
)

// ================================
// RESOLVER LA URL REAL DEL PDF DE UNA NORMA
//
// El link que guardamos (urlPdf/urlDetalle) apunta a la página visor de
// El Peruano (busquedas.elperuano.pe/dispositivo/.../pdf) — un HTML con
// su logo y su UI, no el archivo en sí. Esa página carga el PDF real
// desde /api/archivo/file/{hash}/*/{id}.PDF, un endpoint que SÍ permite
// ser embebido (X-Frame-Options: ALLOWALL, confirmado). El hash no se
// puede derivar del ID de la norma — solo aparece en el HTML de esa
// página — así que hay que resolverlo pidiendo esa página una vez.
// Corre en el servidor para evitar CORS (busquedas.elperuano.pe no manda
// Access-Control-Allow-Origin, así que un fetch directo desde el
// navegador fallaría; un <iframe> apuntando al resultado si funciona,
// porque eso lo rige X-Frame-Options, no CORS).
// ================================
export const resolverUrlPdfNorma = onRequest(
  { cors: ORIGENES_PERMITIDOS, timeoutSeconds: 30 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const uid = await autorizar(req, res)
    if (!uid) return

    const { urlWrapper } = req.body as { urlWrapper?: string }
    if (!urlWrapper || !urlWrapper.startsWith('https://busquedas.elperuano.pe/')) {
      res.status(400).json({ error: 'urlWrapper inválida' })
      return
    }

    try {
      const respuesta = await fetch(urlWrapper, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LexitAI-Bot/1.0)' }
      })
      if (!respuesta.ok) {
        throw new Error(`El Peruano respondió ${respuesta.status}`)
      }
      const html = await respuesta.text()
      const match = /\/api\/archivo\/file\/[^"'\\ ]*/.exec(html)
      if (!match) {
        throw new Error('No se encontró la URL del archivo PDF en la página')
      }

      res.json({ urlPdf: `https://busquedas.elperuano.pe${match[0]}` })
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en resolverUrlPdfNorma:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)

const PINECONE_API_KEY = defineSecret('PINECONE_API_KEY')

const PINECONE_INDEX = 'lexit'
const PINECONE_HOST = 'https://lexit-rv6se0q.svc.aped-4627-b74a.pinecone.io'

interface PineconeRecord {
  id: string
  text: string
  documentoId?: unknown
  nombreDocumento?: unknown
  tipoDocumento?: unknown
  indiceChunk?: unknown
  fechaGuardado?: unknown
  numeroArticulo?: unknown
  esFuentePrimaria?: unknown
}

interface SearchRequest {
  query: string
  topK?: number
  tipoDocumento?: string
  soloFuentePrimaria?: boolean
}

// ================================
// UPSERT RECORDS (integrated embedding)
// ================================
export const upsertToPinecone = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [PINECONE_API_KEY] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    // Escribe en la base jurídica que la IA cita como ley — solo admins.
    const uid = await autorizar(req, res, { soloAdmin: true })
    if (!uid) return

    try {
      const pinecone = new Pinecone({
        apiKey: PINECONE_API_KEY.value()
      })

      const idx = pinecone.index(PINECONE_INDEX, PINECONE_HOST)
      const body = req.body as { records: PineconeRecord[] }
      const records = body.records

      if (!Array.isArray(records) || records.length === 0) {
        res.status(400).json({ error: 'records debe ser un array no vacío' })
        return
      }
      if (records.length > 100) {
        res.status(413).json({ error: 'Máximo 100 records por lote' })
        return
      }

      logger.info(`👤 Upsert solicitado por admin ${uid}`)

      logger.info(`Procesando ${records.length} records`)

      // El índice "lexit" tiene integrated embedding (field map: "text"),
      // así que Pinecone genera el vector automáticamente. No llamamos a
      // pinecone.inference.embed() ni construimos "values" a mano.
      const registros = records.map(record => ({
        id: record.id,
        text: record.text,
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        documentoId: String(record.documentoId ?? ''),
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        nombreDocumento: String(record.nombreDocumento ?? ''),
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        tipoDocumento: String(record.tipoDocumento ?? ''),
        indiceChunk: Number(record.indiceChunk ?? 0),
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        fechaGuardado: String(record.fechaGuardado ?? ''),
        esFuentePrimaria: Boolean(record.esFuentePrimaria ?? false),
        ...(record.numeroArticulo !== undefined
          ? { numeroArticulo: Number(record.numeroArticulo) }
          : {})
      }))

      await idx.upsertRecords({ records: registros })

      logger.info(`✅ Upsert exitoso: ${registros.length} registros`)
      res.json({ success: true, count: registros.length })

    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en upsert:', error.message, error.stack)
      res.status(500).json({ error: error.message })
    }
  }
)

// ================================
// ELIMINAR DOCUMENTO (todos sus chunks) POR documentoId
// Los índices serverless no soportan borrar por filtro de metadata de
// forma confiable, así que listamos los IDs por prefijo (los IDs siguen
// el patrón `${documentoId}_chunk_N`) y los borramos en lote.
// ================================
export const eliminarDocumentoDePinecone = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [PINECONE_API_KEY] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const uid = await autorizar(req, res, { soloAdmin: true })
    if (!uid) return

    try {
      const { documentoId } = req.body as { documentoId: string }
      logger.info(`👤 Eliminación de "${documentoId}" solicitada por admin ${uid}`)

      if (!documentoId) {
        res.status(400).json({ error: 'documentoId es requerido' })
        return
      }

      const pinecone = new Pinecone({
        apiKey: PINECONE_API_KEY.value()
      })

      const idx = pinecone.index(PINECONE_INDEX, PINECONE_HOST)
      const prefix = `${documentoId}_chunk_`

      let totalEliminados = 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let paginationToken: string | undefined = undefined
      let paginaNum = 0

      do {
        paginaNum++
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pagina: any = await idx.listPaginated({
          prefix,
          ...(paginationToken ? { paginationToken } : {})
        })

        // 🔍 LOG TEMPORAL DE DIAGNÓSTICO
        logger.info(`--- Página ${paginaNum} ---`)
        logger.info('Respuesta cruda de listPaginated:', JSON.stringify(pagina).slice(0, 800))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ids: string[] = (pagina.vectors ?? [])
          .map((v: { id?: string }) => v.id)
          .filter((id: string | undefined): id is string => !!id)

        logger.info(`IDs construidos (primeros 5): ${JSON.stringify(ids.slice(0, 5))}`)
        logger.info(`Total IDs en esta página: ${ids.length}`)

        if (ids.length > 0) {
          await idx.namespace('__default__').deleteMany({ ids })
          totalEliminados += ids.length
          logger.info(`🗑️ Eliminado lote de ${ids.length} (total: ${totalEliminados})`)
        }

        paginationToken = pagina.pagination?.next
      } while (paginationToken)

      logger.info(`✅ Documento "${documentoId}" eliminado: ${totalEliminados} registros`)
      res.json({ success: true, eliminados: totalEliminados })

    } catch (err) {
      const error = err as Error
      logger.error('❌ Error eliminando documento:', error.message, error.stack)
      res.status(500).json({ error: error.message })
    }
  }
)

// ================================
// ELIMINAR DUPLICADOS (por contenido de texto idéntico)
// Detecta registros con el mismo campo "text" (típicamente por haber
// subido el mismo documento más de una vez) y conserva solo uno de cada
// grupo. Usa dryRun:true para solo contar, sin borrar nada todavía.
// ================================
export const eliminarDuplicadosDePinecone = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [PINECONE_API_KEY], timeoutSeconds: 300 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const uid = await autorizar(req, res, { soloAdmin: true })
    if (!uid) return

    try {
      const { dryRun } = req.body as { dryRun?: boolean }
      logger.info(`👤 Limpieza de duplicados (dryRun=${String(dryRun)}) solicitada por admin ${uid}`)

      const pinecone = new Pinecone({
        apiKey: PINECONE_API_KEY.value()
      })

      const idx = pinecone.index(PINECONE_INDEX, PINECONE_HOST)

      // 1. Listar TODOS los IDs del índice (paginado, sin filtro de prefijo)
      const todosLosIds: string[] = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let paginationToken: string | undefined = undefined

      do {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pagina: any = await idx.listPaginated({
          limit: 100,
          ...(paginationToken ? { paginationToken } : {})
        })
        const ids: string[] = (pagina.vectors ?? [])
          .map((v: { id?: string }) => v.id)
          .filter((id: string | undefined): id is string => !!id)
        todosLosIds.push(...ids)
        paginationToken = pagina.pagination?.next
      } while (paginationToken)

      logger.info(`Total de IDs en el índice: ${todosLosIds.length}`)

      // 2. Traer el texto de cada uno en lotes, para agrupar por contenido
      const textoAIds = new Map<string, string[]>()
      const LOTE_FETCH = 100
      let primerLote = true

      for (let i = 0; i < todosLosIds.length; i += LOTE_FETCH) {
        const loteIds = todosLosIds.slice(i, i + LOTE_FETCH)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resultado: any = await idx.fetch({ ids: loteIds })

        if (primerLote) {
          // 🔍 Log de diagnóstico solo la primera vez, por si la forma de
          // la respuesta no es la esperada.
          logger.info('Forma cruda de fetch (primer lote):', JSON.stringify(resultado).slice(0, 500))
          primerLote = false
        }

        const records = resultado.records ?? {}

        for (const id of Object.keys(records)) {
          const texto = records[id]?.metadata?.text as string | undefined
          if (!texto) continue

          const lista = textoAIds.get(texto) ?? []
          lista.push(id)
          textoAIds.set(texto, lista)
        }
      }

      // 3. Detectar duplicados: mismo texto en más de un ID (se conserva
      // el primero, se marcan los demás para borrar)
      const idsABorrar: string[] = []
      let gruposConDuplicados = 0

      for (const ids of textoAIds.values()) {
        if (ids.length > 1) {
          gruposConDuplicados++
          idsABorrar.push(...ids.slice(1))
        }
      }

      logger.info(`Grupos con duplicados: ${gruposConDuplicados}, registros a eliminar: ${idsABorrar.length}`)

      if (dryRun) {
        res.json({
          success: true,
          dryRun: true,
          totalRegistros: todosLosIds.length,
          textosUnicos: textoAIds.size,
          gruposConDuplicados,
          duplicadosDetectados: idsABorrar.length
        })
        return
      }

      // 4. Borrar los duplicados en lotes
      let totalEliminados = 0
      const LOTE_DELETE = 100
      let primerLoteDelete = true

      for (let i = 0; i < idsABorrar.length; i += LOTE_DELETE) {
        const lote = idsABorrar.slice(i, i + LOTE_DELETE)

        if (primerLoteDelete) {
          logger.info(`🔍 Primer lote a borrar (${lote.length} ids): ${JSON.stringify(lote.slice(0, 5))}...`)
          logger.info(`🔍 Tipo de cada elemento: ${lote.slice(0, 3).map(x => typeof x).join(', ')}`)
          primerLoteDelete = false
        }

        try {
          await idx.namespace('__default__').deleteMany({ ids: lote })
        } catch (errLote) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const e = errLote as any
          logger.error(
            '🔍 Error COMPLETO en este lote:',
            JSON.stringify(e, Object.getOwnPropertyNames(e)).slice(0, 2000)
          )
          throw errLote
        }

        totalEliminados += lote.length
        logger.info(`🗑️ Eliminado lote de ${lote.length} duplicados (total: ${totalEliminados})`)
      }

      logger.info(`✅ Duplicados eliminados: ${totalEliminados}`)
      res.json({
        success: true,
        dryRun: false,
        totalRegistros: todosLosIds.length,
        textosUnicos: textoAIds.size,
        gruposConDuplicados,
        duplicadosEliminados: totalEliminados
      })

    } catch (err) {
      const error = err as Error
      logger.error('❌ Error eliminando duplicados:', error.message, error.stack)
      res.status(500).json({ error: error.message })
    }
  }
)

// ================================
// SEARCH RECORDS (integrated embedding)
// ================================
export const searchInPinecone = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [PINECONE_API_KEY] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const uid = await autorizar(req, res)
    if (!uid) return

    try {
      const { query, topK: topKPedido = 5, tipoDocumento, soloFuentePrimaria } = req.body as SearchRequest
      if (typeof query !== 'string' || !query.trim()) {
        res.status(400).json({ error: 'Falta query' })
        return
      }
      if (excede(query, MAX_CARACTERES_MENSAJE)) {
        res.status(413).json({ error: 'La búsqueda es demasiado larga' })
        return
      }
      if (!(await consumirCuotaIA(uid, res))) return

      const topK = Math.min(Math.max(Number(topKPedido) || 5, 1), 20)

      const pinecone = new Pinecone({
        apiKey: PINECONE_API_KEY.value()
      })

      const idx = pinecone.index(PINECONE_INDEX, PINECONE_HOST)

      const filtros: Record<string, unknown> = {}
      if (tipoDocumento) filtros.tipoDocumento = { $eq: tipoDocumento }
      if (soloFuentePrimaria) filtros.esFuentePrimaria = { $eq: true }

      const resultados = await idx.searchRecords({
        query: {
          topK,
          inputs: { text: query },
          ...(Object.keys(filtros).length > 0 ? { filter: filtros } : {})
        }
      })

      // La forma de la respuesta es resultados.result.hits[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawHits = (resultados as any)?.result?.hits ?? []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hits = rawHits.map((h: any) => ({
        _score: h._score,
        fields: {
          text: h.fields?.text ?? '',
          nombreDocumento: h.fields?.nombreDocumento ?? '',
          tipoDocumento: h.fields?.tipoDocumento ?? '',
          documentoId: h.fields?.documentoId ?? '',
          indiceChunk: h.fields?.indiceChunk ?? 0,
          numeroArticulo: h.fields?.numeroArticulo,
          esFuentePrimaria: h.fields?.esFuentePrimaria
        }
      }))

      logger.info(`🔍 Search: ${hits.length} resultados`)
      res.json({ hits })

    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en search:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)

// ================================
// ESTADÍSTICAS DEL ÍNDICE (panel Admin)
// Antes se consultaba desde el navegador con el SDK de Pinecone, lo que
// obligaba a meter la API key en el bundle público. Ahora la key solo
// vive aquí, como secreto de Firebase.
// ================================
export const estadisticasPinecone = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [PINECONE_API_KEY] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const uid = await autorizar(req, res, { soloAdmin: true })
    if (!uid) return

    try {
      const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY.value() })
      const idx = pinecone.index(PINECONE_INDEX, PINECONE_HOST)
      const stats = await idx.describeIndexStats()

      res.json({ conectado: true, totalVectores: stats.totalRecordCount ?? 0 })
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en estadisticasPinecone:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)

// ================================
// LISTAR DOCUMENTOS INDEXADOS (panel Admin)
// La lista antes vivía en el localStorage del navegador de quien subió
// cada PDF, así que cada admin solo veía lo suyo. Ahora se reconstruye
// desde el propio índice: los IDs siguen el patrón `${documentoId}_chunk_N`
// (ver guardarDocumentoEnPinecone), así que se agrupan por ese prefijo y
// se lee el nombre/tipo del primer chunk de cada documento.
// ================================
interface DocumentoIndexadoResumen {
  id: string
  nombre: string
  tipo: string
  chunks: number
}

export const listarDocumentosPinecone = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [PINECONE_API_KEY], timeoutSeconds: 120 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const uid = await autorizar(req, res, { soloAdmin: true })
    if (!uid) return

    try {
      const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY.value() })
      const idx = pinecone.index(PINECONE_INDEX, PINECONE_HOST)

      // 1. Todos los IDs, agrupados por documento
      const chunksPorDocumento = new Map<string, string[]>()
      let paginationToken: string | undefined = undefined
      do {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pagina: any = await idx.listPaginated({
          limit: 100,
          ...(paginationToken ? { paginationToken } : {})
        })
        for (const v of (pagina.vectors ?? []) as { id?: string }[]) {
          if (!v.id) continue
          const separador = v.id.lastIndexOf('_chunk_')
          const documentoId = separador === -1 ? v.id : v.id.slice(0, separador)
          const lista = chunksPorDocumento.get(documentoId) ?? []
          lista.push(v.id)
          chunksPorDocumento.set(documentoId, lista)
        }
        paginationToken = pagina.pagination?.next
      } while (paginationToken)

      // 2. Nombre y tipo, leídos de un chunk representativo por documento
      const representantes = [...chunksPorDocumento.values()].map(ids => ids[0]!)
      const metadatos = new Map<string, Record<string, unknown>>()
      for (let i = 0; i < representantes.length; i += 100) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resultado: any = await idx.fetch({ ids: representantes.slice(i, i + 100) })
        for (const [id, record] of Object.entries(resultado.records ?? {})) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadatos.set(id, ((record as any)?.metadata ?? {}) as Record<string, unknown>)
        }
      }

      const documentos: DocumentoIndexadoResumen[] = [...chunksPorDocumento.entries()]
        .map(([documentoId, ids]) => {
          const meta = metadatos.get(ids[0]!) ?? {}
          return {
            id: documentoId,
            nombre: typeof meta.nombreDocumento === 'string' && meta.nombreDocumento ? meta.nombreDocumento : documentoId,
            tipo: typeof meta.tipoDocumento === 'string' ? meta.tipoDocumento : '',
            chunks: ids.length
          }
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

      res.json({ documentos })
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en listarDocumentosPinecone:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)
