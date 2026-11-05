// =========================
// ERRORES DE PANTALLA (front)
// Lo que falla en el navegador de los usuarios (Vue, el editor, la vista
// del Word, el PDF…) no aparece en los logs de las funciones. El front los
// captura (src/boot/errores.ts) y los manda aquí:
//  - reportarErrorFront: los AGRUPA en Firestore (mismo error = un solo
//    registro, con cuántas veces y a cuántas personas les pasó) y los
//    escribe en los logs con el formato de Google Cloud Error Reporting,
//    que también los agrupa y puede avisar por correo.
//  - erroresAdmin (solo admins): la lista para Admin › Errores y marcar
//    un error como resuelto (si vuelve a pasar, se reabre solo).
//
// Privacidad: solo se guarda el error técnico (mensaje, página, componente,
// navegador). Los textos largos entre comillas y los correos se borran
// antes de guardar, por si el mensaje trae algo que escribió el usuario.
//
// Firestore (solo Admin SDK):
//  - erroresFront/{firma}: el grupo (firma = huella del mensaje + dónde falló)
//  - erroresFront/{firma}/usuarios/{uid}: para contar personas distintas
//  - erroresFrontDia/{YYYY-MM-DD}: { total, produccion, local }
//  - uso_errores/{uid}: tope diario de reportes por usuario
// =========================
import { createHash } from 'node:crypto'
import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { getFirestore, FieldValue, type Timestamp } from 'firebase-admin/firestore'
import { ORIGENES_PERMITIDOS, autorizar } from './seguridad'

// Un usuario no puede llenar la base con reportes: pasado el tope del día,
// se ignoran en silencio
const LIMITE_DIARIO_REPORTES = 30
const DIAS_GRAFICO = 14
const DIA_MS = 86_400_000

type TipoError = 'vue' | 'ventana' | 'promesa'
type Entorno = 'produccion' | 'local'

const fechaPeru = (ms = Date.now()) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

// Quita lo que podría haber escrito el usuario y recorta
function limpiar(texto: unknown, max: number): string {
  if (typeof texto !== 'string') return ''
  return texto
    .replace(/(["'`])(?:(?!\1).){40,}\1/g, '$1…$1')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[correo]')
    .slice(0, max)
}

// La misma falla debe caer en el mismo grupo aunque cambien los números
// del mensaje o el nombre con hash de los archivos tras cada deploy
function firmaDe(tipo: string, mensaje: string, pila: string): string {
  const primeraLinea = pila.split('\n').map(l => l.trim()).find(l => l.startsWith('at ') || l.includes('@')) ?? ''
  const donde = primeraLinea.replace(/-[\w-]{8}\.js/g, '.js').replace(/:\d+:\d+/g, '')
  return createHash('sha1').update(`${tipo}|${mensaje.replace(/\d+/g, '#')}|${donde}`).digest('hex').slice(0, 20)
}

function navegadorDe(ua: string): string {
  const navegador = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Otro'
  const sistema = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Windows/.test(ua) ? 'Windows'
    : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Otro'
  return `${navegador} · ${sistema}`
}

async function quedaCupo(uid: string): Promise<boolean> {
  const db = getFirestore()
  const ref = db.collection('uso_errores').doc(uid)
  const hoy = fechaPeru()
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    const usados = snap.get('fecha') === hoy ? Number(snap.get('usados')) || 0 : 0
    if (usados >= LIMITE_DIARIO_REPORTES) return false
    tx.set(ref, { fecha: hoy, usados: usados + 1 })
    return true
  })
}

export const reportarErrorFront = onRequest(
  { cors: ORIGENES_PERMITIDOS },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método no permitido' })
      return
    }
    const uid = await autorizar(req, res, { sinAnalitica: true })
    if (!uid) return

    const body = (req.body ?? {}) as Record<string, unknown>
    const tipo: TipoError = body.tipo === 'vue' || body.tipo === 'promesa' ? body.tipo : 'ventana'
    const entorno: Entorno = body.entorno === 'local' ? 'local' : 'produccion'
    const mensaje = limpiar(body.mensaje, 300) || 'Error sin mensaje'
    const pila = limpiar(body.pila, 3000)
    const componente = limpiar(body.componente, 80)
    const ruta = limpiar(body.ruta, 120) || '/'
    const navegador = navegadorDe(req.header('user-agent') ?? '')

    try {
      if (!await quedaCupo(uid)) {
        res.status(204).end()
        return
      }

      const db = getFirestore()
      const firma = firmaDe(tipo, mensaje, pila)
      const grupo = db.collection('erroresFront').doc(firma)
      const usuario = grupo.collection('usuarios').doc(uid)

      await db.runTransaction(async tx => {
        const [snapGrupo, snapUsuario] = await Promise.all([tx.get(grupo), tx.get(usuario)])
        const reabrir = snapGrupo.get('estado') === 'resuelto'
        tx.set(grupo, {
          tipo,
          mensaje,
          pila,
          componente,
          veces: FieldValue.increment(1),
          ultimaVez: FieldValue.serverTimestamp(),
          ...(snapGrupo.exists ? {} : { primeraVez: FieldValue.serverTimestamp() }),
          // personas distintas: suma solo la primera vez que le pasa a este usuario
          ...(snapUsuario.exists ? {} : { personas: FieldValue.increment(1) }),
          ...(reabrir || !snapGrupo.exists ? { estado: 'abierto' } : {}),
          ...(reabrir ? { reabierto: true } : {}),
          rutas: { [ruta]: FieldValue.increment(1) },
          navegadores: { [navegador]: FieldValue.increment(1) },
          entornos: { [entorno]: FieldValue.increment(1) }
        }, { merge: true })
        if (!snapUsuario.exists) tx.create(usuario, { en: FieldValue.serverTimestamp() })
      })
      await db.collection('erroresFrontDia').doc(fechaPeru())
        .set({ total: FieldValue.increment(1), [entorno]: FieldValue.increment(1) }, { merge: true })

      // Formato de Error Reporting: aparece agrupado en Google Cloud ›
      // Error Reporting (servicio lexit-front), donde se pueden activar avisos
      logger.error(`${mensaje}\n${pila}`, {
        '@type': 'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent',
        serviceContext: { service: entorno === 'local' ? 'lexit-front-local' : 'lexit-front' },
        context: { httpRequest: { url: ruta, userAgent: navegador }, user: uid, reportLocation: { functionName: componente || tipo } }
      })
      res.status(204).end()
    } catch (err) {
      logger.warn('⚠️ No se pudo guardar un error del front:', (err as Error).message)
      res.status(204).end()
    }
  }
)

const milis = (v: unknown) => (v as Timestamp | undefined)?.toMillis?.() ?? null

export const erroresAdmin = onRequest(
  { cors: ORIGENES_PERMITIDOS },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método no permitido' })
      return
    }
    const uid = await autorizar(req, res, { soloAdmin: true })
    if (!uid) return

    const body = (req.body ?? {}) as { accion?: unknown; id?: unknown; estado?: unknown }
    try {
      const db = getFirestore()

      if (body.accion === 'estado') {
        if (typeof body.id !== 'string' || !/^[a-f0-9]{20}$/.test(body.id) || (body.estado !== 'resuelto' && body.estado !== 'abierto')) {
          res.status(400).json({ error: "Falta el id del error o el estado ('resuelto' o 'abierto')" })
          return
        }
        await db.collection('erroresFront').doc(body.id).update({
          estado: body.estado,
          reabierto: false,
          actualizadoPor: uid,
          actualizadoEn: FieldValue.serverTimestamp()
        })
      }

      // Los 60 grupos más recientes y los conteos de los últimos 14 días
      const ahora = Date.now()
      const fechas = Array.from({ length: DIAS_GRAFICO }, (_, i) => fechaPeru(ahora - (DIAS_GRAFICO - 1 - i) * DIA_MS))
      const [grupos, dias] = await Promise.all([
        db.collection('erroresFront').orderBy('ultimaVez', 'desc').limit(60).get(),
        db.getAll(...fechas.map(f => db.collection('erroresFrontDia').doc(f)))
      ])

      res.json({
        grupos: grupos.docs.map(d => ({
          id: d.id,
          tipo: d.get('tipo') as TipoError,
          mensaje: d.get('mensaje') as string,
          pila: (d.get('pila') as string | undefined) ?? '',
          componente: (d.get('componente') as string | undefined) ?? '',
          veces: Number(d.get('veces')) || 0,
          personas: Number(d.get('personas')) || 0,
          estado: d.get('estado') === 'resuelto' ? 'resuelto' : 'abierto',
          reabierto: d.get('reabierto') === true,
          primeraVez: milis(d.get('primeraVez')),
          ultimaVez: milis(d.get('ultimaVez')),
          rutas: (d.get('rutas') as Record<string, number> | undefined) ?? {},
          navegadores: (d.get('navegadores') as Record<string, number> | undefined) ?? {},
          entornos: (d.get('entornos') as Record<string, number> | undefined) ?? {}
        })),
        dias: dias.map((d, i) => ({
          fecha: fechas[i],
          total: Number(d.get('total')) || 0,
          produccion: Number(d.get('produccion')) || 0,
          local: Number(d.get('local')) || 0
        }))
      })
    } catch (err) {
      logger.error('❌ Error en erroresAdmin:', (err as Error).message)
      res.status(500).json({ error: (err as Error).message })
    }
  }
)
