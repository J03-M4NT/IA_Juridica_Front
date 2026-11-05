import { postFuncion } from './functionsClient'

// =========================
// ANALÍTICA (Cloud Function analiticaAdmin, solo admins)
// Resumen de los últimos 30 días: personas activas, usuarios registrados,
// uso por herramienta y consumo de IA de hoy. Solo son conteos: no incluye
// el texto de las consultas ni datos personales.
// =========================

export interface DiaAnalitica {
  fecha: string // YYYY-MM-DD (hora Perú)
  llamadas: number
  activos: number
  nuevos: number // primera vez que usaron LexIT
  recurrentes: number // ya lo habían usado otro día
  porFuncion: Record<string, number> // nombre de la función (en minúsculas) → llamadas
}

export interface ResumenAnalitica {
  hoy: string
  desde: string | null
  dias: DiaAnalitica[]
  activos: { hoy: number; semana: number; mes: number; conActividad: number }
  usuarios: { total: number; nuevosSemana: number; nuevosMes: number }
  consumoHoy: {
    ia: { usadas: number; usuarios: number; enLimite: number; limite: number }
    sugerencias: { usadas: number; usuarios: number; limite: number }
    rerank: { mes: string; usados: number; limite: number }
  }
}

export async function leerAnalitica(): Promise<ResumenAnalitica> {
  const response = await postFuncion('analiticaAdmin', {})
  const data = await response.json().catch(() => ({})) as ResumenAnalitica & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'No se pudo leer la analítica')
  return data
}

// Herramientas de LexIT y las funciones que usa cada una (en minúsculas,
// como las registra el servidor)
export const HERRAMIENTAS: Array<{ nombre: string; icono: string; acciones: Record<string, string> }> = [
  {
    nombre: 'Consultas',
    icono: 'forum',
    acciones: { consultarlexit: 'Preguntas en el chat', metabusqueda: 'Meta búsqueda', searchinpinecone: 'Búsquedas en la base legal' }
  },
  {
    nombre: 'Análisis de contratos',
    icono: 'fact_check',
    acciones: { generarsugerenciascontrato: 'Contratos analizados', explicarcambioscontratoia: 'Comparaciones de versiones', descargarwordeditado: 'Descargas en Word', obtenerurlfirmadadocumento: 'Documentos abiertos' }
  },
  {
    nombre: 'Gestión de contratos',
    icono: 'description',
    acciones: { recomendarplantillaia: 'Recomendaciones de plantilla', chatedicioncontratoia: 'Chat de llenado', modificarplantillaia: 'Cambios a plantillas' }
  },
  {
    nombre: 'Redacción',
    icono: 'edit_note',
    acciones: { redactardocumentoia: 'Documentos redactados', sugerirredaccionia: 'Sugerencias en vivo' }
  },
  {
    nombre: 'Panorama',
    icono: 'insights',
    acciones: { obtenerpanoramadia: 'Panoramas del día' }
  },
  {
    nombre: 'Biblioteca legal',
    icono: 'local_library',
    acciones: { resumirnormaia: 'Resúmenes de normas', resumirnormasdeldiaia: 'Resúmenes de normas del día', resolverurlpdfnorma: 'PDF de normas abiertos' }
  }
]
