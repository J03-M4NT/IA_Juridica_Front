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
