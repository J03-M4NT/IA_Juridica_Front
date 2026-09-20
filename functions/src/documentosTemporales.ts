import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'

const SEIS_HORAS_MS = 6 * 60 * 60 * 1000

// Genera una URL firmada temporal para un .docx que el usuario subió a
// Storage desde Consultas (ver documentosTemporalesService.ts) — para el
// botón "Abrir en Word" (ms-word:ofe|u|<url>). No se confía en ningún uid
// que mande el cliente: se verifica el ID token de Firebase y se exige que
// el storagePath pedido esté dentro de la carpeta de ESE usuario.
export const obtenerUrlFirmadaDocumento = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    try {
      const authHeader = req.headers.authorization
      const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
      if (!idToken) {
        res.status(401).json({ error: 'Falta el token de autenticación' })
        return
      }

      const { uid } = await getAuth().verifyIdToken(idToken)

      const { storagePath } = req.body as { storagePath?: string }
      if (!storagePath) {
        res.status(400).json({ error: 'Falta storagePath' })
        return
      }

      const prefijoPermitido = `documentos-temporales/${uid}/`
      if (!storagePath.startsWith(prefijoPermitido)) {
        res.status(403).json({ error: 'No tienes acceso a ese documento' })
        return
      }

      const bucket = getStorage().bucket()
      const [url] = await bucket.file(storagePath).getSignedUrl({
        action: 'read',
        expires: Date.now() + SEIS_HORAS_MS
      })

      res.json({ url })
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en obtenerUrlFirmadaDocumento:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)
