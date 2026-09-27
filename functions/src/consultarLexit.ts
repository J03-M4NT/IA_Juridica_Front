import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { Pinecone } from '@pinecone-database/pinecone'
import * as logger from 'firebase-functions/logger'
import { GEMINI_API_KEY, TIMEOUT_FUNCIONES_IA_SEGUNDOS, conModeloDeRespaldo } from './geminiClient'
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

// Pinecone siempre devuelve los topK fragmentos "más parecidos", aunque no
// tengan nada que ver con la pregunta. En Consultas (sin documento adjunto)
// se descartan los que quedan por debajo de este score (llama-text-embed-v2,
// coseno), para que una pregunta común no termine respondida con artículos
// de la Constitución que no vienen al caso. Valor inicial conservador:
// calibrarlo con los scores que se registran en los logs ("🔎 Scores").
const SCORE_MINIMO_RELEVANCIA = 0.25

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
  // Solo interno (no se devuelve al front): el trozo estaba etiquetado con
  // un artículo pero no trae su encabezado — es un comentario de doctrina,
  // una nota o un índice del PDF, no texto de ley.
  esComentario?: boolean
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
  topK = 5,
  numeroArticulo?: number
): Promise<FragmentoResultado[]> {
  const buscar = async (soloFuentePrimaria: boolean, articulo?: number): Promise<FragmentoResultado[]> => {
    const filtros: Record<string, unknown> = {}
    if (soloFuentePrimaria) filtros.esFuentePrimaria = { $eq: true }
    if (articulo !== undefined) filtros.numeroArticulo = { $eq: articulo }

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

  // Si la pregunta nombra un artículo concreto, primero se buscan solo los
  // fragmentos etiquetados con ese número (la búsqueda semántica sola suele
  // traer artículos vecinos o del índice). Sin resultados, sigue la
  // búsqueda normal.
  if (numeroArticulo !== undefined) {
    const porArticuloPrimario = await buscar(true, numeroArticulo)
    if (porArticuloPrimario.length > 0) return porArticuloPrimario
    const porArticulo = await buscar(false, numeroArticulo)
    if (porArticulo.length > 0) return porArticulo
  }

  const fragmentosPrimarios = await buscar(true)
  if (fragmentosPrimarios.length > 0) return fragmentosPrimarios
  return buscar(false)
}

// Un artículo real empieza con su encabezado ("Artículo 140 º .-",
// "Artículo 3.-"). Los trozos etiquetados con un número pero sin ese
// encabezado vienen de índices, notas de modificación ("Artículo 2 de la
// Ley Nº...") o comentarios de doctrina que trae el PDF del código.
function tieneEncabezadoDeArticulo(fragmento: FragmentoResultado): boolean {
  if (fragmento.numeroArticulo === undefined) return true
  return new RegExp(`Art[íi]culo\\s+${fragmento.numeroArticulo}\\s*[°º]?\\s*\\.\\s*-`, 'i').test(fragmento.texto)
}

// Número de artículo nombrado en la pregunta ("artículo 2", "art. 1681°").
function numeroArticuloEnPregunta(pregunta: string): number | undefined {
  const match = /\bart(?:[íi]culo|\.)\s*(\d{1,4})\b/i.exec(pregunta)
  return match?.[1] ? Number(match[1]) : undefined
}

// El footer (📚/⚠️) es solo de UI — no se le debe reenviar a Gemini como
// si formara parte de lo que él mismo dijo en un turno anterior.
function sinIndicador(contenido: string): string {
  return contenido.replace(/\n\n---\n\*(?:📚|⚠️)[^*]*\*$/, '')
}

// =========================
// CITAS: en Consultas, Gemini marca con [n] cada fragmento que usó. Solo
// esos se devuelven como fuentes, renumerados 1..k en orden de aparición
// para que el texto y las tarjetas de fuentes del chat coincidan.
// =========================
const CITA_REGEX = /\[(\d+(?:\s*,\s*\d+)*)\]/g

function filtrarFragmentosCitados(
  respuesta: string,
  fragmentos: FragmentoResultado[]
): { respuesta: string; citados: FragmentoResultado[] } {
  const nuevoNumero = new Map<number, number>()
  const citados: FragmentoResultado[] = []

  for (const match of respuesta.matchAll(CITA_REGEX)) {
    for (const n of match[1]!.split(',').map(s => Number(s.trim()))) {
      const fragmento = fragmentos[n - 1]
      if (fragmento && !nuevoNumero.has(n)) {
        citados.push(fragmento)
        nuevoNumero.set(n, citados.length)
      }
    }
  }

  const respuestaRenumerada = respuesta.replace(CITA_REGEX, (_, grupo: string) => {
    const numeros = grupo.split(',')
      .map(s => nuevoNumero.get(Number(s.trim())))
      .filter((n): n is number => n !== undefined)
    return numeros.length ? `[${numeros.join(', ')}]` : ''
  })

  return { respuesta: respuestaRenumerada, citados }
}

// =========================
// CLOUD FUNCTION
// =========================
export const consultarLexit = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [PINECONE_API_KEY, GEMINI_API_KEY], timeoutSeconds: TIMEOUT_FUNCIONES_IA_SEGUNDOS },
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

      logger.info(`📨 Consulta: ${pregunta.length} car., historial ${historialMensajes.length} msj., ` +
        (textoDocumentoAdjunto
          ? `documento adjunto "${nombreDocumentoAdjunto ?? '?'}" (${textoDocumentoAdjunto.length} car.), análisis=${String(esSolicitudAnalisis)}`
          : 'sin documento adjunto'))

      const esTrivial = esSaludoOTrivial(pregunta)
      const tratarComoTrivial = esTrivial && !esSolicitudAnalisis && !textoDocumentoAdjunto

      // Consultas (chat jurídico sin documento): filtra por relevancia y
      // pide citas [n]. Con documento adjunto (Análisis de Contratos) se
      // mantiene el comportamiento anterior sin cambios.
      const modoConsulta = !textoDocumentoAdjunto

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

          const articuloPedido = modoConsulta ? numeroArticuloEnPregunta(pregunta) : undefined

          fragmentosEncontrados = dedupeFragmentos(await buscarEnPineconeInterno(idx, queryBusqueda, 5, articuloPedido))

          // Si vinieron del filtro por número de artículo, son justo lo que
          // se pidió: no se les aplica el umbral de score.
          const vienenDelArticuloPedido = articuloPedido !== undefined &&
            fragmentosEncontrados.length > 0 &&
            fragmentosEncontrados.every(f => f.numeroArticulo === articuloPedido)

          logger.info(`🔎 Scores Pinecone (${modoConsulta ? 'consulta' : 'documento'}` +
            (articuloPedido !== undefined ? `, artículo ${articuloPedido}${vienenDelArticuloPedido ? ' encontrado' : ' no encontrado'}` : '') + '): ' +
            (fragmentosEncontrados.map(f => f.score.toFixed(3)).join(', ') || 'sin resultados'))

          if (modoConsulta) {
            const antes = fragmentosEncontrados.length
            fragmentosEncontrados = vienenDelArticuloPedido
              // Del artículo pedido solo sirve su texto real: si ningún
              // trozo trae el encabezado, no hay texto de ese artículo.
              ? fragmentosEncontrados.filter(tieneEncabezadoDeArticulo)
              : fragmentosEncontrados
                .filter(f => f.score >= SCORE_MINIMO_RELEVANCIA)
                // Comentarios/notas: se conservan como apoyo, pero sin la
                // etiqueta de artículo, que sería engañosa.
                .map(f => {
                  if (tieneEncabezadoDeArticulo(f)) return f
                  const { numeroArticulo: _descartado, ...resto } = f
                  return { ...resto, esComentario: true }
                })
            logger.info(`🧹 Fragmentos útiles: ${fragmentosEncontrados.length} de ${antes}` +
              ` (${fragmentosEncontrados.filter(f => f.esComentario).length} comentario/nota)`)
          }

          if (fragmentosEncontrados.length > 0 && modoConsulta) {
            const textoFragmentos = fragmentosEncontrados
              .map((f, i) => f.esComentario
                ? `[${i + 1}] ${f.nombreDocumento} (comentario o nota incluida en el documento, NO es texto de un artículo): ${f.texto}`
                : f.numeroArticulo
                  ? `[${i + 1}] ${f.nombreDocumento} - Artículo ${f.numeroArticulo}°: ${f.texto}`
                  : `[${i + 1}] ${f.nombreDocumento}: ${f.texto}`)
              .join('\n\n')

            const hayFuentePrimaria = fragmentosEncontrados.some(f => f.esFuentePrimaria)

            contexto = [
              '\n\n---',
              'CONTEXTO LEGAL DE LA BASE DE DATOS JURÍDICA (fragmentos numerados; pueden o no ser relevantes para la pregunta):',
              textoFragmentos,
              '\nInstrucciones sobre este contexto:',
              '- Si algún fragmento responde la pregunta, úsalo y cítalo con su número entre corchetes justo después de la idea que sustenta, ej. [1] o [1, 3].',
              '- Cita SOLO los fragmentos que realmente usaste. Si ninguno sirve, ignóralos por completo, no los menciones y responde con tu conocimiento general.',
              '- Úsalos solo si la pregunta trata sobre lo que regula esa norma. No relaciones la pregunta con un artículo solo porque comparten palabras (ej. "pedir una reunión" por correo NO es la convocatoria a asamblea de una asociación). Si la pregunta es práctica o cotidiana (redactar un correo, un trámite general, una duda común), ignora los fragmentos.',
              '- Las citas textuales (entre comillas) solo pueden salir de estos fragmentos; no transcribas artículos de memoria.',
              '- Complementa con tu conocimiento jurídico general (doctrina, finalidad de la norma, ejemplos, relación con otras figuras o normas) sin número de cita. Los fragmentos sustentan la respuesta, no la limitan.',
              '- Los fragmentos marcados como "comentario o nota" no son texto de ley: puedes usarlos como apoyo doctrinal citándolos, pero nunca presentarlos como el texto de un artículo.',
              '- Si un fragmento no sirve, NO pongas su número [n] en ninguna parte de la respuesta, ni siquiera para decir que no sirve.',
              '- El usuario no ve este contexto: nunca hables de "fragmentos", "contexto", "base de datos proporcionada" ni "información proporcionada". Menciona las normas por su nombre y artículo (ej. "según el artículo 1681° del Código Civil [2]").',
              hayFuentePrimaria
                ? '- Si el usuario pregunta por un artículo específico, o qué artículo regula un tema, y está en estos fragmentos, incluye: el número de artículo, una explicación desarrollada y la cita textual exacta del artículo (copiada tal cual del fragmento) con su número de cita.'
                : '',
              '---\n'
            ].join('\n')
          } else if (fragmentosEncontrados.length > 0) {
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
          : modoConsulta
            ? [
                'No hay fragmentos de la base de datos jurídica para esta pregunta: respóndela con tu conocimiento general, de forma directa.',
                'No presentes texto como transcripción literal de una ley. Si mencionas un artículo o norma específica, sugiere brevemente verificarlo en la fuente oficial.',
                `PREGUNTA DEL USUARIO: ${pregunta}`
              ].join('\n')
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

      // El chat se arma dentro del callback: si el modelo principal está
      // saturado, se vuelve a armar con el modelo de respaldo.
      const result = await conModeloDeRespaldo(model => model.startChat({
        history: historialMensajes.map(m => ({
          role: m.esIA ? 'model' : 'user',
          parts: [{ text: m.esIA ? sinIndicador(m.contenido) : m.contenido }]
        })),
        // Consultas pide respuestas desarrolladas (ver instrucción de
        // profundidad abajo): más margen para que no se corten.
        generationConfig: { maxOutputTokens: modoConsulta ? 4096 : 2000 },
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
              '- Respondes en formato markdown cuando sea útil (listas, negritas).',
              '- No te presentes ni saludes al inicio de cada respuesta; hazlo solo si el usuario te saluda.',
              ...(modoConsulta
                ? ['- En preguntas jurídicas, desarrolla la respuesta con profundidad, como lo haría un buen profesor de derecho: concepto, finalidad de la figura, requisitos o elementos, un ejemplo práctico concreto, consecuencias de su incumplimiento y relación con otras figuras o normas cuando corresponda. No te limites a repetir el texto del artículo. En preguntas cotidianas o simples, responde directo sin alargar.']
                : [])
            ].join('\n')
          }]
        }
      }).sendMessage(mensajeFinal))
      const respuestaCompleta = result.response.text()

      if (!respuestaCompleta) {
        res.status(502).json({ error: 'La respuesta de la IA está vacía' })
        return
      }

      // Consultas: solo cuentan como fuentes los fragmentos que Gemini citó
      // con [n]; una pregunta común queda sin fuentes y sin pie de aviso.
      // Con documento adjunto se mantiene el comportamiento anterior.
      let textoRespuesta = respuestaCompleta
      let fragmentosDevueltos = fragmentosEncontrados
      if (modoConsulta && !tratarComoTrivial && fragmentosEncontrados.length > 0) {
        const filtrado = filtrarFragmentosCitados(respuestaCompleta, fragmentosEncontrados)
        textoRespuesta = filtrado.respuesta
        fragmentosDevueltos = filtrado.citados
        logger.info(`📌 Fragmentos citados: ${fragmentosDevueltos.length} de ${fragmentosEncontrados.length}`)
      }

      const usandoPinecone = !tratarComoTrivial && fragmentosDevueltos.length > 0
      // En Consultas no se agrega pie: el chat ya muestra el bloque de
      // fuentes ("Basado en N fuente(s)") debajo de la respuesta.
      const indicador = tratarComoTrivial || modoConsulta
        ? ''
        : usandoPinecone
          ? `\n\n---\n*📚 Respuesta basada en ${fragmentosDevueltos.length} documento(s) de la base jurídica*`
          : '\n\n---\n*⚠️ No se encontró información verificada en la base jurídica para esta consulta*'

      const respuesta: ConsultarLexitResponse = {
        respuesta: textoRespuesta + indicador,
        usandoPinecone,
        fragmentosEncontrados: fragmentosDevueltos.length,
        fragmentos: fragmentosDevueltos.map(({ esComentario, ...f }) => esComentario
          ? { ...f, nombreDocumento: `${f.nombreDocumento} · Comentario o nota` }
          : f)
      }

      res.json(respuesta)
    } catch (err) {
      const error = err as Error
      logger.error('❌ Error en consultarLexit:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)
