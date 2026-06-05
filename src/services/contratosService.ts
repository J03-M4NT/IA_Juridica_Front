import { db, storage } from '../firebase/firebaseConfig'
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  type Unsubscribe
} from 'firebase/firestore'
import { ref, getDownloadURL, getBlob, uploadBytes, deleteObject } from 'firebase/storage'

/**
 * Interfaz que define la estructura de un contrato almacenado en Firestore
 */
export interface ContratoFirebase {
  id: string
  name: string
  type: string
  storagePath: string
  createdAt: Date
}

/**
 * Escucha en tiempo real los contratos generados en Firestore
 */
export function listenContratos(
  callback: (contratos: ContratoFirebase[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const contratosRef = collection(db, 'contratos')
  const q = query(contratosRef, orderBy('createdAt', 'desc'))

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const contratos: ContratoFirebase[] = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name || 'Sin nombre',
          type: data.type || 'general',
          storagePath: data.storagePath || '',
          createdAt: data.createdAt?.toDate?.() || new Date()
        }
      })

      callback(contratos)
    },
    (error) => {
      console.error('❌ Error escuchando contratos:', error)
      onError(error)
    }
  )

  return unsubscribe
}

/**
 * Obtiene la URL de descarga de un contrato generado
 */
export async function getContratoDownloadURL(storagePath: string): Promise<string> {
  try {
    const fileRef = ref(storage, storagePath)
    return await getDownloadURL(fileRef)
  } catch (err) {
  const error = err as Error
  throw new Error(`No se pudo obtener la URL: ${error.message}`)
}
}

/**
 * Descarga un contrato como Blob
 */
export async function downloadContrato(storagePath: string): Promise<Blob> {
  try {
    const fileRef = ref(storage, storagePath)
    return await getBlob(fileRef)
  } catch (err) {
    const error = err as Error
    console.error('❌ Error descargando contrato:', error)
    throw new Error(`No se pudo descargar el archivo: ${error.message}`)
  }
}

/**
 * [ADMIN] Sube una nueva plantilla: archivo a Storage + documento a Firestore
 */
export async function uploadTemplate(
  file: File,
  name: string,
  type: string,
  description?: string
): Promise<string> {
  const timestamp = Date.now()
  const safeName = file.name.replace(/\s+/g, '_')
  const storagePath = `contract_templates/${timestamp}_${safeName}`

  const fileRef = ref(storage, storagePath)
  await uploadBytes(fileRef, file)

  const docRef = await addDoc(collection(db, 'contract_templates'), {
    name,
    type,
    description: description || '',
    storage_path: storagePath,
    createdAt: serverTimestamp()
  })

  return docRef.id
}

/**
 * [ADMIN] Elimina una plantilla: documento de Firestore + archivo de Storage
 */
export async function deleteTemplate(templateId: string, storagePath: string): Promise<void> {
  await deleteDoc(doc(db, 'contract_templates', templateId))

  if (storagePath) {
    try {
      await deleteObject(ref(storage, storagePath))
    } catch {
      // El archivo ya no existe en Storage; el doc de Firestore ya fue eliminado
    }
  }
}

/**
 * ⭐ NUEVA FUNCIÓN: Obtiene la URL de descarga de una plantilla (template)
 * Esta es la que faltaba para cargar los PDFs en ContratosPage
 */
export async function getTemplateDownloadURL(storagePath: string): Promise<string> {
  try {
    // Verifica que el storagePath no esté vacío
    if (!storagePath) {
      throw new Error('La ruta de almacenamiento está vacía')
    }

    const fileRef = ref(storage, storagePath)
    const url = await getDownloadURL(fileRef)

    console.log('✅ URL obtenida para template:', storagePath)
    return url
  } catch (err) {
    const error = err as Error
    console.error('❌ Error obteniendo URL del template:', error)
    console.error('📍 Ruta intentada:', storagePath)
    throw new Error(`No se pudo obtener la URL del template: ${error.message}`)
  }
}
