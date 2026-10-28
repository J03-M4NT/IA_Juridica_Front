// =========================
// APP CHECK: verificación (la usa autorizar() en seguridad.ts)
// Comprueba que cada llamada a las funciones venga de la app de LexIT (y
// no de un script que use la sesión de alguien para gastar la cuota de
// Gemini/Pinecone). El front manda el token en el header
// X-Firebase-AppCheck (ver src/services/functionsClient.ts).
//
// Dos modos, en Firestore config/appCheck.modo (cambian sin deploy):
//  - 'monitor' (por defecto): se verifica y se cuenta, pero no se rechaza.
//  - 'exigir': sin un token válido, la llamada se rechaza con 401.
// Los conteos por día (appCheckUso/{YYYY-MM-DD}) muestran en Admin si ya
// es seguro exigirlo (ver appCheck.ts). Se suma ADEMÁS de verificar el ID
// token: no lo reemplaza.
// Este archivo no importa seguridad.ts (evita una dependencia circular).
// =========================
import type { Request } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { getAppCheck } from 'firebase-admin/app-check'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export type ModoAppCheck = 'monitor' | 'exigir'
export type ResultadoAppCheck = 'validos' | 'sinToken' | 'invalidos'

const CACHE_MS = 60_000
let modoEnCache: { modo: ModoAppCheck; hasta: number } | null = null

export function olvidarModoAppCheck(): void {
  modoEnCache = null
}

export async function modoAppCheck(): Promise<ModoAppCheck> {
  if (modoEnCache && Date.now() < modoEnCache.hasta) return modoEnCache.modo
  let modo: ModoAppCheck = 'monitor'
  try {
    const doc = await getFirestore().collection('config').doc('appCheck').get()
    if (doc.get('modo') === 'exigir') modo = 'exigir'
  } catch (err) {
    logger.warn(`⚠️ No se pudo leer config/appCheck, se usa 'monitor': ${(err as Error).message}`)
  }
  modoEnCache = { modo, hasta: Date.now() + CACHE_MS }
  return modo
}

const fechaPeru = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

export async function revisarAppCheck(req: Request, contar = true): Promise<ResultadoAppCheck> {
  const token = req.header('X-Firebase-AppCheck')
  let resultado: ResultadoAppCheck = 'sinToken'
  if (token) {
    try {
      await getAppCheck().verifyToken(token)
      resultado = 'validos'
    } catch {
      resultado = 'invalidos'
    }
  }
  if (contar) {
    getFirestore().collection('appCheckUso').doc(fechaPeru())
      .set({ [resultado]: FieldValue.increment(1) }, { merge: true })
      .catch(() => undefined)
  }
  return resultado
}
