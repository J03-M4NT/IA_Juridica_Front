import { ref, uploadBytes } from 'firebase/storage'
import { storage } from '../firebase/firebaseConfig'
import { postFuncion } from './functionsClient'

// Sube el .docx original adjuntado en Consultas a una carpeta privada del
// usuario, para poder abrirlo luego en Word de escritorio (botón "Abrir en
// Word"). Se borra solo a los 3 días por una Lifecycle Rule del bucket, no
// hay que limpiarlo a mano — por eso "documentos-temporales" va PRIMERO en
// la ruta (no dentro de usuarios/{uid}/): la regla de Lifecycle necesita
// un prefijo literal, y Cloud Storage no soporta comodines en medio de la
// ruta para saltarse el {uid}.
export async function subirDocumentoTemporal(uid: string, archivo: File): Promise<string> {
  const timestamp = Date.now()
  const safeName = archivo.name.replace(/\s+/g, '_')
  const storagePath = `documentos-temporales/${uid}/${timestamp}-${safeName}`

  // contentType explícito: en Windows File.type puede llegar vacío para un
  // .docx, y la regla de Storage (storage.rules) exige exactamente este
  // MIME — sin esto la subida se rechazaba en silencio.
  const fileRef = ref(storage, storagePath)
  await uploadBytes(fileRef, archivo, {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  })

  return storagePath
}

// Pide una URL firmada temporal (6 horas) para ese documento — nunca una
// URL pública permanente. La Cloud Function verifica el ID token y que el
// storagePath pedido sea del usuario que llama.
export async function obtenerUrlFirmadaDocumento(storagePath: string): Promise<string> {
  const response = await postFuncion('obtenerUrlFirmadaDocumento', { storagePath })

  const data = await response.json() as { url?: string; error?: string }
  if (!response.ok || !data.url) {
    throw new Error(data.error ?? 'No se pudo generar el link para abrir en Word')
  }

  return data.url
}
