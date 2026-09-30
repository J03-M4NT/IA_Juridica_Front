import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { createHash } from 'node:crypto'
import { getFirestore } from 'firebase-admin/firestore'
import { GEMINI_API_KEY, TIMEOUT_FUNCIONES_IA_SEGUNDOS, conModeloDeRespaldo } from './geminiClient'
import {
  ORIGENES_PERMITIDOS,
  MAX_CARACTERES_DOCUMENTO,
  MAX_CARACTERES_CONTRATO,
  MAX_CARACTERES_MENSAJE,
  MAX_MENSAJES_HISTORIAL,
  autorizar,
  consumirCuotaIA,
  excede
} from './seguridad'
import { dividirEnSecciones } from './seccionesContrato'
import { asignarBaseLegal, PINECONE_API_KEY } from './baseLegal'

// ================================
// SUGERENCIAS DE CAMBIOS (redline) PARA UN CONTRATO
// ================================
interface SugerenciaCambio {
  id: string
  tipo: 'cambio' | 'riesgo'
  clausula: string
  textoOriginal: string
  textoSugerido: string
  explicacion: string
  nivel?: 'alto' | 'medio' | 'bajo'
}

// Contratos largos (70-270 páginas) se revisan por secciones: cada una va
// en su propia llamada a Gemini, varias a la vez, y los resultados se
// juntan. Así no se corta por tiempo y cada parte recibe su propia
// revisión (con una sola llamada, un contrato de 200 páginas quedaba con
// 10 marcas en total). Sigue contando como 1 consulta del límite diario.
const CARACTERES_POR_SECCION = 30_000
const SECCIONES_EN_PARALELO = 4
const MAX_ANOTACIONES_CONTRATO_CORTO = 10
const MAX_ANOTACIONES_POR_SECCION = 8
// Con muchas secciones cada llamada puede tardar; más margen que el resto.
const TIMEOUT_SUGERENCIAS_SEGUNDOS = 300

function promptSugerencias(texto: string, maxAnotaciones: number, parte?: { numero: number; total: number }): string {
  return `
    Eres un abogado experto en derecho peruano. Revisa este contrato y devuelve
    dos tipos de anotaciones, para poder marcarlas directamente sobre el texto:

    1. "cambio": una modificación puntual y concreta de redacción (no un
       reescrito completo del contrato).
    2. "riesgo": una cláusula riesgosa que conviene señalar, aunque no siempre
       tenga una reescritura concreta.

    Responde SOLO en JSON con esta estructura, un objeto por cada anotación:
    [
      {
        "tipo": "cambio" o "riesgo",
        "clausula": "nombre o número de la cláusula",
        "textoOriginal": "el fragmento EXACTO del contrato al que se refiere esta anotación, copiado tal cual aparece abajo, sin resumir ni parafrasear",
        "textoSugerido": "para tipo cambio: el texto que lo reemplaza. Para tipo riesgo: puede ir vacío si es solo una alerta, sin una reescritura concreta",
        "explicacion": "por qué se marca esta cláusula, en lenguaje simple",
        "nivel": "alto, medio o bajo — SOLO para tipo riesgo, y NUNCA uses porcentajes"
      }
    ]

    Reglas importantes:
    - "textoOriginal" debe ser una copia literal de un fragmento del contrato de abajo (para poder ubicarlo con una búsqueda de texto exacta). No lo alteres ni corrijas errores de tipeo del original.
    - Si no hay nada que anotar, responde con un array vacío [].
    - Máximo ${maxAnotaciones} anotaciones en total, prioriza las más importantes.
    ${parte ? `- Esta es la PARTE ${parte.numero} de ${parte.total} de un contrato largo. Revisa SOLO esta parte (las demás se revisan por separado) y no marques como faltante algo que podría estar en otra parte.` : ''}

    ${parte ? `CONTRATO (parte ${parte.numero} de ${parte.total}):` : 'CONTRATO:'}
    ${texto}
  `
}

// Gemini a veces envuelve el array en un objeto ({"anotaciones": [...]}).
function leerAnotaciones(respuesta: string): Omit<SugerenciaCambio, 'id'>[] {
  const datos: unknown = JSON.parse(respuesta.replace(/```json|```/g, '').trim())
  if (Array.isArray(datos)) return datos as Omit<SugerenciaCambio, 'id'>[]
  if (datos && typeof datos === 'object') {
    const lista = Object.values(datos).find(Array.isArray)
    if (lista) return lista as Omit<SugerenciaCambio, 'id'>[]
  }
  return []
}

async function anotarTexto(texto: string, maxAnotaciones: number, parte?: { numero: number; total: number }) {
  const result = await conModeloDeRespaldo(model => model.generateContent(promptSugerencias(texto, maxAnotaciones, parte)), { json: true })
  return leerAnotaciones(result.response.text())
}

// Ejecuta las tareas de a `limite` a la vez, conservando el orden.
async function enParalelo<T, R>(items: T[], limite: number, tarea: (item: T, indice: number) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const resultados: PromiseSettledResult<R>[] = new Array(items.length)
  let siguiente = 0
  const trabajador = async () => {
    while (siguiente < items.length) {
      const indice = siguiente++
      const item = items[indice]
      if (item === undefined) continue
      try {
        resultados[indice] = { status: 'fulfilled', value: await tarea(item, indice) }
      } catch (reason) {
        resultados[indice] = { status: 'rejected', reason }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, items.length) }, trabajador))
  return resultados
}

const ORDEN_NIVEL: Record<string, number> = { alto: 0, medio: 1, bajo: 2 }

export const generarSugerenciasContrato = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [GEMINI_API_KEY, PINECONE_API_KEY], timeoutSeconds: TIMEOUT_SUGERENCIAS_SEGUNDOS },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const uid = await autorizar(req, res)
    if (!uid) return

    try {
      const { textoContrato } = req.body as { textoContrato?: string }
      if (!textoContrato?.trim()) {
        res.status(400).json({ error: 'Falta textoContrato' })
        return
      }
      if (excede(textoContrato, MAX_CARACTERES_CONTRATO)) {
        res.status(413).json({ error: 'El contrato es demasiado largo para analizarlo' })
        return
      }
      if (!(await consumirCuotaIA(uid, res))) return

      const secciones = dividirEnSecciones(textoContrato, CARACTERES_POR_SECCION)
      let anotaciones: Omit<SugerenciaCambio, 'id'>[]
      let partesConError = 0

      if (secciones.length <= 1) {
        anotaciones = await anotarTexto(textoContrato, MAX_ANOTACIONES_CONTRATO_CORTO)
      } else {
        logger.info(`📑 Contrato largo (${textoContrato.length} car.): ${secciones.length} secciones`)
        const resultados = await enParalelo(secciones, SECCIONES_EN_PARALELO, (texto, i) =>
          anotarTexto(texto, MAX_ANOTACIONES_POR_SECCION, { numero: i + 1, total: secciones.length }))
        anotaciones = []
        resultados.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            anotaciones.push(...r.value)
          } else {
            partesConError++
            logger.error(`❌ Sección ${i + 1}/${secciones.length} sin analizar:`, (r.reason as Error)?.message)
          }
        })
        if (partesConError === secciones.length) {
          throw new Error('No se pudo analizar ninguna parte del contrato')
        }
        // Sin repetidos (mismo fragmento marcado dos veces) y los riesgos
        // más graves primero; los cambios de redacción al final.
        const vistos = new Set<string>()
        anotaciones = anotaciones
          .filter(a => {
            const clave = `${a.tipo}::${(a.textoOriginal ?? '').trim()}`
            if (vistos.has(clave)) return false
            vistos.add(clave)
            return true
          })
          .sort((a, b) => (ORDEN_NIVEL[a.nivel ?? ''] ?? 3) - (ORDEN_NIVEL[b.nivel ?? ''] ?? 3))
      }

      // Base legal de la base jurídica, solo cuando un artículo sustenta
      // directamente la sugerencia (ver baseLegal.ts). Si falla, las
      // sugerencias van igual, sin cita.
      const conBaseLegal = await asignarBaseLegal(anotaciones)

      res.json({
        sugerencias: conBaseLegal.map((s, i) => ({ id: `sugerencia-${i}`, ...s })),
        partes: secciones.length,
        partesConError
      })
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en generarSugerenciasContrato:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)

// ================================
// MODIFICAR PLANTILLA CON IA
// ================================
export const modificarPlantillaIA = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [GEMINI_API_KEY], timeoutSeconds: TIMEOUT_FUNCIONES_IA_SEGUNDOS },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const uid = await autorizar(req, res)
    if (!uid) return

    try {
      const { textoPlantilla, instruccion } = req.body as { textoPlantilla?: string; instruccion?: string }
      if (!textoPlantilla?.trim() || !instruccion?.trim()) {
        res.status(400).json({ error: 'Falta textoPlantilla o instruccion' })
        return
      }
      if (excede(textoPlantilla, MAX_CARACTERES_DOCUMENTO) || excede(instruccion, MAX_CARACTERES_MENSAJE)) {
        res.status(413).json({ error: 'La plantilla o la instrucción son demasiado largas' })
        return
      }
      if (!(await consumirCuotaIA(uid, res))) return

      const prompt = `
    Eres un abogado experto en derecho peruano.
    El usuario quiere modificar esta plantilla de contrato.

    INSTRUCCIÓN: ${instruccion}

    PLANTILLA ACTUAL:
    ${textoPlantilla}

    Devuelve SOLO el contrato modificado, sin explicaciones.
  `

      const result = await conModeloDeRespaldo(model => model.generateContent(prompt))

      res.json({ textoModificado: result.response.text() })
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en modificarPlantillaIA:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)

// ================================
// CHAT CONVERSACIONAL PARA COMPLETAR/EDITAR UN CONTRATO
// (la IA analiza el contrato, pregunta un dato a la vez, y al final
// devuelve el contrato completo actualizado)
// ================================
interface MensajeChatEdicion {
  esIA: boolean
  contenido: string
}

interface CambioTextoContrato {
  antes: string
  despues: string
}

interface RespuestaChatEdicion {
  tipo: 'pregunta' | 'documento_final'
  mensaje: string
  textoModificado?: string
  // Solo con formato "cambios" (plantillas Word): en vez del contrato
  // reescrito, los reemplazos puntuales, para aplicarlos sobre el Word
  // original sin perder su formato.
  cambios?: CambioTextoContrato[]
}

const MAX_CAMBIOS_CHAT_EDICION = 300

// El modo JSON de Gemini no siempre garantiza JSON válido en respuestas
// largas (sobre todo el modelo de respaldo): a veces deja una coma antes de
// "]" o "}", o una clave sin comillas. Se reparan esos dos errores típicos
// antes de dar la respuesta por perdida. Si aun así no es JSON, lanza
// SyntaxError.
function parsearJsonTolerante(texto: string): unknown {
  const inicio = texto.indexOf('{')
  const fin = texto.lastIndexOf('}')
  const cuerpo = inicio !== -1 && fin > inicio ? texto.slice(inicio, fin + 1) : texto
  try {
    return JSON.parse(cuerpo)
  } catch {
    const reparado = cuerpo
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3')
    return JSON.parse(reparado)
  }
}

function normalizarCambios(crudo: unknown): CambioTextoContrato[] {
  if (!Array.isArray(crudo)) return []
  return crudo
    .map(c => (c ?? {}) as Record<string, unknown>)
    .filter(c => typeof c.antes === 'string' && typeof c.despues === 'string' && c.antes.trim() && c.antes !== c.despues)
    .slice(0, MAX_CAMBIOS_CHAT_EDICION)
    .map(c => ({ antes: c.antes as string, despues: c.despues as string }))
}

export const chatEdicionContratoIA = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [GEMINI_API_KEY], timeoutSeconds: TIMEOUT_FUNCIONES_IA_SEGUNDOS },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const uid = await autorizar(req, res)
    if (!uid) return

    try {
      const { textoContrato, historialChat: historialRecibido = [], respuestaUsuario, formato } = req.body as {
        textoContrato?: string
        historialChat?: MensajeChatEdicion[]
        respuestaUsuario?: string
        formato?: string
      }
      const enCambios = formato === 'cambios'
      if (!textoContrato?.trim()) {
        res.status(400).json({ error: 'Falta textoContrato' })
        return
      }
      if (!Array.isArray(historialRecibido)) {
        res.status(400).json({ error: 'historialChat debe ser un array' })
        return
      }
      if (excede(textoContrato, MAX_CARACTERES_DOCUMENTO) || excede(respuestaUsuario, MAX_CARACTERES_MENSAJE)) {
        res.status(413).json({ error: 'El contrato o el mensaje son demasiado largos' })
        return
      }
      if (!(await consumirCuotaIA(uid, res))) return

      // Solo los últimos mensajes: la conversación completa puede crecer
      // sin límite y cada turno se reenvía entero a Gemini. Gemini exige que
      // el historial empiece con un turno del usuario: si el recorte (o un
      // turno que falló antes) lo deja empezando con uno de la IA, se
      // descartan esos primeros turnos.
      const historialChat = historialRecibido.slice(-MAX_MENSAJES_HISTORIAL)
      while (historialChat.length > 0 && historialChat[0]?.esIA) historialChat.shift()

      const systemInstruction = `
Eres un asistente legal que ayuda a un usuario a completar o modificar un contrato, conversando paso a paso.

CONTRATO ACTUAL:
${textoContrato}

Tu trabajo:
1. Analiza el contrato de arriba: identifica qué datos faltan por completar (espacios en blanco, líneas de puntos, placeholders tipo XXXX, campos vacíos) y qué el usuario podría querer modificar.
2. Pregunta UNA sola cosa a la vez, en lenguaje natural y claro (ej. "¿Cuál es el nombre completo del arrendador?"), nunca varias preguntas juntas.
3. No repitas una pregunta que ya fue respondida en la conversación.
${enCambios
  ? `4. Cuando ya tengas suficiente información, o el usuario diga que ya terminó, que no quiere completar más, o pida ver el resultado, devuelve la LISTA DE CAMBIOS a aplicar sobre el contrato (NO el contrato completo). Cada cambio es un reemplazo dentro de un mismo párrafo:
   - "antes": fragmento COPIADO EXACTAMENTE del contrato de arriba (mismas palabras, puntos, guiones y espacios), con las palabras de alrededor necesarias para que aparezca UNA sola vez en el contrato. Nunca abarques dos párrafos.
   - "despues": ese mismo fragmento con el dato completado o la modificación hecha, sin cambiar nada más.
   Incluye todos los datos que el usuario dio, en todos los lugares del contrato donde correspondan.

Responde SIEMPRE y ÚNICAMENTE en JSON, con esta estructura exacta, sin texto fuera del JSON:
{
  "tipo": "pregunta" o "documento_final",
  "mensaje": "el mensaje conversacional para mostrarle al usuario (la pregunta a hacer, o un breve resumen de que terminaste)",
  "cambios": [{ "antes": "fragmento exacto del contrato", "despues": "fragmento con el cambio" }]
}
("cambios" SOLO si tipo es documento_final; omítelo si tipo es pregunta.)
`
  : `4. Cuando ya tengas suficiente información, o el usuario diga que ya terminó, que no quiere completar más, o pida ver el resultado, genera el CONTRATO COMPLETO actualizado con todos los cambios aplicados, conservando el resto del texto, la estructura y las cláusulas originales tal cual.

Responde SIEMPRE y ÚNICAMENTE en JSON, con esta estructura exacta, sin texto fuera del JSON:
{
  "tipo": "pregunta" o "documento_final",
  "mensaje": "el mensaje conversacional para mostrarle al usuario (la pregunta a hacer, o un breve resumen de que terminaste)",
  "textoModificado": "SOLO si tipo es documento_final: el contrato completo con todos los cambios aplicados, listo para reemplazar al original. Omite este campo si tipo es pregunta."
}
`}`

      const mensajeUsuario = respuestaUsuario?.trim() ||
        'Analiza el contrato y hazme la primera pregunta para completarlo o modificarlo.'

      // El chat se arma dentro del callback: si el modelo principal está
      // saturado, se vuelve a armar con el modelo de respaldo.
      const pedirRespuesta = async (): Promise<Partial<RespuestaChatEdicion>> => {
        const result = await conModeloDeRespaldo(model => model.startChat({
          history: historialChat.map(m => ({
            role: m.esIA ? 'model' : 'user',
            parts: [{ text: m.contenido }]
          })),
          // Al final la IA devuelve el contrato COMPLETO: con 4000 tokens una
          // plantilla de ~29k caracteres (Compra-Venta) salía cortada.
          generationConfig: { maxOutputTokens: 32_000, responseMimeType: 'application/json' },
          systemInstruction: { role: 'user', parts: [{ text: systemInstruction }] }
        }).sendMessage(mensajeUsuario), { json: true })
        const clean = result.response.text().replace(/```json|```/g, '').trim()
        // A veces el modelo de respaldo contesta la pregunta en texto plano
        // en vez de JSON ("Gracias. Ahora, ¿cuál es...?"): eso es una
        // pregunta válida, no un error.
        if (clean && !clean.includes('{')) return { tipo: 'pregunta', mensaje: clean }
        return parsearJsonTolerante(clean) as Partial<RespuestaChatEdicion>
      }

      // Si el JSON viene tan roto que no se puede reparar, se pide una vez más.
      let parsed: Partial<RespuestaChatEdicion>
      try {
        parsed = await pedirRespuesta()
      } catch (err) {
        if (!(err instanceof SyntaxError)) throw err
        logger.warn('⚠️ chatEdicionContratoIA: JSON inválido de la IA, se reintenta una vez:', err.message)
        parsed = await pedirRespuesta()
      }

      if (parsed.tipo !== 'pregunta' && parsed.tipo !== 'documento_final') {
        throw new Error('Respuesta de la IA con formato inesperado')
      }
      if (!parsed.mensaje) {
        throw new Error('Respuesta de la IA sin mensaje')
      }

      const cambios = enCambios && parsed.tipo === 'documento_final' ? normalizarCambios(parsed.cambios) : []
      const respuesta: RespuestaChatEdicion = {
        tipo: parsed.tipo,
        mensaje: parsed.mensaje,
        ...(!enCambios && parsed.textoModificado !== undefined ? { textoModificado: parsed.textoModificado } : {}),
        ...(enCambios && parsed.tipo === 'documento_final' ? { cambios } : {})
      }
      res.json(respuesta)
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en chatEdicionContratoIA:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)

// ================================
// RESUMEN DE NORMAS DEL DÍA
// ================================
export const resumirNormasDelDiaIA = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [GEMINI_API_KEY], timeoutSeconds: TIMEOUT_FUNCIONES_IA_SEGUNDOS },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const uid = await autorizar(req, res)
    if (!uid) return

    try {
      const { normas } = req.body as { normas?: { titulo: string; sumilla: string }[] }
      if (!Array.isArray(normas) || normas.length === 0) {
        res.status(400).json({ error: 'Falta normas' })
        return
      }
      if (normas.length > 300 || excede(JSON.stringify(normas), MAX_CARACTERES_DOCUMENTO)) {
        res.status(413).json({ error: 'Demasiadas normas para resumir' })
        return
      }

      const listado = normas
        .map((n, i) => `${i + 1}. ${n.titulo}${n.sumilla ? ` — ${n.sumilla}` : ''}`)
        .join('\n')

      // Todos los usuarios ven las mismas normas del día, así que el
      // resumen se genera una sola vez por listado y se reutiliza — abrir
      // la Biblioteca Legal no gasta Gemini ni el cupo del usuario.
      const cacheRef = getFirestore()
        .collection('resumenes_normas')
        .doc(createHash('sha256').update(listado).digest('hex'))
      const cache = await cacheRef.get()
      if (cache.exists) {
        res.json(cache.get('resultado'))
        return
      }

      if (!(await consumirCuotaIA(uid, res))) return

      const prompt = `
    Eres un abogado experto en derecho peruano.
    Estas son las normas publicadas hoy en el Diario Oficial El Peruano:

    ${listado}

    Responde SOLO en JSON con esta estructura:
    {
      "resumen": "resumen breve (2-3 frases) de las normas del día",
      "destacadas": [
        { "titulo": "título exacto de la norma más relevante", "razon": "por qué le importa a un abogado en ejercicio, en una frase" },
        { "titulo": "título exacto de la segunda norma más relevante", "razon": "por qué le importa a un abogado en ejercicio, en una frase" }
      ]
    }
  `

      const result = await conModeloDeRespaldo(model => model.generateContent(prompt), { json: true })
      const text = result.response.text()
      const clean = text.replace(/```json|```/g, '').trim()
      const resultado = JSON.parse(clean) as unknown

      await cacheRef.set({ resultado, creadoEn: new Date().toISOString() })
      res.json(resultado)
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en resumirNormasDelDiaIA:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)
