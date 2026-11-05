// =========================
// ANALÍTICA: registro de uso (lo llama autorizar() en seguridad.ts)
// Cuenta, por día (hora Perú), cuántas llamadas recibe cada herramienta y
// cuántas personas distintas usaron LexIT. Solo se guardan CONTEOS y el uid:
// nunca el texto de las consultas, documentos ni datos personales.
//
// No hace esperar al usuario: las escrituras salen sin await (si fallan,
// solo se pierde un conteo). Lo lee el panel de Admin › Analítica
// (ver analitica.ts).
//
// Firestore (solo Admin SDK, el cliente no puede leer ni escribir):
//  - analitica/{YYYY-MM-DD}: { llamadas, porFuncion: {nombre: n},
//      activos, nuevos, recurrentes }
//  - analitica/{YYYY-MM-DD}/activos/{uid}: marca que ese usuario ya se
//      contó ese día (para no contarlo dos veces)
//  - analiticaUsuarios/{uid}: { primerDia, ultimoDia, dias }
// Este archivo no importa seguridad.ts (evita una dependencia circular).
// =========================
import type { Request } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const fechaPeru = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

// Nombre de la función que se está ejecutando (Cloud Functions lo da en
// FUNCTION_TARGET; K_SERVICE es el mismo nombre en minúsculas)
const nombreFuncion = () => (process.env.FUNCTION_TARGET ?? process.env.K_SERVICE ?? 'otra').toLowerCase()

// Llamadas que solo leen un estado y no son uso de una herramienta (por
// ejemplo, al abrir Consultas se piden los usos de Meta búsqueda que
// quedan): no se cuentan
const ACCIONES_DE_LECTURA = new Set(['usos', 'directorio'])

// Usuarios ya contados hoy en esta instancia: evita una escritura extra por
// cada llamada del mismo usuario (se vacía al cambiar el día)
let diaEnMemoria = ''
const contadosHoy = new Set<string>()

export function registrarActividad(uid: string, req: Request): void {
  const accion = (req.body as { accion?: unknown } | undefined)?.accion
  if (typeof accion === 'string' && ACCIONES_DE_LECTURA.has(accion)) return

  const db = getFirestore()
  const hoy = fechaPeru()
  const dia = db.collection('analitica').doc(hoy)

  dia.set({
    llamadas: FieldValue.increment(1),
    porFuncion: { [nombreFuncion()]: FieldValue.increment(1) }
  }, { merge: true }).catch(() => undefined)

  if (diaEnMemoria !== hoy) {
    diaEnMemoria = hoy
    contadosHoy.clear()
  }
  if (contadosHoy.has(uid)) return
  contadosHoy.add(uid)

  // create() falla si el usuario ya se contó hoy (en otra instancia): así
  // cada persona suma una sola vez por día
  dia.collection('activos').doc(uid).create({ en: FieldValue.serverTimestamp() })
    .then(() => db.runTransaction(async tx => {
      const ref = db.collection('analiticaUsuarios').doc(uid)
      const usuario = await tx.get(ref)
      const yaVino = usuario.exists
      tx.set(ref, {
        primerDia: yaVino ? usuario.get('primerDia') as string : hoy,
        ultimoDia: hoy,
        dias: FieldValue.increment(1)
      }, { merge: true })
      // nuevo = primera vez que usa LexIT; recurrente = ya lo había usado otro día
      tx.set(dia, {
        activos: FieldValue.increment(1),
        [yaVino ? 'recurrentes' : 'nuevos']: FieldValue.increment(1)
      }, { merge: true })
    }))
    .catch(() => undefined)
}
