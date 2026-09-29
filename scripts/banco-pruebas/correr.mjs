#!/usr/bin/env node
// Banco de pruebas del chat de Consultas.
//
// Envía cada pregunta de preguntas.json a la Cloud Function consultarLexit
// desplegada (la misma que usa la app), compara las fuentes citadas con las
// esperadas y guarda un informe en resultados/. Si hay una corrida anterior,
// muestra qué pruebas empeoraron (regresiones) o mejoraron.
//
// Uso (PowerShell):
//   $env:LEXIT_EVAL_EMAIL="prueba@..."; $env:LEXIT_EVAL_PASSWORD="..."
//   node scripts/banco-pruebas/correr.mjs [--solo id1,id2] [--pausa 1500]
//
// - Usa una cuenta de prueba (correo y contraseña) creada desde la app: cada
//   pregunta gasta 1 de las 50 consultas diarias de esa cuenta
//   (LIMITE_DIARIO_IA en functions/src/seguridad.ts).
// - La contraseña solo se lee de variables de entorno; no se guarda nada.
// - La clave web de Firebase (pública) se lee de VITE_FIREBASE_API_KEY en .env.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { evaluar, etiqueta } from './evaluar.mjs'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.resolve(DIR, '../..')
const DIR_RESULTADOS = path.join(DIR, 'resultados')
const FUNCTIONS_URL = process.env.VITE_FUNCTIONS_URL || 'https://us-central1-lexit-ai.cloudfunctions.net'

// ---------- argumentos ----------
const args = process.argv.slice(2)
const valorArg = nombre => { const i = args.indexOf(nombre); return i !== -1 ? args[i + 1] : undefined }
const soloIds = valorArg('--solo')?.split(',').map(s => s.trim()).filter(Boolean)
const pausaMs = Number(valorArg('--pausa') ?? 1500)

// ---------- configuración ----------
function leerApiKeyFirebase() {
  if (process.env.VITE_FIREBASE_API_KEY) return process.env.VITE_FIREBASE_API_KEY
  const env = path.join(RAIZ, '.env')
  if (!fs.existsSync(env)) return undefined
  const linea = fs.readFileSync(env, 'utf8').split(/\r?\n/).find(l => l.startsWith('VITE_FIREBASE_API_KEY='))
  return linea?.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '')
}

const email = process.env.LEXIT_EVAL_EMAIL
const password = process.env.LEXIT_EVAL_PASSWORD
const apiKey = leerApiKeyFirebase()
if (!email || !password || !apiKey) {
  console.error('Faltan datos: define LEXIT_EVAL_EMAIL y LEXIT_EVAL_PASSWORD (cuenta de prueba), y VITE_FIREBASE_API_KEY en .env.')
  process.exit(2)
}

// ---------- sesión ----------
async function iniciarSesion() {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  })
  const data = await r.json()
  if (!r.ok || !data.idToken) throw new Error(`No se pudo iniciar sesión: ${data.error?.message ?? r.status}`)
  return data.idToken
}

// ---------- ejecución ----------
const { preguntas } = JSON.parse(fs.readFileSync(path.join(DIR, 'preguntas.json'), 'utf8'))
const casos = soloIds ? preguntas.filter(p => soloIds.includes(p.id)) : preguntas
if (casos.length === 0) { console.error('Ninguna pregunta coincide con --solo'); process.exit(2) }

console.log(`Banco de pruebas: ${casos.length} pregunta(s) contra ${FUNCTIONS_URL}/consultarLexit`)
console.log(`Consume ${casos.length} de las 50 consultas diarias de la cuenta ${email}.\n`)

let token = await iniciarSesion()
const esperar = ms => new Promise(r => setTimeout(r, ms))
const resultados = []

for (const [i, caso] of casos.entries()) {
  const inicio = Date.now()
  let fuentes = []
  let problemas
  let error
  try {
    const llamar = () => fetch(`${FUNCTIONS_URL}/consultarLexit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pregunta: caso.pregunta, historialMensajes: caso.historial ?? [] })
    })
    let r = await llamar()
    if (r.status === 401) { token = await iniciarSesion(); r = await llamar() }
    const data = await r.json()
    if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`)
    fuentes = data.fragmentos ?? []
    problemas = evaluar(caso, fuentes)
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    problemas = [`ERROR: ${error}`]
  }
  const segundos = (Date.now() - inicio) / 1000
  const paso = problemas.length === 0
  resultados.push({ id: caso.id, pregunta: caso.pregunta, paso, problemas, citadas: fuentes.map(etiqueta), segundos })
  console.log(`${String(i + 1).padStart(2)}. ${paso ? 'PASA ' : 'FALLA'} ${caso.id.padEnd(30)} ${segundos.toFixed(1).padStart(5)}s` +
    (paso ? '' : `  → ${problemas.join(' | ')}`))
  if (error?.includes('límite')) { console.log('\nSe agotó el límite diario de la cuenta; se detiene la corrida.'); break }
  if (i < casos.length - 1) await esperar(pausaMs)
}

// ---------- resumen ----------
const pasan = resultados.filter(r => r.paso).length
const tiempos = resultados.map(r => r.segundos).sort((a, b) => a - b)
const mediana = tiempos[Math.floor(tiempos.length / 2)] ?? 0
console.log(`\nResultado: ${pasan}/${resultados.length} pasan (${Math.round((pasan / resultados.length) * 100)}%). ` +
  `Tiempo mediano: ${mediana.toFixed(1)}s, máximo: ${(tiempos[tiempos.length - 1] ?? 0).toFixed(1)}s.`)

fs.mkdirSync(DIR_RESULTADOS, { recursive: true })
const anteriores = fs.readdirSync(DIR_RESULTADOS).filter(f => f.endsWith('.json')).sort()
const ultimo = anteriores[anteriores.length - 1]
let empeoraron = []
if (ultimo) {
  const previo = JSON.parse(fs.readFileSync(path.join(DIR_RESULTADOS, ultimo), 'utf8'))
  const antes = new Map(previo.resultados.map(r => [r.id, r.paso]))
  empeoraron = resultados.filter(r => antes.get(r.id) === true && !r.paso).map(r => r.id)
  const mejoraron = resultados.filter(r => antes.get(r.id) === false && r.paso).map(r => r.id)
  console.log(`Comparado con ${ultimo}: ${empeoraron.length ? `EMPEORARON ${empeoraron.join(', ')}` : 'ninguna empeoró'}` +
    `${mejoraron.length ? `; mejoraron ${mejoraron.join(', ')}` : ''}.`)
}

const archivo = path.join(DIR_RESULTADOS, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
fs.writeFileSync(archivo, JSON.stringify({ fecha: new Date().toISOString(), pasan, total: resultados.length, resultados }, null, 2))
console.log(`Informe guardado en ${path.relative(RAIZ, archivo)}`)
// Código de salida 1 si algo que antes pasaba ahora falla: sirve para no
// desplegar un cambio que empeora el chat.
process.exit(empeoraron.length > 0 ? 1 : 0)
