export interface Clausula {
  numero: number
  texto: string
  riesgo?: string
  tipo?: string
}

export interface AnalisisContrato {
  resumen: string
  clausulas: Clausula[]
  tipoContrato?: string
  partes?: string[]
  fechaAnalisis: Date
}

export interface ArchivoPDF {
  id: string
  nombre: string
  tamano: number
  fechaSubida: Date
  analisis?: AnalisisContrato
  contenido?: string
}

export interface MensajeConsulta {
  id: string
  contenido: string
  esIA: boolean
  timestamp: Date
  referencias?: string[]
  archivoAdjunto?: ArchivoPDF
  tipo?: 'texto' | 'pdf' | 'consulta_pdf'
}
