import { defineBoot } from '#q-app/wrappers'
import { auth } from '../firebase/firebaseConfig'
import { reportarError, type TipoError } from '../services/erroresService'

// =========================
// ERRORES DE PANTALLA: captura lo que falla en el navegador y nadie maneja
// (errores de Vue, de la página y promesas rechazadas) y lo manda a
// reportarErrorFront, que lo agrupa para Admin › Errores y Google Cloud
// Error Reporting. No cambia lo que ve el usuario: el error se sigue
// mostrando en la consola como antes.
//  - Solo con sesión iniciada (la función exige el token).
//  - Cada error distinto se manda una sola vez por pestaña, y como mucho
//    10 por pestaña: un error en bucle no genera cientos de llamadas.
// =========================

const MAX_POR_PESTANA = 10
const enviados = new Set<string>()

// Ruta sin parámetros ni ids (modo hash: #/app/consultas?x=1 → /app/consultas)
function rutaActual(): string {
  const ruta = (window.location.hash.replace(/^#/, '') || window.location.pathname).split('?')[0] ?? '/'
  return ruta.replace(/\/[\w-]{16,}/g, '/:id')
}

// Ruido que no es de LexIT: extensiones del navegador, avisos benignos del
// navegador y errores de scripts de otros dominios sin detalle
function esRuido(mensaje: string, pila: string): boolean {
  return /ResizeObserver loop/.test(mensaje) ||
    mensaje === 'Script error.' ||
    /(chrome|moz|safari(-web)?)-extension:/.test(pila)
}

function enviar(tipo: TipoError, error: unknown, componente = '') {
  if (!auth.currentUser) return
  const e = error instanceof Error ? error : null
  const mensaje = e ? `${e.name}: ${e.message}` : String(error).slice(0, 300)
  const pila = e?.stack ?? ''
  if (esRuido(mensaje, pila)) return

  const clave = `${tipo}|${mensaje}`
  if (enviados.has(clave) || enviados.size >= MAX_POR_PESTANA) return
  enviados.add(clave)

  reportarError({
    tipo,
    mensaje,
    pila,
    componente,
    ruta: rutaActual(),
    entorno: import.meta.env.DEV ? 'local' : 'produccion'
  }).catch(() => undefined) // si el reporte falla, no se reporta (evita un bucle)
}

export default defineBoot(({ app }) => {
  app.config.errorHandler = (err, instancia) => {
    console.error(err) // lo que Vue hacía por defecto
    const opciones = instancia?.$options as { name?: string; __name?: string } | undefined
    enviar('vue', err, opciones?.name ?? opciones?.__name ?? '')
  }

  window.addEventListener('error', evento => {
    enviar('ventana', evento.error ?? evento.message)
  })

  window.addEventListener('unhandledrejection', evento => {
    enviar('promesa', evento.reason)
  })
})
