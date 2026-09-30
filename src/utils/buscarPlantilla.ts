// =========================
// BÚSQUEDA LOCAL DE PLANTILLAS (respaldo del asistente de contratos)
// Si la IA no responde (sin conexión, cupo diario agotado, Gemini caído),
// el asistente sigue ofreciendo plantillas buscando por palabras: el
// nombre, tipo y descripción de cada plantilla, más sinónimos coloquiales
// de los contratos más comunes.
// =========================

interface PlantillaBuscable {
  id: string
  name: string
  type?: string
  description?: string
}

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Palabra coloquial → término que suele aparecer en el nombre de la plantilla.
const SINONIMOS: Record<string, string[]> = {
  arrendamiento: ['alquiler', 'alquilar', 'alquilo', 'renta', 'rentar', 'inquilino', 'arrendar', 'arriendo', 'depa', 'departamento', 'casa', 'local', 'cuarto', 'habitacion', 'oficina'],
  compraventa: ['vender', 'venta', 'vendo', 'comprar', 'compra', 'compro', 'auto', 'carro', 'vehiculo', 'terreno', 'inmueble', 'moto'],
  comodato: ['prestar', 'presto', 'prestamo', 'gratis', 'gratuito', 'uso'],
  mutuo: ['prestamo', 'dinero', 'plata', 'deuda', 'intereses'],
  deposito: ['guardar', 'custodia', 'almacen', 'almacenar', 'depositar', 'bodega'],
  obra: ['construir', 'construccion', 'remodelar', 'remodelacion', 'edificar', 'contratista', 'albanil'],
  agencia: ['agente', 'representante', 'comision', 'intermediario'],
  agente: ['agencia', 'representante', 'comision', 'intermediario'],
  servicios: ['servicio', 'freelance', 'consultoria', 'honorarios', 'locacion'],
  trabajo: ['empleo', 'trabajador', 'laboral', 'sueldo', 'contratar']
}

// Palabras que aparecen en casi cualquier pedido y no distinguen plantillas.
const VACIAS = new Set([
  'contrato', 'contratos', 'modelo', 'plantilla', 'formato', 'quiero', 'necesito', 'busco', 'hacer',
  'para', 'una', 'uno', 'unos', 'unas', 'los', 'las', 'del', 'con', 'por', 'que', 'mis', 'sus', 'este', 'esta'
])

function palabras(texto: string): string[] {
  return normalizar(texto).split(/[^a-z0-9ñ]+/).filter(p => p.length >= 3 && !VACIAS.has(p))
}

// Plantillas que coinciden con lo que escribió el usuario, la más probable primero.
export function buscarPlantillasLocal<T extends PlantillaBuscable>(consulta: string, plantillas: T[], maximo = 3): T[] {
  // Término → peso: 1 por cada palabra escrita, y un término de contrato
  // pesa tantas veces como sinónimos suyos aparezcan ("remodelar" y
  // "contratista" → obra pesa 2; "casa" → arrendamiento pesa 1).
  const escritas = new Set(palabras(consulta))
  const terminos = new Map<string, number>([...escritas].map(p => [p, 1]))
  for (const [termino, sinonimos] of Object.entries(SINONIMOS)) {
    const coincidencias = sinonimos.filter(s => escritas.has(s)).length
    if (coincidencias > 0) terminos.set(termino, (terminos.get(termino) ?? 0) + coincidencias)
  }
  if (terminos.size === 0) return []

  return plantillas
    .map(p => {
      const nombre = normalizar(p.name)
      const resto = normalizar(`${p.type ?? ''} ${p.description ?? ''}`)
      let puntaje = 0
      for (const [t, peso] of terminos) {
        // "contratista", "contratar"... coincidirían con "Contrato de ..."
        // de todas las plantillas; solo cuentan por sus sinónimos.
        if (t.startsWith('contrat')) continue
        const raiz = t.slice(0, 6)
        if (nombre.includes(raiz)) puntaje += 3 * peso
        else if (resto.includes(raiz)) puntaje += peso
      }
      return { p, puntaje }
    })
    .filter(x => x.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, maximo)
    .map(x => x.p)
}
