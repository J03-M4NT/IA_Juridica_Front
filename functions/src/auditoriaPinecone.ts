// =========================
// AUDITORÍA DE PINECONE (fase 0 de la mejora de Consultas) — SOLO LECTURA
// Lee el índice "lexit" (namespace __default__) y devuelve un informe:
// configuración del índice, normas cargadas, cómo están cortadas,
// duplicados, campos presentes y ejemplos de registros. Además prueba el
// reranker de Pinecone con una consulta real (búsqueda normal vs.
// reordenada) e informa si funciona y sus límites.
// No escribe, no borra y no cambia nada en Pinecone ni en Firestore.
// Solo admins (verifica el ID token). La clave sigue siendo el secreto
// PINECONE_API_KEY de Firebase.
// =========================
import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { Pinecone } from '@pinecone-database/pinecone'
import { createHash } from 'crypto'
import { gzipSync } from 'zlib'
import { getStorage } from 'firebase-admin/storage'
import { ORIGENES_PERMITIDOS, autorizar } from './seguridad'
import { PINECONE_API_KEY, PINECONE_HOST, PINECONE_INDEX } from './consultarLexit'

const NAMESPACE = '__default__'
const MODELO_RERANK = 'bge-reranker-v2-m3'
const CONSULTA_POR_DEFECTO = '¿Cuáles son los requisitos de validez del acto jurídico?'
const CANDIDATOS_RERANK = 30
const TOP_RERANK = 8

type Meta = Record<string, unknown>

const txt = (v: unknown): string => (typeof v === 'string' ? v : '')

function percentil(valores: number[], p: number): number {
  if (valores.length === 0) return 0
  const orden = [...valores].sort((a, b) => a - b)
  return orden[Math.min(orden.length - 1, Math.floor((p / 100) * orden.length))] ?? 0
}

function mensajeDeError(err: unknown): string {
  const e = err as { message?: string; name?: string }
  return `${e.name ?? 'Error'}: ${e.message ?? String(err)}`
}

// Resumen corto de un resultado de búsqueda (para comparar órdenes)
function resumenHit(meta: Meta, score: number) {
  const texto = txt(meta.text)
  return {
    score: Number(score.toFixed(4)),
    norma: txt(meta.nombreDocumento),
    articulo: typeof meta.numeroArticulo === 'number' ? meta.numeroArticulo : null,
    esComentario: meta.esComentario === true,
    inicio: texto.slice(0, 160)
  }
}

export const auditarPinecone = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [PINECONE_API_KEY], timeoutSeconds: 540, memory: '1GiB' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }
    const uid = await autorizar(req, res, { soloAdmin: true })
    if (!uid) return

    const { consulta: consultaPedida, modo } = (req.body ?? {}) as { consulta?: unknown; modo?: unknown }
    const consulta = typeof consultaPedida === 'string' && consultaPedida.trim()
      ? consultaPedida.trim().slice(0, 300)
      : CONSULTA_POR_DEFECTO

    logger.info(`🔎 Auditoría de Pinecone (solo lectura) solicitada por admin ${uid}`)
    const inicio = Date.now()

    try {
      const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY.value() })
      const idx = pinecone.index(PINECONE_INDEX, PINECONE_HOST)

      // ===== 1. Configuración del índice =====
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const descripcion: any = await pinecone.describeIndex(PINECONE_INDEX).catch((e: unknown) => ({ error: mensajeDeError(e) }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const estadisticas: any = await idx.describeIndexStats()

      // ===== 2. Todos los IDs y metadatos del namespace por defecto =====
      const ids: string[] = []
      let token: string | undefined = undefined
      do {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pagina: any = await idx.listPaginated({ limit: 100, ...(token ? { paginationToken: token } : {}) })
        for (const v of (pagina.vectors ?? []) as { id?: string }[]) if (v.id) ids.push(v.id)
        token = pagina.pagination?.next
      } while (token)

      const metadatos = new Map<string, Meta>()
      for (let i = 0; i < ids.length; i += 100) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r: any = await idx.fetch({ ids: ids.slice(i, i + 100) })
        for (const [id, record] of Object.entries(r.records ?? {})) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadatos.set(id, ((record as any)?.metadata ?? {}) as Meta)
        }
      }

      // ===== RESPALDO (fase 4): IDs, metadatos y texto de __default__ en Storage =====
      // Solo lectura de Pinecone; el archivo queda en respaldos/pinecone/ y se
      // devuelve un enlace de descarga temporal (24 h).
      if (modo === 'respaldo') {
        const registros = ids.map(id => ({ id, metadata: metadatos.get(id) ?? {} }))
        const contenido = JSON.stringify({ generadoEn: new Date().toISOString(), indice: PINECONE_INDEX, namespace: NAMESPACE, total: registros.length, registros })
        const sha256 = createHash('sha256').update(contenido).digest('hex')
        const comprimido = gzipSync(Buffer.from(contenido, 'utf8'))
        const ruta = `respaldos/pinecone/${NAMESPACE}-${new Date().toISOString().replace(/[:.]/g, '-')}.json.gz`
        const archivo = getStorage().bucket().file(ruta)
        await archivo.save(comprimido, { contentType: 'application/gzip', metadata: { metadata: { registros: String(registros.length), sha256 } } })
        const [url] = await archivo.getSignedUrl({ action: 'read', expires: Date.now() + 24 * 60 * 60 * 1000 })
        logger.info(`💾 Respaldo de ${NAMESPACE}: ${registros.length} registros → ${ruta} (admin ${uid})`)
        res.json({ ruta, url, registros: registros.length, bytesJson: contenido.length, bytesGzip: comprimido.length, sha256 })
        return
      }

      // ===== 3. Análisis =====
      const camposPresentes: Record<string, number> = {}
      const longitudes: number[] = []
      const porHash = new Map<string, string[]>()
      const idsFueraDePatron: string[] = []
      let muyCortos = 0
      let largos = 0
      let continuaciones = 0
      let conDerogado = 0
      let articulosConLetra = 0

      interface ResumenDoc {
        documentoId: string
        nombre: string
        tipo: string
        area: string
        fragmentos: number
        articulosDistintos: number
        fragmentosConArticulo: number
        comentarios: number
        sinArticulo: number
        esFuentePrimaria: boolean
        fechaGuardado: string
        numerosRepetidos: number
      }
      const documentos = new Map<string, ResumenDoc & { _articulos: Map<number, number> }>()

      for (const id of ids) {
        const meta = metadatos.get(id) ?? {}
        for (const campo of Object.keys(meta)) camposPresentes[campo] = (camposPresentes[campo] ?? 0) + 1
        const texto = txt(meta.text)
        longitudes.push(texto.length)
        if (texto.length < 80) muyCortos++
        if (texto.length > 2000) largos++
        if (/\(continuaci[óo]n\)/i.test(texto)) continuaciones++
        if (/\bderogad[oa]\b/i.test(texto)) conDerogado++
        if (/Art[íi]culo\s+\d+\s*[°º]?\s*-\s*[A-Z]\s*\.\s*-/.test(texto)) articulosConLetra++

        const hash = createHash('sha1').update(texto.trim()).digest('hex')
        porHash.set(hash, [...(porHash.get(hash) ?? []), id])

        const separador = id.lastIndexOf('_chunk_')
        if (separador === -1) idsFueraDePatron.push(id)
        const documentoId = txt(meta.documentoId) || (separador === -1 ? id : id.slice(0, separador))
        const doc = documentos.get(documentoId) ?? {
          documentoId,
          nombre: txt(meta.nombreDocumento),
          tipo: txt(meta.tipoDocumento),
          area: txt(meta.area),
          fragmentos: 0,
          articulosDistintos: 0,
          fragmentosConArticulo: 0,
          comentarios: 0,
          sinArticulo: 0,
          esFuentePrimaria: meta.esFuentePrimaria === true,
          fechaGuardado: txt(meta.fechaGuardado),
          numerosRepetidos: 0,
          _articulos: new Map<number, number>()
        }
        doc.fragmentos++
        if (meta.esComentario === true) doc.comentarios++
        else if (typeof meta.numeroArticulo === 'number') {
          doc.fragmentosConArticulo++
          doc._articulos.set(meta.numeroArticulo, (doc._articulos.get(meta.numeroArticulo) ?? 0) + 1)
        } else doc.sinArticulo++
        const fecha = txt(meta.fechaGuardado)
        if (fecha && (!doc.fechaGuardado || fecha < doc.fechaGuardado)) doc.fechaGuardado = fecha
        documentos.set(documentoId, doc)
      }

      const listaDocumentos: ResumenDoc[] = [...documentos.values()].map(({ _articulos, ...d }) => ({
        ...d,
        articulosDistintos: _articulos.size,
        // Mismo número en varios fragmentos: artículos largos partidos o
        // 108 / 108-A / 108-B que comparten numeroArticulo
        numerosRepetidos: [..._articulos.values()].filter(n => n > 1).length
      })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

      // Duplicados: mismo texto en varios IDs, y misma norma subida varias veces
      const gruposDuplicados = [...porHash.values()].filter(g => g.length > 1)
      const copiasSobrantes = gruposDuplicados.reduce((s, g) => s + g.length - 1, 0)
      const porNombre = new Map<string, string[]>()
      for (const d of listaDocumentos) {
        const clave = d.nombre.trim().toLowerCase()
        porNombre.set(clave, [...(porNombre.get(clave) ?? []), d.documentoId])
      }
      const normasRepetidas = [...porNombre.entries()].filter(([, v]) => v.length > 1).map(([nombre, docs]) => ({ nombre, documentos: docs }))

      // Ejemplos: un artículo, una continuación, un comentario y un corte genérico
      const ejemplo = (pred: (m: Meta) => boolean) => {
        const id = ids.find(i => pred(metadatos.get(i) ?? {}))
        if (!id) return null
        const { text, ...resto } = metadatos.get(id) ?? {}
        return { id, metadatos: resto, texto: txt(text).slice(0, 600) }
      }
      const ejemplos = {
        articulo: ejemplo(m => typeof m.numeroArticulo === 'number' && !/\(continuaci/i.test(txt(m.text))),
        continuacion: ejemplo(m => /\(continuaci[óo]n\)/i.test(txt(m.text))),
        comentario: ejemplo(m => m.esComentario === true),
        corteGenerico: ejemplo(m => m.esFuentePrimaria !== true)
      }

      // ===== 4. Prueba del reranker con una consulta real =====
      const prueba: Record<string, unknown> = { consulta, modelo: MODELO_RERANK }

      // 4a. Búsqueda normal (como hoy, sin filtros) con más candidatos
      let candidatos: Array<{ meta: Meta; score: number }> = []
      try {
        const t0 = Date.now()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r: any = await idx.searchRecords({ query: { topK: CANDIDATOS_RERANK, inputs: { text: consulta } } })
        prueba.msBusqueda = Date.now() - t0
        candidatos = ((r?.result?.hits ?? []) as Array<{ _score?: number; fields?: Meta }>)
          .map(h => ({ meta: h.fields ?? {}, score: h._score ?? 0 }))
        prueba.sinReordenar = candidatos.slice(0, TOP_RERANK).map(c => resumenHit(c.meta, c.score))
      } catch (err) {
        prueba.errorBusqueda = mensajeDeError(err)
      }

      // 4b. Reranker como llamada aparte (inference.rerank)
      if (candidatos.length > 0) {
        try {
          const t0 = Date.now()
          const r = await pinecone.inference.rerank({
            model: MODELO_RERANK,
            query: consulta,
            documents: candidatos.map(c => txt(c.meta.text)),
            topN: TOP_RERANK,
            returnDocuments: false,
            parameters: { truncate: 'END' }
          })
          prueba.msRerank = Date.now() - t0
          prueba.rerankFunciona = true
          prueba.usoRerank = r.usage
          prueba.reordenado = r.data.map(d => {
            const c = candidatos[d.index]
            return { posicionOriginal: d.index + 1, ...resumenHit(c?.meta ?? {}, d.score) }
          })
        } catch (err) {
          prueba.rerankFunciona = false
          prueba.errorRerank = mensajeDeError(err)
        }
      }

      // 4c. Reranker integrado en la búsqueda (una sola llamada)
      try {
        const t0 = Date.now()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r: any = await idx.searchRecords({
          query: { topK: CANDIDATOS_RERANK, inputs: { text: consulta } },
          rerank: { model: MODELO_RERANK, rankFields: ['text'], topN: TOP_RERANK, parameters: { truncate: 'END' } }
        })
        prueba.msBusquedaConRerank = Date.now() - t0
        prueba.rerankIntegradoFunciona = true
        prueba.usoBusquedaConRerank = r?.usage
      } catch (err) {
        prueba.rerankIntegradoFunciona = false
        prueba.errorRerankIntegrado = mensajeDeError(err)
      }

      // 4d. Límites publicados del modelo (tokens por par, documentos por llamada)
      try {
        prueba.limitesModelo = await pinecone.inference.getModel(MODELO_RERANK)
      } catch (err) {
        prueba.errorLimitesModelo = mensajeDeError(err)
      }

      const informe = {
        generadoEn: new Date().toISOString(),
        segundos: Math.round((Date.now() - inicio) / 1000),
        soloLectura: true,
        indice: {
          nombre: PINECONE_INDEX,
          descripcion,
          estadisticas
        },
        namespaceAuditado: NAMESPACE,
        totales: {
          registros: ids.length,
          documentos: listaDocumentos.length,
          longitudTexto: {
            p50: percentil(longitudes, 50),
            p95: percentil(longitudes, 95),
            max: Math.max(0, ...longitudes)
          },
          muyCortosMenos80: muyCortos,
          largosMas2000: largos,
          continuaciones,
          conPalabraDerogado: conDerogado,
          articulosConLetra,
          idsFueraDePatron: idsFueraDePatron.slice(0, 20),
          camposPresentes
        },
        duplicados: {
          gruposDeTextoIdentico: gruposDuplicados.length,
          copiasSobrantes,
          ejemplosDeGrupos: gruposDuplicados.slice(0, 10),
          normasSubidasVariasVeces: normasRepetidas
        },
        documentos: listaDocumentos,
        ejemplos,
        pruebaReranker: prueba
      }

      logger.info(`✅ Auditoría: ${ids.length} registros, ${listaDocumentos.length} documentos, ${informe.segundos}s`)
      res.json(informe)
    } catch (err) {
      logger.error('❌ Error en auditarPinecone:', mensajeDeError(err))
      res.status(500).json({ error: mensajeDeError(err) })
    }
  }
)
