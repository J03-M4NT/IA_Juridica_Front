import { Pinecone } from '@pinecone-database/pinecone'
import type { EmbeddingsList } from '@pinecone-database/pinecone'

// =========================
// INICIALIZAR PINECONE
// =========================
const pinecone = new Pinecone({
  apiKey: import.meta.env.VITE_PINECONE_API_KEY as string
})

// =========================
// DIVIDIR TEXTO EN CHUNKS
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
// EXTRAER VALORES DEL EMBEDDING
// =========================
function extraerValores(embeddings: EmbeddingsList, indice: number): number[] {
  try {
    // EmbeddingsList en v8 tiene propiedad de acceso directo
    const emb = (embeddings as unknown as { [key: number]: { values?: number[] } })[indice]
    if (!emb?.values) return []
    return emb.values
  } catch {
    return []
  }
}

// =========================
// GUARDAR DOCUMENTO EN PINECONE
// =========================
export async function guardarDocumentoEnPinecone(
  documentoId: string,
  nombreDocumento: string,
  textoCompleto: string,
  tipoDocumento: string
): Promise<{ exito: boolean; chunksGuardados: number }> {

  try {
    const idx = pinecone.index(
      import.meta.env.VITE_PINECONE_INDEX as string,
      import.meta.env.VITE_PINECONE_HOST as string
    )

    const chunks = dividirEnChunks(textoCompleto)
    console.log(`📌 Procesando ${chunks.length} chunks para Pinecone...`)

    const LOTE = 10
    for (let i = 0; i < chunks.length; i += LOTE) {
      const loteChunks = chunks.slice(i, i + LOTE)

      // Generar embeddings — v8 solo acepta el objeto de configuración
      const embeddingResponse = await pinecone.inference.embed({
        model: 'llama-text-embed-v2',
        inputs: loteChunks,
        parameters: { inputType: 'passage' }
      })

      const vectores = loteChunks.map((chunk, j) => ({
        id: `${documentoId}_chunk_${i + j}`,
        values: extraerValores(embeddingResponse, j),
        metadata: {
          texto: chunk,
          documentoId,
          nombreDocumento,
          tipoDocumento,
          indiceChunk: i + j,
          fechaGuardado: new Date().toISOString()
        }
      }))

      await (idx.upsert as (v: unknown) => Promise<void>)(vectores)
      console.log(`✅ Lote ${Math.floor(i / LOTE) + 1} guardado`)
    }

    return { exito: true, chunksGuardados: chunks.length }

  } catch (err) {
    const error = err as Error
    console.error('❌ Error guardando en Pinecone:', error.message)
    throw error
  }
}

// =========================
// BUSCAR EN PINECONE
// =========================
export async function buscarEnPinecone(
  consulta: string,
  tipoDocumento?: string,
  topK = 5
): Promise<string[]> {

  try {
    const idx = pinecone.index(
      import.meta.env.VITE_PINECONE_INDEX as string,
      import.meta.env.VITE_PINECONE_HOST as string
    )

    // Generar embedding de la consulta
    const embeddingResponse = await pinecone.inference.embed({
      model: 'llama-text-embed-v2',
      inputs: [consulta],
      parameters: { inputType: 'query' }
    })

    const vector = extraerValores(embeddingResponse, 0)

    if (vector.length === 0) {
      console.warn('⚠️ No se pudo generar embedding para la consulta')
      return []
    }

    const queryOptions: {
      vector: number[]
      topK: number
      includeMetadata: boolean
      filter?: Record<string, unknown>
    } = {
      vector,
      topK,
      includeMetadata: true
    }

    if (tipoDocumento) {
      queryOptions.filter = { tipoDocumento: { $eq: tipoDocumento } }
    }

    const resultados = await idx.query(queryOptions)

    const fragmentos = (resultados.matches ?? [])
      .filter(m => (m.score ?? 0) > 0.3)
      .map(m => {
        const nombre = (m.metadata?.nombreDocumento ?? '') as string
        const texto = (m.metadata?.texto ?? '') as string
        return nombre ? `[${nombre}]: ${texto}` : texto
      })
      .filter(t => t.length > 0)

    console.log(`🔍 Encontrados ${fragmentos.length} fragmentos relevantes`)
    return fragmentos

  } catch (err) {
    const error = err as Error
    console.error('❌ Error buscando en Pinecone:', error.message)
    return []
  }
}

// =========================
// ELIMINAR DOCUMENTO DE PINECONE
// =========================
export async function eliminarDocumentoDePinecone(
  documentoId: string
): Promise<void> {
  try {
    const idx = pinecone.index(
      import.meta.env.VITE_PINECONE_INDEX as string,
      import.meta.env.VITE_PINECONE_HOST as string
    )

    // En v8, deleteMany acepta un array de IDs o un objeto con filter
    // Primero buscamos los IDs del documento
    const stats = await idx.describeIndexStats()
    console.log('📊 Stats antes de eliminar:', stats.totalRecordCount)

    // Eliminar por prefijo del ID
    const idsParaEliminar: string[] = []
    for (let i = 0; i < 1000; i++) {
      idsParaEliminar.push(`${documentoId}_chunk_${i}`)
    }

    await idx.deleteMany(idsParaEliminar)
    console.log(`🗑️ Documento eliminado de Pinecone: ${documentoId}`)

  } catch (err) {
    const error = err as Error
    console.error('❌ Error eliminando de Pinecone:', error.message)
  }
}

// =========================
// VERIFICAR CONEXIÓN
// =========================
export async function verificarConexionPinecone(): Promise<boolean> {
  try {
    const idx = pinecone.index(
      import.meta.env.VITE_PINECONE_INDEX as string,
      import.meta.env.VITE_PINECONE_HOST as string
    )

    const stats = await idx.describeIndexStats()
    console.log('✅ Pinecone conectado. Vectores totales:', stats.totalRecordCount)
    return true
  } catch (err) {
    const error = err as Error
    console.error('❌ Error conectando a Pinecone:', error.message)
    return false
  }
}
