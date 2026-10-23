import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { GEMINI_API_KEY, TIMEOUT_FUNCIONES_IA_SEGUNDOS, conModeloDeRespaldo } from './geminiClient'
import { ORIGENES_PERMITIDOS, autorizar, consumirCuotaIA, consumirCuotaSugerencias } from './seguridad'
import { PINECONE_API_KEY } from './consultarLexit'
import { parsearJsonTolerante } from './geminiTools'
import { verificarNormasCitadas } from './verificarNormas'

// =========================
// REDACCIÓN AVANZADA
// Documentos que acompañan a los contratos o los reemplazan: cartas,
// cargos, escritos, solicitudes, reclamos, descargos, cartas notariales...
//  - redactarDocumentoIA: genera el borrador completo a partir de lo que
//    el usuario pide (cupo general de IA).
//    Con un escrito subido (opcional, "modo"): 'trabajar' lo reescribe según
//    la indicación del usuario; 'responder' redacta la respuesta a ese
//    escrito tomándolo como base. Sin "modo", todo es igual que antes.
//  - sugerirRedaccionIA: mientras el usuario escribe, propone una mejor
//    redacción del párrafo en el que está (cupo propio de sugerencias).
// En ambos casos las normas citadas se contrastan con la base jurídica.
// =========================

const MIN_PEDIDO = 8
const MAX_PEDIDO = 2_000
const MAX_PARRAFO = 3_000
const MAX_CONTEXTO = 1_500
const MAX_BLOQUES = 80
// Texto del escrito subido (~30 páginas)
const MAX_DOCUMENTO_BASE = 90_000
const MODOS_CON_DOCUMENTO = new Set(['trabajar', 'responder'])
const ALINEACIONES = new Set(['izquierda', 'derecha', 'centro', 'justificado'])

export interface BloqueDocumento {
  texto: string
  alineacion: 'izquierda' | 'derecha' | 'centro' | 'justificado'
  negrita: boolean
}

const ESTILO = `
Reglas de redacción (derecho peruano):
- Registro jurídico formal, claro y respetuoso; oraciones completas, sin coloquialismos.
- No inventes hechos, montos, fechas, nombres, DNI ni direcciones: si faltan, deja un marcador "[completar: dato]".
- Cita normas solo si estás seguro de su número y de que aplican (por ejemplo, el TUO de la Ley N° 27444 para trámites ante entidades públicas o el derecho de petición del artículo 2, inciso 20 de la Constitución). Si dudas, no cites.
- Nunca inventes números de normas ni de artículos.`

function texto(v: unknown, max: number): string | null {
  return typeof v === 'string' && v.length <= max ? v : null
}

// ======================= BORRADOR COMPLETO =======================
export const redactarDocumentoIA = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [GEMINI_API_KEY, PINECONE_API_KEY], timeoutSeconds: TIMEOUT_FUNCIONES_IA_SEGUNDOS },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }
    const uid = await autorizar(req, res)
    if (!uid) return

    try {
      const body = (req.body ?? {}) as { pedido?: unknown; modo?: unknown; documentoBase?: unknown; nombreDocumentoBase?: unknown }
      const modo = typeof body.modo === 'string' && MODOS_CON_DOCUMENTO.has(body.modo) ? body.modo as 'trabajar' | 'responder' : null
      const pedido = texto(body.pedido ?? '', MAX_PEDIDO)?.trim()

      // Con un escrito subido: la indicación es opcional
      let documentoBase: string | null = null
      if (modo) {
        documentoBase = texto(body.documentoBase, MAX_DOCUMENTO_BASE)?.trim() ?? null
        if (pedido === undefined) {
          res.status(400).json({ error: 'La indicación es demasiado larga' })
          return
        }
        if (!documentoBase || documentoBase.length < 50) {
          res.status(400).json({ error: typeof body.documentoBase === 'string' && body.documentoBase.length > MAX_DOCUMENTO_BASE
            ? 'El escrito es demasiado largo (máximo unas 30 páginas).'
            : 'No se pudo leer el texto del escrito. Prueba con un PDF que tenga texto seleccionable o con un Word.' })
          return
        }
      } else if (!pedido || pedido.length < MIN_PEDIDO) {
        res.status(400).json({ error: 'Describe con un poco más de detalle el documento que necesitas' })
        return
      }
      if (!(await consumirCuotaIA(uid, res))) return

      const nombreBase = typeof body.nombreDocumentoBase === 'string' ? body.nombreDocumentoBase.slice(0, 120) : 'escrito adjunto'
      const formatoSalida = `
Responde SOLO JSON:
{"tipo": "tipo de documento", "titulo": "título corto para el archivo", "bloques": [{"texto": "un párrafo", "alineacion": "izquierda|derecha|centro|justificado", "negrita": false}]}
Cada bloque es un párrafo del documento, en orden. Los títulos y la sumilla van con "negrita": true.`

      const prompt = modo === 'responder' ? `
Eres un abogado peruano. El usuario recibió el ESCRITO de abajo (${nombreBase}) y necesita RESPONDERLO.

ESCRITO RECIBIDO:
"""${documentoBase}"""

INDICACIONES DEL USUARIO (su posición, datos o lo que quiere lograr; puede estar vacío):
"""${pedido || 'Sin indicaciones: responde de forma formal y prudente, sin aceptar responsabilidades ni hechos que el escrito no acredite.'}"""

Redacta la respuesta completa tomando el escrito recibido como base:
- Usa el tipo de respuesta que corresponda: carta de respuesta a una carta o carta notarial; absolución, descargo o contestación a un escrito, requerimiento o notificación; recurso si el usuario lo pide.
- Toma del escrito los datos que existan: remitente (que ahora es el destinatario), destinatario (que ahora firma), número de expediente, carta, resolución o referencia, fechas y montos. Cítalo como "Referencia:" o en la sumilla.
- Responde punto por punto a cada hecho, pretensión o requerimiento del escrito, en el mismo orden, según las indicaciones del usuario.
- No inventes hechos ni aceptes los del escrito si el usuario no lo indica; lo que falte, con "[completar: dato]".
${ESTILO}
${formatoSalida}` : modo === 'trabajar' ? `
Eres un abogado peruano. El usuario subió el ESCRITO de abajo (${nombreBase}) y quiere trabajar sobre él.

ESCRITO DEL USUARIO:
"""${documentoBase}"""

INDICACIÓN DEL USUARIO:
"""${pedido || 'Mejora la redacción jurídica sin cambiar el contenido.'}"""

Devuelve el escrito completo aplicando la indicación:
- Conserva su estructura, orden, datos, hechos, nombres, montos, fechas y firmas; cambia solo lo que la indicación pide.
- No agregues hechos nuevos; si la indicación requiere un dato que no está, usa "[completar: dato]".
${ESTILO}
${formatoSalida}` : `
Eres un abogado peruano que redacta documentos legales que no son contratos: cartas, cartas notariales, cargos, escritos, solicitudes, reclamos, descargos, requerimientos, etc.

PEDIDO DEL USUARIO:
"""${pedido}"""

Identifica el tipo de documento y redáctalo completo con la estructura habitual en Perú. Por ejemplo:
- Carta: lugar y fecha (a la derecha), destinatario y cargo, dirección, "Asunto:" y "Referencia:" si aplica, saludo ("De nuestra consideración:"), cuerpo, petición concreta, despedida ("Atentamente,"), firma, nombre y DNI.
- Escrito o solicitud ante una entidad: sumilla (a la derecha, en negrita), destinatario en mayúsculas ("SEÑOR ALCALDE DE LA MUNICIPALIDAD DISTRITAL DE ...:"), identificación del solicitante, petitorio, fundamentos de hecho (numerados), fundamentos de derecho, anexos, "POR TANTO:", lugar y fecha, firma.
${ESTILO}

Responde SOLO JSON:
{"tipo": "tipo de documento", "titulo": "título corto para el archivo", "bloques": [{"texto": "un párrafo", "alineacion": "izquierda|derecha|centro|justificado", "negrita": false}]}
Cada bloque es un párrafo del documento, en orden. Los títulos y la sumilla van con "negrita": true.`

      const pedir = async () => {
        const r = await conModeloDeRespaldo(model => model.generateContent(prompt), { json: true })
        return parsearJsonTolerante(r.response.text()) as { tipo?: unknown; titulo?: unknown; bloques?: unknown }
      }
      let datos: Awaited<ReturnType<typeof pedir>>
      try {
        datos = await pedir()
      } catch (err) {
        if (!(err instanceof SyntaxError)) throw err
        datos = await pedir()
      }

      const bloques: BloqueDocumento[] = (Array.isArray(datos.bloques) ? datos.bloques : [])
        .slice(0, modo ? MAX_BLOQUES * 3 : MAX_BLOQUES)
        .map(b => (b ?? {}) as Record<string, unknown>)
        .filter(b => typeof b.texto === 'string' && b.texto.trim())
        .map(b => ({
          texto: (b.texto as string).trim().slice(0, 4_000),
          alineacion: typeof b.alineacion === 'string' && ALINEACIONES.has(b.alineacion) ? b.alineacion as BloqueDocumento['alineacion'] : 'justificado',
          negrita: b.negrita === true
        }))
      if (bloques.length === 0) throw new Error('Respuesta de la IA sin contenido')

      const normas = await verificarNormasCitadas(bloques.map(b => b.texto).join('\n'))
      res.json({
        tipo: typeof datos.tipo === 'string' ? datos.tipo.slice(0, 80) : 'Documento',
        titulo: typeof datos.titulo === 'string' ? datos.titulo.slice(0, 120) : 'Documento',
        bloques,
        normas
      })
    } catch (err) {
      logger.error('❌ Error en redactarDocumentoIA:', (err as Error).message)
      res.status(500).json({ error: 'No se pudo redactar el documento. Intenta de nuevo.' })
    }
  }
)

// ======================= SUGERENCIA EN VIVO =======================
export const sugerirRedaccionIA = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [GEMINI_API_KEY, PINECONE_API_KEY], timeoutSeconds: 60 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }
    const uid = await autorizar(req, res)
    if (!uid) return

    try {
      const body = (req.body ?? {}) as Record<string, unknown>
      const parrafo = texto(body.parrafo, MAX_PARRAFO)?.trim()
      const anterior = texto(body.anterior ?? '', MAX_CONTEXTO)
      const siguiente = texto(body.siguiente ?? '', MAX_CONTEXTO)
      const tipoDocumento = texto(body.tipoDocumento ?? '', 80)
      if (!parrafo || anterior === null || siguiente === null || tipoDocumento === null) {
        res.status(400).json({ error: 'Párrafo inválido o demasiado largo' })
        return
      }
      if (!(await consumirCuotaSugerencias(uid, res))) return

      const prompt = `
Eres un abogado peruano que revisa, en tiempo real, la redacción de un ${tipoDocumento || 'documento legal'} mientras el usuario lo escribe.

PÁRRAFO QUE ESTÁ ESCRIBIENDO:
"""${parrafo}"""

Contexto (solo para entender, no lo reescribas):
Párrafo anterior: """${anterior}"""
Párrafo siguiente: """${siguiente}"""

Propón la versión del párrafo con redacción jurídica formal, con el MISMO contenido y la misma intención (por ejemplo, "Hola municipalidad de la Molina" → "Señores de la Municipalidad Distrital de La Molina:" o "Nos dirigimos a ustedes, por medio de la presente, a fin de...").
${ESTILO}
- Conserva tal cual los marcadores "[completar: ...]" y los datos que el usuario ya escribió.
- Si el párrafo ya está bien redactado, devuelve "sugerencia" vacía.

Responde SOLO JSON: {"sugerencia": "el párrafo mejorado (o vacío)", "motivo": "qué mejora, en una frase corta"}`

      const r = await conModeloDeRespaldo(model => model.generateContent(prompt), { json: true })
      const datos = parsearJsonTolerante(r.response.text()) as { sugerencia?: unknown; motivo?: unknown }
      let sugerencia = typeof datos.sugerencia === 'string' ? datos.sugerencia.trim().slice(0, 6_000) : ''
      if (sugerencia.replace(/\s+/g, ' ') === parrafo.replace(/\s+/g, ' ')) sugerencia = ''
      const motivo = typeof datos.motivo === 'string' ? datos.motivo.trim().slice(0, 300) : ''

      const normas = await verificarNormasCitadas(parrafo, sugerencia)
      res.json({ sugerencia, motivo, normas })
    } catch (err) {
      logger.error('❌ Error en sugerirRedaccionIA:', (err as Error).message)
      res.status(500).json({ error: 'No se pudo revisar el párrafo.' })
    }
  }
)
