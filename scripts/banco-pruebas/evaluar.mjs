// Compara las fuentes que citó consultarLexit con lo esperado en un caso de
// preguntas.json. Devuelve la lista de problemas (vacía = la prueba pasa).

// Por si el documento se subió con otro tipo en Admin, también se acepta
// que el NOMBRE del documento corresponda al código esperado.
const PATRON_NOMBRE = { 'constitucion': /constituci/i, 'codigo-civil': /civil/i, 'codigo-penal': /penal/i }

export function coincide(fuente, esperado) {
  const delCodigo = fuente.tipoDocumento === esperado.codigo || PATRON_NOMBRE[esperado.codigo]?.test(fuente.nombreDocumento ?? '')
  const articulo = fuente.numeroArticulo !== undefined
    ? `${fuente.numeroArticulo}${fuente.sufijoArticulo ? `-${fuente.sufijoArticulo}` : ''}`
    : undefined
  return Boolean(delCodigo) && articulo === String(esperado.articulo).toUpperCase()
}

export const etiqueta = f => f.numeroArticulo !== undefined
  ? `${f.nombreDocumento} ${f.numeroArticulo}${f.sufijoArticulo ? `-${f.sufijoArticulo}` : ''}`
  : `${f.nombreDocumento} (sin artículo)`

const etiquetaEsperado = e => `${e.codigo} ${e.articulo}`

export function evaluar(caso, fuentes) {
  const problemas = []
  if (caso.tipo === 'sin_citas') {
    if (fuentes.length > 0) problemas.push(`no debía citar, citó: ${fuentes.map(etiqueta).join('; ')}`)
    return problemas
  }
  if (fuentes.length === 0) problemas.push('no citó ninguna fuente')
  for (const e of caso.debe_citar ?? []) {
    if (!fuentes.some(f => coincide(f, e))) problemas.push(`faltó ${etiquetaEsperado(e)}`)
  }
  if (caso.alguno_de?.length) {
    const minimo = caso.minimo ?? 1
    const encontrados = caso.alguno_de.filter(e => fuentes.some(f => coincide(f, e)))
    if (encontrados.length < minimo) {
      problemas.push(`citó ${encontrados.length} de [${caso.alguno_de.map(etiquetaEsperado).join(', ')}], mínimo ${minimo}`)
    }
  }
  for (const e of caso.no_debe_citar ?? []) {
    if (fuentes.some(f => coincide(f, e))) problemas.push(`citó ${etiquetaEsperado(e)}, que no corresponde`)
  }
  return problemas
}
