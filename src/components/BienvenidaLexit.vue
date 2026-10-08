<template>
  <div
    ref="raiz"
    class="bienvenida"
    role="dialog"
    aria-modal="true"
    aria-label="Bienvenida a LexIT"
    @keydown.esc="saltar"
  >
    <!-- Mosaico: las 22 fotos se arman del centro hacia afuera, con un
         acercamiento lento; luego se juntan y se funden bajo un velo claro -->
    <div class="bienvenida-mosaico" aria-hidden="true">
      <div
        v-for="foto in FOTOS"
        :key="foto.src"
        class="bienvenida-foto"
        :class="{ 'bienvenida-foto--ancha': foto.ancha }"
      >
        <img :src="foto.src" alt="" decoding="async" />
      </div>
    </div>

    <div class="bienvenida-velo" aria-hidden="true"></div>

    <div class="bienvenida-centro">
      <span class="bienvenida-logo" aria-label="LexIT">
        <span
          v-for="(letra, li) in 'LexIT'"
          :key="li"
          class="bienvenida-letra"
          :class="{ 'bienvenida-letra--acento': li >= 3 }"
          aria-hidden="true"
        >{{ letra }}</span>
      </span>
      <span class="bienvenida-linea" aria-hidden="true"></span>
      <p class="bienvenida-saludo" role="status">
        Te damos la bienvenida<template v-if="nombre">, <strong>{{ nombre }}</strong></template>
      </p>
    </div>

    <!-- Avance de la bienvenida -->
    <div class="bienvenida-progreso" aria-hidden="true"><span></span></div>

    <button ref="botonSaltar" type="button" class="bienvenida-saltar" @click="saltar">
      Saltar <span aria-hidden="true">→</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import { useBienvenidaStore } from '../stores/bienvenida'
import { useUserProfileStore } from '../stores/userProfile'
import arquitecturaModerna from '../assets/bienvenida/arquitectura-moderna.webp'
import pinturaTormenta from '../assets/bienvenida/pintura-tormenta.webp'
import pinturaJinete from '../assets/bienvenida/pintura-jinete.webp'
import pinturaInterior from '../assets/bienvenida/pintura-interior.webp'
import apretonDeManos from '../assets/bienvenida/apreton-de-manos.webp'
import firma from '../assets/bienvenida/firma.webp'
import bahiaCosta from '../assets/bienvenida/bahia-costa.webp'
import desierto from '../assets/bienvenida/desierto.webp'
import limaTorres from '../assets/bienvenida/lima-torres.webp'
import palacioFachada from '../assets/bienvenida/palacio-fachada.webp'
import limaAerea from '../assets/bienvenida/lima-aerea.webp'
import faroMiraflores from '../assets/bienvenida/faro-miraflores.webp'
import limaCalle from '../assets/bienvenida/lima-calle.webp'
import limaNoche from '../assets/bienvenida/lima-noche.webp'
import palacioBalcones from '../assets/bienvenida/palacio-balcones.webp'
import casonaColonial from '../assets/bienvenida/casona-colonial.webp'
import valleAndino from '../assets/bienvenida/valle-andino.webp'
import moray from '../assets/bienvenida/moray.webp'
import cuscoIglesia from '../assets/bienvenida/cusco-iglesia.webp'
import tejados from '../assets/bienvenida/tejados.webp'
import pinturaForja from '../assets/bienvenida/pintura-forja.webp'
import palacioDibujo from '../assets/bienvenida/palacio-dibujo.webp'

// =========================
// BIENVENIDA DESPUÉS DE INICIAR SESIÓN
// Mosaico de 22 fotos (~0,9 MB en total, optimizadas en webp de 720 px)
// en una grilla de 6×4 (dos fotos apaisadas ocupan dos celdas). Se arma
// del centro hacia afuera con un acercamiento lento, se junta hacia el
// centro bajo un velo claro y aparecen "LexIT" letra por letra y el saludo
// con el nombre. Dura ~4 s y se puede saltar (botón o Esc). Con "reducir
// movimiento" solo muestra el saludo un momento.
// =========================
const FOTOS = [
  { src: limaTorres }, { src: palacioFachada }, { src: bahiaCosta, ancha: true }, { src: faroMiraflores }, { src: pinturaTormenta },
  { src: apretonDeManos }, { src: cuscoIglesia }, { src: limaNoche }, { src: moray }, { src: casonaColonial }, { src: firma },
  { src: pinturaJinete }, { src: limaAerea }, { src: palacioBalcones }, { src: desierto }, { src: tejados }, { src: arquitecturaModerna },
  { src: valleAndino }, { src: pinturaForja, ancha: true }, { src: limaCalle }, { src: pinturaInterior }, { src: palacioDibujo }
]

const bienvenida = useBienvenidaStore()
const perfil = useUserProfileStore()
const nombre = computed(() => perfil.profile?.displayName?.trim() || '')

const raiz = ref<HTMLElement | null>(null)
const botonSaltar = ref<HTMLButtonElement | null>(null)
let linea: gsap.core.Timeline | null = null
let terminado = false

function terminar() {
  if (terminado) return
  terminado = true
  document.documentElement.style.overflow = ''
  bienvenida.cerrar()
}

function saltar() {
  linea?.kill()
  const el = raiz.value
  if (!el) return terminar()
  gsap.to(el, { opacity: 0, duration: 0.25, ease: 'power1.out', onComplete: terminar })
}

// Espera a que carguen las fotos (o 1,2 s como máximo) para no mostrar
// cuadros vacíos.
function precargar(): Promise<void> {
  const cargas = FOTOS.map(({ src }) => new Promise<void>(resolve => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  }))
  return Promise.race([
    Promise.all(cargas).then(() => undefined),
    new Promise<void>(resolve => setTimeout(resolve, 1200))
  ])
}

onMounted(async () => {
  document.documentElement.style.overflow = 'hidden'
  botonSaltar.value?.focus({ preventScroll: true })
  const el = raiz.value
  if (!el) return terminar()

  const fotos = Array.from(el.querySelectorAll<HTMLElement>('.bienvenida-foto'))
  const imagenes = fotos.map(f => f.querySelector('img'))
  const velo = el.querySelector<HTMLElement>('.bienvenida-velo')
  const centro = el.querySelector<HTMLElement>('.bienvenida-centro')
  const letras = Array.from(el.querySelectorAll<HTMLElement>('.bienvenida-letra'))
  const lineaDecorativa = el.querySelector<HTMLElement>('.bienvenida-linea')
  const saludo = el.querySelector<HTMLElement>('.bienvenida-saludo')
  const progreso = el.querySelector<HTMLElement>('.bienvenida-progreso span')

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(fotos, { opacity: 0 })
    gsap.set(velo, { opacity: 1 })
    linea = gsap.timeline({ onComplete: terminar })
      .from(centro, { opacity: 0, duration: 0.3 })
      .to(el, { opacity: 0, duration: 0.3 }, '+=1.4')
    return
  }

  await precargar()
  if (terminado) return

  // Desplazamiento de cada foto hacia el centro de la pantalla.
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  const haciaCentro = fotos.map(f => {
    const r = f.getBoundingClientRect()
    return { x: (cx - (r.left + r.width / 2)) * 0.3, y: (cy - (r.top + r.height / 2)) * 0.3 }
  })
  // Orden de aparición: del centro hacia afuera.
  const distancia = (i: number) => Math.hypot(haciaCentro[i]!.x, haciaCentro[i]!.y)
  const deCentroAFuera = fotos.map((_, i) => i).sort((a, b) => distancia(a) - distancia(b))

  gsap.set(fotos, { opacity: 0, scale: 0.9, y: 14 })
  gsap.set(imagenes, { scale: 1.16 })
  gsap.set(velo, { opacity: 0 })
  gsap.set(centro, { opacity: 1 })
  gsap.set(letras, { opacity: 0, yPercent: 60, filter: 'blur(6px)' })
  gsap.set(lineaDecorativa, { scaleX: 0 })
  gsap.set(saludo, { opacity: 0, y: 12 })
  gsap.set(progreso, { scaleX: 0 })

  linea = gsap.timeline({ onComplete: terminar })
  // Barra de avance durante toda la bienvenida.
  linea.to(progreso, { scaleX: 1, duration: 3.6, ease: 'none' }, 0)
  // 1. Las fotos se arman, del centro hacia afuera, con acercamiento lento.
  deCentroAFuera.forEach((i, orden) => {
    linea!.to(fotos[i]!, { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.1 + orden * 0.045)
  })
  linea.to(imagenes, { scale: 1, duration: 2.6, ease: 'power1.out' }, 0.1)
  // 2. Velo claro y las fotos se juntan hacia el centro y se funden.
  linea.to(velo, { opacity: 1, duration: 0.9, ease: 'power2.inOut' }, 1.55)
  fotos.forEach((f, i) => {
    linea!.to(f, {
      x: haciaCentro[i]!.x,
      y: haciaCentro[i]!.y,
      scale: 0.88,
      opacity: 0,
      duration: 1,
      ease: 'power2.in'
    }, 1.6 + (distancia(i) / 2000))
  })
  // 3. "LexIT" letra por letra, la línea y el saludo con el nombre.
  linea.to(letras, { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 0.65, ease: 'power3.out', stagger: 0.07 }, 1.85)
  linea.to(lineaDecorativa, { scaleX: 1, duration: 0.6, ease: 'power3.out' }, 2.25)
  linea.to(saludo, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 2.35)
  // 4. Se desvanece y queda la app.
  linea.to(el, { opacity: 0, duration: 0.45, ease: 'power1.inOut' }, 3.6)
})

onUnmounted(() => {
  linea?.kill()
  document.documentElement.style.overflow = ''
})
</script>

<style scoped>
/* Paleta de las funciones: navy #1B2632, Palladian #EEE9DF, Oatmeal
   #C9C1B1, Truffle Trouble #A35139, Burning Flame #FFB162. */
.bienvenida {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #EEE9DF;
  color: #1B2632;
}

.bienvenida-mosaico {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 6px;
  padding: 6px;
}

.bienvenida-foto {
  overflow: hidden;
  border-radius: 4px;
  background: #C9C1B1;
  will-change: transform, opacity;
}

.bienvenida-foto--ancha {
  grid-column: span 2;
}

.bienvenida-foto img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  will-change: transform;
}

/* Velo claro que deja el logo y el saludo sobre un fondo limpio */
.bienvenida-velo {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 55% at 50% 50%, rgba(255, 255, 255, 0.97) 0%, rgba(255, 255, 255, 0.9) 45%, rgba(238, 233, 223, 0.92) 100%);
  pointer-events: none;
}

.bienvenida-centro {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 0 24px;
  text-align: center;
}

.bienvenida-logo {
  display: inline-flex;
  overflow: hidden;
  padding-bottom: 0.06em;
  font-family: 'Baskervville', 'EB Garamond', Georgia, serif;
  font-size: clamp(3.4rem, 9vw, 6.4rem);
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 1.05;
}

.bienvenida-letra {
  display: inline-block;
  will-change: transform, opacity, filter;
}

.bienvenida-letra--acento {
  color: #A35139;
}

.bienvenida-linea {
  width: 140px;
  height: 2px;
  background: #FFB162;
  transform-origin: center;
}

.bienvenida-saludo {
  margin: 0;
  font-family: 'Urbanist', 'Figtree', -apple-system, 'Segoe UI', sans-serif;
  font-size: clamp(1.1rem, 2.4vw, 1.5rem);
  font-weight: 400;
  letter-spacing: 0.01em;
  color: rgba(27, 38, 50, 0.78);
}

.bienvenida-saludo strong {
  font-weight: 700;
  color: #1B2632;
}

/* Barra fina de avance, abajo */
.bienvenida-progreso {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: rgba(27, 38, 50, 0.08);
}

.bienvenida-progreso span {
  display: block;
  height: 100%;
  background: #1B2632;
  transform-origin: left;
}

.bienvenida-saltar {
  position: absolute;
  right: 22px;
  bottom: 22px;
  padding: 8px 16px;
  border: 1px solid rgba(27, 38, 50, 0.24);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(6px);
  color: #1B2632;
  font-family: 'Urbanist', 'Figtree', -apple-system, 'Segoe UI', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, border-color 0.2s;
}

.bienvenida-saltar:hover {
  background: #1B2632;
  border-color: #1B2632;
  color: #FFFFFF;
}

.bienvenida-saltar:focus-visible { outline: 2px solid #FFB162; outline-offset: 3px; }

/* Celular en vertical: 4 columnas × 6 filas (las dos apaisadas siguen
   ocupando dos celdas) */
@media (max-width: 700px) and (orientation: portrait) {
  .bienvenida-mosaico {
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(6, 1fr);
    gap: 4px;
    padding: 4px;
  }
}
</style>
