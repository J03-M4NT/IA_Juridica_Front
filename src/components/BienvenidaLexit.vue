<template>
  <div
    ref="raiz"
    class="bienvenida"
    role="dialog"
    aria-modal="true"
    aria-label="Bienvenida a LexIT"
    @keydown.esc="saltar"
  >
    <!-- Mosaico: 12 fotos que aparecen, se juntan hacia el centro y se funden -->
    <div class="bienvenida-mosaico" aria-hidden="true">
      <div v-for="foto in FOTOS" :key="foto" class="bienvenida-foto">
        <img :src="foto" alt="" decoding="async" />
      </div>
    </div>

    <div class="bienvenida-centro">
      <span class="bienvenida-logo">LexIT</span>
      <span class="bienvenida-linea" aria-hidden="true"></span>
      <p class="bienvenida-saludo" role="status">
        {{ nombre ? `Te damos la bienvenida, ${nombre}` : 'Te damos la bienvenida' }}
      </p>
    </div>

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
import apretonDeManos from '../assets/bienvenida/apreton-de-manos.webp'
import limaTorres from '../assets/bienvenida/lima-torres.webp'
import palacioFachada from '../assets/bienvenida/palacio-fachada.webp'
import firma from '../assets/bienvenida/firma.webp'
import faroMiraflores from '../assets/bienvenida/faro-miraflores.webp'
import balconColonial from '../assets/bienvenida/balcon-colonial.webp'
import cuscoIglesia from '../assets/bienvenida/cusco-iglesia.webp'
import limaAerea from '../assets/bienvenida/lima-aerea.webp'
import limaNoche from '../assets/bienvenida/lima-noche.webp'
import palacioDibujo from '../assets/bienvenida/palacio-dibujo.webp'
import moray from '../assets/bienvenida/moray.webp'
import limaCalle from '../assets/bienvenida/lima-calle.webp'

// =========================
// BIENVENIDA DESPUÉS DE INICIAR SESIÓN
// Mosaico de 12 fotos (~0,5 MB en total, optimizadas en webp) que se arma,
// se junta hacia el centro y se funde en el logo y el saludo; luego se
// desvanece y queda la app. Dura ~3,6 s y se puede saltar (botón o Esc).
// Con "reducir movimiento" solo muestra el saludo un momento.
// =========================
const FOTOS = [
  apretonDeManos, limaTorres, palacioFachada, firma,
  faroMiraflores, balconColonial, cuscoIglesia, limaAerea,
  limaNoche, palacioDibujo, moray, limaCalle
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

// Espera a que carguen las fotos (o 700 ms como máximo) para no mostrar
// cuadros vacíos.
function precargar(): Promise<void> {
  const cargas = FOTOS.map(src => new Promise<void>(resolve => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  }))
  return Promise.race([
    Promise.all(cargas).then(() => undefined),
    new Promise<void>(resolve => setTimeout(resolve, 700))
  ])
}

onMounted(async () => {
  document.documentElement.style.overflow = 'hidden'
  botonSaltar.value?.focus({ preventScroll: true })
  const el = raiz.value
  if (!el) return terminar()

  const fotos = Array.from(el.querySelectorAll<HTMLElement>('.bienvenida-foto'))
  const centro = el.querySelector<HTMLElement>('.bienvenida-centro')
  const lineaDecorativa = el.querySelector<HTMLElement>('.bienvenida-linea')

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(fotos, { opacity: 0 })
    linea = gsap.timeline({ onComplete: terminar })
      .from(centro, { opacity: 0, duration: 0.3 })
      .to(el, { opacity: 0, duration: 0.3 }, '+=1.2')
    return
  }

  await precargar()
  if (terminado) return

  // Desplazamiento de cada foto hacia el centro de la pantalla.
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  const haciaCentro = fotos.map(f => {
    const r = f.getBoundingClientRect()
    return { x: (cx - (r.left + r.width / 2)) * 0.45, y: (cy - (r.top + r.height / 2)) * 0.45 }
  })
  // Orden de aparición: del centro hacia afuera.
  const distancia = (i: number) => Math.hypot(haciaCentro[i]!.x, haciaCentro[i]!.y)
  const deCentroAFuera = fotos.map((_, i) => i).sort((a, b) => distancia(a) - distancia(b))

  gsap.set(fotos, { opacity: 0, scale: 0.86 })
  gsap.set(centro, { opacity: 0, scale: 0.94 })
  gsap.set(lineaDecorativa, { scaleX: 0 })

  linea = gsap.timeline({ onComplete: terminar })
  // 1. Las fotos se arman, del centro hacia afuera.
  deCentroAFuera.forEach((i, orden) => {
    linea!.to(fotos[i]!, { opacity: 1, scale: 1, duration: 0.55, ease: 'power3.out' }, 0.1 + orden * 0.06)
  })
  // 2. Se juntan hacia el centro y se funden.
  fotos.forEach((f, i) => {
    linea!.to(f, {
      x: haciaCentro[i]!.x,
      y: haciaCentro[i]!.y,
      scale: 0.7,
      opacity: 0,
      duration: 0.85,
      ease: 'power2.in'
    }, 1.5 + (distancia(i) / 1400))
  })
  // 3. Logo y saludo.
  linea.to(centro, { opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out' }, 1.75)
  linea.to(lineaDecorativa, { scaleX: 1, duration: 0.6, ease: 'power3.out' }, 1.95)
  // 4. Se desvanece y queda la app.
  linea.to(el, { opacity: 0, duration: 0.45, ease: 'power1.inOut' }, 3.15)
})

onUnmounted(() => {
  linea?.kill()
  document.documentElement.style.overflow = ''
})
</script>

<style scoped>
.bienvenida {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #F8F7F2;
  color: #17211B;
}

.bienvenida-mosaico {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 10px;
  padding: 10px;
}

.bienvenida-foto {
  overflow: hidden;
  border-radius: 14px;
  background: #D9D4C6;
  will-change: transform, opacity;
}

.bienvenida-foto img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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
  font-family: 'Baskervville', 'EB Garamond', Georgia, serif;
  font-size: clamp(3.2rem, 9vw, 6rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1;
}

.bienvenida-linea {
  width: 120px;
  height: 1px;
  background: #9C9275;
  transform-origin: center;
}

.bienvenida-saludo {
  margin: 0;
  font-family: 'Baskervville', 'EB Garamond', Georgia, serif;
  font-style: italic;
  font-size: clamp(1.15rem, 2.6vw, 1.6rem);
  color: rgba(23, 33, 27, 0.78);
}

.bienvenida-saltar {
  position: absolute;
  right: 22px;
  bottom: 22px;
  padding: 9px 18px;
  border: 1px solid rgba(23, 33, 27, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(6px);
  color: #17211B;
  font-family: 'Baskervville', 'EB Garamond', Georgia, serif;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.bienvenida-saltar:hover { background: #FFFFFF; }
.bienvenida-saltar:focus-visible { outline: 2px solid #9C9275; outline-offset: 3px; }

/* Celular en vertical: 3 columnas × 4 filas */
@media (max-width: 700px) and (orientation: portrait) {
  .bienvenida-mosaico {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(4, 1fr);
    gap: 6px;
    padding: 6px;
  }
  .bienvenida-foto { border-radius: 10px; }
}
</style>
