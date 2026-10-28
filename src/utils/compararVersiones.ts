// =========================
// COMPARAR VERSIONES DE UN CONTRATO (parte determinística, sin IA)
// Lectura y validación de los dos .docx, división en cláusulas,
// emparejamiento entre versiones y diff por palabras. La IA solo explica
// después las cláusulas que cambiaron (ver services/compararVersionesService.ts).
// =========================
import * as mammoth from 'mammoth'
import { diffWordsWithSpace } from 'diff'

export const MAX_BYTES_WORD = 10 * 1024 * 1024
export const MENSAJE_SOLO_DOCX = 'Por ahora la comparación funciona solo con archivos Word (.docx)'

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
// Algunos navegadores/sistemas no informan el tipo, o lo informan genérico
const MIMES_ACEPTADOS = new Set([MIME_DOCX, '', 'application/octet-stream', 'application/zip'])

export class ErrorArchivoWord extends Error {}

/**
 * Valida extensión, tipo, tamaño y que el contenido sea realmente un .docx
 * (un .docx es un ZIP: empieza con "PK"; uno cifrado con contraseña o un
 * .doc antiguo es un archivo OLE: empieza con D0 CF 11 E0).
 * Devuelve el mensaje de error, o null si está bien.
 */
export async function validarArchivoWord(archivo: File): Promise<string | null> {
  if (!/\.docx$/i.test(archivo.name) || !MIMES_ACEPTADOS.has(archivo.type)) return MENSAJE_SOLO_DOCX
  if (archivo.size === 0) return 'El archivo está vacío.'
  if (archivo.size > MAX_BYTES_WORD) return 'El archivo supera los 10 MB. Prueba con una versión más liviana.'

  const cabecera = new Uint8Array(await archivo.slice(0, 4).arrayBuffer())
  const esZip = cabecera[0] === 0x50 && cabecera[1] === 0x4b && cabecera[2] === 0x03 && cabecera[3] === 0x04
  const esOle = cabecera[0] === 0xd0 && cabecera[1] === 0xcf && cabecera[2] === 0x11 && cabecera[3] === 0xe0
  if (esOle) {
    return 'El archivo está protegido con contraseña o es un Word antiguo (.doc). Quita la contraseña o guárdalo como .docx e inténtalo de nuevo.'
  }
  if (!esZip) return 'El archivo está dañado o no es un Word válido.'
  return null
}

const limpiar = (t: string) => t.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Párrafos del documento, en orden, con la numeración automática de las
 * listas reconstruida ("1.", "1.1.", "a)") — mammoth la convierte en
 * <ol>/<li> y se perdería. Las tablas se leen fila por fila.
 */
export function parrafosDesdeHtml(html: string): string[] {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const parrafos: string[] = []

  const recorrerLista = (lista: Element, prefijo: string) => {
    const ordenada = lista.tagName === 'OL'
    let n = 0
    for (const item of Array.from(lista.children)) {
      if (item.tagName !== 'LI') continue
      n++
      const numero = ordenada ? `${prefijo}${n}.` : '•'
      // Texto propio del ítem, sin las sublistas (van como párrafos aparte)
      const copia = item.cloneNode(true) as Element
      copia.querySelectorAll('ol, ul').forEach(sub => sub.remove())
      const texto = limpiar(copia.textContent ?? '')
      if (texto) parrafos.push(`${numero} ${texto}`)
      for (const sub of Array.from(item.children)) {
        if (sub.tagName === 'OL' || sub.tagName === 'UL') recorrerLista(sub, ordenada ? `${prefijo}${n}.` : prefijo)
      }
    }
  }

  const recorrer = (nodo: Element) => {
    for (const hijo of Array.from(nodo.children)) {
      const etiqueta = hijo.tagName
      if (etiqueta === 'OL' || etiqueta === 'UL') {
        recorrerLista(hijo, '')
      } else if (etiqueta === 'TABLE') {
        hijo.querySelectorAll('tr').forEach(fila => {
          const celdas = Array.from(fila.children).map(c => limpiar(c.textContent ?? '')).filter(Boolean)
          if (celdas.length) parrafos.push(celdas.join(' | '))
        })
      } else if (/^(P|H[1-6]|BLOCKQUOTE|PRE)$/.test(etiqueta)) {
        const texto = limpiar(hijo.textContent ?? '')
        if (texto) parrafos.push(texto)
      } else {
        recorrer(hijo)
      }
    }
  }

  recorrer(doc.body)
  return parrafos
}

export interface DocumentoComparable {
  nombre: string
  parrafos: string[]
}

/** Lee un .docx ya validado y devuelve sus párrafos. Lanza ErrorArchivoWord con un mensaje claro. */
export async function leerDocumentoComparable(archivo: File): Promise<DocumentoComparable> {
  let html: string
  try {
    const { value } = await mammoth.convertToHtml({ arrayBuffer: await archivo.arrayBuffer() })
    html = value
  } catch {
    throw new ErrorArchivoWord('No se pudo leer el archivo: puede estar dañado o protegido.')
  }
  const parrafos = parrafosDesdeHtml(html)
  if (parrafos.length === 0) throw new ErrorArchivoWord('El documento no tiene texto para comparar.')
  return { nombre: archivo.name, parrafos }
}

// =========================
// DIVIDIR EN CLÁUSULAS
// Una cláusula empieza en un encabezado: ordinal ("PRIMERA.-", "DÉCIMO
// SEGUNDA:"), "CLÁUSULA 5", "ARTÍCULO 5" o, si el documento no usa
// ordinales, un número de primer nivel ("5. OBJETO"). Los títulos de
// sección en mayúsculas ("PLAZO:", "OBLIGACIONES DEL COMODATARIO") se
// guardan como subtítulo de la cláusula que sigue. Lo que va antes de la
// primera cláusula (partes, comparecencia) es el "Encabezado".
// =========================
export interface Clausula {
  // Número de la cláusula (1, 2, 3...) o null para el encabezado/sin número
  numero: number | null
  titulo: string
  parrafos: string[]
  texto: string
  // Texto sin el encabezado ("PRIMERA.-"), para no contar una
  // renumeración como cambio de contenido
  cuerpo: string
  // Título de sección tal como está en el documento ("OBLIGACIONES DEL
  // COMODATARIO"), si la cláusula tenía uno antes: va en el título, no en
  // el texto, y el documento comparado lo vuelve a mostrar
  seccion?: string
}

const sinTildes = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const UNIDADES: Record<string, number> = {
  PRIMER: 1, PRIMERA: 1, PRIMERO: 1, SEGUNDA: 2, SEGUNDO: 2, TERCER: 3, TERCERA: 3, TERCERO: 3,
  CUARTA: 4, CUARTO: 4, QUINTA: 5, QUINTO: 5, SEXTA: 6, SEXTO: 6, SEPTIMA: 7, SEPTIMO: 7,
  SETIMA: 7, SETIMO: 7, OCTAVA: 8, OCTAVO: 8, NOVENA: 9, NOVENO: 9
}
const DECENAS: Record<string, number> = {
  DECIMA: 10, DECIMO: 10, VIGESIMA: 20, VIGESIMO: 20, TRIGESIMA: 30, TRIGESIMO: 30, CUADRAGESIMA: 40, CUADRAGESIMO: 40
}
const ESPECIALES: Record<string, number> = { UNDECIMA: 11, UNDECIMO: 11, DUODECIMA: 12, DUODECIMO: 12 }

// "DÉCIMO PRIMERA", "DECIMOPRIMERA", "VIGÉSIMA-SEGUNDA", "UNDÉCIMA", "PRIMERA"
const RE_ORDINAL = /^\s*(?:CLAUSULA\s+)?((?:DECIM[AO]|VIGESIM[AO]|TRIGESIM[AO]|CUADRAGESIM[AO])\s*-?\s*(?:PRIMER[AO]?|SEGUND[AO]|TERCER[AO]?|CUART[AO]|QUINT[AO]|SEXT[AO]|SEPTIM[AO]|SETIM[AO]|OCTAV[AO]|NOVEN[AO])|UNDECIM[AO]|DUODECIM[AO]|DECIM[AO]|VIGESIM[AO]|TRIGESIM[AO]|CUADRAGESIM[AO]|PRIMER[AO]?|SEGUND[AO]|TERCER[AO]?|CUART[AO]|QUINT[AO]|SEXT[AO]|SEPTIM[AO]|SETIM[AO]|OCTAV[AO]|NOVEN[AO])\b\s*(?:[.:\-–—)]|$)/
const RE_CLAUSULA_NUMERO = /^\s*(?:CLAUSULA|ARTICULO)\s+(?:N[°º.]?\s*)?(\d{1,3})\b/
const RE_NUMERO = /^\s*(\d{1,3})\s*(?:\.-|[.)–—-])\s*\S/

function numeroOrdinal(palabra: string): number | null {
  const p = palabra.replace(/[\s-]+/g, '')
  if (ESPECIALES[p] !== undefined) return ESPECIALES[p]
  if (UNIDADES[p] !== undefined) return UNIDADES[p]
  if (DECENAS[p] !== undefined) return DECENAS[p]
  for (const [decena, valor] of Object.entries(DECENAS)) {
    if (p.startsWith(decena)) {
      const unidad = UNIDADES[p.slice(decena.length)]
      if (unidad !== undefined) return valor + unidad
    }
  }
  return null
}

interface Encabezado { numero: number; etiqueta: string; largo: number }

function encabezadoOrdinal(parrafo: string): Encabezado | null {
  const mayus = sinTildes(parrafo).toUpperCase()
  const m = RE_ORDINAL.exec(mayus)
  if (m?.[1]) {
    const numero = numeroOrdinal(m[1])
    if (numero !== null) return { numero, etiqueta: parrafo.slice(0, m[0].length).replace(/[.:\-–—)\s]+$/, '').trim(), largo: m[0].length }
  }
  const c = RE_CLAUSULA_NUMERO.exec(mayus)
  if (c?.[1]) return { numero: Number(c[1]), etiqueta: parrafo.slice(0, c[0].length).trim(), largo: c[0].length }
  return null
}

function encabezadoNumerico(parrafo: string): Encabezado | null {
  // Solo primer nivel ("5. Objeto"); "5.1" es parte de la cláusula 5
  if (/^\s*\d{1,3}\.\d/.test(parrafo)) return null
  const m = RE_NUMERO.exec(parrafo)
  if (!m?.[1] || parrafo.length > 400) return null
  const sinCorte = m[0].slice(0, -1)
  return { numero: Number(m[1]), etiqueta: `${m[1]}.`, largo: sinCorte.length }
}

// Título de sección: línea corta, casi toda en mayúsculas, sin punto final
function esTituloDeSeccion(parrafo: string): boolean {
  const letras = parrafo.match(/\p{L}/gu) ?? []
  if (parrafo.length > 90 || letras.length < 3 || /[.;]$/.test(parrafo.trim())) return false
  const mayusculas = letras.filter(l => l === l.toUpperCase() && l !== l.toLowerCase()).length
  return mayusculas / letras.length > 0.85
}

// Inicio del bloque de cierre y firmas ("En señal de conformidad...",
// "En fe de lo cual...", líneas de firma): va como un bloque aparte para
// que no se pegue a la última cláusula (si esta se elimina o se agrega
// otra, las firmas no deben aparecer como cambio).
const RE_CIERRE = /^(?:en senal de conformidad|en senal de aceptacion|en fe de lo cual|estando conformes|firmado en|suscriben|suscrito en|_{4,})/

function esInicioDeCierre(parrafo: string): boolean {
  return RE_CIERRE.test(sinTildes(parrafo.trim().toLowerCase()))
}

const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
const limpiarTitulo = (t: string) => capitalizar(t.replace(/[:.\-–—]+$/, '').trim())

export function dividirEnClausulas(parrafos: string[]): Clausula[] {
  // Si el documento usa ordinales / "Cláusula N", los números sueltos
  // ("1. Utilizar el bien...") son incisos, no cláusulas.
  const conOrdinal = parrafos.filter(p => encabezadoOrdinal(p)).length
  const detectar = conOrdinal >= 2 ? encabezadoOrdinal : (p: string) => encabezadoOrdinal(p) ?? encabezadoNumerico(p)

  const clausulas: Clausula[] = []
  let actual: { numero: number | null; titulo: string; parrafos: string[]; largoEncabezado: number; seccion?: string } | null = null
  let seccionPendiente = ''
  let seccionCruda = ''

  const cerrar = () => {
    if (!actual || actual.parrafos.length === 0) return
    const texto = actual.parrafos.join('\n')
    const cuerpo = [actual.parrafos[0]!.slice(actual.largoEncabezado), ...actual.parrafos.slice(1)].join('\n').trim()
    clausulas.push({ numero: actual.numero, titulo: actual.titulo, parrafos: actual.parrafos, texto, cuerpo, ...(actual.seccion ? { seccion: actual.seccion } : {}) })
  }

  let enCierre = false
  for (const parrafo of parrafos) {
    if (enCierre) {
      actual!.parrafos.push(parrafo)
      continue
    }
    if (clausulas.length + (actual ? 1 : 0) > 0 && esInicioDeCierre(parrafo)) {
      cerrar()
      // El título de sección que venía ("CONFORMIDAD") se descarta: el
      // bloque tiene su propio nombre
      seccionPendiente = ''
      actual = { numero: null, titulo: 'Cierre y firmas', parrafos: [parrafo], largoEncabezado: 0 }
      enCierre = true
      continue
    }
    const encabezado = detectar(parrafo)
    if (encabezado) {
      cerrar()
      const base = `Cláusula ${encabezado.etiqueta.toLowerCase()}`
      actual = {
        numero: encabezado.numero,
        titulo: seccionPendiente ? `${base} · ${seccionPendiente}` : base,
        parrafos: [parrafo],
        largoEncabezado: encabezado.largo,
        ...(seccionPendiente ? { seccion: seccionCruda } : {})
      }
      seccionPendiente = ''
      continue
    }
    if (esTituloDeSeccion(parrafo) && clausulas.length + (actual ? 1 : 0) > 0) {
      // Título de la sección que viene: se guarda para la próxima cláusula
      seccionPendiente = limpiarTitulo(parrafo)
      seccionCruda = parrafo
      continue
    }
    if (!actual) {
      actual = { numero: null, titulo: 'Encabezado y partes', parrafos: [], largoEncabezado: 0 }
    }
    if (seccionPendiente) {
      // Un título de sección sin cláusula numerada después: queda como texto
      actual.parrafos.push(seccionPendiente.toUpperCase())
      seccionPendiente = ''
    }
    actual.parrafos.push(parrafo)
  }
  cerrar()
  return clausulas
}

// =========================
// EMPAREJAR CLÁUSULAS ENTRE VERSIONES
// Alineación en orden (como un diff de líneas, pero con cláusulas): se
// empareja por parecido del texto, con un plus si conservan el número.
// Así una cláusula nueva en el medio no hace que todas las siguientes se
// vean "modificadas" por la renumeración.
// =========================
const palabras = (t: string) => new Set(sinTildes(t.toLowerCase()).split(/[^a-z0-9ñ]+/).filter(w => w.length > 2))

function parecido(a: Clausula, b: Clausula): number {
  const pa = palabras(a.cuerpo || a.texto)
  const pb = palabras(b.cuerpo || b.texto)
  if (pa.size === 0 && pb.size === 0) return 1
  let comunes = 0
  for (const w of pa) if (pb.has(w)) comunes++
  return comunes / (pa.size + pb.size - comunes)
}

const UMBRAL_PARECIDO = 0.3

export function emparejarClausulas(originales: Clausula[], modificadas: Clausula[]): [Clausula | null, Clausula | null][] {
  const n = originales.length
  const m = modificadas.length
  const puntaje = (i: number, j: number) => {
    const a = originales[i]!
    const b = modificadas[j]!
    const s = parecido(a, b) + (a.numero !== null && a.numero === b.numero ? 0.15 : 0)
    return s >= UMBRAL_PARECIDO ? s : -1
  }
  // Programación dinámica: mejor suma de parecidos respetando el orden
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  const cache: number[][] = Array.from({ length: n }, () => new Array<number>(m).fill(Number.NaN))
  const p = (i: number, j: number) => {
    const fila = cache[i]!
    if (Number.isNaN(fila[j]!)) fila[j] = puntaje(i, j)
    return fila[j]!
  }
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const s = p(i, j)
      dp[i]![j] = Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!, s >= 0 ? s + dp[i + 1]![j + 1]! : -Infinity)
    }
  }
  const pares: [Clausula | null, Clausula | null][] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    const s = p(i, j)
    if (s >= 0 && dp[i]![j] === s + dp[i + 1]![j + 1]!) {
      pares.push([originales[i]!, modificadas[j]!])
      i++
      j++
    } else if (dp[i]![j] === dp[i + 1]![j]) {
      pares.push([originales[i]!, null])
      i++
    } else {
      pares.push([null, modificadas[j]!])
      j++
    }
  }
  while (i < n) pares.push([originales[i++]!, null])
  while (j < m) pares.push([null, modificadas[j++]!])
  return pares
}

// =========================
// COMPARAR: diff por palabras y clasificación
// =========================
export type TipoCambio = 'sin_cambios' | 'modificada' | 'agregada' | 'eliminada'

export interface TramoDiff {
  texto: string
  tipo: 'igual' | 'agregado' | 'eliminado'
}

export interface CambioClausula {
  id: string
  tipo: TipoCambio
  titulo: string
  textoOriginal: string
  textoModificado: string
  tramos: TramoDiff[]
  // La cláusula solo cambió de número (su contenido es igual)
  renumerada: boolean
  // Títulos de sección de cada versión (ver Clausula.seccion)
  seccionOriginal?: string
  seccionModificada?: string
}

export interface ResultadoComparacion {
  cambios: CambioClausula[]
  totales: Record<TipoCambio, number>
}

const normalizarEspacios = (t: string) => t.replace(/\s+/g, ' ').trim()

export function compararDocumentos(original: string[], modificada: string[]): ResultadoComparacion {
  const pares = emparejarClausulas(dividirEnClausulas(original), dividirEnClausulas(modificada))
  const totales: Record<TipoCambio, number> = { sin_cambios: 0, modificada: 0, agregada: 0, eliminada: 0 }

  const cambios = pares.map(([a, b], indice): CambioClausula => {
    const textoOriginal = a?.texto ?? ''
    const textoModificado = b?.texto ?? ''
    let tipo: TipoCambio
    let renumerada = false
    if (a && b) {
      const igualTexto = normalizarEspacios(a.texto) === normalizarEspacios(b.texto)
      const igualCuerpo = normalizarEspacios(a.cuerpo) === normalizarEspacios(b.cuerpo)
      tipo = igualTexto || igualCuerpo ? 'sin_cambios' : 'modificada'
      renumerada = !igualTexto && igualCuerpo
    } else {
      tipo = a ? 'eliminada' : 'agregada'
    }
    totales[tipo]++

    const tramos: TramoDiff[] = tipo === 'modificada'
      ? diffWordsWithSpace(textoOriginal, textoModificado).map(parte => ({
          texto: parte.value,
          tipo: parte.added ? 'agregado' : parte.removed ? 'eliminado' : 'igual'
        }))
      : tipo === 'agregada'
        ? [{ texto: textoModificado, tipo: 'agregado' }]
        : tipo === 'eliminada'
          ? [{ texto: textoOriginal, tipo: 'eliminado' }]
          : [{ texto: textoModificado, tipo: 'igual' }]

    return {
      id: `clausula-${indice}`,
      tipo,
      // El título de la versión modificada manda (si existe)
      titulo: (b ?? a)!.titulo,
      textoOriginal,
      textoModificado,
      tramos,
      renumerada,
      ...(a?.seccion ? { seccionOriginal: a.seccion } : {}),
      ...(b?.seccion ? { seccionModificada: b.seccion } : {})
    }
  })

  return { cambios, totales }
}
