import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { GEMINI_API_KEY, obtenerModeloGemini } from './geminiClient'

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

export const generarSugerenciasContrato = onRequest(
  { cors: true, secrets: [GEMINI_API_KEY], timeoutSeconds: 120 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    try {
      const { textoContrato } = req.body as { textoContrato?: string }
      if (!textoContrato?.trim()) {
        res.status(400).json({ error: 'Falta textoContrato' })
        return
      }

      const prompt = `
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
    - Máximo 10 anotaciones en total, prioriza las más importantes.

    CONTRATO:
    ${textoContrato}
  `

      const model = obtenerModeloGemini()
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const clean = text.replace(/```json|```/g, '').trim()
      const sugerencias = JSON.parse(clean) as Omit<SugerenciaCambio, 'id'>[]

      res.json({
        sugerencias: sugerencias.map((s, i) => ({ id: `sugerencia-${i}`, ...s }))
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
  { cors: true, secrets: [GEMINI_API_KEY], timeoutSeconds: 120 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    try {
      const { textoPlantilla, instruccion } = req.body as { textoPlantilla?: string; instruccion?: string }
      if (!textoPlantilla?.trim() || !instruccion?.trim()) {
        res.status(400).json({ error: 'Falta textoPlantilla o instruccion' })
        return
      }

      const prompt = `
    Eres un abogado experto en derecho peruano.
    El usuario quiere modificar esta plantilla de contrato.

    INSTRUCCIÓN: ${instruccion}

    PLANTILLA ACTUAL:
    ${textoPlantilla}

    Devuelve SOLO el contrato modificado, sin explicaciones.
  `

      const model = obtenerModeloGemini()
      const result = await model.generateContent(prompt)

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

interface RespuestaChatEdicion {
  tipo: 'pregunta' | 'documento_final'
  mensaje: string
  textoModificado?: string
}

export const chatEdicionContratoIA = onRequest(
  { cors: true, secrets: [GEMINI_API_KEY], timeoutSeconds: 120 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    try {
      const { textoContrato, historialChat = [], respuestaUsuario } = req.body as {
        textoContrato?: string
        historialChat?: MensajeChatEdicion[]
        respuestaUsuario?: string
      }
      if (!textoContrato?.trim()) {
        res.status(400).json({ error: 'Falta textoContrato' })
        return
      }

      const systemInstruction = `
Eres un asistente legal que ayuda a un usuario a completar o modificar un contrato, conversando paso a paso.

CONTRATO ACTUAL:
${textoContrato}

Tu trabajo:
1. Analiza el contrato de arriba: identifica qué datos faltan por completar (espacios en blanco, líneas de puntos, placeholders tipo XXXX, campos vacíos) y qué el usuario podría querer modificar.
2. Pregunta UNA sola cosa a la vez, en lenguaje natural y claro (ej. "¿Cuál es el nombre completo del arrendador?"), nunca varias preguntas juntas.
3. No repitas una pregunta que ya fue respondida en la conversación.
4. Cuando ya tengas suficiente información, o el usuario diga que ya terminó, que no quiere completar más, o pida ver el resultado, genera el CONTRATO COMPLETO actualizado con todos los cambios aplicados, conservando el resto del texto, la estructura y las cláusulas originales tal cual.

Responde SIEMPRE y ÚNICAMENTE en JSON, con esta estructura exacta, sin texto fuera del JSON:
{
  "tipo": "pregunta" o "documento_final",
  "mensaje": "el mensaje conversacional para mostrarle al usuario (la pregunta a hacer, o un breve resumen de que terminaste)",
  "textoModificado": "SOLO si tipo es documento_final: el contrato completo con todos los cambios aplicados, listo para reemplazar al original. Omite este campo si tipo es pregunta."
}
`

      const model = obtenerModeloGemini()
      const chat = model.startChat({
        history: historialChat.map(m => ({
          role: m.esIA ? 'model' : 'user',
          parts: [{ text: m.contenido }]
        })),
        generationConfig: { maxOutputTokens: 4000 },
        systemInstruction: { role: 'user', parts: [{ text: systemInstruction }] }
      })

      const mensajeUsuario = respuestaUsuario?.trim() ||
        'Analiza el contrato y hazme la primera pregunta para completarlo o modificarlo.'

      const result = await chat.sendMessage(mensajeUsuario)
      const text = result.response.text()
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean) as Partial<RespuestaChatEdicion>

      if (parsed.tipo !== 'pregunta' && parsed.tipo !== 'documento_final') {
        throw new Error('Respuesta de la IA con formato inesperado')
      }
      if (!parsed.mensaje) {
        throw new Error('Respuesta de la IA sin mensaje')
      }

      const respuesta: RespuestaChatEdicion = {
        tipo: parsed.tipo,
        mensaje: parsed.mensaje,
        ...(parsed.textoModificado !== undefined ? { textoModificado: parsed.textoModificado } : {})
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
  { cors: true, secrets: [GEMINI_API_KEY], timeoutSeconds: 60 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    try {
      const { normas } = req.body as { normas?: { titulo: string; sumilla: string }[] }
      if (!normas || normas.length === 0) {
        res.status(400).json({ error: 'Falta normas' })
        return
      }

      const listado = normas
        .map((n, i) => `${i + 1}. ${n.titulo}${n.sumilla ? ` — ${n.sumilla}` : ''}`)
        .join('\n')

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

      const model = obtenerModeloGemini()
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const clean = text.replace(/```json|```/g, '').trim()

      res.json(JSON.parse(clean))
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en resumirNormasDelDiaIA:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)
