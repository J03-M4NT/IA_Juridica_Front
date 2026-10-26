// =========================
// APP CHECK (Admin): conteos por día y cambio de modo
// La verificación vive en appCheckVerificacion.ts. Esta función (solo
// admins) muestra cuántas llamadas llegaron con un token válido y pasa de
// 'monitor' a 'exigir' (o vuelve) sin deploy. Ella misma no exige App
// Check, para poder volver a 'monitor' si algo falla.
// =========================
import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { getFirestore, FieldPath, FieldValue } from 'firebase-admin/firestore'
import { ORIGENES_PERMITIDOS, autorizar } from './seguridad'
import { modoAppCheck, olvidarModoAppCheck, revisarAppCheck } from './appCheckVerificacion'

export const appCheckAdmin = onRequest(
  { cors: ORIGENES_PERMITIDOS },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método no permitido' })
      return
    }
    const uid = await autorizar(req, res, { soloAdmin: true, sinAppCheck: true })
    if (!uid) return

    const body = (req.body ?? {}) as { accion?: unknown; modo?: unknown }
    try {
      const tokenPropio = await revisarAppCheck(req, false)
      if (body.accion === 'modo') {
        if (body.modo !== 'monitor' && body.modo !== 'exigir') {
          res.status(400).json({ error: "modo debe ser 'monitor' o 'exigir'" })
          return
        }
        // Para no dejar fuera a todos: solo se puede exigir desde una
        // sesión cuyo propio token de App Check sea válido
        if (body.modo === 'exigir' && tokenPropio !== 'validos') {
          res.status(409).json({ error: 'Tu propia sesión no tiene un token de App Check válido: si se exige ahora, LexIT dejaría de funcionar. Revisa la configuración de reCAPTCHA antes de exigirlo.' })
          return
        }
        await getFirestore().collection('config').doc('appCheck').set({ modo: body.modo, actualizadoPor: uid, actualizadoEn: FieldValue.serverTimestamp() }, { merge: true })
        olvidarModoAppCheck()
        logger.info(`🛡️ App Check en modo ${body.modo} (por ${uid})`)
      }

      const snap = await getFirestore().collection('appCheckUso').orderBy(FieldPath.documentId(), 'desc').limit(7).get()
      res.json({
        modo: await modoAppCheck(),
        tokenPropio,
        dias: snap.docs.map(d => ({
          fecha: d.id,
          validos: (d.get('validos') as number | undefined) ?? 0,
          sinToken: (d.get('sinToken') as number | undefined) ?? 0,
          invalidos: (d.get('invalidos') as number | undefined) ?? 0
        }))
      })
    } catch (err) {
      logger.error('❌ Error en appCheckAdmin:', (err as Error).message)
      res.status(500).json({ error: (err as Error).message })
    }
  }
)
