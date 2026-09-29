// =========================
// CONTRATOS LARGOS: DIVIDIR EN SECCIONES Y ELEGIR LAS RELEVANTES
// Un contrato de 70-200 páginas (150.000-450.000 caracteres) no se puede
// mandar entero a Gemini en cada llamada: tarda demasiado, se corta por
// tiempo y el análisis se queda con pocas marcas para todo el documento.
// Aquí se parte en secciones de tamaño acotado, cortando entre párrafos y,
// cuando se puede, justo antes de una cláusula, para no partirlas a la
// mitad. El texto de cada sección queda literal (los "textoOriginal" de
// las sugerencias se siguen encontrando en el documento completo).
// =========================

// Encabezados típicos de cláusula: "CLÁUSULA PRIMERA", "PRIMERA:",
// "ARTÍCULO 5", "ANEXO I", "3. OBJETO", "10.2 Penalidades"...
const ENCABEZADO_PALABRA = /^\s*(?:CL[ÁA]USULA|ART[ÍI]CULO|CAP[ÍI]TULO|T[ÍI]TULO|ANEXO|SECCI[ÓO]N|PRIMER[AO]|SEGUND[AO]|TERCER[AO]|CUART[AO]|QUINT[AO]|SEXT[AO]|S[ÉE]PTIM[AO]|OCTAV[AO]|NOVEN[AO]|D[ÉE]CIM[AO]|UND[ÉE]CIM[AO]|DUOD[ÉE]CIM[AO]|VIG[ÉE]SIM[AO])\b/i
const ENCABEZADO_NUMERO = /^\s*\d+(?:\.\d+)*[.)-]?\s+[A-ZÁÉÍÓÚÑ]/

function esEncabezado(parrafo: string): boolean {
  return parrafo.length < 300 && (ENCABEZADO_PALABRA.test(parrafo) || ENCABEZADO_NUMERO.test(parrafo))
}

// Un párrafo más largo que el máximo (raro, pero pasa con tablas o texto
// sin saltos) se parte por oraciones, sin descartar nada.
function partirParrafoLargo(parrafo: string, max: number): string[] {
  const piezas = parrafo.split(/(?<=[.;:])\s+/)
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
  if (actual) trozos.push(actual)
  return trozos
}

export function dividirEnSecciones(texto: string, maxCaracteres = 30_000): string[] {
  const parrafos = texto
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .flatMap(p => (p.length > maxCaracteres ? partirParrafoLargo(p, maxCaracteres) : [p]))

  const secciones: string[] = []
  let actual: string[] = []
  let largoActual = 0

  for (const parrafo of parrafos) {
    if (actual.length > 0 && largoActual + parrafo.length + 2 > maxCaracteres) {
      // Se corta antes del último encabezado de cláusula de la segunda
      // mitad de la sección, para no dejar una cláusula partida en dos.
      let corte = actual.length
      let acumulado = 0
      for (let j = 0; j < actual.length; j++) {
        if (j > 0 && acumulado >= largoActual / 2 && esEncabezado(actual[j] ?? "")) corte = j
        acumulado += (actual[j] ?? "").length + 2
      }
      secciones.push(actual.slice(0, corte).join('\n\n'))
      actual = actual.slice(corte)
      largoActual = actual.reduce((s, p) => s + p.length + 2, 0)
    }
    actual.push(parrafo)
    largoActual += parrafo.length + 2
  }
  if (actual.length > 0) secciones.push(actual.join('\n\n'))
  return secciones
}

// =========================
// ELEGIR LAS SECCIONES RELACIONADAS CON UNA PREGUNTA (chat de Análisis)
// Puntuación simple por palabras clave de la pregunta (sin tildes ni
// palabras vacías). La primera sección (partes, objeto, definiciones)
// siempre se incluye. Se respeta el orden original del contrato.
// =========================
const PALABRAS_VACIAS = new Set([
  'que', 'qué', 'cual', 'cuales', 'como', 'cómo', 'cuando', 'donde', 'quien', 'quienes', 'dice', 'dicen', 'sobre',
  'para', 'por', 'con', 'sin', 'del', 'las', 'los', 'una', 'uno', 'unos', 'unas', 'este', 'esta', 'estos', 'estas',
  'ese', 'esa', 'eso', 'hay', 'tiene', 'tienen', 'puede', 'pueden', 'contrato', 'clausula', 'clausulas', 'mas',
  'muy', 'ser', 'son', 'fue', 'era', 'algo', 'todo', 'toda', 'todos', 'todas', 'entre', 'hasta', 'desde', 'segun',
  'explica', 'explicame', 'dime', 'analiza', 'riesgos', 'riesgo', 'documento', 'favor', 'quiero', 'saber'
])

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function palabrasClave(texto: string): string[] {
  return [...new Set(normalizar(texto).split(/[^a-z0-9ñ]+/).filter(p => p.length >= 4 && !PALABRAS_VACIAS.has(p)))]
}

export function seleccionarSecciones(secciones: string[], consulta: string, presupuestoCaracteres: number): string[] {
  if (secciones.length === 0) return []
  const claves = palabrasClave(consulta)
  const puntuadas = secciones.map((texto, indice) => {
    const normal = normalizar(texto)
    // Raíz de 6 letras: "penalidad" también encuentra "penalidades".
    const puntaje = claves.reduce((total, clave) => {
      const raiz = clave.slice(0, 6)
      return total + (normal.split(raiz).length - 1)
    }, 0)
    return { indice, texto, puntaje }
  })

  const elegidas = new Set<number>([0])
  let usado = (secciones[0] ?? "").length
  for (const s of [...puntuadas].sort((a, b) => b.puntaje - a.puntaje)) {
    if (s.puntaje === 0 || elegidas.has(s.indice)) continue
    if (usado + s.texto.length > presupuestoCaracteres) continue
    elegidas.add(s.indice)
    usado += s.texto.length
  }
  return [...elegidas].sort((a, b) => a - b).map(i => secciones[i] ?? "")
}
