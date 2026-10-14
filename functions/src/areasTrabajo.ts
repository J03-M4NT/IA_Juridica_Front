// =========================
// ÁREAS DE TRABAJO DEL USUARIO (Financiera, RR. HH., etc.)
// Con el área elegida en su perfil, el resumen de las normas del día se
// enfoca en lo que le importa a esa área. "otra" (o sin área) usa el
// resumen general de siempre.
// Mantener sincronizado con src/constants/areasTrabajo.ts (functions/ no
// puede importar archivos del front).
// =========================

export const ENFOQUE_POR_AREA: Record<string, { nombre: string; enfoque: string }> = {
  legal: {
    nombre: 'Legal',
    enfoque: 'cambios normativos, plazos, obligaciones nuevas y riesgos de cumplimiento para la empresa'
  },
  financiera: {
    nombre: 'Financiera / Contable',
    enfoque: 'impacto en finanzas, contabilidad, sistema financiero, mercado de valores, SBS/SMV, presupuesto, tasas, encajes, deuda y reportes'
  },
  tributaria: {
    nombre: 'Tributaria',
    enfoque: 'impuestos, SUNAT, aduanas, tasas, plazos de declaración y pago, comprobantes, beneficios y sanciones tributarias'
  },
  'recursos-humanos': {
    nombre: 'Recursos Humanos / Laboral',
    enfoque: 'remuneraciones, beneficios sociales, contratación, SUNAFIL, seguridad y salud en el trabajo, régimen laboral y pensiones'
  },
  comercial: {
    nombre: 'Comercial / Ventas',
    enfoque: 'consumidor, INDECOPI, publicidad, contratos con clientes, comercio exterior, precios y competencia'
  },
  operaciones: {
    nombre: 'Operaciones / Logística',
    enfoque: 'transporte, permisos y licencias, normas sectoriales, medio ambiente, importaciones, seguridad y procesos operativos'
  },
  ti: {
    nombre: 'Tecnología (TI)',
    enfoque: 'protección de datos personales, gobierno digital, ciberseguridad, firma y comprobantes electrónicos, telecomunicaciones'
  },
  gerencia: {
    nombre: 'Gerencia / Administración',
    enfoque: 'impacto general en la empresa: obligaciones nuevas, costos, plazos, contrataciones con el Estado y decisiones que debe tomar la dirección'
  }
}
