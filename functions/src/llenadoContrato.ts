// =========================
// LLENADO DE CONTRATOS CON IA (Gestión de contratos)
// Reglas para que el chat de edición complete las plantillas sin dejar
// restos ("____ (años / meses)" → "10 (diez) años"), el flujo de las
// cláusulas adicionales y la comprobación de que no queden espacios por
// completar (salvo las líneas de firma, que se firman a mano).
// =========================

export const REGLAS_LLENADO = `
REGLAS PARA COMPLETAR LA PLANTILLA (obligatorias):
- Completa TODOS los espacios en blanco ("____", "……", "(____)") con el dato que corresponda; pregunta por cada dato que falte. Excepción: las líneas de firma ("Firma: ________") se dejan en blanco porque se firman a mano. Nombre y DNI de quien firma SÍ se completan.
- Las indicaciones entre paréntesis junto a un espacio son instrucciones para quien llena el contrato y NO deben quedar en el texto final: "(años / meses)", "(casa-habitación / local comercial)", "(indicar la finalidad del uso)", "(consignar la cantidad en números y letras...)", "(describir el bien...)", etc. Al completar el espacio, BORRA la indicación y los guiones; si la indicación ofrece opciones separadas por "/", deja solo la que corresponde.
  Ejemplo: "es de ________ (años / meses), de carácter forzoso" con la respuesta "10 años" → "es de 10 (diez) años, de carácter forzoso".
- Cantidades: en números y en letras. Plazos: "10 (diez) años", "30 (treinta) días calendario". Montos: "S/ 1,500.00 (mil quinientos y 00/100 soles)" o "US$ 2,000.00 (dos mil y 00/100 dólares americanos)"; si la plantilla ya trae "(______ y 00/100 soles)", completa ahí las letras.
- Fechas: "15 de octubre de 2026". Lugar y fecha del cierre: "Lima, 15 de octubre de 2026".
- Nombres de personas y razones sociales tal como los dé el usuario, en mayúsculas si la plantilla los pone en mayúsculas. DNI y RUC solo con los números que dé el usuario.
- Si el usuario no conoce un dato, pregunta si prefiere dejarlo pendiente; solo en ese caso puede quedar el espacio.
- Pregunta por los datos en el orden en que aparecen en el contrato, agrupando lo que es de la misma parte (por ejemplo, nombre, DNI y domicilio del arrendador pueden pedirse juntos).`

export const INSTRUCCION_CLAUSULAS_ADICIONALES = `
CLÁUSULAS ADICIONALES:
- Cuando ya estén completos los datos de la plantilla y ANTES de terminar, pregunta: "¿Deseas agregar cláusulas adicionales al contrato?". Si no, termina.
- Si el usuario quiere agregar, pregúntale qué quiere pactar en cada una y redáctalas con lenguaje jurídico formal, en el mismo estilo del contrato.
- Usa OBLIGATORIAMENTE los términos definidos del contrato (los que están en MAYÚSCULAS en la cláusula de DEFINICIONES y en el texto: PARTES, CONTRATO, INMUEBLE, RENTA, etc.) con su mismo nombre. No crees definiciones nuevas.
- Numéralas así: "CLÁUSULA ADICIONAL PRIMERA.- TÍTULO", "CLÁUSULA ADICIONAL SEGUNDA.- TÍTULO", etc.
- Devuélvelas en el campo "clausulasAdicionales" (la lista COMPLETA cada vez que agregues o modifiques alguna; nunca en "cambios"): [{"encabezado": "CLÁUSULA ADICIONAL PRIMERA.- CONFIDENCIALIDAD", "texto": "El texto de la cláusula. Si tiene varios párrafos, sepáralos con saltos de línea."}]. Se insertarán después de la última cláusula del contrato y antes del cierre y las firmas. Omite el campo si no cambiaron.
- Después de cada cláusula adicional, pregunta si desea agregar otra.`

export interface ClausulaAdicional {
  encabezado: string
  texto: string
}

const MAX_CLAUSULAS = 10

export function normalizarClausulasAdicionales(crudo: unknown): ClausulaAdicional[] | undefined {
  if (!Array.isArray(crudo)) return undefined
  return crudo
    .map(c => (c ?? {}) as Record<string, unknown>)
    .filter(c => typeof c.encabezado === 'string' && typeof c.texto === 'string' && c.encabezado.trim() && c.texto.trim())
    .slice(0, MAX_CLAUSULAS)
    .map(c => ({
      encabezado: (c.encabezado as string).replace(/\s+/g, ' ').trim().slice(0, 200),
      texto: (c.texto as string).trim().slice(0, 4_000)
    }))
}

// Aplica los reemplazos sobre el texto (solo para comprobar qué quedaría)
export function aplicarCambiosTexto(texto: string, cambios: { antes: string; despues: string }[]): string {
  let resultado = texto
  for (const c of cambios) {
    if (resultado.includes(c.antes)) resultado = resultado.replace(c.antes, () => c.despues)
  }
  return resultado
}

const RE_INDICACION = /\((?:indicar|consignar|describir|detallar|precisar|señalar|cantidad de)[^)]{0,120}\)|\([^()]{2,40}\s\/\s[^()]{2,40}\)|\(\s*\)/i

/**
 * Lo que todavía falta completar: líneas con espacios en blanco (salvo las
 * de firma) o con indicaciones para quien llena el contrato.
 */
export function pendientesDelContrato(texto: string): string[] {
  return texto
    .split(/\n+/)
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(l => l && !/\bfirma\b/i.test(l) && (/_{3,}|…{2,}|\.{6,}/.test(l) || RE_INDICACION.test(l)))
    .map(l => (l.length > 160 ? `${l.slice(0, 160)}…` : l))
}

// El usuario pidió terminar o dejar datos pendientes
export function quiereTerminar(mensaje: string): boolean {
  return /\b(termina|terminar|terminemos|finaliza|finalizar|ya est[áa]|as[íi] est[áa] bien|dejar(lo)? (en blanco|pendiente)|no (lo )?s[ée]|no tengo|despu[ée]s lo completo|ver el resultado)\b/i.test(mensaje)
}

// ¿Ya se ofreció agregar cláusulas adicionales en esta conversación?
export function yaSeOfrecieronAdicionales(historial: { esIA: boolean; contenido: string }[]): boolean {
  return historial.some(m => m.esIA && /cl[áa]usulas? adicional/i.test(m.contenido))
}
