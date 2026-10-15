// =========================
// CLÁUSULAS ADICIONALES (Gestión de contratos)
// Muestra en pantalla las cláusulas adicionales que redacta la IA, en el
// mismo lugar donde la descarga las inserta en el Word original (ver
// functions/src/clausulasDocx.ts): después de la última cláusula y antes
// del cierre ("Sírvase usted, señor Notario...", lugar y fecha, firmas),
// copiando el formato del último encabezado de cláusula y del párrafo que
// lo sigue. No cambian el HTML base del documento (los cambios por párrafo
// se siguen calculando contra el original).
// =========================

export interface ClausulaAdicional {
  encabezado: string
  texto: string
}

const RE_ENCABEZADO = /^\s*CL[ÁA]USULA\s+[A-ZÁÉÍÓÚÑ\s]+[.:-]/i
const RE_CIERRE = /^\s*(?:S[íi]rvase|En se[ñn]al|En fe de lo cual|Estando conformes|Firmado|Suscrito|[^\n]{0,40},\s*(?:_{2,}|\d{1,2})\s+de\s)/i

const textoDe = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()

// Copia de "modelo" con otro texto: conserva la etiqueta, sus clases y
// estilos, y el estilo del primer tramo de texto
function copiaConTexto(modelo: Element, texto: string, claseExtra: string): Element {
  const copia = modelo.cloneNode(false) as Element
  copia.removeAttribute('data-p')
  copia.setAttribute('data-adicional', '')
  if (claseExtra) copia.classList.add(...claseExtra.split(' '))
  const tramo = Array.from(modelo.querySelectorAll('span')).find(s => s.children.length === 0 && (s.textContent ?? '').trim())
  if (tramo) {
    const nuevoTramo = tramo.cloneNode(false) as Element
    nuevoTramo.textContent = texto
    copia.appendChild(nuevoTramo)
  } else {
    copia.textContent = texto
  }
  return copia
}

/** Inserta las cláusulas en el HTML de la vista fiel del Word (docx-preview). */
export function insertarClausulasEnHtml(html: string, clausulas: ClausulaAdicional[], claseExtra = ''): string {
  if (clausulas.length === 0 || !html) return html
  const contenedor = document.createElement('div')
  contenedor.innerHTML = html
  // Párrafos del cuerpo (no los anidados en tablas)
  const parrafos = Array.from(contenedor.querySelectorAll('[data-p]')).filter(p => !p.parentElement?.closest('[data-p], table'))
  const textos = parrafos.map(textoDe)

  const iEncabezado = textos.reduce((ultimo, t, i) => (RE_ENCABEZADO.test(t) ? i : ultimo), -1)
  const modeloEncabezado = parrafos[iEncabezado]
  if (!modeloEncabezado) return html
  const iTexto = textos.findIndex((t, i) => i > iEncabezado && t.length > 30)
  const modeloTexto = parrafos[iTexto] ?? modeloEncabezado
  const iCierre = textos.findIndex((t, i) => i > iEncabezado && RE_CIERRE.test(t))
  const referencia = parrafos[iCierre]
  const padre = referencia?.parentElement ?? parrafos[parrafos.length - 1]?.parentElement
  if (!padre) return html

  for (const c of clausulas) {
    const nuevos = [
      copiaConTexto(modeloEncabezado, c.encabezado, claseExtra),
      ...c.texto.split(/\n+/).map(l => l.trim()).filter(Boolean).map(l => copiaConTexto(modeloTexto, l, claseExtra))
    ]
    for (const n of nuevos) padre.insertBefore(n, referencia ?? null)
  }
  return contenedor.innerHTML
}

/** Igual, para el contrato en texto plano (plantillas PDF o Word sin vista fiel). */
export function insertarClausulasEnTexto(texto: string, clausulas: ClausulaAdicional[]): string {
  if (clausulas.length === 0) return texto
  const bloque = clausulas.map(c => `${c.encabezado}\n${c.texto.trim()}`).join('\n\n')
  const lineas = texto.split('\n')
  const iEncabezado = lineas.reduce((ultimo, l, i) => (RE_ENCABEZADO.test(l) ? i : ultimo), -1)
  const iCierre = lineas.findIndex((l, i) => i > iEncabezado && RE_CIERRE.test(l))
  if (iCierre === -1) return `${texto.trimEnd()}\n\n${bloque}\n`
  return [...lineas.slice(0, iCierre), bloque, '', ...lineas.slice(iCierre)].join('\n')
}
