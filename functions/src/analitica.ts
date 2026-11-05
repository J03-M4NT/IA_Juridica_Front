// =========================
// ANALÍTICA (Admin): resumen de uso de LexIT
// Los conteos se registran en analiticaRegistro.ts (desde autorizar). Esta
// función, solo para admins, junta todo lo que muestra Admin › Analítica:
// personas activas, usuarios registrados, uso por herramienta y consumo
// de IA. Lee resúmenes ya contados (un documento por día) y conteos de
// Firestore (count/sum), así que abrir el panel cuesta pocas lecturas
// aunque LexIT tenga muchos usuarios.
// =========================
import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { getFirestore, Timestamp, type Query } from 'firebase-admin/firestore'
import { ORIGENES_PERMITIDOS, LIMITE_DIARIO_IA, LIMITE_DIARIO_SUGERENCIAS, autorizar } from './seguridad'
import { usosRerankDelMes } from './cuotaPinecone'

const DIAS = 30
const DIA_MS = 86_400_000

const fechaPeru = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
const numero = (v: unknown) => (typeof v === 'number' ? v : 0)

export const analiticaAdmin = onRequest(
  { cors: ORIGENES_PERMITIDOS },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método no permitido' })
      return
    }
    const uid = await autorizar(req, res, { soloAdmin: true })
    if (!uid) return

    try {
      const db = getFirestore()
      const ahora = Date.now()
      // Los últimos 30 días (hora Perú), del más antiguo a hoy
      const fechas = Array.from({ length: DIAS }, (_, i) => fechaPeru(ahora - (DIAS - 1 - i) * DIA_MS))
      const hoy = fechas[DIAS - 1]
      const hace7 = fechas[DIAS - 7]
      const hace30 = fechas[0]

      const usuariosActividad = db.collection('analiticaUsuarios')
      const usuarios = db.collection('users')
      const cuenta = async (q: Query) => (await q.count().get()).data().count
      // Cupos de hoy: solo se filtra por fecha (sin índices compuestos) y se
      // suma aquí; son a lo sumo un documento por persona que usó la IA hoy
      const cuposDeHoy = async (coleccion: string) => {
        const snap = await db.collection(coleccion).where('fecha', '==', hoy).get()
        const usadas = snap.docs.map(d => numero(d.get('usadas')))
        return { usuarios: usadas.length, usadas: usadas.reduce((s, n) => s + n, 0), enLimite: usadas.filter(n => n >= LIMITE_DIARIO_IA).length }
      }

      const [docsDias, activos7, activos30, conActividad, total, nuevos7, nuevos30, ia, sugerencias, rerank] = await Promise.all([
        db.getAll(...fechas.map(f => db.collection('analitica').doc(f))),
        cuenta(usuariosActividad.where('ultimoDia', '>=', hace7)),
        cuenta(usuariosActividad.where('ultimoDia', '>=', hace30)),
        cuenta(usuariosActividad),
        cuenta(usuarios),
        cuenta(usuarios.where('createdAt', '>=', Timestamp.fromMillis(ahora - 7 * DIA_MS))),
        cuenta(usuarios.where('createdAt', '>=', Timestamp.fromMillis(ahora - DIAS * DIA_MS))),
        cuposDeHoy('uso_ia'),
        cuposDeHoy('uso_ia_vivo'),
        usosRerankDelMes()
      ])

      const dias = docsDias.map((d, i) => ({
        fecha: fechas[i],
        llamadas: numero(d.get('llamadas')),
        activos: numero(d.get('activos')),
        nuevos: numero(d.get('nuevos')),
        recurrentes: numero(d.get('recurrentes')),
        porFuncion: (d.get('porFuncion') as Record<string, number> | undefined) ?? {}
      }))

      res.json({
        hoy,
        // Primer día (de los últimos 30) con datos: el conteo empezó con el deploy
        desde: dias.find(d => d.llamadas > 0)?.fecha ?? null,
        dias,
        activos: { hoy: dias[DIAS - 1]?.activos ?? 0, semana: activos7, mes: activos30, conActividad },
        usuarios: { total, nuevosSemana: nuevos7, nuevosMes: nuevos30 },
        consumoHoy: {
          ia: { usadas: ia.usadas, usuarios: ia.usuarios, enLimite: ia.enLimite, limite: LIMITE_DIARIO_IA },
          sugerencias: { usadas: sugerencias.usadas, usuarios: sugerencias.usuarios, limite: LIMITE_DIARIO_SUGERENCIAS },
          rerank
        }
      })
    } catch (err) {
      logger.error('❌ Error en analiticaAdmin:', (err as Error).message)
      res.status(500).json({ error: (err as Error).message })
    }
  }
)
