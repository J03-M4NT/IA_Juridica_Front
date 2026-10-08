// Especializaciones (áreas del derecho) de la base jurídica: son las
// carpetas del compartido. Se eligen al subir una norma (Admin) y en el
// chat de Consultas para limitar las respuestas a esa rama.
// Mantener sincronizado con functions/src/especialidades.ts.
export const ESPECIALIDADES = [
  { valor: 'derecho-penal', etiqueta: 'Derecho Penal' },
  { valor: 'derecho-civil', etiqueta: 'Derecho Civil' },
  { valor: 'derecho-tributario', etiqueta: 'Derecho Tributario' },
  { valor: 'derecho-comercial', etiqueta: 'Derecho Comercial' },
  { valor: 'derecho-laboral', etiqueta: 'Derecho Laboral' }
] as const

export type Especialidad = typeof ESPECIALIDADES[number]['valor']

export function etiquetaEspecialidad(valor: string | undefined): string {
  return ESPECIALIDADES.find(e => e.valor === valor)?.etiqueta ?? ''
}
