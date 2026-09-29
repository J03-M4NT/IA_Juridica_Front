import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { getStorage } from 'firebase-admin/storage'
import { ORIGENES_PERMITIDOS, autorizar } from './seguridad'
import JSZip from 'jszip'
import { aplicarCambiosDocx, type CambioParrafo } from './editarDocx'
import { agregarMembreteLexit } from './marcaLexit'

// =========================
// DESCARGAR EL WORD EDITADO (Análisis de Contratos)
// Toma el .docx ORIGINAL que el usuario subió a su carpeta privada de
// Storage, le aplica solo los cambios de texto hechos en la app (ver
// editarDocx.ts: el resto del archivo queda igual) y guarda el resultado
// en la misma carpeta, devolviendo un link firmado temporal. No devuelve el
// archivo en la respuesta porque un .docx de 25 MB superaría el límite de
// tamaño de respuesta de las Functions. La carpeta documentos-temporales/
// se limpia sola a los 3 días (Lifecycle Rule del bucket).
// No usa IA: no descuenta del límite diario de consultas.
// =========================

const MAX_BYTES_DOCX = 25 * 1024 * 1024 // mismo límite que storage.rules
const MAX_CAMBIOS = 3000
const MAX_CARACTERES_PARRAFO = 50_000
const VEINTE_MINUTOS_MS = 20 * 60 * 1000

function cambiosValidos(cambios: unknown): cambios is CambioParrafo[] {
  return Array.isArray(cambios) && cambios.length <= MAX_CAMBIOS && cambios.every(c =>
    c !== null && typeof c === 'object' &&
    typeof (c as CambioParrafo).antes === 'string' && (c as CambioParrafo).antes.length <= MAX_CARACTERES_PARRAFO &&
    typeof (c as CambioParrafo).despues === 'string' && (c as CambioParrafo).despues.length <= MAX_CARACTERES_PARRAFO &&
    ((c as CambioParrafo).ocurrencia === undefined || (Number.isInteger((c as CambioParrafo).ocurrencia) && ((c as CambioParrafo).ocurrencia ?? 0) >= 0)) &&
    ((c as CambioParrafo).indice === undefined || (Number.isInteger((c as CambioParrafo).indice) && ((c as CambioParrafo).indice ?? 0) >= 0))
  )
}

export const descargarWordEditado = onRequest(
  // Un .docx grande se abre y se vuelve a comprimir en memoria.
  { cors: ORIGENES_PERMITIDOS, timeoutSeconds: 120, memory: '1GiB' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const uid = await autorizar(req, res)
    if (!uid) return

    try {
      const { storagePath, cambios, nombreDescarga, marcaLexit } = req.body as { storagePath?: string; cambios?: unknown; nombreDescarga?: string; marcaLexit?: unknown }

      // Solo documentos de la carpeta privada del propio usuario (mismo
      // criterio que obtenerUrlFirmadaDocumento).
      const prefijo = `documentos-temporales/${uid}/`
      if (!storagePath || !storagePath.startsWith(prefijo) || storagePath.includes('..') || !storagePath.toLowerCase().endsWith('.docx')) {
        res.status(403).json({ error: 'No tienes acceso a ese documento' })
        return
      }
      if (!cambiosValidos(cambios)) {
        res.status(400).json({ error: 'La lista de cambios no es válida o es demasiado grande' })
        return
      }

      const bucket = getStorage().bucket()
      const archivoOriginal = bucket.file(storagePath)
      const [existe] = await archivoOriginal.exists()
      if (!existe) {
        // Pasados 3 días el original se borra solo: hay que volver a subirlo.
        res.status(404).json({ error: 'El documento original ya no está disponible. Vuelve a subir el archivo.' })
        return
      }
      const [metadata] = await archivoOriginal.getMetadata()
      if (Number(metadata.size ?? 0) > MAX_BYTES_DOCX) {
        res.status(413).json({ error: 'El documento es demasiado grande' })
        return
      }

      const [original] = await archivoOriginal.download()
      const resultado = await aplicarCambiosDocx(original, cambios)
      const { aplicados, fallidos } = resultado
      let buffer = resultado.buffer

      // Contratos: membrete "LEXIT" + "Generado por LexIT" dentro del Word
      // original (ver marcaLexit.ts). Sin esta opción (Análisis) no cambia.
      if (marcaLexit === true) {
        const zip = await JSZip.loadAsync(buffer)
        await agregarMembreteLexit(zip)
        buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
      }
      logger.info(`📝 Word editado para ${uid}: ${aplicados} cambio(s) aplicado(s), ${fallidos.length} sin aplicar, de ${cambios.length}`)

      const nombreBase = (nombreDescarga ?? storagePath.split('/').pop() ?? 'documento.docx')
        .replace(/[^\p{L}\p{N}._ -]/gu, '_').replace(/\.docx$/i, '').slice(0, 120) || 'documento'
      const rutaEditado = `${prefijo}editados/${Date.now()}-${nombreBase}.docx`
      const archivoEditado = bucket.file(rutaEditado)
      await archivoEditado.save(buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        resumable: false
      })

      const [url] = await archivoEditado.getSignedUrl({
        action: 'read',
        expires: Date.now() + VEINTE_MINUTOS_MS,
        // Que el navegador lo descargue con el nombre del documento.
        responseDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(`${nombreBase}.docx`)}`
      })

      res.json({ url, aplicados, fallidos })
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en descargarWordEditado:', error.message)
      res.status(500).json({ error: 'No se pudo generar el Word editado. Intenta de nuevo.' })
    }
  }
)
