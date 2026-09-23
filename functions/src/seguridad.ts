import type { Request } from 'firebase-functions/v2/https'
import type { Response } from 'express'
import { setGlobalOptions } from 'firebase-functions/v2'
import * as logger from 'firebase-functions/logger'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

if (getApps().length === 0) {
  initializeApp()
}

// Tope de instancias simultáneas por función: aunque alguien lograra
// saltarse el límite por usuario (ej. creando muchas cuentas), el gasto
// en Gemini/Pinecone nunca puede escalar sin control. Se define aquí (y
// no en index.ts) porque todos los módulos de funciones importan este
// archivo ANTES de declarar sus funciones, así que aplica a todas.
setGlobalOptions({ maxInstances: 10 })

// Solo la página publicada y el servidor de desarrollo pueden llamar a
// las funciones desde el navegador. No es la protección principal (eso
// es el token), pero evita que otra web use las funciones con la sesión
// de un usuario.
export const ORIGENES_PERMITIDOS = [
  'https://j03-m4nt.github.io',
  /^http:\/\/localhost:\d+$/
]

// Cantidad de llamadas a la IA (Gemini/Pinecone) que cada usuario puede
// hacer por día (hora Perú). Ajustar aquí si se cambia a un plan de pago.
export const LIMITE_DIARIO_IA = 50

// Tamaños máximos de lo que se manda a la IA — un contrato real ronda los
// 20-60k caracteres; esto deja margen sin permitir pegar libros enteros.
export const MAX_CARACTERES_DOCUMENTO = 200_000
export const MAX_CARACTERES_MENSAJE = 4_000
export const MAX_MENSAJES_HISTORIAL = 30

interface OpcionesAutorizacion {
  soloAdmin?: boolean
}

// Verifica el ID token de Firebase del header Authorization. Si falta, es
// inválido, o el usuario no es admin (cuando se exige), responde 401/403 y
// devuelve null — el handler solo tiene que hacer `if (!uid) return`.
// El rol se lee de Firestore con el Admin SDK: el cliente no puede
// modificarlo (ver firestore.rules), solo se asigna desde la consola.
export async function autorizar(
  req: Request,
  res: Response,
  opciones: OpcionesAutorizacion = {}
): Promise<string | null> {
  const authHeader = req.headers.authorization
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
  if (!idToken) {
    res.status(401).json({ error: 'Debes iniciar sesión para usar esta función' })
    return null
  }

  let uid: string
  try {
    uid = (await getAuth().verifyIdToken(idToken)).uid
  } catch {
    res.status(401).json({ error: 'Sesión inválida o expirada, vuelve a iniciar sesión' })
    return null
  }

  if (opciones.soloAdmin) {
    const perfil = await getFirestore().collection('users').doc(uid).get()
    if (perfil.get('role') !== 'admin') {
      logger.warn(`🚫 Acceso admin denegado a ${uid}`)
      res.status(403).json({ error: 'Solo un administrador puede realizar esta acción' })
      return null
    }
  }

  return uid
}

function fechaPeru(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }) // YYYY-MM-DD
}

// Descuenta una llamada del cupo diario del usuario (colección uso_ia,
// solo escribible por el Admin SDK). Si ya lo agotó responde 429 y
// devuelve false. Se usa una transacción para que varias pestañas
// abiertas a la vez no puedan pasarse del límite.
export async function consumirCuotaIA(uid: string, res: Response): Promise<boolean> {
  const db = getFirestore()
  const ref = db.collection('uso_ia').doc(uid)
  const hoy = fechaPeru()

  const permitido = await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    const usadasHoy = snap.get('fecha') === hoy ? (snap.get('usadas') as number) ?? 0 : 0

    if (usadasHoy >= LIMITE_DIARIO_IA) return false

    tx.set(ref, {
      fecha: hoy,
      usadas: usadasHoy + 1,
      actualizadoEn: FieldValue.serverTimestamp()
    })
    return true
  })

  if (!permitido) {
    res.status(429).json({
      error: `Alcanzaste el límite de ${LIMITE_DIARIO_IA} consultas a la IA por día. Vuelve a intentarlo mañana.`
    })
  }
  return permitido
}

export function excede(texto: unknown, max: number): boolean {
  return typeof texto === 'string' && texto.length > max
}
