// Área de la empresa en la que trabaja el usuario (Financiera, RR. HH.,
// etc.). Se elige al registrarse o en "Mi perfil" y sirve para enfocar el
// resumen de las normas del día en lo que le importa a esa área.
// No confundir con las especializaciones jurídicas (constants/especialidades.ts).
// Mantener sincronizado con functions/src/areasTrabajo.ts.
export const AREAS_TRABAJO = [
  { valor: 'legal', etiqueta: 'Legal' },
  { valor: 'financiera', etiqueta: 'Financiera / Contable' },
  { valor: 'tributaria', etiqueta: 'Tributaria' },
  { valor: 'recursos-humanos', etiqueta: 'Recursos Humanos / Laboral' },
  { valor: 'comercial', etiqueta: 'Comercial / Ventas' },
  { valor: 'operaciones', etiqueta: 'Operaciones / Logística' },
  { valor: 'ti', etiqueta: 'Tecnología (TI)' },
  { valor: 'gerencia', etiqueta: 'Gerencia / Administración' },
  { valor: 'otra', etiqueta: 'Otra' }
] as const

export type AreaTrabajo = typeof AREAS_TRABAJO[number]['valor']

export function esAreaTrabajo(valor: unknown): valor is AreaTrabajo {
  return AREAS_TRABAJO.some(a => a.valor === valor)
}

export function etiquetaAreaTrabajo(valor: string | null | undefined): string {
  return AREAS_TRABAJO.find(a => a.valor === valor)?.etiqueta ?? ''
}
