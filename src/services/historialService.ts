import { db } from '../firebase/firebaseConfig'
import {
  collection, doc, getDocs, setDoc, deleteDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore'
import type { Mensaje, ArchivoAdjunto } from '../stores/consultas-store'

export interface SesionConsulta {
  id: string
  titulo: string
  fechaActualizacion: Date
  mensajes: Mensaje[]
  archivoAdjunto?: ArchivoAdjunto | null
}

export async function guardarSesion(
  uid: string,
  sesionId: string,
  titulo: string,
  mensajes: Mensaje[],
  archivoAdjunto: ArchivoAdjunto | null
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'consultas', sesionId)
  
  // Transform dates to strings/timestamps if necessary, but Firestore
  // accepts Date objects.
  
  await setDoc(docRef, {
    titulo,
    mensajes,
    archivoAdjunto: archivoAdjunto || null,
    fechaActualizacion: serverTimestamp()
  }, { merge: true })
}

export async function obtenerHistorial(uid: string): Promise<SesionConsulta[]> {
  const consultasRef = collection(db, 'users', uid, 'consultas')
  const q = query(consultasRef, orderBy('fechaActualizacion', 'desc'))
  
  const snapshot = await getDocs(q)
  const sesiones: SesionConsulta[] = []
  
  snapshot.forEach(docSnap => {
    const data = docSnap.data()
    
    // Parse firebase timestamps back to Date objects
    let fecha = new Date()
    if (data.fechaActualizacion) {
      fecha = data.fechaActualizacion.toDate ? data.fechaActualizacion.toDate() : new Date(data.fechaActualizacion)
    }

    // Convert message timestamps
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mensajes = (data.mensajes || []).map((m: any) => ({
      ...m,
      timestamp: m.timestamp?.toDate ? m.timestamp.toDate() : new Date(m.timestamp)
    }))
    
    sesiones.push({
      id: docSnap.id,
      titulo: data.titulo || 'Nueva Consulta',
      fechaActualizacion: fecha,
      mensajes: mensajes,
      archivoAdjunto: data.archivoAdjunto
    })
  })
  
  return sesiones
}

export async function eliminarSesion(uid: string, sesionId: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'consultas', sesionId)
  await deleteDoc(docRef)
}
