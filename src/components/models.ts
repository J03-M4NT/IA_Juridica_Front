export interface Todo {
  id: number;
  content: string;
}

export interface Meta {
  totalCount: number;
}

// Interfaces para el análisis de contratos y PDFs
export interface Clausula {
  numero: number;
  texto: string;
  riesgo?: string;
  tipo?: string;
}

export interface AnalisisContrato {
  resumen: string;
  clausulas: Clausula[];
  tipoContrato?: string;
  partes?: string[];
  fechaAnalisis: Date;
}

export interface ArchivoPDF {
  id: string;
  nombre: string;
  tamano: number;
  fechaSubida: Date;
  analisis?: AnalisisContrato;
  contenido?: string; // Para almacenar el texto extraído del PDF
}

export interface MensajeConsulta {
  id: string;
  contenido: string;
  esIA: boolean;
  timestamp: Date;
  referencias?: string[];
  archivoAdjunto?: ArchivoPDF;
  tipo?: 'texto' | 'pdf' | 'consulta_pdf';
}
