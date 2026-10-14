// Formato de presentación para textos que llegan TODO EN MAYÚSCULAS (por
// ejemplo, sectores y títulos de normas de El Peruano): se muestran en
// mayúsculas y minúsculas, conservando siglas (SUNAT, EF, MTC...),
// números de norma (N° 012-2026-EF) y numerales romanos. Solo cambia cómo
// se ve; el dato guardado no se toca. Si el texto ya viene en mayúsculas y
// minúsculas, se devuelve igual.

// Palabras que van en minúscula dentro de un título (salvo al inicio)
const MENORES = new Set([
  'a', 'al', 'con', 'de', 'del', 'e', 'el', 'en', 'la', 'las', 'lo', 'los',
  'o', 'para', 'por', 'que', 'se', 'su', 'sus', 'u', 'un', 'una', 'y'
])

// Siglas frecuentes en El Peruano que tienen vocales (las que no tienen
// vocales, como MTC o SBS, se reconocen solas)
const SIGLAS = new Set([
  'SUNAT', 'INDECOPI', 'SUNAFIL', 'MINAM', 'ONPE', 'JNE', 'RENIEC', 'OSINERGMIN',
  'OSIPTEL', 'SUNARP', 'SUNASS', 'OEFA', 'MEF', 'BCRP', 'INEI', 'ESSALUD',
  'SENASA', 'SERFOR', 'INGEMMET', 'OSITRAN', 'CONCYTEC', 'OSCE', 'MIDIS', 'MIMP',
  'MINSA', 'MINEDU', 'MINCETUR', 'MIDAGRI', 'MINAGRI', 'MINCUL', 'MININTER',
  'MINDEF', 'MINEM', 'MINJUSDH', 'MTPE', 'SIS', 'SUSALUD', 'SUNEDU', 'SUCAMEC',
  'SERVIR', 'PRODUCE', 'DEVIDA', 'CENEPRED', 'INDECI', 'SENAMHI', 'PROINVERSION',
  'SANIPES', 'IGP', 'IPEN', 'INACAL', 'ATU', 'SUTRAN', 'OTASS', 'PERUCOMPRAS',
  'IA', 'SA', 'SAA', 'SAC', 'EIRL', 'EPS', 'ONG', 'UE', 'EE', 'UU', 'II', 'III', 'IV',
  'VI', 'VII', 'VIII', 'IX', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XIX', 'XX'
])

const VOCALES = /[AEIOUÁÉÍÓÚÜ]/

// El Peruano suele publicar los textos en mayúsculas sin tildes: se
// recuperan las de las palabras más frecuentes en sectores y títulos.
const TILDES: Record<string, string> = {
  economia: 'economía', energia: 'energía', mineria: 'minería', policia: 'policía',
  tecnico: 'técnico', tecnicos: 'técnicos', tecnica: 'técnica', tecnicas: 'técnicas',
  publico: 'público', publicos: 'públicos', publica: 'pública', publicas: 'públicas',
  administracion: 'administración', resolucion: 'resolución', direccion: 'dirección',
  legislacion: 'legislación', educacion: 'educación', informacion: 'información',
  produccion: 'producción', inclusion: 'inclusión', poblacion: 'población',
  comision: 'comisión', gestion: 'gestión', construccion: 'construcción',
  promocion: 'promoción', regulacion: 'regulación', supervision: 'supervisión',
  fiscalizacion: 'fiscalización', organizacion: 'organización', inversion: 'inversión',
  contratacion: 'contratación', aprobacion: 'aprobación', designacion: 'designación',
  autonomo: 'autónomo', autonomos: 'autónomos', regimen: 'régimen', republica: 'república',
  credito: 'crédito', agricola: 'agrícola', camara: 'cámara', codigo: 'código',
  articulo: 'artículo', articulos: 'artículos', numero: 'número', transito: 'tránsito',
  electrica: 'eléctrica', electricas: 'eléctricas', juridico: 'jurídico', juridica: 'jurídica',
  defensoria: 'defensoría', fiscalia: 'fiscalía', ambito: 'ámbito', basica: 'básica',
  medico: 'médico', medica: 'médica', unico: 'único', unica: 'única', integracion: 'integración'
}

function esMayormenteMayusculas(texto: string): boolean {
  const letras = texto.match(/\p{L}/gu) ?? []
  if (letras.length < 4) return false
  const mayusculas = letras.filter(l => l === l.toUpperCase() && l !== l.toLowerCase()).length
  return mayusculas / letras.length > 0.7
}

function capitalizar(palabra: string): string {
  return palabra.charAt(0).toUpperCase() + palabra.slice(1)
}

function convertirPalabra(original: string, indice: number, modo: 'titulo' | 'oracion', antesDeNumero: boolean): string {
  // Separa signos de puntuación al inicio y al final (comillas, paréntesis, comas...)
  const partes = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u.exec(original)
  const antes = partes?.[1] ?? ''
  const nucleo = partes?.[2] ?? original
  const despues = partes?.[3] ?? ''
  if (!nucleo) return original

  // Números de norma, códigos y siglas se quedan como vienen
  if (/\d/.test(nucleo)) return original
  if (/^N$/i.test(nucleo) && /^[°ºª]/.test(despues)) return `${antes}N°${despues.slice(1)}`
  if (/^N[ºª]$/i.test(nucleo)) return `${antes}N°${despues}`
  const limpio = nucleo.replace(/[.\-/]/g, '')
  if (SIGLAS.has(limpio) || (limpio.length > 1 && limpio.length <= 5 && !VOCALES.test(limpio))) return original

  const minuscula = TILDES[nucleo.toLowerCase()] ?? nucleo.toLowerCase()
  // "LEY N° 31814" → "Ley N° 31814": lo que va antes del número de norma, con mayúscula
  if (indice === 0 || antesDeNumero) return antes + capitalizar(minuscula) + despues
  if (modo === 'oracion') return antes + minuscula + despues
  if (MENORES.has(minuscula)) return antes + minuscula + despues
  return antes + capitalizar(minuscula) + despues
}

/**
 * "ECONOMIA Y FINANZAS" → "Economía y Finanzas"
 * "DECRETO SUPREMO N° 012-2026-EF" → "Decreto Supremo N° 012-2026-EF"
 * "DECRETO SUPREMO QUE APRUEBA EL REGLAMENTO ..." → "Decreto Supremo que aprueba el reglamento ..."
 * (antes de "QUE"/"N°" va como título; después, como oración)
 */
export function mayusculasYMinusculas(texto: string | null | undefined): string {
  if (!texto) return ''
  if (!esMayormenteMayusculas(texto)) return texto

  const palabras = texto.split(/(\s+)/)
  let indice = 0
  let modo: 'titulo' | 'oracion' = 'titulo'
  return palabras
    .map((trozo, i) => {
      if (/^\s+$/.test(trozo) || trozo === '') return trozo
      const siguiente = palabras[i + 2] ?? ''
      const resultado = convertirPalabra(trozo, indice, modo, /^N[°ºª]/i.test(siguiente))
      // Tras el tipo de norma ("... QUE ...") el resto se lee como oración
      if (indice > 0 && /^que$/i.test(trozo)) modo = 'oracion'
      // Después de un punto, la siguiente palabra empieza en mayúscula
      if (/[.:;]$/.test(trozo) && !/\d/.test(trozo)) {
        indice = 0
        return resultado
      }
      indice++
      return resultado
    })
    .join('')
}
