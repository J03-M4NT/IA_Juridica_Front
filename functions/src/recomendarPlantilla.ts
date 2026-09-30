import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { getFirestore } from 'firebase-admin/firestore'
import { GEMINI_API_KEY, TIMEOUT_FUNCIONES_IA_SEGUNDOS, conModeloDeRespaldo } from './geminiClient'
import { ORIGENES_PERMITIDOS, MAX_CARACTERES_MENSAJE, autorizar, consumirCuotaIA, excede } from './seguridad'

// ================================
// ASISTENTE DE CONTRATOS (Gestión de Contratos)
//
// El usuario describe con sus palabras el contrato que necesita ("alquilar
// mi depa", "vender el carro", "prestarle algo a un amigo") y la IA elige,
// de las plantillas que subió el admin, las que corresponden. Si no queda
// claro, pregunta; si no hay ninguna que sirva, lo dice.
//
// Las plantillas se leen aquí de Firestore (contract_templates), no se
// reciben del navegador: la IA solo puede recomendar plantillas reales.
// ================================

const MAX_TURNOS_HISTORIAL = 10
const MAX_RECOMENDADAS = 3

interface TurnoAsistente {
  esIA: boolean
  contenido: string
}

export interface RespuestaAsistente {
  mensaje: string
  plantillas: string[]
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

export const recomendarPlantillaIA = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [GEMINI_API_KEY], timeoutSeconds: TIMEOUT_FUNCIONES_IA_SEGUNDOS },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const uid = await autorizar(req, res)
    if (!uid) return

    const { mensaje, historial = [] } = req.body as { mensaje?: string; historial?: TurnoAsistente[] }
    if (typeof mensaje !== 'string' || !mensaje.trim()) {
      res.status(400).json({ error: 'Escribe qué contrato necesitas' })
      return
    }
    if (!Array.isArray(historial)) {
      res.status(400).json({ error: 'historial debe ser un array' })
      return
    }
    const turnos = historial.slice(-MAX_TURNOS_HISTORIAL)
    if (excede(mensaje, MAX_CARACTERES_MENSAJE) || turnos.some(t => excede(t?.contenido, MAX_CARACTERES_MENSAJE))) {
      res.status(413).json({ error: 'El mensaje es demasiado largo' })
      return
    }

    try {
      const snapshot = await getFirestore().collection('contract_templates').get()
      const plantillas = snapshot.docs.map(doc => ({
        id: doc.id,
        nombre: texto(doc.get('name')) || 'Sin nombre',
        tipo: texto(doc.get('type')),
        descripcion: texto(doc.get('description'))
      }))
      if (plantillas.length === 0) {
        res.json({ mensaje: 'Todavía no hay plantillas de contratos cargadas en la plataforma.', plantillas: [] })
        return
      }

      if (!(await consumirCuotaIA(uid, res))) return

      const catalogo = plantillas
        .map(p => `- id: ${p.id} | nombre: ${p.nombre}${p.tipo ? ` | tipo: ${p.tipo}` : ''}${p.descripcion ? ` | descripción: ${p.descripcion}` : ''}`)
        .join('\n')
      const conversacion = turnos
        .map(t => `${t?.esIA ? 'Asistente' : 'Usuario'}: ${texto(t?.contenido)}`)
        .join('\n')

      const prompt = `
Eres el asistente de contratos de LexIT, una plataforma legal peruana. Ayudas
al usuario a encontrar la plantilla de contrato que necesita. El usuario suele
escribir de forma general, coloquial o con palabras relacionadas (ej.
"alquilar mi depa" = arrendamiento; "vender mi carro" = compraventa;
"prestar algo gratis" = comodato; "guardar cosas de alguien" = depósito;
"construir o remodelar" = contrato de obra). Interpreta la intención jurídica.

PLANTILLAS DISPONIBLES (solo puedes recomendar estas, por su id exacto):
${catalogo}

${conversacion ? `CONVERSACIÓN PREVIA:\n${conversacion}\n` : ''}
MENSAJE DEL USUARIO: ${mensaje.trim()}

Reglas:
- Si una o más plantillas corresponden, recomiéndalas (máximo ${MAX_RECOMENDADAS}, la más adecuada primero) y explica en una frase por qué.
- Si el pedido es ambiguo entre varias, recomienda las posibles y pregunta cuál se ajusta mejor.
- Si ninguna plantilla corresponde, dilo con claridad, sin inventar plantillas, y sugiere la más cercana solo si realmente sirve.
- Si el mensaje no trata de contratos (saludo, otra consulta), responde breve y pregunta qué contrato necesita.
- Tono profesional y cercano, en español, máximo 3 frases. No des asesoría legal extensa.

Responde SOLO en JSON:
{
  "mensaje": "texto para el usuario",
  "plantillas": ["id de plantilla recomendada", "..."]
}
`

      const result = await conModeloDeRespaldo(model => model.generateContent(prompt), { json: true })
      const clean = result.response.text().replace(/```json|```/g, '').trim()
      const crudo = JSON.parse(clean) as { mensaje?: unknown; plantillas?: unknown }

      // Solo ids que existen de verdad, sin repetir.
      const idsValidos = new Set(plantillas.map(p => p.id))
      const recomendadas = Array.isArray(crudo.plantillas)
        ? [...new Set(crudo.plantillas.filter((id): id is string => typeof id === 'string' && idsValidos.has(id)))].slice(0, MAX_RECOMENDADAS)
        : []
      const respuesta: RespuestaAsistente = {
        mensaje: texto(crudo.mensaje) || (recomendadas.length ? 'Estas plantillas corresponden a lo que necesitas:' : '¿Puedes contarme un poco más sobre el contrato que necesitas?'),
        plantillas: recomendadas
      }
      res.json(respuesta)
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en recomendarPlantillaIA:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)
