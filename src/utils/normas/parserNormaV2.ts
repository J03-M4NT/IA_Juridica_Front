// =========================
// PARSER DE NORMAS v2 (mejora de Consultas, fase 1)
// Corta el texto de una norma en UN FRAGMENTO POR ARTÍCULO y separa todo lo
// que no es texto de ley vigente:
//   - jurisprudencia y concordancias de las ediciones anotadas (MINJUS),
//   - ensayos de doctrina intercalados entre libros,
//   - versiones anteriores de artículos modificados (SPIJ: "(*) Artículo
//     modificado por ..., cuyo texto es el siguiente:"),
//   - notas al final del documento (ediciones SUNAT: "25 . Incorporado por...").
// Además detecta la vigencia de cada artículo ("Derogado por...",
// "DEROGADOS", notas de modificación) y su ubicación (libro, título,
// capítulo).
//
// Reconoce los encabezados de las ediciones que hoy fallan:
//   "Art. 1.– El Impuesto..." (abreviado y con raya "–", Ley del IR),
//   "Artículo 1.– Operaciones gravadas" (raya "–", IGV y reglamentos),
//   "Artículo 1 1º .-" (dígitos separados por la extracción del PDF),
//   "Artículos 1055 º al 1066 º .- DEROGADOS" (rangos derogados).
//
// Es puro (sin DOM ni red): se prueba en Node y no cambia nada de lo que
// sube hoy el panel Admin (pineconeService.ts sigue con el corte actual
// hasta que se apruebe el cambio).
// =========================

export type TipoAnotacion = 'jurisprudencia' | 'concordancia' | 'doctrina' | 'nota' | 'version-anterior' | 'preambulo'
export type Vigencia = 'vigente' | 'modificado' | 'derogado'

export interface ArticuloV2 {
  // "140", "108-A", "unico", "1055-1066", "DCF-1"
  clave: string
  numero: number | null
  letra?: string
  sumilla?: string
  jerarquia: string[]
  // Solo el texto de ley vigente (sin jurisprudencia, notas ni versiones anteriores)
  texto: string
  vigencia: Vigencia
  notasVigencia: string[]
  // Texto partido en trozos de hasta MAX_LONGITUD_PARTE (casi siempre uno)
  partes: string[]
}

export interface AnotacionV2 {
  tipo: TipoAnotacion
  texto: string
  articuloRelacionado?: string
}

export interface ResultadoParserV2 {
  formato: string
  articulos: ArticuloV2[]
  anotaciones: AnotacionV2[]
  estadisticas: {
    caracteresTexto: number
    caracteresEnArticulos: number
    caracteresEnAnotaciones: number
    articulosDistintos: number
    derogados: number
    modificados: number
  }
  avisos: string[]
}

export const MAX_LONGITUD_PARTE = 2000

// =========================
// LIMPIEZA (igual que el corte actual): pies de página del MINJUS con letras sueltas
// =========================
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

// Rayas tipográficas (– — ‒ ‐ ‑ ―) → guion, y espacio duro → espacio.
// Se reemplaza carácter por carácter, así las posiciones no cambian.
function normalizarSignos(texto: string): string {
  return texto.replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\u00a0/g, ' ')
}

function limpiar(texto: string): string {
  return normalizarSignos(texto)
    .replace(PIE_DECRETO_REGEX, ' ')
    .replace(PIE_MINISTERIO_REGEX, ' ')
    // Títulos con letras separadas por la tipografía ("T Í TULO I", "CAP Í TULO I", "SECCI Ó N")
    .replace(/(T|CAP)\s?([ÍI])\s?TULO/g, '$1$2TULO')
    .replace(/SECCI\s?([ÓO])\s?N/g, 'SECCI$1N')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
}

function partirSinPerderTexto(texto: string, max: number): string[] {
  const piezas = texto.split(/(?<=[.;:])\s+/)
  const trozos: string[] = []
  let actual = ''
  for (const pieza of piezas) {
    if (actual && actual.length + 1 + pieza.length > max) {
      trozos.push(actual)
      actual = pieza
    } else {
      actual = actual ? `${actual} ${pieza}` : pieza
    }
  }
  if (actual.trim()) trozos.push(actual)
  return trozos.flatMap(t => (t.length > max * 1.5 ? t.match(new RegExp(`[\\s\\S]{1,${max}}`, 'g')) ?? [t] : [t]))
}

// Índice del PDF: líneas "Nulidad ........ 213" (puntos de relleno y número de
// página) que son buena parte del bloque. Las ediciones SUNAT marcan incisos
// derogados con puntos ("b) ......... (28)"): eso no es un índice.
function esIndiceDelDocumento(texto: string): boolean {
  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean)
  const deIndice = lineas.filter(l => /\.{6,}\s*\d{1,4}$/.test(l)).length
  return deIndice >= 3 && deIndice >= lineas.length * 0.3
}

// =========================
// NOTAS AL FINAL (ediciones SUNAT): "25 . Incorporado por D. Leg. 945 (pub. 23-12-03)"
// Se buscan desde el final hacia atrás; deben ser al menos 10 y en orden.
// =========================
const LINEA_NOTA_FINAL = /^\s*(\d{1,3})\s?\.\s+\S/

function separarNotasFinales(texto: string): { cuerpo: string; notas: Map<number, string> } {
  const lineas = texto.split('\n')
  const notas = new Map<number, string>()
  let inicio = lineas.length
  let esperado: number | null = null
  let pendiente: string[] = []
  for (let i = lineas.length - 1; i >= 0; i--) {
    const linea = lineas[i] ?? ''
    const m = LINEA_NOTA_FINAL.exec(linea)
    if (m) {
      const n = Number(m[1])
      // En orden descendente, tolerando notas que la extracción pegó a otra línea
      if (esperado !== null && (n >= esperado || esperado - n > 5)) break
      notas.set(n, [linea.replace(/^\s*\d{1,3}\s?\.\s+/, '').trim(), ...pendiente.reverse()].join(' ').trim())
      pendiente = []
      esperado = n
      inicio = i
      if (n === 1) break
    } else {
      if (linea.trim()) pendiente.push(linea.trim())
      // Demasiado texto sin ninguna nota: ya no es la zona de notas
      if (pendiente.length > 60) break
    }
  }
  if (notas.size < 10) return { cuerpo: texto, notas: new Map() }
  return { cuerpo: lineas.slice(0, inicio).join('\n'), notas }
}

// =========================
// ENCABEZADOS DE ARTÍCULO
// Número: dígitos que la extracción a veces separa ("1 1º" = 11).
// Letra: "108 ° -C", "14-A", "5-A".
// Variantes de cierre, de más estricta a más flexible; se elige la que
// reconoce más artículos propios de la norma (igual que el corte actual).
// =========================
const PREFIJO = String.raw`(?:Art[íi]culo|ART[ÍI]CULO|Art\.)`
// El punto puede ir antes del símbolo de grado ("Artículo 543. º -", Código Civil MINJUS)
const NUMERO = String.raw`(\d(?: ?\d){0,3})\s*(?:\.\s*(?=[°º]))?[°º]?`
const LETRA = String.raw`(?:\s*-\s*([A-Z])(?![a-záéíóúñ])\s*[°º]?)?`

const VARIANTES: Array<{ nombre: string; regex: RegExp }> = [
  // "Artículo 140 º .-", "Art. 14-A.-", "Artículo 1.- " (raya ya normalizada)
  { nombre: 'clasico', regex: new RegExp(`${PREFIJO}\\s*${NUMERO}${LETRA}(?:\\s*\\.\\s*-|\\s*-(?=\\s))`, 'g') },
  // Igual, o con la sumilla ENTRE el número y el ".-" (Nuevo Código Procesal Penal)
  {
    nombre: 'con-sumilla',
    regex: new RegExp(`${PREFIJO}\\s*${NUMERO}${LETRA}(?:\\s*\\.\\s*-|\\s+(?=[A-ZÁÉÍÓÚÑ][^.\\n]{2,160}?\\s*\\.(?:\\s*-|[ \\t]*\\n))|\\s+(?=[A-ZÁÉÍÓÚÑ][^\\n]{2,200}?\\.\\s*-))`, 'g')
  },
  // SPIJ: "Artículo 1. Objeto de la Ley" al inicio de línea (con comillas opcionales)
  {
    nombre: 'spij',
    regex: new RegExp(`(?<=^|\\n)[ \\t]*[“"]?\\s*${PREFIJO}\\s*${NUMERO}${LETRA}(?:\\s*\\.\\s*-|\\.\\s+(?=[A-ZÁÉÍÓÚÑ“"(])|\\s*\\.?\\s*-\\s+)`, 'g')
  }
]

const RANGO_DEROGADO = new RegExp(`Art[íi]culos\\s+${NUMERO}\\s*(?:al|a|y)\\s*${NUMERO}\\s*\\.?\\s*-\\s*(?:\\(?\\s*DEROGADOS?|Derogados?)`, 'g')
const ARTICULO_UNICO = /(?<=^|\n)[ \t]*(?:Art[íi]culo|ART[ÍI]CULO)\s+[ÚU]nico\s*\.?\s*-?/g

interface Candidato {
  indice: number
  fin: number
  numero: number
  letra?: string
  orden: number
  // Rango derogado: último número del rango
  hasta?: number
  unico?: boolean
}

function candidatosCon(texto: string, regex: RegExp): Candidato[] {
  return [...texto.matchAll(regex)].map(m => {
    const numero = Number((m[1] ?? '').replace(/ /g, ''))
    const letra = m[2]?.toUpperCase()
    const indice = (m.index ?? 0) + (m[0].length - m[0].trimStart().length)
    return { indice, fin: (m.index ?? 0) + m[0].length, numero, ...(letra ? { letra } : {}), orden: numero * 100 + (letra ? letra.charCodeAt(0) - 64 : 0) }
  })
}

// Solo encabezados en orden creciente (ver el corte actual): una cita
// "Artículo 696.-" dentro de una nota, o la repetición de un artículo
// modificado en SPIJ, no abre uno nuevo.
function secuenciaDesde(candidatos: Candidato[], inicio: number): Candidato[] {
  const aceptados: Candidato[] = []
  let ultimo = 0
  candidatos.slice(inicio).forEach((c, k) => {
    if (c.orden <= ultimo) return
    const saltoNormal = ultimo === 0 || c.numero - Math.floor(ultimo / 100) <= 50
    const siguiente = candidatos.slice(inicio + k + 1).find(s => s.orden !== c.orden)
    const confirmado = !siguiente || (siguiente.orden > c.orden && siguiente.numero - c.numero <= 5)
    if (saltoNormal || confirmado) {
      aceptados.push(c)
      ultimo = c.hasta !== undefined ? c.hasta * 100 + 99 : c.orden
    }
  })
  return aceptados
}

function mejorSecuencia(candidatos: Candidato[]): Candidato[] {
  // El decreto que promulga un código trae su propio "Artículo 1.-": se
  // prueba empezar en cada "Artículo 1" y queda la secuencia más larga.
  let mejor: Candidato[] = []
  const inicios = [0, ...candidatos.flatMap((c, k) => (c.numero === 1 && !c.letra && k > 0 ? [k] : []))]
  for (const inicio of inicios) {
    const s = secuenciaDesde(candidatos, inicio)
    if (s.length >= mejor.length) mejor = s
  }
  return mejor
}

function cobertura(secuencia: Candidato[]): number {
  const numeros = new Set(secuencia.map(c => c.numero))
  const tope = numeros.size * 1.2 + 5
  return [...numeros].filter(n => n <= tope).length
}

// =========================
// ESTRUCTURA (libro, sección, título, capítulo)
// =========================
const ENCABEZADO_JERARQUIA = /^(LIBRO|SECCI[ÓO]N|T[ÍI]TULO|SUBT[ÍI]TULO|CAP[ÍI]TULO|SUBCAP[ÍI]TULO|SUB-CAP[ÍI]TULO)\s+(?:[IVXLCDM]+|\d+|[ÚU]NICO|PRELIMINAR|PRIMER[OA]?|SEGUND[OA]|TERCER[OA]?|CUART[OA]|QUINT[OA]|SEXT[OA]|S[ÉE]PTIM[OA]|OCTAV[OA]|NOVEN[OA]|D[ÉE]CIM[OA]\w*)\b/i
const NIVEL: Record<string, number> = { LIBRO: 0, SECCION: 1, TITULO: 2, SUBTITULO: 3, CAPITULO: 4, SUBCAPITULO: 5, 'SUB-CAPITULO': 5 }

function nivelDe(linea: string): number | null {
  const m = ENCABEZADO_JERARQUIA.exec(linea.trim())
  if (!m) return null
  const clave = (m[1] ?? '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return NIVEL[clave] ?? null
}

// Nombre que sigue a un encabezado en su propia línea ("SECCIÓN TERCERA" →
// "DERECHOS REALES PRINCIPALES"; "TÍTULO I" → "Disposiciones Generales")
// Una sumilla real es corta y no es una nota ("(*) ...", "...cuyo texto es el siguiente:")
function pareceSumilla(texto: string): boolean {
  // Debe tener palabras: "65 . 5" (llamadas a nota sueltas) no es sumilla
  return texto.length > 0 && texto.length <= 150 && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/.test(texto) && !/[:;,]$/.test(texto) && !/^\(\*/.test(texto) && !/texto\s+es\s+el\s+siguiente/i.test(texto)
}

function esNombreDeEncabezado(linea: string): boolean {
  const l = linea.trim()
  return l.length > 2 && l.length <= 100 && !/[.;:,]$/.test(l) && nivelDe(l) === null && /^[A-ZÁÉÍÓÚÑ]/.test(l) && !/^Art[íi]culo|^Art\./.test(l)
}

// Recorre líneas: separa los encabezados de estructura (con su nombre) y
// devuelve lo que queda después del último (la sumilla, si la hay).
function encabezadosDeEstructura(lineas: string[], sinSumillaAntes = false): { encabezados: Array<{ nivel: number; titulo: string }>; resto: string[] } {
  const limpias = lineas.map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const encabezados: Array<{ nivel: number; titulo: string }> = []
  let ultimo = -1
  for (let i = 0; i < limpias.length; i++) {
    const linea = limpias[i] ?? ''
    const nivel = linea.length < 160 ? nivelDe(linea) : null
    if (nivel === null) continue
    let titulo = linea
    const siguiente = limpias[i + 1]
    // El nombre se une si no es la última línea (esa sería la sumilla del
    // artículo), salvo que esté en mayúsculas: las sumillas nunca lo están
    const esUltima = i + 1 >= limpias.length - 1
    if (siguiente && esNombreDeEncabezado(siguiente) && titulo.split(' ').length <= 3 && (!esUltima || sinSumillaAntes || siguiente === siguiente.toUpperCase())) {
      titulo = `${titulo} ${siguiente}`
      i++
    }
    encabezados.push({ nivel, titulo })
    ultimo = i
  }
  return { encabezados, resto: limpias.slice(ultimo + 1) }
}

// =========================
// ANOTACIONES DENTRO DEL CUERPO DE UN ARTÍCULO
// =========================
const MARCA_JURISPRUDENCIA = /^(?:JURISPRUDENCIA|Casaci[óo]n\s+N|Cas\.\s*N|Sentencia\s+(?:recaída|del|de\s+fecha|N)|Precedente\s+de\s+Observancia|Acuerdo\s+Plenario|Pleno\s+(?:Jurisdiccional|Casatorio)|Exp(?:ediente)?\.?\s*N|STC\s|Resoluci[óo]n\s+N.{0,60}(?:Sala|Tribunal))/i
const CITA_JURISPRUDENCIAL = /\((?:Considerandos?|Fj\.?|Fundamentos?(?:\s+jur[íi]dicos?)?)\s/i
const MARCA_CONCORDANCIA = /^(?:CONCORDANCIAS?(?:\s+JURISPRUDENCIALES?)?\s*:|CONCORDANCIA\s*:)/i
const MARCA_DOCTRINA = /\[\s*LIBRO\s+[IVXL]+\s*\]|\bSumario\s*:/i
// SPIJ: "(*) Artículo modificado por el Artículo 1 de la Ley N° 30171, publicada el 10 marzo 2014, cuyo texto es el siguiente:"
const MARCA_NOTA_SPIJ = /^\(\*+\)\s*(.{0,400})$/s
const CAMBIO_TOTAL = /^(?:Art[íi]culo|Texto)\s+(?:modificad|sustituid|incorporad)\w*\b.*texto\s+es\s+el\s+siguiente/i
const CAMBIO_PARCIAL = /^(?:P[áa]rrafo|Numeral|Inciso|Literal|Pen[úu]ltimo|[ÚU]ltimo|Primer|Segundo|Tercer|Cuarto|Quinto|Sexto|Acápite|Sub\s*numeral)\b.*(?:modificad|sustituid|incorporad)\w*\b.*texto\s+es\s+el\s+siguiente/i
// MINJUS: nota a pie de página "144 Artículo modificado por el Artículo 2º de la Ley Nº 27495..."
const NOTA_PIE_MINJUS = /^(\d{1,3})\s+(?:Art[íi]culo|Extremo|Denominaci[óo]n|Ep[íi]grafe|Sumilla|Rubro|Disposici[óo]n|Inciso|P[áa]rrafo|Numeral|Literal|Texto|Libro|T[íi]tulo|Cap[íi]tulo|Secci[óo]n|Pen[úu]ltimo|[ÚU]ltimo|Primer|Segundo|Tercer|Cuarto|Quinto)\b.{0,160}?(?:modificad|sustituid|incorporad|derogad|vigente|adicionad|agregad)/i
const NOTA_PIE_CITA = /^(\d{1,3})\s+(?:De\s+conformidad|Conforme|Mediante|Seg[úu]n|Por\s+(?:Ley|Decreto|Resoluci[óo]n)|Ver\s|V[ée]ase|Concordancia)\b.{0,300}?(?:Ley|Decreto|Resoluci[óo]n|C[óo]digo)\b/i
const DEROGACION = /\b(?:derogad[oa]s?|dejad[oa]s?\s+sin\s+efecto|declarad[oa]\s+inconstitucional)\b/i
const MODIFICACION = /\b(?:modificad[oa]|sustituid[oa]|incorporad[oa])\b/i

function quitarMarcasSpij(texto: string): string {
  return texto
    .replace(/\s*\(\*+\)\s*/g, ' ')
    .replace(/^[\s“”"]+|[\s“”"]+$/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

interface CuerpoProcesado {
  texto: string
  // Notas a pie (MINJUS) halladas en el bloque y llamadas a nota del texto
  notasPie: Array<{ numero: number; texto: string }>
  llamadas: number[]
  anotaciones: AnotacionV2[]
  notasVigencia: string[]
  vigencia: Vigencia
  jerarquiaSiguiente: Array<{ nivel: number; titulo: string }>
}

// Divide el cuerpo en párrafos y clasifica cada uno.
function procesarCuerpo(cuerpo: string, clave: string): CuerpoProcesado {
  const anotaciones: AnotacionV2[] = []
  const notasVigencia: string[] = []
  const jerarquiaSiguiente: Array<{ nivel: number; titulo: string }> = []
  // Estructura que aparece dentro del ensayo (va después de la del cuerpo)
  const jerarquiaDoctrina: Array<{ nivel: number; titulo: string }> = []
  let vigencia: Vigencia = 'vigente'

  // 1. Ensayo de doctrina intercalado (portada de libro "Acto Jurídico [ LIBRO II ]" o "Sumario:")
  const posDoctrina = cuerpo.search(MARCA_DOCTRINA)
  if (posDoctrina > 0) {
    const puntoPrevio = cuerpo.lastIndexOf('.', posDoctrina - 1)
    const corte = puntoPrevio !== -1 && posDoctrina - puntoPrevio <= 80 ? puntoPrevio + 1 : posDoctrina
    const doctrina = cuerpo.slice(corte).trim()
    if (doctrina.length > 40) anotaciones.push({ tipo: 'doctrina', texto: doctrina, articuloRelacionado: clave })
    // La portada nombra el libro que empieza ("Acto Jurídico [ LIBRO II ]")
    const portada = /([^.[\]]{3,160})\[\s*LIBRO\s+([IVXL]+)\s*\]/i.exec(doctrina)
    if (portada) {
      // El nombre son las últimas líneas antes de "[ LIBRO II ]" ("Acto\nJurídico")
      const nombre = (portada[1] ?? '').split('\n').map(l => l.trim()).filter(Boolean).slice(-2).join(' ')
      jerarquiaDoctrina.push({ nivel: 0, titulo: `LIBRO ${portada[2] ?? ''} ${nombre}`.trim() })
    }
    // Al final del ensayo vienen los títulos y capítulos del libro, antes del primer artículo
    jerarquiaDoctrina.push(...encabezadosDeEstructura(doctrina.slice(-800).split('\n')).encabezados)
    cuerpo = cuerpo.slice(0, corte)
  }

  // 2. Párrafos. Una nota a pie MINJUS pegada al final de un párrafo
  // ("...al. 43 Artículo modificado por...") empieza su propio párrafo.
  cuerpo = cuerpo.replace(
    /([.;:”"])\s+(\d{1,3}\s+(?:(?:Primer|Segundo|Tercer|Cuarto|Quinto|[ÚU]ltimo|Pen[úu]ltimo)\s+p[áa]rrafo|Art[íi]culo|Extremo|Inciso|P[áa]rrafo|Numeral|Literal|Texto)\s+(?:\S+\s+){0,2}?(?:modificad|sustituid|incorporad|derogad|adicionad|agregad))/g,
    '$1\n\n$2'
  )
  const parrafos = cuerpo.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  let ley: string[] = []
  const notasPie: Array<{ numero: number; texto: string }> = []
  const llamadas: number[] = []
  let enConcordancias = false
  for (let i = 0; i < parrafos.length; i++) {
    const p = parrafos[i] ?? ''
    const plano = p.replace(/\s+/g, ' ')

    // Encabezado de libro/título/capítulo al final del artículo: pertenece al siguiente
    const nivel = plano.length < 160 ? nivelDe(plano) : null
    if (nivel !== null) {
      let titulo = plano
      const siguiente = (parrafos[i + 1] ?? '').replace(/\s+/g, ' ')
      if (siguiente && esNombreDeEncabezado(siguiente) && plano.split(' ').length <= 3 && (siguiente === siguiente.toUpperCase() || i + 2 < parrafos.length)) {
        titulo = `${plano} ${siguiente}`
        i++
      }
      jerarquiaSiguiente.push({ nivel, titulo })
      enConcordancias = false
      continue
    }

    if (MARCA_CONCORDANCIA.test(plano)) {
      enConcordancias = true
      anotaciones.push({ tipo: /JURISPRUDENC|Casaci|Sentencia|Expediente|Tribunal/i.test(plano) ? 'jurisprudencia' : 'concordancia', texto: plano, articuloRelacionado: clave })
      continue
    }
    if (MARCA_JURISPRUDENCIA.test(plano) || (enConcordancias && CITA_JURISPRUDENCIAL.test(plano))) {
      enConcordancias = true
      anotaciones.push({ tipo: 'jurisprudencia', texto: plano, articuloRelacionado: clave })
      continue
    }
    // Continuación de una cita partida por el salto de página
    if (enConcordancias && (CITA_JURISPRUDENCIAL.test(plano) || /^(?:de la|del|la|el|y)\s/i.test(plano) || /^[a-záéíóúñ(]/.test(plano))) {
      const ultima = anotaciones[anotaciones.length - 1]
      if (ultima) ultima.texto += ` ${plano}`
      continue
    }
    enConcordancias = false

    // Nota a pie de página (MINJUS): es del artículo que lleva esa llamada,
    // que puede ser otro de la misma página; el "texto anterior" no es ley vigente
    const pie = NOTA_PIE_MINJUS.exec(plano) ?? NOTA_PIE_CITA.exec(plano) ?? (/^Texto\s+anterior\s+a\s+la\s+modificaci[óo]n\s*:/i.test(plano) ? ['', '0'] as unknown as RegExpExecArray : null)
    if (pie) {
      const corte = plano.search(/Texto\s+anterior\s+a\s+la\s+modificaci[óo]n\s*:/i)
      const textoNota = (corte === -1 ? plano : plano.slice(0, corte)).replace(/^\d{1,3}\s+/, '').trim()
      if (textoNota) {
        notasPie.push({ numero: Number(pie[1]), texto: textoNota })
        anotaciones.push({ tipo: 'nota', texto: textoNota, articuloRelacionado: clave })
      }
      if (corte !== -1) {
        // El texto anterior va entre comillas y puede seguir en los párrafos siguientes
        let anterior = plano.slice(corte)
        const abiertas = (t: string) => (t.match(/“/g) ?? []).length - (t.match(/”/g) ?? []).length
        let extra = 0
        while (abiertas(anterior) > 0 && extra < 8 && i + 1 < parrafos.length) {
          i++
          extra++
          anterior += ` ${(parrafos[i] ?? '').replace(/\s+/g, ' ')}`
        }
        anotaciones.push({ tipo: 'version-anterior', texto: anterior, articuloRelacionado: clave })
      }
      continue
    }

    // Notas de SPIJ "(*) ..."
    const nota = MARCA_NOTA_SPIJ.exec(plano)
    if (nota) {
      const contenido = (nota[1] ?? '').trim()
      notasVigencia.push(contenido)
      if (CAMBIO_TOTAL.test(contenido)) {
        // Todo lo anterior era la versión previa del artículo
        if (ley.length) anotaciones.push({ tipo: 'version-anterior', texto: ley.join('\n\n'), articuloRelacionado: clave })
        ley = []
        vigencia = 'modificado'
      } else if (CAMBIO_PARCIAL.test(contenido)) {
        // El párrafo marcado con (*) justo antes es el texto reemplazado
        const ultimo = ley[ley.length - 1]
        if (ultimo && /\(\*+\)\s*["”]?\s*$/.test(ultimo)) {
          anotaciones.push({ tipo: 'version-anterior', texto: ultimo, articuloRelacionado: clave })
          ley.pop()
        }
        if (vigencia === 'vigente') vigencia = 'modificado'
      } else if (/^Art[íi]culo\s+derogad/i.test(contenido) || (/^Art[íi]culo\b/i.test(contenido) && DEROGACION.test(contenido) && !MODIFICACION.test(contenido))) {
        vigencia = 'derogado'
      } else {
        anotaciones.push({ tipo: 'nota', texto: contenido, articuloRelacionado: clave })
      }
      continue
    }

    // Llamada a nota pegada al final del párrafo ("...de ambos cónyuges. 145")
    const llamada = /([.;:])\s+(\d{1,3})\s*$/.exec(p) ?? (p.length < 120 ? /([A-Za-zÁÉÍÓÚÑáéíóúñ)])\s+(\d{1,3})\s*$/.exec(p) : null)
    if (llamada) {
      llamadas.push(Number(llamada[2]))
      ley.push(p.slice(0, llamada.index + 1))
    } else ley.push(p)
  }

  let texto = quitarMarcasSpij(ley.join('\n\n'))
  // "Artículo 5.- Derogado." / "DEROGADO" como único contenido
  if (/^(?:\S+\s+){0,6}\.?\s*-?\s*\(?\s*(?:DEROGAD[OA]|Derogad[oa])\b/.test(texto.slice(0, 120)) && texto.length < 400) vigencia = 'derogado'
  if (!texto) texto = ''
  jerarquiaSiguiente.push(...jerarquiaDoctrina)
  return { texto, anotaciones, notasVigencia, vigencia, jerarquiaSiguiente, notasPie, llamadas }
}

// =========================
// DISPOSICIONES COMPLEMENTARIAS / FINALES / TRANSITORIAS
// =========================
const ENCABEZADO_DISPOSICIONES = /(?<=^|\n)[ \t]*((?:DISPOSICI[OÓ]N(?:ES)?)\s+(?:COMPLEMENTARIAS?\s+)?(?:FINAL(?:ES)?|TRANSITORIAS?|MODIFICATORIAS?|DEROGATORIAS?|COMPLEMENTARIAS?)(?:\s*,?\s+(?:Y\s+)?(?:FINAL(?:ES)?|TRANSITORIAS?|MODIFICATORIAS?|DEROGATORIAS?))*(?:\s+ESPECIALES?)?)[ \t]*(?=\n)/gi
// Apéndices y anexos de la norma (listas de bienes exonerados, tablas): son texto de ley
const ENCABEZADO_APENDICE = /(?<=^|\n)[ \t]*((?:AP[ÉE]NDICE|ANEXO)\s+(?:[IVXL]+|\d+|[ÚU]NICO)\b|DECLARACI[ÓO]N(?=[ \t]*\n))[^\n]*/gi

// Fin del texto de la norma: lo que sigue (índice, cuadro de modificaciones)
// no es ley y no se sube
const FIN_DE_LA_NORMA = /(?<=^|\n)[ \t]*(?:CUADRO\s+DE\s+MODIFICACIONES|[ÍI]NDICE(?:\s+(?:GENERAL|ANAL[ÍI]TICO|SISTEM[ÁA]TICO))?|TABLA\s+DE\s+CONTENIDO)\b[^\n]*(?=\n)/gi
const LINEA_DE_INDICE = /\.{6,}\s*\d{1,4}\s*$/

// Primer punto, después de "desde", donde empieza el índice o un cuadro final
function inicioDeMaterialFinal(texto: string, desde: number): number {
  let fin = texto.length
  for (const m of texto.matchAll(FIN_DE_LA_NORMA)) {
    if ((m.index ?? 0) > desde) { fin = Math.min(fin, m.index ?? fin); break }
  }
  // Bloque de índice sin título: 5 líneas "....... 72" dentro de 15 líneas seguidas
  const lineas = texto.slice(desde).split('\n')
  let pos = desde
  for (let i = 0; i < lineas.length; i++) {
    if (LINEA_DE_INDICE.test(lineas[i] ?? '') && lineas.slice(i, i + 15).filter(l => LINEA_DE_INDICE.test(l)).length >= 5) {
      fin = Math.min(fin, pos)
      break
    }
    pos += (lineas[i] ?? '').length + 1
  }
  return fin
}
// Índice + 1 = número de la disposición
const ORDINALES = ['PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA',
  'DÉCIMO PRIMERA', 'DÉCIMO SEGUNDA', 'DÉCIMO TERCERA', 'DÉCIMO CUARTA', 'DÉCIMO QUINTA', 'DÉCIMO SEXTA', 'DÉCIMO SÉPTIMA', 'DÉCIMO OCTAVA', 'DÉCIMO NOVENA', 'VIGÉSIMA']
const SINONIMOS_ORDINAL: Record<string, number> = { UNDECIMA: 11, DUODECIMA: 12, SETIMA: 7, DECIMOSETIMA: 17 }
// El texto trae tildes ("Décima", "Undécima"): cada vocal acepta su forma con tilde
const TILDES: Record<string, string> = { A: 'AÁ', E: 'EÉ', I: 'IÍ', O: 'OÓ', U: 'UÚ' }
const conTildes = (patron: string) => patron.replace(/[AEIOU]/g, v => `[${TILDES[v] ?? v}]`)
const sinTildes = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const ORDINAL_REGEX = new RegExp(`(?<=^|\\n)[ \\t]*[“"]?\\s*(${[...ORDINALES.map(o => sinTildes(o)), ...Object.keys(SINONIMOS_ORDINAL)].sort((a, b) => b.length - a.length).map(o => conTildes(o).replace(/ /g, '\\s*')).join('|')})\\s*\\.?\\s*-`, 'gi')

function numeroDeOrdinal(palabra: string): number | null {
  const p = sinTildes(palabra).toUpperCase().replace(/\s+/g, '')
  if (SINONIMOS_ORDINAL[p]) return SINONIMOS_ORDINAL[p]
  const i = ORDINALES.findIndex(o => sinTildes(o).replace(/\s+/g, '') === p)
  return i === -1 ? null : i + 1
}

function prefijoDisposicion(encabezado: string): string {
  const e = sinTildes(encabezado).toUpperCase()
  const comp = /COMPLEMENTARIA/.test(e) ? 'C' : ''
  const especial = /ESPECIAL/.test(e) ? 'E' : ''
  if (/FINAL/.test(e) && /TRANSITORIA/.test(e)) return `D${comp}FT${especial}`
  if (/TRANSITORIA/.test(e)) return `D${comp}T${especial}`
  if (/MODIFICATORIA/.test(e)) return `D${comp}M`
  if (/DEROGATORIA/.test(e)) return `D${comp}D`
  return `D${comp}F`
}

// =========================
// PARSER PRINCIPAL
// =========================
export function parsearNormaV2(textoOriginal: string): ResultadoParserV2 {
  const avisos: string[] = []
  const limpio = limpiar(textoOriginal)
  const { cuerpo: texto, notas: notasFinales } = separarNotasFinales(limpio)
  if (notasFinales.size) avisos.push(`${notasFinales.size} notas al final del documento separadas como anotaciones`)

  // 1. Mejor variante de encabezados
  let formato = 'ninguno'
  let encabezados: Candidato[] = []
  for (const v of VARIANTES) {
    const s = mejorSecuencia(candidatosCon(texto, v.regex))
    if (cobertura(s) > cobertura(encabezados) * 1.1) {
      encabezados = s
      formato = v.nombre
    }
  }

  // Rangos derogados ("Artículos 1055 º al 1066 º .- DEROGADOS") y artículo único
  const rangos: Candidato[] = [...texto.matchAll(RANGO_DEROGADO)].map(m => {
    const numero = Number((m[1] ?? '').replace(/ /g, ''))
    return { indice: m.index ?? 0, fin: (m.index ?? 0) + m[0].length, numero, orden: numero * 100, hasta: Number((m[2] ?? '').replace(/ /g, '')) }
  })
  if (rangos.length) {
    encabezados = mejorSecuencia([...encabezados.filter(e => !rangos.some(r => e.indice >= r.indice && e.indice < r.fin)), ...rangos].sort((a, b) => a.indice - b.indice))
  }
  if (encabezados.length === 0) {
    const unico = ARTICULO_UNICO.exec(texto)
    ARTICULO_UNICO.lastIndex = 0
    if (unico) encabezados = [{ indice: unico.index, fin: unico.index + unico[0].length, numero: 1, orden: 100, unico: true }]
  }
  if (encabezados.length === 0) {
    avisos.push('No se reconoció ningún encabezado de artículo')
    return {
      formato, articulos: [], anotaciones: [], avisos,
      estadisticas: { caracteresTexto: textoOriginal.length, caracteresEnArticulos: 0, caracteresEnAnotaciones: 0, articulosDistintos: 0, derogados: 0, modificados: 0 }
    }
  }

  // 2. Disposiciones finales: empiezan en el primer encabezado de
  // disposiciones que aparece después del último artículo de la secuencia
  // (o después de la mitad, si allí rompen la numeración: son citas).
  const medio = encabezados[Math.floor(encabezados.length / 2)]?.indice ?? 0
  const disposiciones = [...texto.matchAll(ENCABEZADO_DISPOSICIONES)].filter(m => (m.index ?? 0) > medio)
  const apendices = [...texto.matchAll(ENCABEZADO_APENDICE)].filter(m => (m.index ?? 0) > medio)
  let finArticulos = texto.length
  const anotaciones0: AnotacionV2[] = []
  const ultimoArticulo = encabezados[encabezados.length - 1]
  // Lo que va después del índice o del cuadro de modificaciones final no es ley
  const finDelDocumento = ultimoArticulo ? inicioDeMaterialFinal(texto, ultimoArticulo.fin) : texto.length
  if (finDelDocumento < texto.length) {
    anotaciones0.push({ tipo: 'nota', texto: `Material final del documento (índice o cuadros): ${texto.slice(finDelDocumento).trim()}` })
    finArticulos = finDelDocumento
  }
  const primeraDisp = [...disposiciones, ...apendices]
    .filter(m => ultimoArticulo && (m.index ?? 0) > ultimoArticulo.indice)
    .filter(m => (m.index ?? 0) < finDelDocumento)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))[0]
  if (primeraDisp) finArticulos = Math.min(finArticulos, primeraDisp.index ?? texto.length)
  // Artículos después de una disposición que rompen la numeración: citas de otra norma
  const citados = new Set<Candidato>()
  const primeraDispMedio = disposiciones[0]?.index
  if (primeraDispMedio !== undefined) {
    let ultimoReal: Candidato | undefined
    let enCitas = false
    for (const e of encabezados) {
      if (e.indice > primeraDispMedio && (enCitas || (ultimoReal && e.numero - ultimoReal.numero > 3))) {
        enCitas = true
        citados.add(e)
      } else ultimoReal = e
    }
  }

  // 3. Preámbulo (antes del primer artículo): solo encabezados de estructura
  const anotaciones: AnotacionV2[] = [...anotaciones0]
  const articulos: ArticuloV2[] = []
  const pila: Array<{ nivel: number; titulo: string }> = []
  const apilar = (nivel: number, titulo: string) => {
    while (pila.length && (pila[pila.length - 1]?.nivel ?? -1) >= nivel) pila.pop()
    pila.push({ nivel, titulo })
  }

  // Inicio de cada artículo, retrocediendo para incluir su sumilla
  const MAX_SUMILLA = 250
  const inicios = encabezados.map((e, i) => {
    const desde = i === 0 ? 0 : encabezados[i - 1]?.fin ?? 0
    const ultimoPunto = texto.lastIndexOf('.', e.indice - 1)
    return ultimoPunto >= desde && e.indice - (ultimoPunto + 1) <= MAX_SUMILLA ? ultimoPunto + 1 : e.indice
  })

  // ¿La norma pone la sumilla ANTES del encabezado (ediciones MINJUS)? Si
  // casi ningún artículo tiene texto propio antes, la línea previa es el
  // nombre del capítulo (SUNAT, SPIJ) y la sumilla va en el encabezado.
  const conSumillaAntes = encabezados.filter((e, i) => {
    const r = encabezadosDeEstructura(texto.slice(inicios[i] ?? e.indice, e.indice).split('\n'))
    return r.encabezados.length === 0 && pareceSumilla(r.resto.join(' ').trim())
  }).length
  const sinSumillaAntes = conSumillaAntes < encabezados.length * 0.3

  const notasPie = new Map<number, string>()
  const llamadasPorArticulo = new Map<ArticuloV2, number[]>()

  const preambulo = texto.slice(0, inicios[0] ?? 0)
  for (const linea of preambulo.split(/\n\s*\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)) {
    const nivel = linea.length < 160 ? nivelDe(linea) : null
    if (nivel !== null) apilar(nivel, linea)
  }
  if (preambulo.trim().length > 40) anotaciones.push({ tipo: 'preambulo', texto: preambulo.trim() })

  encabezados.forEach((e, i) => {
    const inicio = inicios[i] ?? e.indice
    const fin = Math.min(inicios[i + 1] ?? texto.length, i === encabezados.length - 1 ? finArticulos : Infinity)
    const bloque = texto.slice(inicio, fin)
    const clave = e.unico ? 'unico' : e.hasta !== undefined ? `${e.numero}-${e.hasta}` : `${e.numero}${e.letra ? `-${e.letra}` : ''}`

    // Sumilla: lo que va antes del encabezado (MINJUS) o la línea corta
    // después de él (SPIJ, SUNAT: "Artículo 1.- Operaciones gravadas")
    const antes = bloque.slice(0, e.indice - inicio).replace(/^["'”».\s]+/, '').trim()
    const estructura = encabezadosDeEstructura(antes.split('\n'), sinSumillaAntes)
    for (const enc of estructura.encabezados) apilar(enc.nivel, enc.titulo)
    // Sin referencias a notas sueltas ("(22)")
    const previo = estructura.resto.join(' ').replace(/\(\d{1,3}\)/g, ' ').replace(/\s+/g, ' ').trim()
    let sumilla = !sinSumillaAntes && pareceSumilla(previo) ? previo : ''
    // Si no es sumilla, ese texto es una nota (SPIJ): se conserva como anotación
    if (!sumilla && previo.length > 40) anotaciones.push({ tipo: 'nota', texto: previo, articuloRelacionado: clave })
    const despues = bloque.slice(e.indice - inicio)
    const [primeraLinea = '', ...siguientes] = despues.slice(e.fin - e.indice).split('\n').map(l => l.trim())
    const lineaSiguiente = siguientes.find(Boolean) ?? ''
    if (!sumilla && primeraLinea && primeraLinea.length <= 80 && !/[.:;,]$/.test(primeraLinea) && !/^\(\d+\)/.test(primeraLinea) &&
      /^[A-ZÁÉÍÓÚÑ]/.test(primeraLinea) && /^[A-ZÁÉÍÓÚÑ(“"0-9]/.test(lineaSiguiente)) {
      sumilla = primeraLinea
    }
    // Sin el número de nota pegado al final ("Vigencia 30")
    sumilla = sumilla.replace(/\s*\(\d{1,3}\)/g, '').replace(/(?:\s+\d{1,3})+$/, '').trim()

    if (citados.has(e)) {
      anotaciones.push({ tipo: 'nota', texto: `Cita de otra norma: ${despues.trim()}` })
      return
    }

    const procesado = procesarCuerpo(despues, clave)
    anotaciones.push(...procesado.anotaciones)
    for (const n of procesado.notasPie) notasPie.set(n.numero, n.texto)

    // Vigencia por las notas al final del documento: "(25)" justo después del encabezado
    const notasVigencia = [...procesado.notasVigencia]
    let vigencia = procesado.vigencia
    const ref = /^\s*\((\d{1,3})\)/.exec(despues.slice(e.fin - e.indice))
    const notaFinal = ref ? notasFinales.get(Number(ref[1])) : undefined
    if (notaFinal) {
      notasVigencia.push(notaFinal)
      if (/^(?:Art[íi]culo\s+)?derogad/i.test(notaFinal) || (DEROGACION.test(notaFinal) && !MODIFICACION.test(notaFinal))) vigencia = 'derogado'
      else if (MODIFICACION.test(notaFinal) && vigencia === 'vigente') vigencia = 'modificado'
    }
    if (e.hasta !== undefined) vigencia = 'derogado'

    const textoArticulo = procesado.texto
    // El índice del documento no es ley, pero tampoco se pierde en silencio
    if (esIndiceDelDocumento(textoArticulo) && textoArticulo.length < 20000) {
      anotaciones.push({ tipo: 'nota', texto: `Índice del documento: ${textoArticulo}`, articuloRelacionado: clave })
    } else if (textoArticulo.length > 15) {
      articulos.push({
        clave,
        numero: e.numero,
        ...(e.letra ? { letra: e.letra } : {}),
        ...(sumilla ? { sumilla: sumilla.slice(0, 200) } : {}),
        jerarquia: pila.map(p => p.titulo),
        texto: textoArticulo,
        vigencia,
        notasVigencia,
        partes: textoArticulo.length > MAX_LONGITUD_PARTE ? partirSinPerderTexto(textoArticulo, MAX_LONGITUD_PARTE) : [textoArticulo]
      })
      const agregado = articulos[articulos.length - 1]
      if (agregado && procesado.llamadas.length) llamadasPorArticulo.set(agregado, procesado.llamadas)
    }
    for (const j of procesado.jerarquiaSiguiente) apilar(j.nivel, j.titulo)
  })

  // 4. Zona final: disposiciones (por ordinal) y apéndices/anexos (enteros)
  if (primeraDisp) {
    const zona = texto.slice(primeraDisp.index ?? 0, finDelDocumento)
    const prefijosUsados = new Set<string>()
    const secciones = [
      ...[...zona.matchAll(ENCABEZADO_DISPOSICIONES)].map(m => ({ m, tipo: 'disposicion' as const })),
      ...[...zona.matchAll(ENCABEZADO_APENDICE)].map(m => ({ m, tipo: 'apendice' as const }))
    ].sort((a, b) => (a.m.index ?? 0) - (b.m.index ?? 0))
    secciones.forEach(({ m: b, tipo }, k) => {
      const desde = (b.index ?? 0) + b[0].length
      const hasta = secciones[k + 1]?.m.index ?? zona.length
      const seccion = zona.slice(desde, hasta)
      const titulo = b[0].replace(/\s+/g, ' ').replace(/\s*\(\d{1,3}\)/g, '').replace(/\.\s*$/, '').trim()
      const agregar = (clave: string, cuerpo: string, jerarquia: string[]) => {
        const procesado = procesarCuerpo(cuerpo, clave)
        anotaciones.push(...procesado.anotaciones)
        if (procesado.texto.length <= 15) return
        articulos.push({
          clave,
          numero: null,
          jerarquia,
          texto: procesado.texto,
          vigencia: procesado.vigencia,
          notasVigencia: procesado.notasVigencia,
          partes: procesado.texto.length > MAX_LONGITUD_PARTE ? partirSinPerderTexto(procesado.texto, MAX_LONGITUD_PARTE) : [procesado.texto]
        })
      }
      if (tipo === 'apendice') {
        agregar(sinTildes(b[1] ?? '').toUpperCase().replace(/\s+/g, '-'), `${titulo}\n\n${seccion}`, [titulo])
        return
      }
      let prefijo = prefijoDisposicion(b[1] ?? '')
      if (prefijosUsados.has(prefijo)) prefijo = `${prefijo}${k + 1}`
      prefijosUsados.add(prefijo)
      const ordinales = [...seccion.matchAll(ORDINAL_REGEX)]
      const numerosUsados = new Set<number>()
      ordinales.forEach((o, n) => {
        // El número sale del propio ordinal ("Decimosegunda" = 12), no de la posición
        let numero = numeroDeOrdinal(o[1] ?? '') ?? n + 1
        while (numerosUsados.has(numero)) numero++
        numerosUsados.add(numero)
        agregar(`${prefijo}-${numero}`, seccion.slice(o.index ?? 0, ordinales[n + 1]?.index ?? seccion.length), [titulo])
      })
      if (ordinales.length === 0 && seccion.trim().length > 40) agregar(prefijo, seccion, [titulo])
    })
  }

  const vistas = new Map<string, number>()
  for (const a of articulos) {
    const n = (vistas.get(a.clave) ?? 0) + 1
    vistas.set(a.clave, n)
    if (n > 1) a.clave = `${a.clave}-${n}`
  }

  // Notas a pie (MINJUS): vigencia del artículo que lleva la llamada
  for (const [articulo, numeros] of llamadasPorArticulo) {
    for (const n of numeros) {
      const nota = notasPie.get(n)
      if (!nota) continue
      articulo.notasVigencia.push(nota)
      if (/^(?:Art[íi]culo\s+)?derogad/i.test(nota)) articulo.vigencia = 'derogado'
      else if (MODIFICACION.test(nota) && articulo.vigencia === 'vigente') articulo.vigencia = 'modificado'
    }
  }

  for (const [n, t] of notasFinales) anotaciones.push({ tipo: 'nota', texto: `Nota ${n}: ${t}` })

  const caracteresEnArticulos = articulos.reduce((s, a) => s + a.texto.length, 0)
  const caracteresEnAnotaciones = anotaciones.reduce((s, a) => s + a.texto.length, 0)
  return {
    formato,
    articulos,
    anotaciones,
    avisos,
    estadisticas: {
      caracteresTexto: textoOriginal.length,
      caracteresEnArticulos,
      caracteresEnAnotaciones,
      articulosDistintos: new Set(articulos.filter(a => a.numero !== null).map(a => a.clave)).size,
      derogados: articulos.filter(a => a.vigencia === 'derogado').length,
      modificados: articulos.filter(a => a.vigencia === 'modificado').length
    }
  }
}
