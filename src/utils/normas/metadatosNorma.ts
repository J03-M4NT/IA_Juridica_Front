// =========================
// METADATOS DE NORMA Y REGISTROS v2 (mejora de Consultas, fase 1)
// - tipoNorma y número: sugeridos desde el texto/nombre; el admin los
//   confirma en el formulario (tipo, número, nombre y vigencia obligatorios;
//   fecha y URL opcionales).
// - construirRegistrosV2: arma los registros para Pinecone, un fragmento por
//   artículo, con ID fijo ("{normaId}#art-{clave}") y un encabezado de
//   contexto en el texto que se vectoriza. Puro: no sube nada.
// =========================
import type { ArticuloV2, ResultadoParserV2, Vigencia } from './parserNormaV2'

export const TIPOS_NORMA = [
  { valor: 'constitucion', etiqueta: 'Constitución' },
  { valor: 'codigo', etiqueta: 'Código' },
  { valor: 'ley', etiqueta: 'Ley' },
  { valor: 'decreto-legislativo', etiqueta: 'Decreto Legislativo' },
  { valor: 'decreto-ley', etiqueta: 'Decreto Ley' },
  { valor: 'decreto-supremo', etiqueta: 'Decreto Supremo' },
  { valor: 'decreto-urgencia', etiqueta: 'Decreto de Urgencia' },
  { valor: 'texto-unico-ordenado', etiqueta: 'Texto Único Ordenado (TUO)' },
  { valor: 'reglamento', etiqueta: 'Reglamento' },
  { valor: 'resolucion', etiqueta: 'Resolución' },
  { valor: 'decision-andina', etiqueta: 'Decisión de la Comunidad Andina' },
  { valor: 'otra', etiqueta: 'Otra' }
] as const

export type TipoNorma = typeof TIPOS_NORMA[number]['valor']

export interface MetaNorma {
  // "codigo-civil", "ley-29571", "dleg-774"
  normaId: string
  // Nombre para citar: "Código Civil", "Ley de Delitos Informáticos"
  norma: string
  tipoNorma: TipoNorma
  // Instrumento: "D. Leg. 295", "Ley 29571", "D.S. 179-2004-EF"
  numeroNorma: string
  vigencia: Vigencia
  area?: string
  fechaPublicacion?: string // AAAA-MM-DD
  fuenteUrl?: string
}

const ABREVIATURA: Record<TipoNorma, string> = {
  constitucion: 'Constitución',
  codigo: 'Código',
  ley: 'Ley',
  'decreto-legislativo': 'D. Leg.',
  'decreto-ley': 'D. Ley',
  'decreto-supremo': 'D.S.',
  'decreto-urgencia': 'D.U.',
  'texto-unico-ordenado': 'TUO',
  reglamento: 'Reglamento',
  resolucion: 'Resolución',
  'decision-andina': 'Decisión',
  otra: ''
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export function slug(texto: string): string {
  return sinTildes(texto).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

// =========================
// SUGERENCIA DE TIPO Y NÚMERO
// Mira el nombre y las primeras líneas. El orden importa: un TUO aprobado
// por decreto supremo es un TUO; un reglamento aprobado por D.S. es un
// reglamento; un código aprobado por decreto legislativo es un código.
// =========================
const NUMERO_LEY = /\bLEY\s*(?:N[°º.]*|Nro\.?)?\s*(\d{4,5})\b/i
const NUMERO_DLEG = /\b(?:DECRETO\s+LEGISLATIVO|D\.?\s*LEG(?:ISLATIVO)?\.?|DL)\s*(?:N[°º.]*)?\s*(\d{2,4})\b/i
const NUMERO_DS = /\b(?:DECRETO\s+SUPREMO|D\.?\s*S\.?)\s*(?:N[°º.]*)?\s*(\d{1,4}-\d{2,4}(?:-[A-Z]{2,6})?)/i
const NUMERO_DECISION = /\bDECISI[ÓO]N\s*(?:N[°º.]*)?\s*(\d{3})\b/i
const NUMERO_DU = /\b(?:DECRETO\s+DE\s+URGENCIA|D\.?\s*U\.?)\s*(?:N[°º.]*)?\s*(\d{3}-\d{4})/i

export interface SugerenciaNorma extends Pick<MetaNorma, 'tipoNorma' | 'numeroNorma'> {
  fechaPublicacion?: string
  // El número del nombre no coincide con el del documento (¿archivo equivocado?)
  aviso?: string
}

export function sugerirMetadatosNorma(texto: string, nombre: string): SugerenciaNorma {
  const sugerencia = sugerirSinControl(texto, nombre)
  const numeroNombre = NUMERO_LEY.exec(nombre)?.[1] ?? NUMERO_DLEG.exec(nombre)?.[1]
  const encabezado = encabezadoPropio(texto)
  const numeroTexto = encabezado ? (NUMERO_LEY.exec(encabezado)?.[1] ?? NUMERO_DLEG.exec(encabezado)?.[1]) : undefined
  if (numeroNombre && numeroTexto && numeroNombre !== numeroTexto) {
    return { ...sugerencia, aviso: `El nombre dice ${numeroNombre} pero el documento es la norma ${numeroTexto}: revisa que el archivo sea el correcto.` }
  }
  return sugerencia
}

// Línea con el número de la propia norma, al inicio del documento ("LEY Nº 30424")
function encabezadoPropio(texto: string): string | undefined {
  return texto.slice(0, 1500).split('\n').map(l => l.trim()).filter(Boolean).slice(0, 4)
    .find(l => /^(?:LEY|DECRETO\s+LEGISLATIVO|DECRETO\s+SUPREMO|D\.\s*LEG\.?|D\.\s*S\.)\s*(?:N[°º.]*)?\s*\d/i.test(l))
}

function sugerirSinControl(texto: string, nombre: string): SugerenciaNorma {
  // Solo el nombre y las primeras líneas reales: sin las notas "(*)", las
  // concordancias ni los avisos que SPIJ pone antes del título
  const lineas = texto.slice(0, 4000).split('\n').map(l => l.trim())
    .filter(l => l && !/^\(\*|^\(\d|^CONCORDANCIAS?|^NOTA\b|^ENLACE|^DIARIO DE LOS DEBATES/i.test(l))
    .slice(0, 6)
  // El número del encabezado propio manda sobre los que aparecen después
  const propio = encabezadoPropio(texto)
  const cabecera = [nombre, ...(propio ? [propio] : []), ...lineas].join('\n')
  const c = sinTildes(cabecera).toUpperCase()
  const ley = NUMERO_LEY.exec(cabecera)?.[1]
  const dleg = NUMERO_DLEG.exec(cabecera)?.[1]
  const ds = NUMERO_DS.exec(cabecera)?.[1]
  const du = NUMERO_DU.exec(cabecera)?.[1]
  const decision = NUMERO_DECISION.exec(cabecera)?.[1]
  const fecha = fechaDePublicacion(lineas.join('\n'))
  const con = <T extends object>(o: T) => (fecha ? { ...o, fechaPublicacion: fecha } : o)

  // Título de la norma: el nombre y las líneas hasta su propio número
  // (después vienen concordancias y considerandos que citan la Constitución,
  // reglamentos, TUO, etc.)
  const hastaPropio = propio ? lineas.indexOf(propio) : -1
  const titular = sinTildes([nombre, ...lineas.slice(0, hastaPropio >= 0 ? hastaPropio + 1 : 2)].join('\n')).toUpperCase()
  if (/CONSTITUCION\s*POLITICA|^CONSTITUCION/.test(titular)) return con({ tipoNorma: 'constitucion' as const, numeroNorma: '1993' })
  const titulo = sinTildes(`${nombre}\n${lineas[0] ?? ''}`).toUpperCase()
  if (/(?:^|\n)\s*(?:NUEVO\s+)?CODIGO\b|^CODIGO|\bCODIGO\s*(?:CIVIL|PENAL|PROCESAL|DE\s+COMERCIO|TRIBUTARIO|DE\s+PROTECCION|DEL\s+TRABAJO|DE\s+LOS\s+NI)/.test(titulo)) {
    return con({ tipoNorma: 'codigo' as const, numeroNorma: dleg ? `D. Leg. ${dleg}` : ley ? `Ley ${ley}` : ds ? `D.S. ${ds}` : '' })
  }
  if (/\bREGLAMENTO\b/.test(titular) && ds) return con({ tipoNorma: 'reglamento' as const, numeroNorma: `D.S. ${ds}` })
  if (/TEXTO UNICO ORDENADO|\bTUO\b/.test(titular)) {
    // Se cita por la norma ordenada; el D.S. que aprueba el TUO va en el nombre
    return con({ tipoNorma: 'texto-unico-ordenado' as const, numeroNorma: ds ? `D.S. ${ds}` : dleg ? `D. Leg. ${dleg}` : ley ? `Ley ${ley}` : '' })
  }
  if (decision && /COMUNIDAD ANDINA|ACUERDO DE CARTAGENA/.test(c) && !/DECRETO LEGISLATIVO QUE APRUEBA/.test(c)) return con({ tipoNorma: 'decision-andina' as const, numeroNorma: `Decisión ${decision}` })
  if (/DECRETO LEGISLATIVO|D\.\s*LEG/.test(c.slice(0, 600)) && dleg) return con({ tipoNorma: 'decreto-legislativo' as const, numeroNorma: `D. Leg. ${dleg}` })
  if (du) return con({ tipoNorma: 'decreto-urgencia' as const, numeroNorma: `D.U. ${du}` })
  if (ley) return con({ tipoNorma: 'ley' as const, numeroNorma: `Ley ${ley}` })
  if (/DECRETO LEY/.test(c) ) return con({ tipoNorma: 'decreto-ley' as const, numeroNorma: '' })
  if (ds) return con({ tipoNorma: 'decreto-supremo' as const, numeroNorma: `D.S. ${ds}` })
  if (dleg) return con({ tipoNorma: 'decreto-legislativo' as const, numeroNorma: `D. Leg. ${dleg}` })
  return con({ tipoNorma: 'otra' as const, numeroNorma: '' })
}

// "(pub. 8-12-04)", "publicada el 10 marzo 2014", "publicado el 21 de diciembre de 2023"
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre']
function fechaDePublicacion(texto: string): string | undefined {
  const corta = /\(pub\.\s*(\d{1,2})-(\d{1,2})-(\d{2,4})\)/i.exec(texto)
  if (corta) {
    const anio = Number(corta[3])
    const a = corta[3]!.length === 2 ? (anio > 30 ? 1900 + anio : 2000 + anio) : anio
    return `${a}-${corta[2]!.padStart(2, '0')}-${corta[1]!.padStart(2, '0')}`
  }
  const larga = /publicad[oa]\s+el\s+(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)\s+(?:de\s+)?(\d{4})/i.exec(texto)
  const mes = larga ? MESES.indexOf(sinTildes(larga[2] ?? '').toLowerCase().replace('septiembre', 'setiembre')) : -1
  if (larga && mes !== -1) return `${larga[3]}-${String(mes + 1).padStart(2, '0')}-${(larga[1] ?? '').padStart(2, '0')}`
  return undefined
}

// =========================
// HASH (para cargas incrementales: subir solo lo nuevo o modificado)
// cyrb53: rápido, sin dependencias y síncrono (también en el navegador)
// =========================
export function hashTexto(texto: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < texto.length; i++) {
    const ch = texto.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

// =========================
// REGISTROS v2
// =========================
export interface RegistroV2 {
  id: string
  // Texto que se vectoriza: encabezado de contexto + texto del artículo
  text: string
  normaId: string
  norma: string
  tipoNorma: TipoNorma
  numeroNorma: string
  articulo: string
  articuloNum?: number
  tituloArticulo?: string
  jerarquia?: string
  parte: number
  totalPartes: number
  vigencia: Vigencia
  // La vigencia de cada artículo la detecta el parser ("Derogado por...",
  // notas de modificación): queda como "detectada" hasta que alguien la
  // verifique contra el texto oficial.
  vigenciaOrigen: 'detectada' | 'verificada'
  // La de la norma la elige el admin al subirla
  vigenciaNorma: Vigencia
  vigenciaNormaOrigen: 'admin'
  notasVigencia?: string
  fechaPublicacion?: string
  fechaNum?: number
  fuenteUrl?: string
  area?: string
  esComentario: boolean
  tipoAnotacion?: string
  hashTexto: string
  versionEsquema: 2
  // Campos del esquema actual, para que la búsqueda de hoy siga funcionando
  documentoId: string
  nombreDocumento: string
  tipoDocumento: string
  indiceChunk: number
  numeroArticulo?: number
  esFuentePrimaria: boolean
}

function etiquetaArticulo(a: ArticuloV2): string {
  if (a.clave === 'unico') return 'Artículo Único'
  if (/^AP[EÉ]NDICE|^ANEXO/i.test(a.clave)) return a.clave.replace(/-/g, ' ')
  if (/^D[A-Z]*-?\d*$/.test(a.clave) && a.numero === null) return `${a.jerarquia[0] ?? 'Disposición'} ${a.clave.split('-')[1] ?? ''}`.trim()
  return `Artículo ${a.clave}`
}

// =========================
// PARTES PARA MODELOS CON LÍMITE DE LONGITUD (multilingual-e5-large: ~507 tokens)
// Parte el texto por párrafo o inciso; un párrafo que no entra se parte por
// oración y, en último caso, por palabras. Nunca se pierde texto.
// =========================
export function partirParaModelo(texto: string, max: number): string[] {
  const piezas: string[] = []
  for (const parrafo of texto.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)) {
    if (parrafo.length <= max) { piezas.push(parrafo); continue }
    for (const oracion of parrafo.split(/(?<=[.;:])\s+/)) {
      if (oracion.length <= max) { piezas.push(oracion); continue }
      let actual = ''
      for (const palabra of oracion.split(/\s+/)) {
        if (actual && actual.length + 1 + palabra.length > max) { piezas.push(actual); actual = palabra } else actual = actual ? `${actual} ${palabra}` : palabra
      }
      if (actual) piezas.push(actual)
    }
  }
  // Se juntan piezas consecutivas mientras quepan
  const partes: string[] = []
  let actual = ''
  for (const pieza of piezas) {
    if (actual && actual.length + 2 + pieza.length > max) { partes.push(actual); actual = pieza } else actual = actual ? `${actual}\n\n${pieza}` : pieza
  }
  if (actual) partes.push(actual)
  return partes.length ? partes : [texto]
}

export function construirRegistrosV2(meta: MetaNorma, resultado: ResultadoParserV2, opciones: { incluirAnotaciones?: boolean; maxCaracteres?: number | null } = {}): RegistroV2[] {
  const registros: RegistroV2[] = []
  const instrumento = meta.numeroNorma && !meta.norma.includes(meta.numeroNorma) ? ` (${meta.numeroNorma})` : ''

  const comunes = {
    normaId: meta.normaId,
    norma: meta.norma,
    tipoNorma: meta.tipoNorma,
    numeroNorma: meta.numeroNorma,
    vigenciaNorma: meta.vigencia,
    vigenciaNormaOrigen: 'admin' as const,
    ...(meta.fechaPublicacion ? { fechaPublicacion: meta.fechaPublicacion, fechaNum: Number(meta.fechaPublicacion.replace(/-/g, '')) } : {}),
    ...(meta.fuenteUrl ? { fuenteUrl: meta.fuenteUrl } : {}),
    ...(meta.area ? { area: meta.area } : {}),
    versionEsquema: 2 as const,
    documentoId: meta.normaId,
    nombreDocumento: meta.norma,
    tipoDocumento: meta.tipoNorma,
    esFuentePrimaria: true
  }

  let indice = 0
  for (const a of resultado.articulos) {
    let jerarquia = a.jerarquia.join(' › ')
    const etiqueta = etiquetaArticulo(a)
    const armarEncabezado = (k: number, total: number) => [
      `${meta.norma}${instrumento}`,
      jerarquia,
      `${etiqueta}${a.sumilla ? ` (${a.sumilla})` : ''}${total > 1 ? ` [parte ${k + 1} de ${total}]` : ''}`,
      a.vigencia === 'derogado' ? 'DEROGADO' : ''
    ].filter(Boolean).join(' | ')

    // Con límite de longitud (índice e5): cada parte, con su encabezado
    // completo, cabe en maxCaracteres. Si el encabezado es muy largo, la
    // jerarquía se acorta a sus dos últimos niveles.
    let partes = a.partes
    const max = opciones.maxCaracteres
    if (max) {
      let presupuesto = max - armarEncabezado(98, 99).length - 1
      if (presupuesto < 500 && a.jerarquia.length > 2) {
        jerarquia = a.jerarquia.slice(-2).join(' › ')
        presupuesto = max - armarEncabezado(98, 99).length - 1
      }
      partes = partirParaModelo(a.texto, Math.max(400, presupuesto))
    }

    partes.forEach((parte, k) => {
      const total = partes.length
      const encabezado = armarEncabezado(k, total)
      registros.push({
        ...comunes,
        id: `${meta.normaId}#art-${a.clave}${total > 1 ? `#p${k + 1}` : ''}`,
        text: `${encabezado}\n${parte}`,
        articulo: a.clave,
        ...(a.numero !== null ? { articuloNum: a.numero, numeroArticulo: a.numero } : {}),
        ...(a.sumilla ? { tituloArticulo: a.sumilla } : {}),
        ...(jerarquia ? { jerarquia } : {}),
        parte: k + 1,
        totalPartes: total,
        vigencia: a.vigencia,
        vigenciaOrigen: 'detectada',
        ...(a.notasVigencia.length ? { notasVigencia: a.notasVigencia.join(' | ').slice(0, 1000) } : {}),
        esComentario: false,
        hashTexto: hashTexto(parte),
        indiceChunk: indice++
      })
    })
  }

  // Anotaciones (jurisprudencia, doctrina, notas): fuera por defecto. Si se
  // incluyen, van marcadas como comentario y se excluyen de la búsqueda normal.
  if (opciones.incluirAnotaciones) {
    resultado.anotaciones
      .filter(n => n.tipo === 'jurisprudencia' || n.tipo === 'doctrina')
      .forEach((n, k) => {
        const texto = n.texto.slice(0, 2000)
        registros.push({
          ...comunes,
          id: `${meta.normaId}#nota-${k + 1}`,
          text: `${meta.norma} | ${n.tipo}${n.articuloRelacionado ? ` (relacionada con el artículo ${n.articuloRelacionado})` : ''}\n${texto}`,
          articulo: n.articuloRelacionado ?? '',
          parte: 1,
          totalPartes: 1,
          vigencia: 'vigente',
          vigenciaOrigen: 'detectada',
          esComentario: true,
          tipoAnotacion: n.tipo,
          hashTexto: hashTexto(texto),
          indiceChunk: indice++
        })
      })
  }
  return registros
}

export { ABREVIATURA }
