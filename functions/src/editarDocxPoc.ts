import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import JSZip from 'jszip'
import { DOMParser, XMLSerializer, type Element as XmlElement } from '@xmldom/xmldom'
import { ORIGENES_PERMITIDOS, autorizar } from './seguridad'

// =========================
// PRUEBA DE CONCEPTO: edición quirúrgica de un .docx existente.
//
// A diferencia del pipeline actual de Consultas (mammoth → HTML →
// reconstruir con la librería `docx`), esto NUNCA reconstruye el
// documento — abre el .docx original (es un .zip), ubica el párrafo
// exacto dentro de word/document.xml por su índice, y dentro de ESE
// párrafo busca el fragmento de texto exacto (textoOriginal) para
// reemplazarlo por textoNuevo — sin tocar el resto del párrafo. Todo lo
// demás (fuente, márgenes, encabezados/pies, logos, estilos
// corporativos) queda intacto porque nunca se toca.
//
// Por qué "buscar el fragmento", no "reemplazar todo el párrafo": la
// primera versión de esta POC ponía TODO el texto nuevo en el primer run
// del párrafo — en un párrafo real como "SEXTA.- EL COMODATARIO se obliga
// a:" (etiqueta en negrita + resto normal, dos runs), eso se comía la
// etiqueta en negrita junto con el resto. Probado con 3 documentos reales
// (Comodato, Compra-Venta, Arrendamiento) — ver conversación — 9 de las
// 28 cláusulas del Comodato real tienen justo ese patrón. Buscar el
// fragmento exacto (igual que reemplazarEnHtml en htmlTexto.ts hace para
// el HTML del lado del cliente, pero acá operando sobre <w:r>/<w:t> en
// vez de nodos DOM) resuelve el caso común de raíz: si el fragmento cae
// dentro de UN SOLO run, ese run ni se entera de los demás; si cruza
// varios runs, cada uno conserva su propio formato fuera del fragmento.
//
// Alcance de esta prueba de concepto, a propósito: NO usa Firebase
// Storage (el .docx viaja en la request como base64) y NO reemplaza el
// flujo real de Consultas (mammothExtractor.ts/htmlTexto.ts/
// documentExport.ts siguen intactos) — es solo para validar el mecanismo
// central antes de decidir si vale la pena migrar todo el módulo.
// =========================

interface CambioParrafo {
  indiceParrafo: number
  textoOriginal: string
  textoNuevo: string
}

interface EditarDocxPocRequest {
  docxBase64: string
  cambios: CambioParrafo[]
}

interface EntradaRun {
  nodoTexto: XmlElement
  texto: string
  inicio: number
  fin: number
}

// Recorre los runs del párrafo en orden y arma el texto plano completo
// más un mapa de qué <w:t> corresponde a cada rango de ese texto — mismo
// principio que walkTextoConMapa en htmlTexto.ts, pero sobre <w:r>/<w:t>
// de OOXML en vez de nodos de texto de HTML.
function mapaDeTextoDelParrafo(parrafo: XmlElement): { texto: string; mapa: EntradaRun[] } {
  const nodosTexto = parrafo.getElementsByTagName('w:t')
  let texto = ''
  const mapa: EntradaRun[] = []

  for (let i = 0; i < nodosTexto.length; i++) {
    const nodo = nodosTexto.item(i)
    if (!nodo) continue
    const contenido = nodo.textContent ?? ''
    if (!contenido) continue
    mapa.push({ nodoTexto: nodo, texto: contenido, inicio: texto.length, fin: texto.length + contenido.length })
    texto += contenido
  }

  return { texto, mapa }
}

function fijarTexto(nodoTexto: XmlElement, textoNuevo: string) {
  nodoTexto.textContent = textoNuevo
  // Preserva espacios al inicio/final — sin esto, un procesador OOXML
  // puede colapsarlos (ej. "SEXTA.- " perdería el espacio final).
  if (/^\s|\s$/.test(textoNuevo)) {
    nodoTexto.setAttribute('xml:space', 'preserve')
  }
}

// Reemplaza SOLO el fragmento textoOriginal dentro del párrafo, sin tocar
// el resto — preserva el formato (negrita, fuente, etc.) de cualquier
// texto fuera del fragmento, incluso si el fragmento cruza varios runs.
function reemplazarFragmentoEnParrafo(parrafo: XmlElement, textoOriginal: string, textoNuevo: string) {
  const { texto, mapa } = mapaDeTextoDelParrafo(parrafo)
  if (mapa.length === 0) {
    throw new Error('El párrafo no tiene ningún texto (<w:t>) editable.')
  }

  const idx = texto.indexOf(textoOriginal)
  if (idx === -1) {
    throw new Error(`No se encontró el texto "${textoOriginal.slice(0, 80)}" dentro de este párrafo.`)
  }
  const fin = idx + textoOriginal.length

  const entradaInicio = mapa.find(e => idx >= e.inicio && idx < e.fin)
  const entradaFin = mapa.find(e => (fin - 1) >= e.inicio && (fin - 1) < e.fin)
  if (!entradaInicio || !entradaFin) {
    throw new Error('No se pudo ubicar el fragmento dentro de los runs del párrafo (caso borde no soportado).')
  }

  if (entradaInicio === entradaFin) {
    // Caso común: el fragmento cae dentro de un único run — ningún otro
    // run del párrafo se toca en absoluto (ej. la etiqueta "SEXTA.-" en
    // negrita, si el fragmento buscado está solo en el run siguiente).
    const offsetInicio = idx - entradaInicio.inicio
    const offsetFin = fin - entradaInicio.inicio
    const nuevoTextoDelRun = entradaInicio.texto.slice(0, offsetInicio) + textoNuevo + entradaInicio.texto.slice(offsetFin)
    fijarTexto(entradaInicio.nodoTexto, nuevoTextoDelRun)
    return
  }

  // El fragmento cruza varios runs: el primero conserva su prefijo (antes
  // del fragmento) + el texto nuevo completo; el último conserva su
  // sufijo (después del fragmento); cualquier run intermedio, íntegramente
  // dentro del fragmento, queda vacío. El formato de cada run (negrita,
  // fuente) no se toca — solo su contenido de texto.
  const offsetInicioEnPrimero = idx - entradaInicio.inicio
  const offsetFinEnUltimo = fin - entradaFin.inicio

  fijarTexto(entradaInicio.nodoTexto, entradaInicio.texto.slice(0, offsetInicioEnPrimero) + textoNuevo)
  fijarTexto(entradaFin.nodoTexto, entradaFin.texto.slice(offsetFinEnUltimo))

  const indiceInicio = mapa.indexOf(entradaInicio)
  const indiceFin = mapa.indexOf(entradaFin)
  for (let i = indiceInicio + 1; i < indiceFin; i++) {
    fijarTexto(mapa[i]!.nodoTexto, '')
  }
}

async function aplicarCambiosQuirurgicos(bufferOriginal: Buffer, cambios: CambioParrafo[]): Promise<Buffer> {
  const zip = await JSZip.loadAsync(bufferOriginal)
  const rutaDocumentXml = 'word/document.xml'
  const archivoDocumentXml = zip.file(rutaDocumentXml)
  if (!archivoDocumentXml) {
    throw new Error('El archivo no parece ser un .docx válido (falta word/document.xml).')
  }

  const xmlString = await archivoDocumentXml.async('text')
  const doc = new DOMParser().parseFromString(xmlString, 'text/xml')
  // getElementsByTagName trae TODOS los <w:p> del documento, incluidos los
  // que están dentro de tablas — el índice es sobre esa lista completa, en
  // el mismo orden en que aparecen en el XML.
  const parrafos = doc.getElementsByTagName('w:p')

  for (const { indiceParrafo, textoOriginal, textoNuevo } of cambios) {
    const parrafo = parrafos.item(indiceParrafo)
    if (!parrafo) {
      throw new Error(`No existe el párrafo #${indiceParrafo} (el documento tiene ${parrafos.length} párrafos).`)
    }
    reemplazarFragmentoEnParrafo(parrafo, textoOriginal, textoNuevo)
  }

  const xmlModificado = new XMLSerializer().serializeToString(doc)
  zip.file(rutaDocumentXml, xmlModificado)

  return zip.generateAsync({ type: 'nodebuffer' })
}

export const editarParrafoDocxPoc = onRequest(
  { cors: ORIGENES_PERMITIDOS, timeoutSeconds: 60 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    // Prueba de concepto sin uso en la página todavía — solo admins.
    const uid = await autorizar(req, res, { soloAdmin: true })
    if (!uid) return

    const { docxBase64, cambios } = req.body as EditarDocxPocRequest
    if (!docxBase64 || typeof docxBase64 !== 'string') {
      res.status(400).json({ error: 'docxBase64 es requerido' })
      return
    }
    if (!Array.isArray(cambios) || cambios.length === 0) {
      res.status(400).json({ error: 'cambios debe ser un array con al menos un elemento' })
      return
    }

    try {
      const bufferOriginal = Buffer.from(docxBase64, 'base64')
      const bufferEditado = await aplicarCambiosQuirurgicos(bufferOriginal, cambios)

      res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      res.status(200).send(bufferEditado)
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en editarParrafoDocxPoc:', error.message)
      res.status(400).json({ error: error.message })
    }
  }
)
