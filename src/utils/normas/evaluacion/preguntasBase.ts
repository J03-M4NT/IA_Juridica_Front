// =========================
// PREGUNTAS DE EVALUACIÓN (mejora de Consultas, fase 3)
// ⚠ BORRADOR, PENDIENTE DE VALIDACIÓN LEGAL: los artículos esperados los
// propuso el equipo técnico; deben validarse contra el texto oficial y luego
// por un abogado antes de usar los resultados para decidir.
//
// Formato reutilizable: para evaluar otra área (por ejemplo, Derecho
// Administrativo) se arma un juego igual (en este formato o como JSON) y se
// carga desde Admin, sin cambiar código. Cada esperado identifica la norma
// por su normaId del esquema nuevo, su nombre y su número (para reconocerla
// también en la base actual) y el artículo con su letra si la tiene.
// =========================

export interface ArticuloEsperado {
  normaId: string
  norma: string
  numeroNorma: string
  articulo: string
}

export interface PreguntaEvaluacion {
  id: string
  pregunta: string
  tipo: 'articulo' | 'tema' | 'varios-temas' | 'norma-nombrada' | 'ley-especial'
  area?: string
  esperados: ArticuloEsperado[]
  comentario?: string
}

export interface JuegoPreguntas {
  nombre: string
  estado: string
  version: number
  preguntas: PreguntaEvaluacion[]
}

const CC = { normaId: 'codigo-civil', norma: 'Código Civil', numeroNorma: 'D. Leg. 295' }
const CP = { normaId: 'codigo-penal', norma: 'Código Penal', numeroNorma: 'D. Leg. 635' }
const CONST = { normaId: 'constitucion-1993', norma: 'Constitución Política del Perú', numeroNorma: '1993' }
const IR = { normaId: 'tuo-ley-impuesto-renta', norma: 'TUO de la Ley del Impuesto a la Renta', numeroNorma: 'D.S. 179-2004-EF' }
const L30096 = { normaId: 'ley-30096', norma: 'Ley de Delitos Informáticos', numeroNorma: 'Ley 30096' }
const L26872 = { normaId: 'ley-26872', norma: 'Ley de Conciliación', numeroNorma: 'Ley 26872' }

export const PREGUNTAS_BASE: JuegoPreguntas = {
  nombre: 'Fase 3 · 20 preguntas sobre las 6 normas de prueba',
  estado: 'borrador, pendiente de validación legal',
  version: 1,
  preguntas: [
    { id: 'p01', tipo: 'tema', area: 'derecho-civil', pregunta: '¿Cuáles son los requisitos de validez del acto jurídico?', esperados: [{ ...CC, articulo: '140' }] },
    { id: 'p02', tipo: 'articulo', area: 'derecho-civil', pregunta: '¿Qué dice el artículo 1351 del Código Civil?', esperados: [{ ...CC, articulo: '1351' }] },
    { id: 'p03', tipo: 'tema', area: 'derecho-civil', pregunta: '¿Qué es el contrato de arrendamiento?', esperados: [{ ...CC, articulo: '1666' }] },
    { id: 'p04', tipo: 'tema', area: 'derecho-civil', pregunta: '¿En qué casos es nulo un acto jurídico?', esperados: [{ ...CC, articulo: '219' }] },
    { id: 'p05', tipo: 'tema', area: 'derecho-civil', pregunta: '¿Cuál es el plazo de prescripción de la acción personal?', esperados: [{ ...CC, articulo: '2001' }] },
    { id: 'p06', tipo: 'tema', area: 'derecho-civil', pregunta: '¿A qué edad se adquiere la plena capacidad de ejercicio?', esperados: [{ ...CC, articulo: '42' }] },
    {
      id: 'p07', tipo: 'varios-temas', area: 'derecho-civil', pregunta: '¿Un menor de 16 años puede firmar un contrato de alquiler?',
      esperados: [{ ...CC, articulo: '44' }, { ...CC, articulo: '1666' }],
      comentario: 'Incapacidad relativa (art. 44) y definición de arrendamiento (art. 1666).'
    },
    { id: 'p08', tipo: 'tema', area: 'derecho-civil', pregunta: '¿Quién debe indemnizar cuando causa un daño a otro por dolo o culpa?', esperados: [{ ...CC, articulo: '1969' }] },
    { id: 'p09', tipo: 'articulo', area: 'derecho-penal', pregunta: '¿Qué establece el artículo 106 del Código Penal?', esperados: [{ ...CP, articulo: '106' }] },
    { id: 'p10', tipo: 'tema', area: 'derecho-penal', pregunta: '¿Cuál es la pena por sicariato?', esperados: [{ ...CP, articulo: '108-C' }] },
    { id: 'p11', tipo: 'tema', area: 'derecho-penal', pregunta: '¿Qué es el feminicidio y qué pena tiene?', esperados: [{ ...CP, articulo: '108-B' }] },
    { id: 'p12', tipo: 'tema', area: 'derecho-penal', pregunta: '¿Qué es el delito de hurto?', esperados: [{ ...CP, articulo: '185' }] },
    { id: 'p13', tipo: 'tema', area: 'derecho-penal', pregunta: '¿Cuándo se comete el delito de estafa?', esperados: [{ ...CP, articulo: '196' }] },
    {
      id: 'p14', tipo: 'tema', pregunta: '¿Qué dice la Constitución sobre la libertad de expresión?', esperados: [{ ...CONST, articulo: '2' }],
      comentario: 'Artículo 2, inciso 4.'
    },
    {
      id: 'p15', tipo: 'varios-temas', pregunta: '¿Cómo protege la Constitución el derecho de propiedad?',
      esperados: [{ ...CONST, articulo: '70' }, { ...CONST, articulo: '2' }],
      comentario: 'Artículo 70 (inviolabilidad) y artículo 2, inciso 16.'
    },
    { id: 'p16', tipo: 'tema', pregunta: '¿Cuáles son los principios de la función jurisdiccional?', esperados: [{ ...CONST, articulo: '139' }] },
    {
      id: 'p17', tipo: 'norma-nombrada', area: 'derecho-tributario', pregunta: '¿Qué rentas grava el Impuesto a la Renta?', esperados: [{ ...IR, articulo: '1' }],
      comentario: 'En la base actual la Ley del IR no tiene artículos identificados.'
    },
    {
      id: 'p18', tipo: 'articulo', area: 'derecho-tributario', pregunta: '¿Qué dice el artículo 14-A de la Ley del Impuesto a la Renta?', esperados: [{ ...IR, articulo: '14-A' }],
      comentario: 'Artículo con letra.'
    },
    { id: 'p19', tipo: 'ley-especial', area: 'derecho-penal', pregunta: '¿Qué es el delito de acceso ilícito a un sistema informático?', esperados: [{ ...L30096, articulo: '2' }] },
    {
      id: 'p20', tipo: 'norma-nombrada', area: 'derecho-civil', pregunta: 'Según la Ley de Conciliación, ¿qué es la conciliación?', esperados: [{ ...L26872, articulo: '5' }]
    }
  ]
}
