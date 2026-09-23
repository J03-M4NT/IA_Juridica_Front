import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { Pinecone } from '@pinecone-database/pinecone'
import * as logger from 'firebase-functions/logger'
import { GEMINI_API_KEY, obtenerModeloGemini } from './geminiClient'
import {
  ORIGENES_PERMITIDOS,
  MAX_CARACTERES_DOCUMENTO,
  MAX_CARACTERES_MENSAJE,
  MAX_MENSAJES_HISTORIAL,
  autorizar,
  consumirCuotaIA,
  excede
} from './seguridad'

const PINECONE_INDEX = 'lexit'
const PINECONE_HOST = 'https://lexit-rv6se0q.svc.aped-4627-b74a.pinecone.io'

const PINECONE_API_KEY = defineSecret('PINECONE_API_KEY')

// =========================
// TIPOS
// =========================
interface FragmentoResultado {
  texto: string
  nombreDocumento: string
  tipoDocumento: string
  documentoId: string
  indiceChunk: number
  score: number
  numeroArticulo?: number
  esFuentePrimaria?: boolean
}

interface MensajeHistorial {
  esIA: boolean
  contenido: string
}

interface ConsultarLexitRequest {
  pregunta: string
  historialMensajes: MensajeHistorial[]
  textoDocumentoAdjunto?: string
  nombreDocumentoAdjunto?: string
  esSolicitudAnalisis?: boolean
}

interface ConsultarLexitResponse {
  respuesta: string
  usandoPinecone: boolean
  fragmentosEncontrados: number
  fragmentos: FragmentoResultado[]
}

// =========================
// SALUDOS / TRIVIALES (igual que consultas-store.ts antes de esta migración)
// =========================
const ES_SALUDO_REGEX = /^(hola+|holi+|buenas|buenos\s*d[ií]as|buenas\s*tardes|buenas\s*noches|hi|hello|hey|qu[ée]\s*tal|c[óo]mo\s*est[áa]s?|gracias|muchas\s*gracias|ok(ay)?|listo|de\s*acuerdo|entendido|adi[óo]s|chau|bye)[\s!¡.,?¿]*$/i

function esSaludoOTrivial(pregunta: string): boolean {
  return ES_SALUDO_REGEX.test(pregunta.trim())
}

// =========================
// DEDUPE (igual que pineconeService.ts)
// =========================
function numeroArticuloDe(fragmento: FragmentoResultado): number | null {
  if (fragmento.numeroArticulo !== undefined) return fragmento.numeroArticulo
  const match = /Art[íi]culo\s+(\d+)/i.exec(fragmento.texto)
  return match?.[1] ? Number(match[1]) : null
}

function dedupeFragmentos(fragmentos: FragmentoResultado[]): FragmentoResultado[] {
  const vistos = new Set<string>()
  return fragmentos.filter(f => {
    const numeroArticulo = numeroArticuloDe(f)
    const clave = numeroArticulo !== null
      ? `${f.nombreDocumento}::articulo-${numeroArticulo}`
      : f.texto.trim()
    if (vistos.has(clave)) return false
    vistos.add(clave)
    return true
  })
}

// =========================
// BÚSQUEDA EN PINECONE (fuente primaria primero)
// =========================
async function buscarEnPineconeInterno(
  idx: ReturnType<Pinecone['index']>,
  consulta: string,
  topK = 5
): Promise<FragmentoResultado[]> {
  const buscar = async (soloFuentePrimaria: boolean): Promise<FragmentoResultado[]> => {
    const filtros: Record<string, unknown> = {}
    if (soloFuentePrimaria) filtros.esFuentePrimaria = { $eq: true }

    const resultados = await idx.searchRecords({
      query: {
        topK,
        inputs: { text: consulta },
        ...(Object.keys(filtros).length > 0 ? { filter: filtros } : {})
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawHits = (resultados as any)?.result?.hits ?? []

    return (rawHits as Array<{ _score?: number; fields?: Record<string, unknown> }>)
      .map(h => ({
        texto: (h.fields?.text as string) ?? '',
        nombreDocumento: (h.fields?.nombreDocumento as string) ?? '',
        tipoDocumento: (h.fields?.tipoDocumento as string) ?? '',
        documentoId: (h.fields?.documentoId as string) ?? '',
        indiceChunk: (h.fields?.indiceChunk as number) ?? 0,
        score: h._score ?? 0,
        ...(h.fields?.numeroArticulo !== undefined ? { numeroArticulo: h.fields.numeroArticulo as number } : {}),
        ...(h.fields?.esFuentePrimaria !== undefined ? { esFuentePrimaria: h.fields.esFuentePrimaria as boolean } : {})
      }))
      .filter(f => f.texto.length > 0)
  }

  const fragmentosPrimarios = await buscar(true)
  if (fragmentosPrimarios.length > 0) return fragmentosPrimarios
  return buscar(false)
}

// El footer (📚/⚠️) es solo de UI — no se le debe reenviar a Gemini como
// si formara parte de lo que él mismo dijo en un turno anterior.
function sinIndicador(contenido: string): string {
  return contenido.replace(/\n\n---\n\*(?:📚|⚠️)[^*]*\*$/, '')
}

// =========================
// CLOUD FUNCTION
// =========================
export const consultarLexit = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [PINECONE_API_KEY, GEMINI_API_KEY], timeoutSeconds: 120 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const uid = await autorizar(req, res)
    if (!uid) return

    try {
      const {
        pregunta,
        historialMensajes: historialRecibido = [],
        textoDocumentoAdjunto,
        nombreDocumentoAdjunto,
        esSolicitudAnalisis = false
      } = req.body as ConsultarLexitRequest

      if (!pregunta?.trim()) {
        res.status(400).json({ error: 'Falta la pregunta' })
        return
      }
      if (!Array.isArray(historialRecibido)) {
        res.status(400).json({ error: 'historialMensajes debe ser un array' })
        return
      }
      if (excede(pregunta, MAX_CARACTERES_MENSAJE) || excede(textoDocumentoAdjunto, MAX_CARACTERES_DOCUMENTO)) {
        res.status(413).json({ error: 'La pregunta o el documento adjunto son demasiado largos' })
        return
      }
      if (!(await consumirCuotaIA(uid, res))) return

      // Solo los últimos mensajes: cada turno reenvía el historial entero
      // a Gemini, y sin tope una conversación larga dispara el costo.
      const historialMensajes = historialRecibido.slice(-MAX_MENSAJES_HISTORIAL)

      const esTrivial = esSaludoOTrivial(pregunta)
      const tratarComoTrivial = esTrivial && !esSolicitudAnalisis && !textoDocumentoAdjunto

      let contexto = ''
      let fragmentosEncontrados: FragmentoResultado[] = []

      if (!tratarComoTrivial) {
        try {
          const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY.value() })
          const idx = pinecone.index(PINECONE_INDEX, PINECONE_HOST)

          const mensajesUsuario = historialMensajes.filter(m => !m.esIA)
          const preguntaAnterior = mensajesUsuario[mensajesUsuario.length - 1]?.contenido ?? ''
          const esPosibleSeguimiento = !esSolicitudAnalisis && pregunta.trim().split(/\s+/).length <= 8

          const queryBusqueda = esSolicitudAnalisis && textoDocumentoAdjunto
            ? textoDocumentoAdjunto.slice(0, 600)
            : (esPosibleSeguimiento && preguntaAnterior)
              ? `${preguntaAnterior} ${pregunta}`
              : pregunta

          fragmentosEncontrados = dedupeFragmentos(await buscarEnPineconeInterno(idx, queryBusqueda))

          if (fragmentosEncontrados.length > 0) {
            const textoFragmentos = fragmentosEncontrados
              .map(f => f.numeroArticulo
                ? `[${f.nombreDocumento} - Artículo ${f.numeroArticulo}°]: ${f.texto}`
                : `[${f.nombreDocumento}]: ${f.texto}`)
              .join('\n\n')

            const hayFuentePrimaria = fragmentosEncontrados.some(f => f.esFuentePrimaria)

            contexto = [
              '\n\n---',
              'CONTEXTO LEGAL DE LA BASE DE DATOS JURÍDICA (usa ÚNICAMENTE esta información para citar artículos o transcribir texto legal; no completes con conocimiento propio):',
              textoFragmentos,
              hayFuentePrimaria
                ? '\nEstos fragmentos vienen de una fuente primaria (código legal completo, subido y verificado). Si el usuario pregunta por un artículo específico, o qué artículo regula un tema, responde EXACTAMENTE en este formato:\n1. Número de artículo\n2. Interpretación en lenguaje simple\n3. Cita textual exacta del artículo (copiada tal cual del fragmento de arriba, sin resumir ni parafrasear esa parte)'
                : '',
              '---\n'
            ].join('\n')
          }
        } catch (err) {
          logger.warn('⚠️ Pinecone no disponible, usando solo Gemini:', (err as Error).message)
        }
      }

      const preguntaConContexto = tratarComoTrivial
        ? pregunta
        : contexto
          ? `${contexto}\nPREGUNTA DEL USUARIO: ${pregunta}`
          : [
              'AVISO: No se encontró ningún fragmento en la base de datos jurídica indexada para esta pregunta.',
              'NO cites artículos específicos, números de ley, ni transcripciones textuales como si vinieran de la base de datos verificada.',
              'Si respondes con tu conocimiento general, dilo explícitamente al usuario (ej. "Esto no está verificado contra la base de datos jurídica indexada, según mi conocimiento general...") y recomiéndale confirmar con la fuente oficial o reformular la pregunta.',
              `PREGUNTA DEL USUARIO: ${pregunta}`
            ].join('\n')

      let mensajeFinal = preguntaConContexto

      if (esSolicitudAnalisis && textoDocumentoAdjunto) {
        const bloqueAdjunto = [
          `\n\n---\nCONTRATO ADJUNTO POR EL USUARIO ("${nombreDocumentoAdjunto ?? 'documento'}") — documento privado de esta conversación, NO forma parte de la base de datos jurídica compartida.`,
          'Este documento reemplaza cualquier otro contrato adjuntado antes en esta conversación; analiza únicamente este a menos que el usuario indique lo contrario.',
          textoDocumentoAdjunto,
          '---\n'
        ].join('\n')

        const bloqueFormato = [
          'El usuario adjuntó un contrato y quiere un análisis de riesgos. Responde revisando las cláusulas relevantes, en este formato para cada una:',
          '- Cláusula: (nombre o número)',
          '- Nivel de riesgo: alto, medio o bajo (NUNCA uses porcentajes, dan una falsa sensación de precisión matemática)',
          '- Por qué es riesgosa: en lenguaje simple',
          '- Base legal: cita el artículo o norma EXACTAMENTE como aparece en el bloque CONTEXTO LEGAL de este mensaje (códigos o normas del día, lo que aplique). Si este mensaje no trae un bloque CONTEXTO LEGAL, o no cubre esa cláusula, escribe literalmente "⚠️ no se encontró norma específica en la base de datos jurídica para esta cláusula" — no inventes artículos ni cites de memoria.',
          '- Sugerencia: cómo modificar la cláusula concretamente'
        ].join('\n')

        mensajeFinal = `${bloqueFormato}\n${bloqueAdjunto}\n${mensajeFinal}\n\n(Recuerda: responde con la lista de cláusulas en el formato de arriba — riesgo alto/medio/bajo sin porcentajes, razón, base legal y sugerencia.)`
      }

      const model = obtenerModeloGemini()

      const chat = model.startChat({
        history: historialMensajes.map(m => ({
          role: m.esIA ? 'model' : 'user',
          parts: [{ text: m.esIA ? sinIndicador(m.contenido) : m.contenido }]
        })),
        generationConfig: { maxOutputTokens: 2000 },
        systemInstruction: {
          role: 'user',
          parts: [{
            text: [
              'Eres LEXIT AI, una IA jurídica especializada en derecho peruano.',
              '- Respondes consultas legales de manera clara y precisa.',
              '- Citas artículos y normas legales peruanas cuando es relevante.',
              '- Si no sabes algo, lo dices honestamente.',
              '- Usas lenguaje accesible, no solo jerga legal.',
              '- Siempre recomiendas consultar un abogado para casos complejos.',
              '- Respondes en formato markdown cuando sea útil (listas, negritas).'
            ].join('\n')
          }]
        }
      })

      const result = await chat.sendMessage(mensajeFinal)
      const respuestaCompleta = result.response.text()

      if (!respuestaCompleta) {
        res.status(502).json({ error: 'La respuesta de la IA está vacía' })
        return
      }

      const usandoPinecone = !tratarComoTrivial && fragmentosEncontrados.length > 0
      const indicador = tratarComoTrivial
        ? ''
        : usandoPinecone
          ? `\n\n---\n*📚 Respuesta basada en ${fragmentosEncontrados.length} documento(s) de la base jurídica*`
          : '\n\n---\n*⚠️ No se encontró información verificada en la base jurídica para esta consulta*'

      const respuesta: ConsultarLexitResponse = {
        respuesta: respuestaCompleta + indicador,
        usandoPinecone,
        fragmentosEncontrados: fragmentosEncontrados.length,
        fragmentos: fragmentosEncontrados
      }

      res.json(respuesta)
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en consultarLexit:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)
