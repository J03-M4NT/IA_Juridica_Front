// =========================
// CATÁLOGO DE NORMAS (mejora de Consultas, fase 2)
// Tipo, número, nombre para citar y área de cada norma de la base jurídica,
// según la tabla aprobada en la fase 1 (con los nombres corregidos). Admin
// lo usa para completar el formulario al subir una norma al esquema nuevo;
// el admin siempre puede corregirlo antes de subir.
// ⚠ Mercado de Valores y Nuevo RUS: pendientes de verificar contra el texto
// oficial. La Ley 27285 (demarcación de Manu) queda fuera de la base.
// =========================
import type { TipoNorma } from './metadatosNorma'
import { ESPECIALIDADES } from '../../constants/especialidades'

// Áreas del esquema nuevo: las de hoy más las que se suben después (Derecho
// Administrativo, Constitucional). El selector de Consultas en producción no
// cambia hasta la fase 4.
export const AREAS_NORMAS = [
  ...ESPECIALIDADES.map(e => ({ valor: e.valor as string, etiqueta: e.etiqueta as string })),
  { valor: 'derecho-administrativo', etiqueta: 'Derecho Administrativo' },
  { valor: 'derecho-constitucional', etiqueta: 'Derecho Constitucional' }
]

export interface NormaCatalogo {
  normaId: string
  norma: string
  tipoNorma: TipoNorma
  numeroNorma: string
  area?: string
  porVerificar?: boolean
}

export const CATALOGO_NORMAS: NormaCatalogo[] = [
  { normaId: 'constitucion-1993', norma: 'Constitución Política del Perú', tipoNorma: 'constitucion', numeroNorma: '1993' },

  { normaId: 'codigo-civil', norma: 'Código Civil', tipoNorma: 'codigo', numeroNorma: 'D. Leg. 295', area: 'derecho-civil' },
  { normaId: 'codigo-penal', norma: 'Código Penal', tipoNorma: 'codigo', numeroNorma: 'D. Leg. 635', area: 'derecho-penal' },
  { normaId: 'codigo-procesal-civil', norma: 'Código Procesal Civil', tipoNorma: 'codigo', numeroNorma: 'D. Leg. 768', area: 'derecho-civil' },
  { normaId: 'codigo-procesal-penal', norma: 'Nuevo Código Procesal Penal', tipoNorma: 'codigo', numeroNorma: 'D. Leg. 957', area: 'derecho-penal' },
  { normaId: 'codigo-de-comercio', norma: 'Código de Comercio', tipoNorma: 'codigo', numeroNorma: '', area: 'derecho-comercial' },
  { normaId: 'codigo-consumidor', norma: 'Código de Protección y Defensa del Consumidor', tipoNorma: 'codigo', numeroNorma: 'Ley 29571', area: 'derecho-civil' },

  { normaId: 'tuo-ley-impuesto-renta', norma: 'TUO de la Ley del Impuesto a la Renta', tipoNorma: 'texto-unico-ordenado', numeroNorma: 'D.S. 179-2004-EF', area: 'derecho-tributario' },
  { normaId: 'tuo-ley-igv-isc', norma: 'TUO de la Ley del IGV e ISC', tipoNorma: 'texto-unico-ordenado', numeroNorma: 'D.S. 055-99-EF', area: 'derecho-tributario' },
  { normaId: 'tuo-productividad-competitividad-laboral', norma: 'TUO del D. Leg. 728, Ley de Productividad y Competitividad Laboral', tipoNorma: 'texto-unico-ordenado', numeroNorma: 'D.S. 003-97-TR', area: 'derecho-laboral' },
  { normaId: 'tuo-formacion-promocion-laboral', norma: 'TUO del D. Leg. 728, Ley de Formación y Promoción Laboral', tipoNorma: 'texto-unico-ordenado', numeroNorma: 'D.S. 002-97-TR', area: 'derecho-laboral' },
  { normaId: 'tuo-cts', norma: 'TUO de la Ley de Compensación por Tiempo de Servicios', tipoNorma: 'texto-unico-ordenado', numeroNorma: 'D.S. 001-97-TR', area: 'derecho-laboral' },
  { normaId: 'tuo-jornada-trabajo', norma: 'TUO de la Ley de Jornada de Trabajo, Horario y Trabajo en Sobretiempo', tipoNorma: 'texto-unico-ordenado', numeroNorma: 'D.S. 007-2002-TR', area: 'derecho-laboral' },
  { normaId: 'tuo-relaciones-colectivas', norma: 'TUO de la Ley de Relaciones Colectivas de Trabajo', tipoNorma: 'texto-unico-ordenado', numeroNorma: 'D.S. 010-2003-TR', area: 'derecho-laboral' },
  { normaId: 'tuo-mercado-valores', norma: 'TUO de la Ley del Mercado de Valores', tipoNorma: 'texto-unico-ordenado', numeroNorma: 'D.S. 093-2002-EF', area: 'derecho-comercial', porVerificar: true },

  { normaId: 'reglamento-ley-impuesto-renta', norma: 'Reglamento de la Ley del Impuesto a la Renta', tipoNorma: 'reglamento', numeroNorma: 'D.S. 122-94-EF', area: 'derecho-tributario' },
  { normaId: 'reglamento-ley-igv-isc', norma: 'Reglamento de la Ley del IGV e ISC', tipoNorma: 'reglamento', numeroNorma: 'D.S. 029-94-EF', area: 'derecho-tributario' },

  { normaId: 'dleg-299', norma: 'Arrendamiento Financiero', tipoNorma: 'decreto-legislativo', numeroNorma: 'D. Leg. 299', area: 'derecho-comercial' },
  { normaId: 'dleg-713', norma: 'Descansos remunerados de los trabajadores del régimen laboral de la actividad privada', tipoNorma: 'decreto-legislativo', numeroNorma: 'D. Leg. 713', area: 'derecho-laboral' },
  { normaId: 'dleg-822', norma: 'Ley sobre el Derecho de Autor', tipoNorma: 'decreto-legislativo', numeroNorma: 'D. Leg. 822', area: 'derecho-comercial' },
  { normaId: 'dleg-862', norma: 'Ley de Fondos de Inversión y sus Sociedades Administradoras', tipoNorma: 'decreto-legislativo', numeroNorma: 'D. Leg. 862', area: 'derecho-comercial' },
  { normaId: 'dleg-892', norma: 'Participación de los trabajadores en las utilidades de las empresas', tipoNorma: 'decreto-legislativo', numeroNorma: 'D. Leg. 892', area: 'derecho-laboral' },
  { normaId: 'dleg-937', norma: 'Texto del Nuevo Régimen Único Simplificado (Nuevo RUS)', tipoNorma: 'decreto-legislativo', numeroNorma: 'D. Leg. 937', area: 'derecho-tributario', porVerificar: true },
  { normaId: 'dleg-968', norma: 'Modificación del TUO de la Ley del Impuesto a la Renta: Régimen Especial (RER)', tipoNorma: 'decreto-legislativo', numeroNorma: 'D. Leg. 968', area: 'derecho-tributario' },
  { normaId: 'dleg-1034', norma: 'Ley de Represión de Conductas Anticompetitivas', tipoNorma: 'decreto-legislativo', numeroNorma: 'D. Leg. 1034', area: 'derecho-comercial' },
  { normaId: 'dleg-1044', norma: 'Ley de Represión de la Competencia Desleal', tipoNorma: 'decreto-legislativo', numeroNorma: 'D. Leg. 1044', area: 'derecho-comercial' },
  { normaId: 'dleg-1053', norma: 'Ley General de Aduanas', tipoNorma: 'decreto-legislativo', numeroNorma: 'D. Leg. 1053', area: 'derecho-comercial' },
  { normaId: 'dleg-1075', norma: 'Disposiciones Complementarias a la Decisión 486 (Propiedad Industrial)', tipoNorma: 'decreto-legislativo', numeroNorma: 'D. Leg. 1075', area: 'derecho-comercial' },
  { normaId: 'dleg-1400', norma: 'Régimen de Garantía Mobiliaria', tipoNorma: 'decreto-legislativo', numeroNorma: 'D. Leg. 1400', area: 'derecho-comercial' },

  { normaId: 'decision-486', norma: 'Régimen Común sobre Propiedad Industrial', tipoNorma: 'decision-andina', numeroNorma: 'Decisión 486', area: 'derecho-comercial' },

  { normaId: 'ley-26702', norma: 'Ley General del Sistema Financiero y del Sistema de Seguros y Orgánica de la SBS', tipoNorma: 'ley', numeroNorma: 'Ley 26702', area: 'derecho-comercial' },
  { normaId: 'ley-26872', norma: 'Ley de Conciliación', tipoNorma: 'ley', numeroNorma: 'Ley 26872', area: 'derecho-civil' },
  { normaId: 'ley-26887', norma: 'Ley General de Sociedades', tipoNorma: 'ley', numeroNorma: 'Ley 26887', area: 'derecho-comercial' },
  { normaId: 'ley-27269', norma: 'Ley de Firmas y Certificados Digitales', tipoNorma: 'ley', numeroNorma: 'Ley 27269', area: 'derecho-comercial' },
  { normaId: 'ley-27735', norma: 'Ley que regula el otorgamiento de las gratificaciones por Fiestas Patrias y Navidad', tipoNorma: 'ley', numeroNorma: 'Ley 27735', area: 'derecho-laboral' },
  { normaId: 'ley-27809', norma: 'Ley General del Sistema Concursal', tipoNorma: 'ley', numeroNorma: 'Ley 27809', area: 'derecho-comercial' },
  { normaId: 'ley-28008', norma: 'Ley de los Delitos Aduaneros', tipoNorma: 'ley', numeroNorma: 'Ley 28008', area: 'derecho-tributario' },
  { normaId: 'ley-28806', norma: 'Ley General de Inspección del Trabajo', tipoNorma: 'ley', numeroNorma: 'Ley 28806', area: 'derecho-laboral' },
  { normaId: 'ley-29623', norma: 'Ley que promueve el financiamiento a través de la factura comercial', tipoNorma: 'ley', numeroNorma: 'Ley 29623', area: 'derecho-comercial' },
  { normaId: 'ley-29733', norma: 'Ley de Protección de Datos Personales', tipoNorma: 'ley', numeroNorma: 'Ley 29733', area: 'derecho-comercial' },
  { normaId: 'ley-29783', norma: 'Ley de Seguridad y Salud en el Trabajo', tipoNorma: 'ley', numeroNorma: 'Ley 29783', area: 'derecho-laboral' },
  { normaId: 'ley-30077', norma: 'Ley contra el Crimen Organizado', tipoNorma: 'ley', numeroNorma: 'Ley 30077', area: 'derecho-penal' },
  { normaId: 'ley-30096', norma: 'Ley de Delitos Informáticos', tipoNorma: 'ley', numeroNorma: 'Ley 30096', area: 'derecho-penal' },
  { normaId: 'ley-30424', norma: 'Ley que regula la responsabilidad administrativa de las personas jurídicas', tipoNorma: 'ley', numeroNorma: 'Ley 30424', area: 'derecho-penal' },
  { normaId: 'ley-31112', norma: 'Ley que establece el control previo de operaciones de concentración empresarial', tipoNorma: 'ley', numeroNorma: 'Ley 31112', area: 'derecho-comercial' },
  { normaId: 'ley-31572', norma: 'Ley del Teletrabajo', tipoNorma: 'ley', numeroNorma: 'Ley 31572', area: 'derecho-laboral' }
]

// Normas que no se suben al esquema nuevo
export const NORMAS_EXCLUIDAS = ['Ley 27285']

// "D.S. 029-94-EF" y "D.S. 29-94-EF" son la misma norma: sin ceros a la izquierda
const clave = (s: string) => s.toUpperCase().replace(/(?<!\d)0+(?=\d)/g, '').replace(/[^A-Z0-9]/g, '').replace(/^(DLEG|DECRETOLEGISLATIVO)/, 'DLEG').replace(/^(DS|DECRETOSUPREMO)/, 'DS')

// Busca la norma del catálogo por su número ("Ley 30096", "D.S. 122-94-EF")
// o, si no hay número, por tipo (códigos y Constitución)
export function buscarEnCatalogo(numeroNorma: string, tipoNorma?: TipoNorma, nombre = ''): NormaCatalogo | undefined {
  if (numeroNorma) {
    const k = clave(numeroNorma)
    const porNumero = CATALOGO_NORMAS.filter(n => n.numeroNorma && clave(n.numeroNorma) === k)
    if (porNumero[0]) return porNumero[0]
  }
  if (tipoNorma === 'constitucion') return CATALOGO_NORMAS[0]
  // Por nombre (de archivo o escrito): "Codigo-Civil", "CODIGOPENAL", "Código Procesal Civil"
  const plano = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '')
  const n = plano(nombre)
  return CATALOGO_NORMAS
    .filter(c => c.tipoNorma === 'codigo' || c.tipoNorma === 'constitucion')
    .map(c => ({ c, clave: plano(c.norma).replace(/^nuevo/, '').replace(/politicadelperu$/, '') }))
    .sort((a, b) => b.clave.length - a.clave.length)
    .find(({ clave }) => n.includes(clave))?.c
}
