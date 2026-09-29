import { defineSecret } from 'firebase-functions/params'
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'
import * as logger from 'firebase-functions/logger'

export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')

// Mantener sincronizado a mano con src/constants/gemini.ts — functions/
// tiene su propio tsconfig/rootDir y no puede importar ese archivo.
export const GEMINI_MODEL = 'gemini-3.1-flash-lite'

// Si el modelo principal está saturado (503 "high demand"), no sirve
// reintentar con él mismo: cada intento tarda 30-60s en fallar y se agota
// el tiempo de la Function. Se pasa a otro modelo de la misma familia.
// Verificados como disponibles para la clave actual (2026-09-23).
const MODELOS_DE_RESPALDO = ['gemini-flash-lite-latest', 'gemini-2.5-flash']

// Tiempo máximo por intento. Con 3 modelos, el peor caso (~150s) entra en
// TIMEOUT_FUNCIONES_IA_SEGUNDOS. Un análisis de contrato normal tarda
// 10-40s, así que 50s no corta respuestas legítimas.
const TIEMPO_MAX_POR_INTENTO_MS = 50_000
export const TIMEOUT_FUNCIONES_IA_SEGUNDOS = 180

interface OpcionesModelo {
  // Activa el modo JSON de Gemini (responseMimeType): garantiza que la
  // respuesta sea JSON válido. Pedirlo solo en el texto del prompt no
  // basta — a veces devuelve comas sobrantes o comillas simples y el
  // JSON.parse falla.
  json?: boolean
}

function crearModelo(nombre: string, opciones: OpcionesModelo): GenerativeModel {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value())
  return genAI.getGenerativeModel(
    {
      model: nombre,
      ...(opciones.json ? { generationConfig: { responseMimeType: 'application/json' } } : {})
    },
    { timeout: TIEMPO_MAX_POR_INTENTO_MS }
  )
}

function esErrorTemporal(err: unknown): boolean {
  const mensaje = err instanceof Error ? `${err.name} ${err.message}` : String(err)
  return /\b(503|429|500|504)\b|high demand|overloaded|RESOURCE_EXHAUSTED|UNAVAILABLE|abort|timeout|timed out/i.test(mensaje)
}

// Ejecuta la llamada con el modelo principal y, si falla por saturación,
// límite de tasa o demora, la repite con cada modelo de respaldo. La
// llamada recibe el modelo a usar (para generateContent o startChat).
// Cualquier otro error (prompt inválido, clave mala...) se propaga directo.
export async function conModeloDeRespaldo<T>(
  llamada: (modelo: GenerativeModel) => Promise<T>,
  opciones: OpcionesModelo = {}
): Promise<T> {
  const modelos = [GEMINI_MODEL, ...MODELOS_DE_RESPALDO]

  for (let i = 0; ; i++) {
    const nombre = modelos[i]!
    try {
      return await llamada(crearModelo(nombre, opciones))
    } catch (err) {
      const siguiente = modelos[i + 1]
      if (!siguiente || !esErrorTemporal(err)) throw err
      logger.warn(`⏳ ${nombre} no disponible (${(err as Error).message.slice(0, 120)}), probando con ${siguiente}`)
    }
  }
}
