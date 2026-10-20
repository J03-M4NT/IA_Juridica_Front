// =========================
// NORMAS v2 (mejora de Consultas, fase 2): carga y búsqueda en un namespace
// APARTE del índice "lexit". Producción (namespace __default__) no se toca:
// estas funciones rechazan cualquier namespace que no esté en la lista.
// Solo admins (verifica el ID token). La clave sigue siendo el secreto
// PINECONE_API_KEY de Firebase.
//
// normasV2 (acciones):
//   estado    → IDs y hash de los fragmentos que ya tiene una norma
//   subir     → upsert de un lote (≤ 96) de registros validados
//   borrar    → borra fragmentos que ya no existen (solo de esa norma)
//   registrar → guarda el resumen de la norma en Firestore (normas_v2)
//   listar    → normas que hay en el namespace y cuántos fragmentos tiene cada una
//   vaciar    → quita TODOS los fragmentos de una norma del namespace indicado
//   config    → lee o cambia el interruptor de la búsqueda de Consultas
//   infoIndices → índices de la cuenta (dimensión, métrica, modelo) y límites del plan
//   crearIndiceE5 → crea el índice temporal lexit-e5 (multilingual-e5-large) si no existe
// Todas las acciones aceptan "indice" ('lexit' por defecto o 'lexit-e5').
// buscarNormasV2: búsqueda de prueba en el namespace (para la fase 3).
// =========================
import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { Pinecone } from '@pinecone-database/pinecone'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { ORIGENES_PERMITIDOS, autorizar } from './seguridad'
import { PINECONE_API_KEY } from './consultarLexit'
import { leerConfigBusqueda, guardarConfigBusqueda } from './configBusqueda'
import { INDICES, INDICE_POR_DEFECTO, type IndiceId, abrirIndice, esIndiceId } from './indicesPinecone'

if (getApps().length === 0) initializeApp()

// Únicos namespaces aceptados: el de prueba y el del esquema nuevo en
// producción. __default__ (la base actual) NO está aquí: no se puede tocar.
export const NAMESPACES_PERMITIDOS = ['normas-v2-prueba', 'normas-v2'] as const
type NamespaceV2 = typeof NAMESPACES_PERMITIDOS[number]

const COLECCION = 'normas_v2'
const MAX_LOTE = 96
const MAX_TEXTO = 6000
const ID_NORMA = /^[a-z0-9][a-z0-9-]{1,60}$/
const ID_REGISTRO = /^[a-z0-9][a-z0-9-]{1,60}#(?:art|nota)-[A-Za-z0-9-]{1,40}(?:#p\d{1,3})?$/

// Campos de metadatos aceptados y su tipo. Cualquier otro se rechaza.
const CAMPOS: Record<string, 'string' | 'number' | 'boolean'> = {
  normaId: 'string', norma: 'string', tipoNorma: 'string', numeroNorma: 'string',
  articulo: 'string', articuloNum: 'number', tituloArticulo: 'string', jerarquia: 'string',
  parte: 'number', totalPartes: 'number',
  vigencia: 'string', vigenciaOrigen: 'string', vigenciaNorma: 'string', vigenciaNormaOrigen: 'string', notasVigencia: 'string',
  fechaPublicacion: 'string', fechaNum: 'number', fuenteUrl: 'string', area: 'string',
  esComentario: 'boolean', tipoAnotacion: 'string', hashTexto: 'string', versionEsquema: 'number',
  documentoId: 'string', nombreDocumento: 'string', tipoDocumento: 'string', indiceChunk: 'number',
  numeroArticulo: 'number', esFuentePrimaria: 'boolean'
}
const VIGENCIAS = ['vigente', 'modificado', 'derogado']

function namespaceValido(valor: unknown): valor is NamespaceV2 {
  return typeof valor === 'string' && (NAMESPACES_PERMITIDOS as readonly string[]).includes(valor)
}

function errorDeRegistro(r: unknown, normaId: string): string | null {
  if (!r || typeof r !== 'object') return 'registro inválido'
  const reg = r as Record<string, unknown>
  if (typeof reg.id !== 'string' || !ID_REGISTRO.test(reg.id)) return `id inválido: ${String(reg.id).slice(0, 80)}`
  if (!reg.id.startsWith(`${normaId}#`)) return `el id ${reg.id} no es de la norma ${normaId}`
  if (typeof reg.text !== 'string' || !reg.text.trim() || reg.text.length > MAX_TEXTO) return `texto vacío o demasiado largo en ${reg.id}`
  if (reg.normaId !== normaId) return `normaId distinto en ${reg.id}`
  if (reg.versionEsquema !== 2) return `versionEsquema debe ser 2 en ${reg.id}`
  if (!VIGENCIAS.includes(String(reg.vigencia)) || !VIGENCIAS.includes(String(reg.vigenciaNorma))) return `vigencia inválida en ${reg.id}`
  if (reg.vigenciaOrigen !== 'detectada' && reg.vigenciaOrigen !== 'verificada') return `vigenciaOrigen inválida en ${reg.id}`
  for (const [campo, valor] of Object.entries(reg)) {
    if (campo === 'id' || campo === 'text') continue
    const tipo = CAMPOS[campo]
    if (!tipo) return `campo no permitido "${campo}" en ${reg.id}`
    if (typeof valor !== tipo) return `campo "${campo}" debe ser ${tipo} en ${reg.id}`
    if (typeof valor === 'string' && valor.length > 1200) return `campo "${campo}" demasiado largo en ${reg.id}`
  }
  return null
}

// Nube y región de un índice serverless (el tipo del SDK también admite BYOC)
const serverless = (spec: unknown) => (spec as { serverless?: { cloud?: string; region?: string } } | undefined)?.serverless

async function indice(ns: NamespaceV2, id: IndiceId = INDICE_POR_DEFECTO) {
  const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY.value() })
  return (await abrirIndice(pinecone, id)).namespace(ns)
}

// Documento del catálogo normas_v2: el índice de siempre conserva su ID de antes
export const idCatalogo = (id: IndiceId, ns: string, normaId: string) =>
  id === INDICE_POR_DEFECTO ? `${ns}__${normaId}` : `${id}__${ns}__${normaId}`

async function idsDeNorma(idx: Awaited<ReturnType<typeof indice>>, normaId: string): Promise<string[]> {
  const ids: string[] = []
  let token: string | undefined = undefined
  do {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pagina: any = await idx.listPaginated({ prefix: `${normaId}#`, limit: 100, ...(token ? { paginationToken: token } : {}) })
    for (const v of (pagina.vectors ?? []) as { id?: string }[]) if (v.id) ids.push(v.id)
    token = pagina.pagination?.next
  } while (token)
  return ids
}

export const normasV2 = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [PINECONE_API_KEY], timeoutSeconds: 300 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }
    const uid = await autorizar(req, res, { soloAdmin: true })
    if (!uid) return

    const body = (req.body ?? {}) as {
      accion?: unknown; namespace?: unknown; normaId?: unknown; registros?: unknown; ids?: unknown; resumen?: unknown
      modo?: unknown; indice?: unknown; umbralRerank?: unknown; umbralDenso?: unknown
    }
    if (body.indice !== undefined && !esIndiceId(body.indice)) {
      res.status(400).json({ error: `Índice no permitido. Solo: ${Object.keys(INDICES).join(', ')}` })
      return
    }
    const indiceId: IndiceId = esIndiceId(body.indice) ? body.indice : INDICE_POR_DEFECTO

    // Interruptor de Consultas: leer o cambiar (modo, índice, umbrales)
    if (body.accion === 'config') {
      try {
        const hayCambios = body.modo !== undefined || body.indice !== undefined || body.umbralRerank !== undefined || body.umbralDenso !== undefined
        if (!hayCambios) {
          res.json(await leerConfigBusqueda())
          return
        }
        if ((body.modo !== undefined && body.modo !== 'actual' && body.modo !== 'v2') || (body.namespace !== undefined && !namespaceValido(body.namespace))) {
          res.status(400).json({ error: 'modo debe ser "actual" o "v2" y el namespace uno permitido' })
          return
        }
        const umbral = (v: unknown) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : undefined)
        await guardarConfigBusqueda({
          ...(body.modo === 'actual' || body.modo === 'v2' ? { modo: body.modo } : {}),
          ...(esIndiceId(body.indice) ? { indice: body.indice } : {}),
          ...(namespaceValido(body.namespace) ? { namespace: body.namespace } : {}),
          ...(umbral(body.umbralRerank) !== undefined ? { umbralRerank: umbral(body.umbralRerank)! } : {}),
          ...(umbral(body.umbralDenso) !== undefined ? { umbralDenso: umbral(body.umbralDenso)! } : {})
        }, uid)
        const config = await leerConfigBusqueda()
        logger.info(`🔀 Búsqueda de Consultas → ${JSON.stringify(config)} por admin ${uid}`)
        res.json(config)
      } catch (err) {
        res.status(500).json({ error: (err as Error).message })
      }
      return
    }

    // Índices de la cuenta: dimensión, métrica y modelo de cada uno
    if (body.accion === 'infoIndices') {
      try {
        const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY.value() })
        const lista = await pinecone.listIndexes()
        const indices = (lista.indexes ?? []).map(i => ({
          nombre: i.name, dimension: i.dimension, metrica: i.metric, estado: i.status?.state,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          modelo: (i as any).embed?.model ?? null, nube: serverless(i.spec)?.cloud ?? null, region: serverless(i.spec)?.region ?? null
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e5: any = await pinecone.inference.getModel(INDICES['lexit-e5'].modelo).catch((e: unknown) => ({ error: (e as Error).message }))
        res.json({ indices, modeloE5: e5 })
      } catch (err) {
        res.status(500).json({ error: (err as Error).message })
      }
      return
    }

    // Crea el índice temporal lexit-e5 (no toca ningún otro índice)
    if (body.accion === 'crearIndiceE5') {
      try {
        const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY.value() })
        const existentes = (await pinecone.listIndexes()).indexes ?? []
        if (existentes.some(i => i.name === INDICES['lexit-e5'].nombre)) {
          res.json({ creado: false, mensaje: 'El índice lexit-e5 ya existe' })
          return
        }
        // Misma nube y región que el índice de siempre (las del plan gratuito)
        const actual = await pinecone.describeIndex(INDICES.lexit.nombre)
        await pinecone.createIndexForModel({
          name: INDICES['lexit-e5'].nombre,
          cloud: serverless(actual.spec)?.cloud ?? 'aws',
          region: serverless(actual.spec)?.region ?? 'us-east-1',
          embed: { model: INDICES['lexit-e5'].modelo, fieldMap: { text: 'text' } },
          waitUntilReady: true
        })
        const creado = await pinecone.describeIndex(INDICES['lexit-e5'].nombre)
        logger.info(`🆕 Índice lexit-e5 creado por admin ${uid}`)
        res.json({ creado: true, nombre: creado.name, dimension: creado.dimension, metrica: creado.metric, estado: creado.status?.state })
      } catch (err) {
        logger.error('❌ Error creando lexit-e5:', (err as Error).message)
        res.status(500).json({ error: (err as Error).message })
      }
      return
    }
    if (!namespaceValido(body.namespace)) {
      res.status(400).json({ error: `Namespace no permitido. Solo: ${NAMESPACES_PERMITIDOS.join(', ')}` })
      return
    }
    const ns = body.namespace

    // listar no necesita normaId: agrupa los IDs del namespace por norma ("{normaId}#...")
    if (body.accion === 'listar') {
      try {
        const idx = await indice(ns, indiceId)
        const conteo = new Map<string, number>()
        let token: string | undefined = undefined
        do {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pagina: any = await idx.listPaginated({ limit: 100, ...(token ? { paginationToken: token } : {}) })
          for (const v of (pagina.vectors ?? []) as { id?: string }[]) {
            const norma = v.id?.split('#')[0]
            if (norma) conteo.set(norma, (conteo.get(norma) ?? 0) + 1)
          }
          token = pagina.pagination?.next
        } while (token)
        res.json({ normas: [...conteo.entries()].map(([id, fragmentos]) => ({ normaId: id, fragmentos })).sort((a, b) => a.normaId.localeCompare(b.normaId)) })
      } catch (err) {
        logger.error('❌ Error listando normasV2:', (err as Error).message)
        res.status(500).json({ error: (err as Error).message })
      }
      return
    }

    if (typeof body.normaId !== 'string' || !ID_NORMA.test(body.normaId)) {
      res.status(400).json({ error: 'normaId inválido' })
      return
    }
    const normaId = body.normaId

    try {
      const idx = await indice(ns, indiceId)

      if (body.accion === 'estado') {
        const ids = await idsDeNorma(idx, normaId)
        const hashes: Record<string, string> = {}
        for (let i = 0; i < ids.length; i += 100) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r: any = await idx.fetch({ ids: ids.slice(i, i + 100) })
          for (const [id, record] of Object.entries(r.records ?? {})) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hash = (record as any)?.metadata?.hashTexto
            hashes[id] = typeof hash === 'string' ? hash : ''
          }
        }
        res.json({ ids, hashes })
        return
      }

      if (body.accion === 'subir') {
        const registros = body.registros
        if (!Array.isArray(registros) || registros.length === 0 || registros.length > MAX_LOTE) {
          res.status(400).json({ error: `registros debe tener entre 1 y ${MAX_LOTE} elementos` })
          return
        }
        for (const r of registros) {
          const error = errorDeRegistro(r, normaId)
          if (error) {
            res.status(400).json({ error })
            return
          }
        }
        // El índice tiene embedding integrado (field map "text"): Pinecone genera el vector
        await idx.upsertRecords({ records: registros as Array<{ id: string; text: string } & Record<string, string | number | boolean>> })
        logger.info(`📥 normasV2 ${indiceId}/${ns}: ${registros.length} registros de ${normaId} (admin ${uid})`)
        res.json({ success: true, count: registros.length })
        return
      }

      if (body.accion === 'borrar') {
        const ids = body.ids
        if (!Array.isArray(ids) || ids.length === 0 || ids.length > 1000 || !ids.every(id => typeof id === 'string' && id.startsWith(`${normaId}#`))) {
          res.status(400).json({ error: 'ids inválidos: deben ser de la misma norma (máximo 1000)' })
          return
        }
        for (let i = 0; i < ids.length; i += 100) await idx.deleteMany({ ids: (ids as string[]).slice(i, i + 100) })
        logger.info(`🗑️ normasV2 ${ns}: ${ids.length} fragmentos obsoletos de ${normaId} (admin ${uid})`)
        res.json({ success: true, eliminados: ids.length })
        return
      }

      if (body.accion === 'vaciar') {
        const ids = await idsDeNorma(idx, normaId)
        for (let i = 0; i < ids.length; i += 100) await idx.deleteMany({ ids: ids.slice(i, i + 100) })
        await getFirestore().collection(COLECCION).doc(idCatalogo(indiceId, ns, normaId)).delete()
        logger.info(`🗑️ normasV2 ${ns}: norma ${normaId} vaciada (${ids.length} fragmentos, admin ${uid})`)
        res.json({ success: true, eliminados: ids.length })
        return
      }

      if (body.accion === 'registrar') {
        const r = (body.resumen ?? {}) as Record<string, unknown>
        const texto = (v: unknown, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '')
        await getFirestore().collection(COLECCION).doc(idCatalogo(indiceId, ns, normaId)).set({
          indice: indiceId,
          namespace: ns,
          normaId,
          norma: texto(r.norma),
          tipoNorma: texto(r.tipoNorma, 40),
          numeroNorma: texto(r.numeroNorma, 60),
          vigencia: texto(r.vigencia, 20),
          area: texto(r.area, 40),
          fechaPublicacion: texto(r.fechaPublicacion, 10),
          fuenteUrl: texto(r.fuenteUrl, 500),
          archivo: texto(r.archivo, 200),
          hashDocumento: texto(r.hashDocumento, 40),
          fragmentos: typeof r.fragmentos === 'number' ? r.fragmentos : 0,
          articulos: typeof r.articulos === 'number' ? r.articulos : 0,
          versionEsquema: 2,
          cargadoPor: uid,
          actualizadoEn: FieldValue.serverTimestamp()
        })
        res.json({ success: true })
        return
      }

      res.status(400).json({ error: 'acción inválida (estado, subir, borrar, registrar, listar o vaciar)' })
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en normasV2:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)

// Búsqueda de prueba en el namespace v2 (fase 3). Con rerank opcional.
export const buscarNormasV2 = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [PINECONE_API_KEY] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }
    const uid = await autorizar(req, res, { soloAdmin: true })
    if (!uid) return

    const { namespace, query, topK, filtro, rerank, indice: indicePedido } = (req.body ?? {}) as { namespace?: unknown; query?: unknown; topK?: unknown; filtro?: unknown; rerank?: unknown; indice?: unknown }
    if (!namespaceValido(namespace)) {
      res.status(400).json({ error: `Namespace no permitido. Solo: ${NAMESPACES_PERMITIDOS.join(', ')}` })
      return
    }
    if (typeof query !== 'string' || !query.trim() || query.length > 1000) {
      res.status(400).json({ error: 'query inválida' })
      return
    }
    const k = Math.min(Math.max(Number(topK) || 10, 1), 50)
    try {
      const idx = await indice(namespace, esIndiceId(indicePedido) ? indicePedido : INDICE_POR_DEFECTO)
      const conRerank = rerank === true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await idx.searchRecords({
        query: { topK: conRerank ? Math.max(k, 30) : k, inputs: { text: query }, ...(filtro && typeof filtro === 'object' ? { filter: filtro as Record<string, unknown> } : {}) },
        ...(conRerank ? { rerank: { model: 'bge-reranker-v2-m3', rankFields: ['text'], topN: k, parameters: { truncate: 'END' } } } : {})
      })
      res.json({ hits: r?.result?.hits ?? [], usage: r?.usage ?? null })
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en buscarNormasV2:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)
