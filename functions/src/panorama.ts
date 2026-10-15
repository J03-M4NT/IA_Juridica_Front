import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import * as cheerio from 'cheerio'
import { getFirestore } from 'firebase-admin/firestore'
import { ORIGENES_PERMITIDOS, autorizar } from './seguridad'

// =========================
// PANORAMA DEL DÍA
// Reúne en un solo panel la información pública del día (también la BVL:
// índices y monto negociado):
//  - BCRP: tipo de cambio (dólar y euro) y tasa de referencia (API oficial).
//  - SMV: hechos de importancia del día (página pública).
//  - Congreso: proyectos de ley del Senado y de la Cámara de Diputados
//    (API pública del portal SPLEY).
//  - El Peruano: normas del día y resoluciones de la SBS (de lo que ya
//    guarda el scraping de Normas). El portal de la SBS bloquea la lectura
//    automática, por eso sus resoluciones se toman de El Peruano.
// Se arma en el servidor (los portales no permiten consultarlos desde el
// navegador), se guarda por día en Firestore (panorama_diario) y se
// reutiliza: como máximo se vuelve a leer una vez por hora. No usa IA.
// =========================

const COLECCION = 'panorama_diario'
const VIGENCIA_MS = 60 * 60 * 1000
const TIMEOUT_FUENTE_MS = 20_000
const UA = 'Mozilla/5.0 (compatible; LexitAI-Bot/1.0; +https://j03-m4nt.github.io)'

const fechaPeru = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

async function pedir(url: string, init: RequestInit = {}): Promise<Response> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), TIMEOUT_FUENTE_MS)
  try {
    const r = await fetch(url, { ...init, signal: ac.signal, headers: { 'User-Agent': UA, ...(init.headers ?? {}) } })
    if (!r.ok) throw new Error(`${url} respondió ${r.status}`)
    return r
  } finally {
    clearTimeout(t)
  }
}

// ======================= BCRP =======================
interface PuntoSerie { fecha: string; valor: number }

const MESES: Record<string, string> = {
  Ene: '01', Jan: '01', Feb: '02', Mar: '03', Abr: '04', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Ago: '08', Aug: '08', Sep: '09', Set: '09', Oct: '10', Nov: '11', Dic: '12', Dec: '12'
}

// "14.Oct.26" → "2026-10-14"
function fechaBcrp(nombre: string): string | null {
  const m = /^(\d{1,2})\.([A-Za-z]{3})\.(\d{2})$/.exec(nombre.trim())
  const mes = m?.[2] ? MESES[m[2]] : undefined
  return m?.[1] && m[3] && mes ? `20${m[3]}-${mes}-${m[1].padStart(2, '0')}` : null
}

async function serieBcrp(codigos: string[], desde: string, hasta: string): Promise<PuntoSerie[][]> {
  const r = await pedir(`https://estadisticas.bcrp.gob.pe/estadisticas/series/api/${codigos.join('-')}/json/${desde}/${hasta}`)
  const datos = await r.json() as { periods?: { name: string; values: string[] }[] }
  const series: PuntoSerie[][] = codigos.map(() => [])
  for (const p of datos.periods ?? []) {
    const fecha = fechaBcrp(p.name)
    if (!fecha) continue
    p.values.forEach((v, i) => {
      const valor = Number(v)
      if (v !== 'n.d.' && Number.isFinite(valor)) series[i]?.push({ fecha, valor })
    })
  }
  return series
}

function ultimoYAnterior(serie: PuntoSerie[]): { valor: number; fecha: string; anterior: number | null } | null {
  const ultimo = serie[serie.length - 1]
  if (!ultimo) return null
  return { valor: ultimo.valor, fecha: ultimo.fecha, anterior: serie[serie.length - 2]?.valor ?? null }
}

async function leerBcrp() {
  const hoy = new Date()
  const hace = new Date(hoy.getTime() - 45 * 24 * 3600 * 1000)
  const desde = fechaPeru(hace)
  const hasta = fechaPeru(hoy)
  const [[usdCompra = [], usdVenta = [], eurVenta = []], [referencia = []]] = await Promise.all([
    serieBcrp(['PD04639PD', 'PD04640PD', 'PD04648PD'], desde, hasta),
    serieBcrp(['PD12301MD'], desde, hasta)
  ])
  return {
    dolarCompra: ultimoYAnterior(usdCompra),
    dolarVenta: ultimoYAnterior(usdVenta),
    euroVenta: ultimoYAnterior(eurVenta),
    tasaReferencia: ultimoYAnterior(referencia),
    historicoDolar: usdVenta.slice(-30)
  }
}

// ======================= SMV =======================
interface HechoSmv {
  empresa: string
  expediente: string
  tipo: string
  sector: string
  descripcion: string
  hora: string
  documentos: string[]
}

async function leerSmv(): Promise<HechoSmv[]> {
  const r = await pedir('https://www.smv.gob.pe/simv/Frm_hechosdeImportanciaDia?data=38C2EC33FA106691BB5B5039DACFDF50795D8EC3AF')
  const bytes = new Uint8Array(await r.arrayBuffer())
  let html = new TextDecoder('utf-8').decode(bytes)
  if (html.includes('�')) html = new TextDecoder('latin1').decode(bytes)
  const $ = cheerio.load(html)
  const limpio = (t: string) => t.replace(/\s+/g, ' ').trim()
  const hechos: HechoSmv[] = []

  $('#MainContent_grdHechosImportancia2 > tbody > tr, #MainContent_grdHechosImportancia2 > tr').each((_, fila) => {
    const empresa = limpio($(fila).find('.titulo-empresa-azul').first().text())
    if (!empresa) return
    $(fila).find('.card-body').each((__, tarjeta) => {
      const t = $(tarjeta)
      const expedienteTexto = limpio(t.find('p.text-blue').first().text())
      const hora = /(\d{2}:\d{2})/.exec(expedienteTexto)?.[1] ?? ''
      const sectorPartes = t.find('.form-group strong').map((___, el) => limpio($(el).text()).replace(/^\|\s*/, '')).get()
      hechos.push({
        empresa,
        expediente: expedienteTexto.replace(/\s+DEL\s+.*$/i, ''),
        tipo: limpio(t.find('.card-title').first().text()),
        sector: sectorPartes.filter(Boolean).join(' · '),
        descripcion: limpio(t.find('p.card-text').first().text()),
        hora,
        documentos: t.find('a[href*="documento.aspx"]').map((___, a) => $(a).attr('href') ?? '').get().filter(Boolean).slice(0, 3)
      })
    })
  })
  return hechos.slice(0, 200)
}

// ======================= CONGRESO =======================
interface ProyectoLey {
  numero: string
  titulo: string
  estado: string
  fecha: string
  proponente: string
  autores: string
  enlace: string
}

const PERIODO_ACTUAL = 2026

async function leerCongreso(camara: 'S' | 'D'): Promise<{ total: number; proyectos: ProyectoLey[] }> {
  const r = await pedir('https://api.congreso.gob.pe/spley-portal-service/proyecto-ley/lista-con-filtro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://wb2server.congreso.gob.pe' },
    body: JSON.stringify({ perParId: PERIODO_ACTUAL, perLegId: null, codTipoParl: camara, pageSize: 60, rowStart: 0 })
  })
  const datos = await r.json() as { data?: { proyectos?: Record<string, unknown>[] } }
  const crudos = datos.data?.proyectos ?? []
  const txt = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '')
  const proyectos = crudos.map(p => ({
    numero: txt(p.proyectoLey),
    titulo: txt(p.titulo).replace(/\s+/g, ' ').trim(),
    estado: txt(p.desEstado),
    fecha: txt(p.fecPresentacion).slice(0, 10),
    proponente: txt(p.desProponente),
    autores: txt(p.autores).slice(0, 300),
    enlace: `https://wb2server.congreso.gob.pe/spley-portal/#/expediente/${txt(p.perParId) || PERIODO_ACTUAL}/${txt(p.pleyNum)}`
  })).filter(p => p.numero && p.titulo)
  return { total: Number(crudos[0]?.rowsTotal ?? proyectos.length), proyectos }
}

// ======================= BVL (datos abiertos del mercado) =======================
// Índices y monto negociado del día (API pública de la BVL). Las "Noticias
// emisores" de su web no tienen una API pública: se muestran los
// comunicados de las empresas emisoras que publica la SMV (misma fuente).
interface IndiceBvl { nombre: string; valor: number; variacion: number; fecha: string }

async function leerBvl() {
  const opciones = { headers: { Origin: 'https://www.bvl.com.pe', Referer: 'https://www.bvl.com.pe/' } }
  const [indicesR, resumenR] = await Promise.all([
    pedir('https://dataondemand.bvl.com.pe/v1/indices', opciones),
    pedir('https://dataondemand.bvl.com.pe/v1/market-summary', opciones)
  ])
  const indicesJson = await indicesR.json() as { up?: number; down?: number; content?: Record<string, unknown>[] }
  const resumenJson = await resumenR.json() as { tradingMechanisms?: Record<string, unknown>[] }
  const numero = (v: unknown) => {
    const n = typeof v === 'number' ? v : Number(String(typeof v === 'string' ? v : '').replace(/,/g, ''))
    return Number.isFinite(n) ? n : 0
  }
  const indices: IndiceBvl[] = (indicesJson.content ?? []).map(c => ({
    nombre: typeof c.name === 'string' ? c.name : '',
    valor: numero(c.value),
    variacion: numero(c.variation),
    fecha: typeof c.date === 'string' ? c.date.slice(0, 16) : ''
  })).filter(i => i.nombre)
  const mecanismo = (nombre: string) => (resumenJson.tradingMechanisms ?? []).find(t => t.tradingMechanism === nombre)
  const total = mecanismo('TOTAL MERCADO')
  const acciones = mecanismo('Acciones')
  return {
    indices,
    suben: indicesJson.up ?? 0,
    bajan: indicesJson.down ?? 0,
    montoSoles: numero(total?.amountSoles),
    montoDolares: numero(total?.amountDollars),
    operaciones: numero(total?.numberOperations),
    montoAccionesSoles: numero(acciones?.amountSoles)
  }
}

// ======================= EL PERUANO (normas ya guardadas) =======================
interface NormaResumen { titulo: string; sector: string; sumilla: string; urlPdf: string }

async function leerElPeruano() {
  const snap = await getFirestore().collection('normas_diarias').orderBy('fecha', 'desc').limit(4).get()
  const ediciones = snap.docs
    .map(d => d.data() as { fecha: string; normas?: (NormaResumen & Record<string, unknown>)[] })
    .filter(e => (e.normas?.length ?? 0) > 0)
  const ultima = ediciones[0]
  const anterior = ediciones[1]
  const esSbs = (n: NormaResumen) => /banca,?\s*seguros|\bSBS\b/i.test(`${n.sector} ${n.titulo}`)
  const resumir = (n: NormaResumen): NormaResumen => ({ titulo: n.titulo, sector: n.sector, sumilla: n.sumilla, urlPdf: n.urlPdf })
  return {
    fecha: ultima?.fecha ?? null,
    total: ultima?.normas?.length ?? 0,
    totalAnterior: anterior?.normas?.length ?? null,
    sbs: (ultima?.normas ?? []).filter(esSbs).map(resumir),
    sbsAnterior: anterior ? (anterior.normas ?? []).filter(esSbs).length : null
  }
}

// ======================= ARMADO Y CACHÉ =======================
async function conRespaldo<T>(nombre: string, leer: () => Promise<T>, previo: T | undefined): Promise<{ valor: T | null; error: boolean }> {
  try {
    return { valor: await leer(), error: false }
  } catch (err) {
    logger.warn(`⚠️ Panorama: no se pudo leer ${nombre}:`, (err as Error).message)
    return { valor: previo ?? null, error: true }
  }
}

type Panorama = {
  fecha: string
  actualizadoEn: string
  bcrp: Awaited<ReturnType<typeof leerBcrp>> | null
  smv: HechoSmv[] | null
  senado: Awaited<ReturnType<typeof leerCongreso>> | null
  diputados: Awaited<ReturnType<typeof leerCongreso>> | null
  elPeruano: Awaited<ReturnType<typeof leerElPeruano>> | null
  bvl?: Awaited<ReturnType<typeof leerBvl>> | null
  fuentesConError: string[]
}

async function armarPanorama(fecha: string, previo: Panorama | undefined): Promise<Panorama> {
  const [bcrp, smv, senado, diputados, elPeruano, bvl] = await Promise.all([
    conRespaldo('BCRP', leerBcrp, previo?.bcrp ?? undefined),
    conRespaldo('SMV', leerSmv, previo?.smv ?? undefined),
    conRespaldo('Senado', () => leerCongreso('S'), previo?.senado ?? undefined),
    conRespaldo('Diputados', () => leerCongreso('D'), previo?.diputados ?? undefined),
    conRespaldo('El Peruano', leerElPeruano, previo?.elPeruano ?? undefined),
    conRespaldo('BVL', leerBvl, previo?.bvl ?? undefined)
  ])
  const fuentesConError = [
    bcrp.error && 'BCRP', smv.error && 'SMV', senado.error && 'Senado',
    diputados.error && 'Diputados', elPeruano.error && 'El Peruano', bvl.error && 'BVL'
  ].filter((x): x is string => Boolean(x))
  return {
    fecha,
    actualizadoEn: new Date().toISOString(),
    bcrp: bcrp.valor,
    smv: smv.valor,
    senado: senado.valor,
    diputados: diputados.valor,
    elPeruano: elPeruano.valor,
    bvl: bvl.valor,
    fuentesConError
  }
}

export const obtenerPanoramaDia = onRequest(
  { cors: ORIGENES_PERMITIDOS, timeoutSeconds: 90 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }
    const uid = await autorizar(req, res)
    if (!uid) return

    try {
      const db = getFirestore()
      const hoy = fechaPeru()
      const ref = db.collection(COLECCION).doc(hoy)
      const guardado = (await ref.get()).data() as Panorama | undefined
      const forzar = (req.body as { actualizar?: unknown })?.actualizar === true

      let panorama = guardado
      const vencido = !guardado || Date.now() - new Date(guardado.actualizadoEn).getTime() > VIGENCIA_MS
      // "Actualizar" a mano: como máximo una vez cada 5 minutos
      const puedeForzar = guardado ? Date.now() - new Date(guardado.actualizadoEn).getTime() > 5 * 60 * 1000 : true
      if (vencido || (forzar && puedeForzar)) {
        panorama = await armarPanorama(hoy, guardado)
        await ref.set(panorama)
      }

      // El día anterior con datos, para comparar (cantidad de hechos SMV y de proyectos)
      const anteriores = await db.collection(COLECCION).where('fecha', '<', hoy).orderBy('fecha', 'desc').limit(1).get()
      const anterior = anteriores.docs[0]?.data() as Panorama | undefined

      res.json({
        ...panorama,
        anterior: anterior
          ? {
              fecha: anterior.fecha,
              smv: anterior.smv?.length ?? null,
              senado: anterior.senado?.total ?? null,
              diputados: anterior.diputados?.total ?? null
            }
          : null
      })
    } catch (err) {
      logger.error('❌ Error en obtenerPanoramaDia:', (err as Error).message)
      res.status(500).json({ error: 'No se pudo cargar el panorama del día. Intenta de nuevo.' })
    }
  }
)
