import type { ChatSession} from '@google/generative-ai';
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY
)

// ================================
// MODELO
// ================================
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash'
})
// ================================
// 1. ANÁLISIS DE CONTRATOS
// ================================
export async function analizarContrato(textoContrato: string) {
  const prompt = `
    Eres un abogado experto en derecho peruano.
    Analiza este contrato y responde SOLO en JSON con esta estructura:
    {
      "resumen": "resumen ejecutivo breve",
      "puntuacion": 75,
      "riesgos": [
        {
          "clausula": "Cláusula X",
          "descripcion": "descripción del riesgo",
          "nivel": "alto",
          "sugerencia": "cómo mejorarla"
        }
      ],
      "mejoras": [
        {
          "titulo": "título",
          "descripcion": "qué agregar o cambiar"
        }
      ],
      "partes": {
        "parte1": "nombre",
        "parte2": "nombre"
      },
      "fechas_importantes": ["fecha1", "fecha2"],
      "obligaciones": {
        "parte1": ["obligacion1", "obligacion2"],
        "parte2": ["obligacion1", "obligacion2"]
      }
    }

    CONTRATO:
    ${textoContrato}
  `

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// ================================
// 2. CORREGIR RIESGOS CON IA
// ================================
export async function corregirContrato(
  textoContrato: string,
  riesgos: string[]
) {
  const prompt = `
    Eres un abogado experto en derecho peruano.
    El siguiente contrato tiene estos riesgos detectados:
    ${riesgos.join('\n')}

    Reescribe el contrato corrigiendo todos los riesgos.
    Devuelve SOLO el contrato corregido, sin explicaciones.

    CONTRATO ORIGINAL:
    ${textoContrato}
  `

  const result = await model.generateContent(prompt)
  return result.response.text()
}

// ================================
// 3. CHAT JURÍDICO
// ================================
export function iniciarChatJuridico(): ChatSession {
  const chat = model.startChat({
    history: [],
    generationConfig: {
      maxOutputTokens: 2000,
    },
    systemInstruction: `
      Eres Letsy, una IA jurídica especializada en derecho peruano.
      - Respondes consultas legales de manera clara y precisa
      - Citas artículos y normas legales peruanas cuando es relevante
      - Si no sabes algo, lo dices honestamente
      - Usas lenguaje accesible, no solo jerga legal
      - Siempre recomiendas consultar un abogado para casos complejos
    `
  })
  return chat
}

export async function enviarMensajeChat(
  chat: ChatSession,
  mensaje: string
) {
  const result = await chat.sendMessage(mensaje)
  return result.response.text()
}

// ================================
// 4. MODIFICAR PLANTILLA
// ================================
export async function modificarPlantilla(
  textoPlantilla: string,
  instruccion: string
) {
  const prompt = `
    Eres un abogado experto en derecho peruano.
    El usuario quiere modificar esta plantilla de contrato.

    INSTRUCCIÓN: ${instruccion}

    PLANTILLA ACTUAL:
    ${textoPlantilla}

    Devuelve SOLO el contrato modificado, sin explicaciones.
  `

  const result = await model.generateContent(prompt)
  return result.response.text()
}

// ================================
// 5. RELLENAR VARIABLES DEL CONTRATO
// ================================
export async function rellenarContrato(
  textoPlantilla: string,
  datos: Record<string, string>
) {
  const prompt = `
    Rellena esta plantilla de contrato con los siguientes datos:
    ${JSON.stringify(datos, null, 2)}

    Reemplaza todos los campos XXXXXXXX o [CAMPO] con los datos proporcionados.
    Devuelve SOLO el contrato rellenado.

    PLANTILLA:
    ${textoPlantilla}
  `

  const result = await model.generateContent(prompt)
  return result.response.text()
}
