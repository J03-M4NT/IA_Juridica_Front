import { defineSecret } from 'firebase-functions/params'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')

// Mantener sincronizado a mano con src/constants/gemini.ts — functions/
// tiene su propio tsconfig/rootDir y no puede importar ese archivo.
export const GEMINI_MODEL = 'gemini-3.1-flash-lite'

export function obtenerModeloGemini() {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value())
  return genAI.getGenerativeModel({ model: GEMINI_MODEL })
}
