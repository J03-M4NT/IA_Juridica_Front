// =========================
// CUPOS DIARIOS DE LAS OPCIONES DE CONSULTAS
// "Meta búsqueda" (búsqueda en fuentes oficiales de internet) y
// "Razonamiento profundo" tienen su propio cupo por usuario y día, aparte del
// general de 50 consultas (colección uso_opciones, solo escribible por el
// Admin SDK). Los admins tienen un cupo mayor para probar.
// =========================
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { esAdmin } from './seguridad'

export type OpcionConsulta = 'metaBusqueda' | 'razonamiento'

export const LIMITES_DIARIOS: Record<OpcionConsulta, { usuario: number; admin: number }> = {
  metaBusqueda: { usuario: 10, admin: 30 },
  razonamiento: { usuario: 5, admin: 15 }
}

const fechaPeru = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

// Descuenta un uso si queda cupo. Devuelve si se pudo y cuántos quedan.
export async function consumirOpcion(uid: string, opcion: OpcionConsulta): Promise<{ permitido: boolean; restantes: number; limite: number }> {
  const db = getFirestore()
  const limite = (await esAdmin(uid)) ? LIMITES_DIARIOS[opcion].admin : LIMITES_DIARIOS[opcion].usuario
  const ref = db.collection('uso_opciones').doc(`${uid}_${opcion}`)
  const hoy = fechaPeru()
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    const usadas = snap.get('fecha') === hoy ? Number(snap.get('usadas')) || 0 : 0
    if (usadas >= limite) return { permitido: false, restantes: 0, limite }
    tx.set(ref, { fecha: hoy, usadas: usadas + 1, actualizadoEn: FieldValue.serverTimestamp() })
    return { permitido: true, restantes: limite - usadas - 1, limite }
  })
}

// Usos que le quedan hoy (para mostrarlo junto al interruptor)
export async function usosRestantes(uid: string): Promise<Record<OpcionConsulta, { restantes: number; limite: number }>> {
  const db = getFirestore()
  const admin = await esAdmin(uid)
  const hoy = fechaPeru()
  const leer = async (opcion: OpcionConsulta) => {
    const limite = admin ? LIMITES_DIARIOS[opcion].admin : LIMITES_DIARIOS[opcion].usuario
    const snap = await db.collection('uso_opciones').doc(`${uid}_${opcion}`).get()
    const usadas = snap.get('fecha') === hoy ? Number(snap.get('usadas')) || 0 : 0
    return { restantes: Math.max(0, limite - usadas), limite }
  }
  return { metaBusqueda: await leer('metaBusqueda'), razonamiento: await leer('razonamiento') }
}
