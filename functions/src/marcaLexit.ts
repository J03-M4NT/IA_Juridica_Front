// =========================
// MEMBRETE LEXIT EN EL WORD ORIGINAL (descarga de Contratos)
// Reproduce el membrete que ponía exportToWordConMarcaDeAgua (src/utils/
// documentExport.ts) —"LEXIT" en negrita, Georgia, arriba a la derecha de
// cada página, y "Generado por LexIT" en el pie— pero DENTRO del .docx
// original, sin reconstruirlo: a los encabezados/pies existentes solo se
// les agrega un párrafo; su contenido original no se toca.
//
// Reglas de Word que se respetan:
// - Una sección sin encabezado propio HEREDA el de la sección anterior: no
//   se le crea uno (reemplazaría el heredado). Solo si ninguna sección
//   anterior tiene, se crea uno nuevo para ella y las siguientes lo heredan.
// - Se marcan también los encabezados de "primera página" y "páginas
//   pares" que ya existan, para que el membrete salga en todas las páginas.
// - Es idempotente: si el encabezado ya tiene el membrete, no se repite.
// =========================
import type JSZip from 'jszip'
import { DOMParser, XMLSerializer, type Element as XmlElement, type Document as XmlDocument } from '@xmldom/xmldom'

const TEXTO_MARCA = 'LEXIT'
const TEXTO_PIE = 'Generado por LexIT'

const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
const NS_CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
const TIPO_REL = {
  header: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/header',
  footer: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer'
}
const TIPO_CONTENIDO = {
  header: 'application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml',
  footer: 'application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml'
}

type Clase = 'header' | 'footer'

function textoDe(el: XmlElement): string {
  const ts = el.getElementsByTagName('w:t')
  let t = ''
  for (let i = 0; i < ts.length; i++) t += ts.item(i)?.textContent ?? ''
  return t
}

function parrafoMembrete(doc: XmlDocument, clase: Clase): XmlElement {
  const w = (tag: string) => doc.createElementNS(NS_W, `w:${tag}`)
  const conVal = (tag: string, valor: string) => {
    const el = w(tag)
    el.setAttributeNS(NS_W, 'w:val', valor)
    return el
  }
  const p = w('p')
  const pPr = w('pPr')
  pPr.appendChild(conVal('jc', clase === 'header' ? 'right' : 'center'))
  p.appendChild(pPr)
  const r = w('r')
  const rPr = w('rPr')
  if (clase === 'header') {
    const fuentes = w('rFonts')
    fuentes.setAttributeNS(NS_W, 'w:ascii', 'Georgia')
    fuentes.setAttributeNS(NS_W, 'w:hAnsi', 'Georgia')
    rPr.appendChild(fuentes)
    rPr.appendChild(w('b'))
    rPr.appendChild(conVal('color', '2B2B2B'))
    rPr.appendChild(conVal('spacing', '40'))
    rPr.appendChild(conVal('sz', '22'))
  } else {
    rPr.appendChild(conVal('color', '999999'))
    rPr.appendChild(conVal('sz', '18'))
  }
  r.appendChild(rPr)
  const t = w('t')
  t.textContent = clase === 'header' ? TEXTO_MARCA : TEXTO_PIE
  r.appendChild(t)
  p.appendChild(r)
  return p
}

// Agrega el membrete a una parte de encabezado/pie existente (arriba en el
// encabezado, abajo en el pie). No hace nada si ya lo tiene.
function marcarParte(xml: string, clase: Clase): string {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const raiz = doc.documentElement
  if (!raiz) return xml
  const parrafos = raiz.getElementsByTagName('w:p')
  const buscado = clase === 'header' ? TEXTO_MARCA : TEXTO_PIE
  for (let i = 0; i < parrafos.length; i++) {
    const p = parrafos.item(i)
    if (p && textoDe(p).trim() === buscado) return xml
  }
  const nuevo = parrafoMembrete(doc, clase)
  if (clase === 'header' && raiz.firstChild) raiz.insertBefore(nuevo, raiz.firstChild)
  else raiz.appendChild(nuevo)
  return new XMLSerializer().serializeToString(doc)
}

function parteNueva(clase: Clase): string {
  const etiqueta = clase === 'header' ? 'w:hdr' : 'w:ftr'
  const doc = new DOMParser().parseFromString(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><${etiqueta} xmlns:w="${NS_W}" xmlns:r="${NS_R}"/>`,
    'text/xml'
  )
  const raiz = doc.documentElement
  if (raiz) raiz.appendChild(parrafoMembrete(doc, clase))
  return new XMLSerializer().serializeToString(doc)
}

function rutaDeTarget(target: string): string {
  // Los Target de document.xml.rels son relativos a /word/.
  return target.startsWith('/') ? target.slice(1) : `word/${target.replace(/^\.\//, '')}`
}

export async function agregarMembreteLexit(zip: JSZip): Promise<void> {
  const archivoDoc = zip.file('word/document.xml')
  const archivoRels = zip.file('word/_rels/document.xml.rels')
  const archivoTipos = zip.file('[Content_Types].xml')
  if (!archivoDoc || !archivoRels || !archivoTipos) throw new Error('El archivo no parece ser un .docx válido.')

  const doc = new DOMParser().parseFromString(await archivoDoc.async('text'), 'text/xml')
  const rels = new DOMParser().parseFromString(await archivoRels.async('text'), 'text/xml')
  const tipos = new DOMParser().parseFromString(await archivoTipos.async('text'), 'text/xml')
  const raizRels = rels.documentElement
  const raizTipos = tipos.documentElement
  if (!raizRels || !raizTipos) throw new Error('El archivo no parece ser un .docx válido.')

  // Id de relación → ruta de la parte, y ids ya usados.
  const relaciones = new Map<string, string>()
  const nodosRel = raizRels.getElementsByTagName('Relationship')
  for (let i = 0; i < nodosRel.length; i++) {
    const r = nodosRel.item(i)
    const id = r?.getAttribute('Id')
    const target = r?.getAttribute('Target')
    if (id && target) relaciones.set(id, rutaDeTarget(target))
  }
  const idNuevo = (base: string) => {
    let n = 1
    while (relaciones.has(`${base}${n}`)) n++
    return `${base}${n}`
  }

  const partesMarcadas = new Set<string>()
  const partesCreadas: Record<Clase, string | null> = { header: null, footer: null }

  const secciones = doc.getElementsByTagName('w:sectPr')
  for (const clase of ['header', 'footer'] as Clase[]) {
    const etiquetaRef = clase === 'header' ? 'w:headerReference' : 'w:footerReference'
    let heredaUnoPorDefecto = false

    for (let i = 0; i < secciones.length; i++) {
      const sect = secciones.item(i)
      if (!sect) continue
      const refs = sect.getElementsByTagName(etiquetaRef)
      let tienePorDefecto = false
      for (let j = 0; j < refs.length; j++) {
        const ref = refs.item(j)
        const id = ref?.getAttribute('r:id')
        const ruta = id ? relaciones.get(id) : undefined
        if (ref?.getAttribute('w:type') === 'default') tienePorDefecto = true
        if (ruta && !partesMarcadas.has(ruta)) {
          const parte = zip.file(ruta)
          if (parte) {
            zip.file(ruta, marcarParte(await parte.async('text'), clase))
            partesMarcadas.add(ruta)
          }
        }
      }
      if (tienePorDefecto) {
        heredaUnoPorDefecto = true
        continue
      }
      if (heredaUnoPorDefecto) continue // hereda el de la sección anterior (ya marcado)

      // Ninguna sección anterior tiene: se crea una parte nueva (una sola,
      // compartida) y esta sección la referencia; las siguientes la heredan.
      if (!partesCreadas[clase]) {
        const nombre = `${clase}_lexit.xml`
        const idRel = idNuevo(clase === 'header' ? 'rIdLexitHdr' : 'rIdLexitFtr')
        zip.file(`word/${nombre}`, parteNueva(clase))
        const rel = rels.createElementNS(NS_REL, 'Relationship')
        rel.setAttribute('Id', idRel)
        rel.setAttribute('Type', TIPO_REL[clase])
        rel.setAttribute('Target', nombre)
        raizRels.appendChild(rel)
        relaciones.set(idRel, `word/${nombre}`)
        const override = tipos.createElementNS(NS_CT, 'Override')
        override.setAttribute('PartName', `/word/${nombre}`)
        override.setAttribute('ContentType', TIPO_CONTENIDO[clase])
        raizTipos.appendChild(override)
        partesCreadas[clase] = idRel
      }
      const referencia = doc.createElementNS(NS_W, etiquetaRef)
      referencia.setAttributeNS(NS_W, 'w:type', 'default')
      referencia.setAttributeNS(NS_R, 'r:id', partesCreadas[clase] ?? '')
      // Las referencias van al principio de <w:sectPr> (orden del esquema).
      sect.insertBefore(referencia, sect.firstChild)
      heredaUnoPorDefecto = true
    }
  }

  const serializar = new XMLSerializer()
  zip.file('word/document.xml', serializar.serializeToString(doc))
  zip.file('word/_rels/document.xml.rels', serializar.serializeToString(rels))
  zip.file('[Content_Types].xml', serializar.serializeToString(tipos))
}
