// =========================
// ÍNDICES DE PINECONE (esquema nuevo)
// - lexit: el índice de siempre (llama-text-embed-v2). __default__ sigue ahí
//   y no se toca; el esquema nuevo usa sus namespaces normas-v2(-prueba).
// - lexit-e5: índice temporal con multilingual-e5-large, para seguir
//   buscando mientras la cuota mensual de llama-text-embed-v2 está agotada.
//   e5 admite ~507 tokens por texto: los fragmentos son más cortos.
// Cuál usa Consultas se elige en config/consultas (configBusqueda.ts), sin
// deploy; volver al anterior es cambiar ese valor.
// =========================
import type { Pinecone } from '@pinecone-database/pinecone'

export const INDICES = {
  lexit: {
    nombre: 'lexit',
    // Mismo host que PINECONE_HOST en consultarLexit.ts
    host: 'https://lexit-rv6se0q.svc.aped-4627-b74a.pinecone.io' as string | null,
    modelo: 'llama-text-embed-v2',
    // Sin límite extra: se mantiene el corte de siempre (partes de 2000 caracteres)
    maxCaracteres: null as number | null
  },
  'lexit-e5': {
    nombre: 'lexit-e5',
    host: null as string | null,
    modelo: 'multilingual-e5-large',
    // Caracteres máximos del texto que se vectoriza (encabezado + artículo)
    maxCaracteres: 1350 as number | null
  }
} as const

export type IndiceId = keyof typeof INDICES
export const INDICE_POR_DEFECTO: IndiceId = 'lexit'

export function esIndiceId(valor: unknown): valor is IndiceId {
  return typeof valor === 'string' && Object.prototype.hasOwnProperty.call(INDICES, valor)
}

// Host de cada índice: el de lexit es fijo; el de los demás se pide a Pinecone una vez
const hosts = new Map<IndiceId, string>()

export async function abrirIndice(pinecone: Pinecone, id: IndiceId): Promise<ReturnType<Pinecone['index']>> {
  const conf = INDICES[id]
  let host = conf.host ?? hosts.get(id)
  if (!host) {
    host = (await pinecone.describeIndex(conf.nombre)).host
    hosts.set(id, host)
  }
  return pinecone.index(conf.nombre, host.startsWith('http') ? host : `https://${host}`)
}
