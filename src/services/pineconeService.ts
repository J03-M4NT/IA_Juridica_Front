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
  // Ensayos de doctrina, presentaciones, etc. que trae el PDF del código
  // entre un libro y otro: no son texto de ley.
  esComentario?: boolean
}

// Tope de tamaño por unidad. Algunos artículos son muy largos (ej. el
// art. 2 de la Constitución, con 24 incisos) y un bloque gigante diluye la
// búsqueda semántica: se parten en trozos de este tamaño.
const MAX_LONGITUD_ARTICULO = 2000

// Encabezado REAL de un artículo: número (con letra opcional, como los
// "Artículo 108 ° -C.-" del Código Penal) seguido de ".-" ("Artículo 2°.-",
// "Artículo 140 º .-", "Artículo 3.-"). Así no se corta en referencias
// dentro del texto como "Artículo 2 de la Ley Nº 27365".
const ENCABEZADO_ARTICULO_REGEX = /Art[íi]culo\s+(\d+)\s*[°º]?\s*(?:-\s*([A-Z])\s*)?\.\s*-/gi

// Encabezados/pies de página de las ediciones oficiales del MINJUS, que la
// extracción deja con letras sueltas por el tipo de letra decorativo, ej.
// "347 DERECHOS REALES LIBRO V Dec R et O Leg I s L at IVO Nº 295 Có D ig O Civi L"
// o "Ministerio de Justicia y derechos h u M anos 534".
function sinLetrasSueltas(palabra: string): string {
  return palabra.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*')
}
const PIE_DECRETO_REGEX = new RegExp(
  `(?:\\d{1,4}\\s+)?(?:[A-ZÁÉÍÓÚÑ,]+\\s+){0,6}(?:LIBRO\\s+[IVXL]+\\s+)?${sinLetrasSueltas('decreto')}\\s*${sinLetrasSueltas('legislativo')}\\s*N\\s*[º°o]\\s*\\d+\\s*${sinLetrasSueltas('c')}\\s*[óo]\\s*${sinLetrasSueltas('digo')}\\s*(?:${sinLetrasSueltas('civil')}|${sinLetrasSueltas('penal')})`,
  'gi'
)
const PIE_MINISTERIO_REGEX = new RegExp(
  `${sinLetrasSueltas('ministerio')}\\s+${sinLetrasSueltas('de')}\\s+${sinLetrasSueltas('justicia')}\\s+y\\s+${sinLetrasSueltas('derechos')}\\s+${sinLetrasSueltas('humanos')}(?:\\s+\\d{1,4})?`,
  'gi'
)

function limpiarRuidoDeCodigo(texto: string): string {
  return texto
    .replace(PIE_DECRETO_REGEX, ' ')
    .replace(PIE_MINISTERIO_REGEX, ' ')
    .replace(/[ \t]{2,}/g, ' ')
}

// Parte un texto largo en trozos de hasta `max` caracteres cortando en
// fin de oración o de inciso, SIN descartar nada (dividirEnChunks tira las
// oraciones cortas, y en un artículo eso borra incisos como "1.- Agente capaz").
function partirSinPerderTexto(texto: string, max: number): string[] {
  const piezas = texto.split(/(?<=[.;:])\s+/)
  const trozos: string[] = []
  let actual = ''
  for (const pieza of piezas) {
    if (actual && (actual.length + 1 + pieza.length) > max) {
      trozos.push(actual)
      actual = pieza
    } else {
      actual = actual ? `${actual} ${pieza}` : pieza
    }
  }
  if (actual.trim()) trozos.push(actual)
  return trozos
}

// Índice del PDF ("Nulidad ....... SECCIÓN TERCERA ......."): va después
// del último artículo y, sin esto, quedaría como su "continuación". Ningún
// artículo real tiene líneas de puntos de relleno.
function esIndiceDelDocumento(texto: string): boolean {
  return (texto.match(/\.{6,}/g) ?? []).length >= 3
}

// Donde empieza un ensayo/presentación intercalado en el código: la
// portada de un libro ("Derechos Reales [ LIBRO V ]") o un "Sumario:".
const INICIO_COMENTARIO_REGEX = /\[\s*LIBRO\s+[IVXL]+\s*\]|\bSumario\s*:/i

// Si antes del encabezado hay un "título" corto sin punto (la sumilla del
// artículo, ej. "TÍTULO VI Arrendamiento CAPÍTULO PRIMERO Disposiciones
// Generales Definición"), pertenece a ESE artículo, no al anterior.
const MAX_LONGITUD_SUMILLA = 250

function dividirEnArticulos(textoOriginal: string): UnidadArticulo[] {
  const texto = limpiarRuidoDeCodigo(textoOriginal)

  // Solo encabezados en orden creciente: un "Artículo 696.-" citado dentro
  // de una nota ("Texto anterior a la modificación: ...") repite el número
  // del artículo en curso y no debe abrir uno nuevo. Un salto grande (ej.
  // un bloque de artículos derogados que la edición no imprime) solo se
  // acepta si el encabezado siguiente continúa la numeración desde ahí:
  // así un número citado fuera de lugar no bloquea el resto del código.
  // El orden se compara por (número, letra): 108 < 108-A < 108-B < 109.
  const candidatos = [...texto.matchAll(ENCABEZADO_ARTICULO_REGEX)].map(m => {
    const numero = Number(m[1])
    const letra = m[2]?.toUpperCase()
    return {
      indice: m.index ?? 0,
      fin: (m.index ?? 0) + m[0].length,
      numero,
      letra,
      orden: numero * 100 + (letra ? letra.charCodeAt(0) - 64 : 0)
    }
  })
  const encabezados: typeof candidatos = []
  let ultimo = 0
  candidatos.forEach((c, k) => {
    if (c.orden <= ultimo) return
    const saltoNormal = ultimo === 0 || c.numero - Math.floor(ultimo / 100) <= 50
    const siguiente = candidatos.slice(k + 1).find(s => s.orden !== c.orden)
    const confirmadoPorElSiguiente = !siguiente || (siguiente.orden > c.orden && siguiente.numero - c.numero <= 5)
    if (saltoNormal || confirmadoPorElSiguiente) {
      encabezados.push(c)
      ultimo = c.orden
    }
  })

  if (encabezados.length === 0) return []

  // Inicio de cada artículo, retrocediendo hasta incluir su sumilla.
  const inicios = encabezados.map((e, i) => {
    const desde = i === 0 ? 0 : encabezados[i - 1]!.fin
    const ultimoPunto = texto.lastIndexOf('.', e.indice - 1)
    if (ultimoPunto >= desde && e.indice - (ultimoPunto + 1) <= MAX_LONGITUD_SUMILLA) {
      return ultimoPunto + 1
    }
    return e.indice
  })

  const partes: UnidadArticulo[] = []

  encabezados.forEach((e, i) => {
    const fin = inicios[i + 1] ?? texto.length
    // Sin comillas/puntos sueltos al inicio (restos del cierre de una nota
    // del artículo anterior, ej. '..." Artículo 697 º .-').
    let cuerpo = texto.slice(inicios[i], fin).trim().replace(/^["'”».\s]+/, '')

    // Un ensayo intercalado después del artículo (típicamente al pasar de
    // un libro del código al siguiente) se separa como comentario.
    let comentario = ''
    const posComentario = cuerpo.slice(e.fin - inicios[i]!).search(INICIO_COMENTARIO_REGEX)
    if (posComentario !== -1) {
      // Se retrocede hasta el último punto para llevarse también el nombre
      // del libro que precede a "[ LIBRO II ]" (ej. "Acto Jurídico").
      const marca = e.fin - inicios[i]! + posComentario
      const puntoPrevio = cuerpo.lastIndexOf('.', marca - 1)
      const corte = puntoPrevio !== -1 && marca - puntoPrevio <= 80 ? puntoPrevio + 1 : marca
      comentario = cuerpo.slice(corte).trim()
      cuerpo = cuerpo.slice(0, corte).trim()
    }

    // Artículos muy cortos (ej. solo el título sin contenido): ruido.
    if (cuerpo.length > 15) {
      const trozos = cuerpo.length > MAX_LONGITUD_ARTICULO
        ? partirSinPerderTexto(cuerpo, MAX_LONGITUD_ARTICULO)
        : [cuerpo]

      trozos.forEach((trozo, j) => {
        // Los trozos siguientes de un artículo largo llevan su referencia,
        // para que la búsqueda y la cita sepan de qué artículo son.
        const textoTrozo = j === 0 ? trozo : `Artículo ${e.numero}${e.letra ? `-${e.letra}` : ''} (continuación).- ${trozo}`
        partes.push({ texto: textoTrozo, numeroArticulo: e.numero })
      })
    }

    for (const trozo of partirSinPerderTexto(comentario, MAX_LONGITUD_ARTICULO)) {
      if (trozo.trim().length > 40) partes.push({ texto: trozo.trim(), esComentario: true })
    }
  })

  return partes.filter(p => !esIndiceDelDocumento(p.texto))
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
  // Letra de artículos como "108°-C" (la calcula consultarLexit)
  sufijoArticulo?: string
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
  esComentario?: boolean
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
      ...(unidad.numeroArticulo !== undefined ? { numeroArticulo: unidad.numeroArticulo } : {}),
      ...(unidad.esComentario ? { esComentario: true } : {})
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

// =========================
// LISTAR / ELIMINAR DOCUMENTOS (panel Admin)
// La lista se arma en el servidor desde el propio índice de Pinecone, así
// que todos los admins ven todos los documentos, desde cualquier PC.
// =========================
export interface DocumentoIndexado {
  id: string
  nombre: string
  tipo: string
  chunks: number
}

export async function listarDocumentosPinecone(): Promise<DocumentoIndexado[]> {
  const response = await postFuncion('listarDocumentosPinecone', {})
  const data = await response.json() as { documentos?: DocumentoIndexado[]; error?: string }
  if (!response.ok || !data.documentos) {
    throw new Error(data.error ?? 'No se pudo obtener la lista de documentos')
  }
  return data.documentos
}

// Borra de Pinecone TODOS los fragmentos del documento (irreversible).
export async function eliminarDocumentoPinecone(documentoId: string): Promise<number> {
  const response = await postFuncion('eliminarDocumentoDePinecone', { documentoId })
  const data = await response.json() as { success?: boolean; eliminados?: number; error?: string }
  if (!response.ok || !data.success) {
    throw new Error(data.error ?? 'No se pudo eliminar el documento')
  }
  return data.eliminados ?? 0
}
