// =========================
// OCR: qué resaltar en la pantalla de revisión
// Sin DOM: la pantalla pinta estos tramos como texto plano (sin HTML).
//  - ilegible: [ILEGIBLE], hay que corregirlo o volver a subir la página
//  - dudoso: lo que Gemini marcó como lectura insegura
//  - dato: montos, fechas y números de documento. Se resaltan SIEMPRE,
//    porque un error de lectura en ellos cambia el contrato y el modelo
//    no siempre sabe cuándo se equivocó.
// =========================

export type TipoTramo = 'normal' | 'ilegible' | 'dudoso' | 'dato'

export interface TramoOcr {
  texto: string
  tipo: TipoTramo
}

export const MARCA_ILEGIBLE = '[ILEGIBLE]'

const DATOS = new RegExp([
  /(?:S\/\.?|US\$|\$|USD|PEN)\s?\d[\d.,]*/.source,
  /\d[\d.,]*\s?(?:soles|dólares|dolares)/.source,
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.source,
  /\b\d{1,2}\s+de\s+[a-záéíóúñ]+\s+(?:de|del)\s+\d{4}\b/.source,
  /\b\d{8}\b/.source,
  /\b\d{11}\b/.source
].join('|'), 'gi')

const escaparRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function tramosResaltados(texto: string, dudosos: string[] = []): TramoOcr[] {
  const marcas: Array<{ inicio: number; fin: number; tipo: TipoTramo }> = []
  const anotar = (regex: RegExp, tipo: TipoTramo) => {
    for (const m of texto.matchAll(regex)) {
      const inicio = m.index
      const fin = inicio + m[0].length
      // El primero que marca un tramo gana: ilegible > dudoso > dato
      if (m[0] && !marcas.some(x => inicio < x.fin && fin > x.inicio)) marcas.push({ inicio, fin, tipo })
    }
  }

  anotar(/\[ILEGIBLE\]/g, 'ilegible')
  for (const d of dudosos) {
    if (d.trim()) anotar(new RegExp(escaparRegex(d.trim()), 'g'), 'dudoso')
  }
  anotar(DATOS, 'dato')

  marcas.sort((a, b) => a.inicio - b.inicio)
  const tramos: TramoOcr[] = []
  let posicion = 0
  for (const { inicio, fin, tipo } of marcas) {
    if (inicio > posicion) tramos.push({ texto: texto.slice(posicion, inicio), tipo: 'normal' })
    tramos.push({ texto: texto.slice(inicio, fin), tipo })
    posicion = fin
  }
  if (posicion < texto.length) tramos.push({ texto: texto.slice(posicion), tipo: 'normal' })
  return tramos
}

export function cuantosIlegibles(texto: string): number {
  return texto.split(MARCA_ILEGIBLE).length - 1
}
