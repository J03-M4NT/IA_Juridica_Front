// Todo acceso a Pinecone pasa por Cloud Functions (ver functions/src/
// index.ts): la API key vive SOLO como secreto de Firebase y nunca llega
// al navegador. No volver a importar @pinecone-database/pinecone aquí.
import { postFuncion } from './functionsClient'

// =========================
// TIPOS DE DOCUMENTO QUE SON "FUENTE PRIMARIA"
// Códigos legales completos que se chunkean por artículo (no por longitud
// de caracteres), y se priorizan en la búsqueda para citas exactas.
// =========================
const TIPOS_FUENTE_PRIMARIA = [
  'codigo-civil',
  'codigo-penal',
  'codigo-laboral',
  'codigo-tributario',
  'constitucion'
]

function esTipoFuentePrimaria(tipoDocumento: string): boolean {
  return TIPOS_FUENTE_PRIMARIA.includes(tipoDocumento)
}

// =========================
// DIVIDIR TEXTO EN CHUNKS (genérico, por longitud/oraciones)
// =========================
function dividirEnChunks(texto: string, tamano = 400): string[] {
  const oraciones = texto.split(/[.!?]+/).filter(s => s.trim().length > 20)
  const chunks: string[] = []
  let chunkActual = ''

  for (const oracion of oraciones) {
    if ((chunkActual + oracion).length > tamano) {
      if (chunkActual.trim()) chunks.push(chunkActual.trim())
      chunkActual = oracion
    } else {
      chunkActual += '. ' + oracion
    }
  }

  if (chunkActual.trim()) chunks.push(chunkActual.trim())
  return chunks
}

// =========================
// DIVIDIR TEXTO POR ARTÍCULO (para códigos legales / fuente primaria)
// Cada unidad resultante es un artículo completo, para poder citarlo
// exacto sin que quede partido a la mitad por el chunking genérico.
// =========================
interface UnidadArticulo {
  texto: string
  numeroArticulo?: number
}

// Tope de tamaño por unidad. Algunos "artículos" en la práctica arrastran
// bloques enormes (ej. Disposiciones Finales y Transitorias, que vienen
// después del último "Artículo N°" del código y no vuelven a usar ese
// formato), así que sin este tope terminarían como un solo chunk gigante
// que diluye la búsqueda semántica.
const MAX_LONGITUD_ARTICULO = 2000

function dividirEnArticulos(texto: string): UnidadArticulo[] {
  const regex = /Art[íi]culo\s+(\d+)[°ºo]?/gi
  const matches = [...texto.matchAll(regex)]

  if (matches.length === 0) {
    return []
  }

  const partes: UnidadArticulo[] = []

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    if (!match) continue

    const siguienteMatch = matches[i + 1]
    const inicio = match.index ?? 0
    const fin = siguienteMatch?.index ?? texto.length
    const numeroArticulo = Number(match[1])
    const fragmento = texto.slice(inicio, fin).trim()

    // Artículos muy cortos (ej. solo el título sin contenido) se
    // descartan; probablemente sea ruido de la extracción del PDF.
    if (fragmento.length <= 15) continue

    if (fragmento.length > MAX_LONGITUD_ARTICULO) {
      // Bloque anormalmente largo: lo partimos en sub-fragmentos más
      // manejables con el chunking genérico, pero conservando el mismo
      // número de artículo en todos, para no perder la referencia.
      const subFragmentos = dividirEnChunks(fragmento, MAX_LONGITUD_ARTICULO)
      for (const sub of subFragmentos) {
        partes.push({ texto: sub, numeroArticulo })
      }
    } else {
      partes.push({ texto: fragmento, numeroArticulo })
    }
  }

  return partes
}

// =========================
// INTERFAZ PINECONE HIT
// =========================
interface PineconeHit {
  _score?: number
  fields?: {
    nombreDocumento?: string
    tipoDocumento?: string
    documentoId?: string
    indiceChunk?: number
    numeroArticulo?: number
    esFuentePrimaria?: boolean
    text?: string
  }
}

// =========================
// FRAGMENTO DE RESULTADO (para mostrar como cita en el chat)
// =========================
export interface FragmentoResultado {
  texto: string
  nombreDocumento: string
  tipoDocumento: string
  documentoId: string
  indiceChunk: number
  score: number
  numeroArticulo?: number
  esFuentePrimaria?: boolean
}

// El modelo de embeddings integrado de Pinecone (llama-text-embed-v2) tiene
// un límite de 250,000 tokens/minuto en el plan actual. Documentos grandes
// (ej. el Código Civil completo, ~3000+ artículos) lo superan si se mandan
// los lotes uno detrás de otro sin pausa — de ahí la pausa proactiva entre
// lotes, y el reintento con espera como red de seguridad si de todos modos
// se llega a topar el límite (los IDs de los chunks son determinísticos,
// así que reintentar el mismo lote es un upsert idempotente, no duplica).
const PAUSA_ENTRE_LOTES_MS = 4500
const MAX_REINTENTOS_POR_LOTE = 5
const ESPERA_BASE_REINTENTO_MS = 20000

function esperar(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface RecordPinecone {
  id: string
  text: string
  documentoId: string
  nombreDocumento: string
  tipoDocumento: string
  indiceChunk: number
  fechaGuardado: string
  esFuentePrimaria: boolean
  numeroArticulo?: number
}

async function subirLoteConReintentos(records: RecordPinecone[], intento = 1): Promise<void> {
  const response = await postFuncion('upsertToPinecone', { records })

  const result = await response.json() as { success?: boolean; error?: string }
  if (result.success) return

  const esLimiteDeTasa = result.error?.includes('RESOURCE_EXHAUSTED') ?? false
  if (esLimiteDeTasa && intento <= MAX_REINTENTOS_POR_LOTE) {
    const espera = ESPERA_BASE_REINTENTO_MS * intento
    console.warn(`⏳ Límite de tasa de Pinecone alcanzado, reintentando en ${espera / 1000}s (intento ${intento}/${MAX_REINTENTOS_POR_LOTE})...`)
    await esperar(espera)
    return subirLoteConReintentos(records, intento + 1)
  }

  throw new Error(result.error ?? 'Error en upsert')
}

// =========================
// GUARDAR DOCUMENTO EN PINECONE
// =========================
export async function guardarDocumentoEnPinecone(
  documentoId: string,
  nombreDocumento: string,
  textoCompleto: string,
  tipoDocumento: string,
  onProgress?: (loteActual: number, totalLotes: number) => void
): Promise<{ exito: boolean; chunksGuardados: number }> {

  const esPrimaria = esTipoFuentePrimaria(tipoDocumento)

  // Para fuente primaria, intentamos chunking por artículo. Si el
  // documento no sigue el formato "Artículo N°" (0 matches), caemos de
  // vuelta al chunking genérico para no perder el documento.
  const unidades: UnidadArticulo[] = esPrimaria
    ? dividirEnArticulos(textoCompleto)
    : []

  const unidadesFinales: UnidadArticulo[] = unidades.length > 0
    ? unidades
    : dividirEnChunks(textoCompleto).map(t => ({ texto: t }))

  const modoUsado = unidades.length > 0 ? 'artículos' : 'chunks'
  console.log(`📌 Procesando ${unidadesFinales.length} ${modoUsado}...`)

  let totalGuardados = 0
  const LOTE = 50
  const totalLotes = Math.ceil(unidadesFinales.length / LOTE)

  for (let i = 0; i < unidadesFinales.length; i += LOTE) {
    const lote = unidadesFinales.slice(i, i + LOTE)
    const numeroLote = Math.floor(i / LOTE) + 1

    const records: RecordPinecone[] = lote.map((unidad, j) => ({
      id: `${documentoId}_chunk_${i + j}`,
      text: unidad.texto,
      documentoId,
      nombreDocumento,
      tipoDocumento,
      indiceChunk: i + j,
      fechaGuardado: new Date().toISOString(),
      esFuentePrimaria: esPrimaria,
      ...(unidad.numeroArticulo !== undefined ? { numeroArticulo: unidad.numeroArticulo } : {})
    }))

    await subirLoteConReintentos(records)

    totalGuardados += records.length
    onProgress?.(numeroLote, totalLotes)
    console.log(`✅ Lote ${numeroLote}/${totalLotes} guardado (${records.length} registros)`)

    if (i + LOTE < unidadesFinales.length) {
      await esperar(PAUSA_ENTRE_LOTES_MS)
    }
  }

  console.log(`✅ Total guardado: ${totalGuardados} registros`)
  return { exito: true, chunksGuardados: totalGuardados }
}

// =========================
// BUSCAR EN PINECONE
// Primero busca SOLO en fuentes primarias (códigos legales completos,
// más confiables para citar un artículo exacto). Si no encuentra nada
// ahí, amplía la búsqueda a todo lo demás (jurisprudencia, otros docs).
// =========================
export async function buscarEnPinecone(
  consulta: string,
  tipoDocumento?: string,
  topK = 5
): Promise<FragmentoResultado[]> {

  const buscar = async (soloFuentePrimaria: boolean): Promise<FragmentoResultado[]> => {
    const response = await postFuncion('searchInPinecone', { query: consulta, topK, tipoDocumento, soloFuentePrimaria })

    const data = await response.json() as { hits?: PineconeHit[] }
    const hits = data.hits ?? []

    return hits
      .map(h => ({
        texto: h.fields?.text ?? '',
        nombreDocumento: h.fields?.nombreDocumento ?? '',
        tipoDocumento: h.fields?.tipoDocumento ?? '',
        documentoId: h.fields?.documentoId ?? '',
        indiceChunk: h.fields?.indiceChunk ?? 0,
        score: h._score ?? 0,
        ...(h.fields?.numeroArticulo !== undefined ? { numeroArticulo: h.fields.numeroArticulo } : {}),
        ...(h.fields?.esFuentePrimaria !== undefined ? { esFuentePrimaria: h.fields.esFuentePrimaria } : {})
      }))
      .filter(f => f.texto.length > 0)
  }

  try {
    const fragmentosPrimarios = await buscar(true)

    if (fragmentosPrimarios.length > 0) {
      console.log(`🔍 Encontrados ${fragmentosPrimarios.length} fragmentos en fuentes primarias`)
      return fragmentosPrimarios
    }

    const fragmentosGenerales = await buscar(false)
    console.log(`🔍 Encontrados ${fragmentosGenerales.length} fragmentos relevantes (búsqueda general)`)
    return fragmentosGenerales

  } catch (err) {
    const error = err as Error
    console.error('❌ Error buscando en Pinecone:', error.message)
    return []
  }
}

// =========================
// VERIFICAR CONEXIÓN
// =========================
export interface EstadoPinecone {
  conectado: boolean
  totalVectores: number
}

export async function verificarConexionPinecone(): Promise<EstadoPinecone> {
  try {
    const response = await postFuncion('estadisticasPinecone', {})
    const data = await response.json() as Partial<EstadoPinecone> & { error?: string }
    if (!response.ok) {
      throw new Error(data.error ?? 'No se pudo consultar Pinecone')
    }
    const totalVectores = data.totalVectores ?? 0
    console.log('✅ Pinecone conectado. Vectores totales:', totalVectores)
    return { conectado: true, totalVectores }
  } catch (err) {
    const error = err as Error
    console.error('❌ Error conectando a Pinecone:', error.message)
    return { conectado: false, totalVectores: 0 }
  }
}
