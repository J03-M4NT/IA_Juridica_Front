// =========================
// EDICIÓN FIEL DE UN .DOCX (Análisis de Contratos)
//
// Aplica los cambios de texto que el usuario hizo en la app sobre el .docx
// ORIGINAL, sin reconstruirlo: abre el .zip, ubica cada párrafo por su
// texto dentro de word/document.xml y reemplaza solo la parte que cambió.
// Todo lo demás (fuentes, márgenes, encabezados/pies, logos, tablas,
// numeración, estilos) queda byte a byte igual, porque nunca se toca.
//
// Basado en la prueba de concepto de editarDocxPoc.ts (validada con
// contratos reales), con dos diferencias:
// - Ubica el párrafo por su TEXTO, no por su índice: el HTML que se muestra
//   en la app (mammoth) no numera los párrafos igual que el XML (tablas,
//   párrafos vacíos, listas).
// - Reemplaza solo el tramo que cambió (entre el prefijo y el sufijo comunes
//   del texto anterior y el nuevo), así un párrafo con formato mixto
//   ("SEXTA.-" en negrita + resto normal) conserva el formato de todo lo que
//   no se editó.
// =========================
import JSZip from 'jszip'
import { DOMParser, XMLSerializer, type Element as XmlElement } from '@xmldom/xmldom'

export interface CambioParrafo {
  // Texto completo del párrafo tal como estaba en el documento original.
  antes: string
  // Texto completo del párrafo después de editarlo.
  despues: string
  // Posición del párrafo en word/document.xml (la app la conoce porque
  // dibuja el Word con docx-preview en el mismo orden). Se usa solo si el
  // texto original en esa posición coincide con "antes".
  indice?: number
  // Si hay varios párrafos con el mismo texto (ej. "Firma: ______"), cuál
  // de ellos es: 0 = el primero, 1 = el segundo... (para buscar por texto).
  ocurrencia?: number
}

export interface ResultadoEdicion {
  buffer: Buffer
  aplicados: number
  fallidos: { antes: string; motivo: string }[]
}

interface EntradaRun {
  nodoTexto: XmlElement
  texto: string
  inicio: number
  fin: number
}

// Texto del párrafo, en el orden real del documento: el contenido de cada
// <w:t> (incluidos los de hipervínculos) y un espacio por cada <w:tab>,
// <w:br> o <w:cr> — sin esto "Anexo N° 1.-<tab>Declaraciones" se leería
// "1.-Declaraciones" y no coincidiría con lo que muestra la app. Las
// tabulaciones/saltos cuentan para las posiciones pero no son editables
// (no tienen entrada en el mapa). Se excluyen códigos de campo, texto
// borrado con control de cambios (<w:instrText>/<w:delText>) y cuadros de
// texto anidados (<w:txbxContent>), que son párrafos aparte.
function mapaDeTextoDelParrafo(parrafo: XmlElement): { texto: string; mapa: EntradaRun[]; tabs: number[] } {
  let texto = ''
  const mapa: EntradaRun[] = []
  // Posición (en `texto`) de cada <w:tab>, para aplicarPorTabulaciones.
  const tabs: number[] = []
  const visitar = (nodo: XmlElement) => {
    for (let hijo = nodo.firstChild; hijo; hijo = hijo.nextSibling) {
      if (hijo.nodeType !== 1) continue
      const el = hijo as XmlElement
      if (el.nodeName === 'w:t') {
        const contenido = el.textContent ?? ''
        if (!contenido) continue
        mapa.push({ nodoTexto: el, texto: contenido, inicio: texto.length, fin: texto.length + contenido.length })
        texto += contenido
      } else if (el.nodeName === 'w:tab' || el.nodeName === 'w:br' || el.nodeName === 'w:cr') {
        if (el.nodeName === 'w:tab') tabs.push(texto.length)
        texto += ' '
      } else if (el.nodeName !== 'w:txbxContent' && el.nodeName !== 'w:pPr' && el.nodeName !== 'w:rPr') {
        visitar(el)
      }
    }
  }
  visitar(parrafo)
  return { texto, mapa, tabs }
}

function fijarTexto(nodoTexto: XmlElement, textoNuevo: string) {
  nodoTexto.textContent = textoNuevo
  // Sin esto, Word puede colapsar espacios al inicio/final de un run.
  if (/^\s|\s$/.test(textoNuevo)) nodoTexto.setAttribute('xml:space', 'preserve')
}

// Reemplaza el tramo [inicio, fin) del texto del párrafo por `nuevo`,
// tocando solo los runs que caen dentro de ese tramo. Una inserción pura
// (inicio === fin) se agrega al run donde cae el cursor.
// Las posiciones pueden caer sobre una tabulación o salto (que no tienen
// entrada en el mapa): se usa el run de texto más cercano. Si el cambio
// tocara la tabulación misma, la comprobación posterior lo detecta y el
// párrafo se deja intacto.
function reemplazarTramo(mapa: EntradaRun[], inicio: number, fin: number, nuevo: string) {
  if (inicio === fin) {
    const entrada = mapa.find(e => inicio >= e.inicio && inicio <= e.fin) ?? mapa.find(e => e.inicio >= inicio) ?? mapa[mapa.length - 1]
    if (!entrada) throw new Error('El párrafo no tiene texto editable')
    const offset = Math.max(0, Math.min(inicio - entrada.inicio, entrada.texto.length))
    fijarTexto(entrada.nodoTexto, entrada.texto.slice(0, offset) + nuevo + entrada.texto.slice(offset))
    return
  }
  const primero = mapa.find(e => e.fin > inicio)
  const ultimo = [...mapa].reverse().find(e => e.inicio < fin)
  if (!primero || !ultimo || mapa.indexOf(primero) > mapa.indexOf(ultimo)) {
    throw new Error('No se pudo ubicar el tramo dentro del párrafo')
  }
  const corteInicio = Math.max(0, inicio - primero.inicio)
  const corteFin = Math.min(ultimo.texto.length, Math.max(0, fin - ultimo.inicio))
  if (primero === ultimo) {
    fijarTexto(primero.nodoTexto, primero.texto.slice(0, corteInicio) + nuevo + primero.texto.slice(corteFin))
    return
  }
  fijarTexto(primero.nodoTexto, primero.texto.slice(0, corteInicio) + nuevo)
  fijarTexto(ultimo.nodoTexto, ultimo.texto.slice(corteFin))
  for (let i = mapa.indexOf(primero) + 1; i < mapa.indexOf(ultimo); i++) {
    const intermedio = mapa[i]
    if (intermedio) fijarTexto(intermedio.nodoTexto, '')
  }
}

// El texto que ve la app (HTML de mammoth) puede diferir del XML en
// espacios (tabulaciones, dobles espacios, espacios duros). Se compara
// "normalizado" y se guarda qué posición del texto real corresponde a cada
// carácter normalizado, para poder volver a las posiciones reales.
function normalizarConMapa(texto: string): { normal: string; posiciones: number[] } {
  let normal = ''
  const posiciones: number[] = []
  let enEspacio = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i] ?? ''
    if (/\s/.test(c)) { // \s ya incluye el espacio duro (U+00A0)
      if (!enEspacio && normal.length > 0) {
        normal += ' '
        posiciones.push(i)
      }
      enEspacio = true
    } else {
      normal += c
      posiciones.push(i)
      enEspacio = false
    }
  }
  if (normal.endsWith(' ')) {
    normal = normal.slice(0, -1)
    posiciones.pop()
  }
  posiciones.push(texto.length)
  return { normal, posiciones }
}

const normalizar = (texto: string) => normalizarConMapa(texto).normal

// Reemplazo de un tramo [inicio, fin) del texto normalizado de `segmento`,
// que empieza en `base` dentro del texto real del párrafo.
function reemplazarEnSegmento(parrafo: XmlElement, base: number, segmento: string, antesSeg: string, despuesSeg: string) {
  const { posiciones } = normalizarConMapa(segmento)
  let prefijo = 0
  while (prefijo < antesSeg.length && prefijo < despuesSeg.length && antesSeg[prefijo] === despuesSeg[prefijo]) prefijo++
  let sufijo = 0
  while (
    sufijo < antesSeg.length - prefijo &&
    sufijo < despuesSeg.length - prefijo &&
    antesSeg[antesSeg.length - 1 - sufijo] === despuesSeg[despuesSeg.length - 1 - sufijo]
  ) sufijo++
  const inicio = base + (posiciones[prefijo] ?? segmento.length)
  const fin = base + (posiciones[antesSeg.length - sufijo] ?? segmento.length)
  reemplazarTramo(mapaDeTextoDelParrafo(parrafo).mapa, inicio, fin, despuesSeg.slice(prefijo, despuesSeg.length - sufijo))
}

// Respaldo para párrafos con tabulaciones que cambian a ambos lados de una
// (ej. dos líneas de firma "______<tab>______" completadas a la vez): un
// solo tramo abarcaría la tabulación, que no es editable. La app marca cada
// tabulación como "\t" (docx-preview la dibuja como un espacio especial),
// así se sabe con certeza qué texto va entre cuáles tabulaciones — un
// nombre con espacios no se confunde con la tabulación. Se reemplaza cada
// tramo entre tabulaciones por separado, del último al primero. Devuelve
// false si no aplica (sin "\t" o no coinciden con las del párrafo).
function aplicarPorTabulaciones(parrafo: XmlElement, antes: string, despues: string): boolean {
  const { texto, tabs } = mapaDeTextoDelParrafo(parrafo)
  const segAntes = antes.split('\t')
  const segDespues = despues.split('\t')
  if (tabs.length === 0 || segAntes.length !== tabs.length + 1 || segDespues.length !== segAntes.length) return false

  const limites = [-1, ...tabs, texto.length]
  const segmentosReales = segAntes.map((_, i) => ({
    base: (limites[i] ?? 0) + 1,
    texto: texto.slice((limites[i] ?? 0) + 1, limites[i + 1] ?? texto.length)
  }))
  // Cada tramo de la app debe coincidir con el del Word, o no es el mismo párrafo.
  if (segmentosReales.some((s, i) => normalizar(s.texto) !== normalizar(segAntes[i] ?? ''))) return false

  for (let i = segAntes.length - 1; i >= 0; i--) {
    const antesSeg = normalizar(segAntes[i] ?? '')
    const despuesSeg = normalizar(segDespues[i] ?? '')
    const real = segmentosReales[i]
    if (antesSeg === despuesSeg || !real) continue
    reemplazarEnSegmento(parrafo, real.base, real.texto, antesSeg, despuesSeg)
  }
  return true
}

export async function aplicarCambiosDocx(original: Buffer, cambios: CambioParrafo[]): Promise<ResultadoEdicion> {
  const zip = await JSZip.loadAsync(original)
  const archivo = zip.file('word/document.xml')
  if (!archivo) throw new Error('El archivo no parece ser un .docx válido (falta word/document.xml).')

  const doc = new DOMParser().parseFromString(await archivo.async('text'), 'text/xml')
  const nodos = doc.getElementsByTagName('w:p')
  const parrafos: XmlElement[] = []
  for (let i = 0; i < nodos.length; i++) {
    const p = nodos.item(i)
    if (p) parrafos.push(p)
  }

  let aplicados = 0
  const fallidos: ResultadoEdicion['fallidos'] = []

  // Texto ORIGINAL de cada párrafo, tomado una sola vez antes de aplicar
  // nada: los párrafos se ubican siempre contra este texto. Si se buscara
  // contra el texto que va cambiando, al editar el primero de dos párrafos
  // iguales ("Área") el segundo dejaría de ser la "ocurrencia 1".
  const textosOriginales = parrafos.map(p => normalizar(mapaDeTextoDelParrafo(p).texto))

  for (const cambio of cambios) {
    // Contenido original de los runs del párrafo, para dejarlo intacto si
    // el cambio no se puede aplicar bien.
    let respaldo: { nodo: XmlElement; texto: string }[] = []
    try {
      let antesNormal = normalizar(cambio.antes)
      let despuesNormal = normalizar(cambio.despues)
      if (antesNormal === despuesNormal) continue

      const coincidentes = parrafos.filter((_, i) => textosOriginales[i] === antesNormal)
      // Por posición, si la app la mandó y el texto original ahí coincide
      // (lo más preciso); si no, por texto.
      const porPosicion = cambio.indice !== undefined && textosOriginales[cambio.indice] === antesNormal
        ? parrafos[cambio.indice]
        : undefined
      let parrafo = porPosicion ?? coincidentes[cambio.ocurrencia ?? 0]
      const conNumeracionAutomatica = !parrafo && coincidentes.length === 0
      if (conNumeracionAutomatica) {
        // Numeración automática de Word ("Anexo N° 1.- ", "3.1. ", "a) "):
        // la app la muestra como texto, pero en el .docx no está escrita,
        // Word la genera. Se ubica el párrafo cuyo texto es el FINAL del que
        // ve la app, y la numeración no se puede editar desde aquí.
        const indicesPorFinal = parrafos.map((_, i) => i).filter(i => {
          const t = textosOriginales[i] ?? ''
          return t.length >= 3 && t.length < antesNormal.length && antesNormal.endsWith(t) && antesNormal.length - t.length <= 30
        })
        const indiceCandidato = indicesPorFinal[cambio.ocurrencia ?? 0]
        const candidato = indiceCandidato === undefined ? undefined : parrafos[indiceCandidato]
        if (candidato && indiceCandidato !== undefined) {
          const numeracion = antesNormal.slice(0, antesNormal.length - (textosOriginales[indiceCandidato] ?? '').length)
          if (!despuesNormal.startsWith(numeracion)) {
            throw new Error(`"${numeracion.trim()}" es numeración automática de Word; cámbiala en Word`)
          }
          antesNormal = antesNormal.slice(numeracion.length)
          despuesNormal = despuesNormal.slice(numeracion.length).trimStart()
          parrafo = candidato
        }
      }
      if (!parrafo) throw new Error(coincidentes.length === 0 ? 'no se encontró el párrafo en el Word original' : 'no se encontró esa ocurrencia del párrafo')

      const { texto, mapa } = mapaDeTextoDelParrafo(parrafo)
      if (mapa.length === 0) throw new Error('el párrafo no tiene texto editable')
      respaldo = mapa.map(e => ({ nodo: e.nodoTexto, texto: e.texto }))
      const { posiciones } = normalizarConMapa(texto)

      // Tramo que cambió: lo que queda entre el prefijo y el sufijo comunes.
      let prefijo = 0
      while (prefijo < antesNormal.length && prefijo < despuesNormal.length && antesNormal[prefijo] === despuesNormal[prefijo]) prefijo++
      let sufijo = 0
      while (
        sufijo < antesNormal.length - prefijo &&
        sufijo < despuesNormal.length - prefijo &&
        antesNormal[antesNormal.length - 1 - sufijo] === despuesNormal[despuesNormal.length - 1 - sufijo]
      ) sufijo++

      const inicioReal = posiciones[prefijo] ?? texto.length
      const finReal = posiciones[antesNormal.length - sufijo] ?? texto.length
      const nuevo = despuesNormal.slice(prefijo, despuesNormal.length - sufijo)
      reemplazarTramo(mapa, inicioReal, finReal, nuevo)

      // Comprobación: el párrafo debe quedar exactamente como lo dejó el usuario.
      if (normalizar(mapaDeTextoDelParrafo(parrafo).texto) !== despuesNormal) {
        // Si el cambio abarcaba una tabulación, se reintenta tramo por tramo
        // entre tabulaciones (desde el párrafo original).
        for (const { nodo, texto: t } of respaldo) fijarTexto(nodo, t)
        const porTabulaciones = !conNumeracionAutomatica && aplicarPorTabulaciones(parrafo, cambio.antes, cambio.despues)
        if (!porTabulaciones || normalizar(mapaDeTextoDelParrafo(parrafo).texto) !== despuesNormal) {
          throw new Error('el resultado no coincide con el texto editado')
        }
      }
      aplicados++
    } catch (err) {
      for (const { nodo, texto } of respaldo) fijarTexto(nodo, texto)
      fallidos.push({ antes: cambio.antes.slice(0, 120), motivo: (err as Error).message })
    }
  }

  // Sin cambios aplicados, se devuelve el archivo original tal cual.
  if (aplicados === 0) return { buffer: original, aplicados, fallidos }

  // Solo se reescribe word/document.xml; el resto de partes del .docx
  // (estilos, encabezados, pies, imágenes, numeración) no se tocan.
  zip.file('word/document.xml', new XMLSerializer().serializeToString(doc))
  return { buffer: await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }), aplicados, fallidos }
}
