<template>
  <div class="landing-page" ref="pageRoot">

    <!-- Blob decorations -->
    <div class="blob-wrap blob-wrap-1"><div class="blob blob-1"></div></div>
    <div class="blob-wrap blob-wrap-2"><div class="blob blob-2"></div></div>
    <div class="blob-wrap blob-wrap-3"><div class="blob blob-3"></div></div>

    <!-- Header -->
    <header class="landing-header">
      <div class="header-inner">
        <div class="header-logo">
          <span class="header-logo-text">LexIT</span>
        </div>
        <nav class="header-nav">
          <a href="#producto" class="header-nav-link" @click.prevent="scrollToSection('producto')">Producto</a>
          <a href="#como-funciona" class="header-nav-link" @click.prevent="scrollToSection('como-funciona')">Cómo funciona</a>
          <a href="#nosotros" class="header-nav-link" @click.prevent="scrollToSection('nosotros')">Nosotros</a>
        </nav>
        <auth-buttons ref="authButtonsRef" />
      </div>
    </header>

    <!-- Main -->
    <main class="main-content">

      <!-- Hero -->
      <section class="hero-section" id="inicio">
        <div class="hero-atmosphere" aria-hidden="true">
          <span class="hero-glow hero-glow--1"></span>
          <span class="hero-glow hero-glow--2"></span>
          <span class="hero-glow hero-glow--3"></span>
          <span class="hero-grid"></span>
        </div>

        <div class="hero-inner">
          <span class="hero-badge">IA jurídica especializada en derecho peruano</span>

          <h1 class="hero-title">
            El derecho peruano,<br />
            <em>al alcance de tu práctica.</em>
          </h1>

          <p class="hero-description">
            Resuelve consultas legales y analiza el riesgo de tus contratos por chat, completa
            plantillas de contratos conversando con la IA, y mantente al día con las normas de
            El Peruano — de principio a fin, sin salir de LexIT AI.
          </p>

          <p class="hero-caption">Hecho para abogados y estudios jurídicos en Perú</p>

          <!-- Vista previa ilustrativa del producto — al hacer clic invita a
               iniciar sesión/registrarse, no ejecuta ninguna consulta real. -->
          <button type="button" class="hero-mock" @click="abrirAuth">
            <div class="mock-window">
              <div class="mock-window-bar">
                <span class="mock-dot"></span>
                <span class="mock-dot"></span>
                <span class="mock-dot"></span>
                <span class="mock-window-title">Consultas — LexIT AI</span>
              </div>
              <div class="mock-chat">
                <div class="mock-bubble mock-bubble--user">
                  ¿Esta cláusula de resolución cumple el Código Civil?
                </div>
                <div class="mock-bubble mock-bubble--ai">
                  <span class="mock-bubble-tag">Artículo 1430°</span>
                  Sí, siempre que la condición resolutoria se pacte expresamente. Te muestro
                  la cita textual y cómo aplica a tu cláusula…
                </div>
              </div>
              <div class="mock-cta">Inicia sesión para probarlo →</div>
            </div>
          </button>
        </div>
      </section>

      <!-- Feature cards -->
      <section class="features-section" id="producto">
        <div class="section-header reveal">
          <span class="section-label">Producto</span>
          <h2 class="section-title">Una plataforma, tres pilares</h2>
        </div>

        <div class="features-grid">

          <article class="feature-card">
            <div class="feature-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                <path d="M8 9h8"/>
                <path d="M8 13h5"/>
              </svg>
            </div>
            <h3 class="feature-title">Consultas Legales</h3>
            <p class="feature-description">Chatea con una IA especializada en derecho peruano — o adjunta un contrato (PDF o Word) para un análisis de riesgos cláusula por cláusula, con base legal citada.</p>
          </article>

          <article class="feature-card">
            <div class="feature-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 7h18"/>
                <path d="M3 7l2-3h14l2 3"/>
                <path d="M5 7v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7"/>
                <path d="M9 12h6"/>
              </svg>
            </div>
            <h3 class="feature-title">Gestión de Contratos</h3>
            <p class="feature-description">Elige una plantilla y complétala conversando con la IA, o edítala tú mismo. Descárgala lista, con marca de agua, o sigue editándola en Word con el complemento de LexIT.</p>
          </article>

          <article class="feature-card">
            <div class="feature-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <h3 class="feature-title">Normas del Día</h3>
            <p class="feature-description">Las normas publicadas en El Peruano, organizadas por sector, con un resumen diario generado por IA y lo más relevante para tu práctica.</p>
          </article>

        </div>
      </section>

      <!-- Fuentes legales / credibilidad — inspirado en la banda de
           "reconocimientos" y áreas de práctica de estudios de abogados
           tradicionales (ref. Estudio Rodrigo), pero con contenido real de
           LEXIT: los códigos que de verdad tiene indexados como fuente
           primaria (ver TIPOS_FUENTE_PRIMARIA en pineconeService.ts), no
           premios ni cifras inventadas. -->
      <section class="fuentes-section">
        <div class="section-header reveal">
          <span class="section-label">Base legal</span>
          <h2 class="section-title">Respaldado por los códigos del Perú</h2>
          <p class="fuentes-subtitle">
            Las respuestas que citan artículos se basan en una base jurídica indexada por
            código y por número de artículo — no en un resumen genérico — para que la cita
            textual sea exacta.
          </p>
        </div>

        <div class="fuentes-badges reveal">
          <span class="fuente-badge">Código Civil</span>
          <span class="fuente-badge">Código Penal</span>
          <span class="fuente-badge">Código Laboral</span>
          <span class="fuente-badge">Código Tributario</span>
          <span class="fuente-badge">Constitución Política</span>
        </div>
      </section>

      <!-- How it works -->
      <section class="steps-section" id="como-funciona">
        <div class="section-header reveal">
          <span class="section-label">Cómo funciona</span>
          <h2 class="section-title">Empieza en tres pasos</h2>
        </div>

        <div class="steps-grid">

          <div class="step-card">
            <div class="step-number">01</div>
            <h3 class="step-title">Crea tu cuenta</h3>
            <p class="step-description">Regístrate gratis en segundos y accede a todas las herramientas.</p>
          </div>

          <div class="step-card">
            <div class="step-number">02</div>
            <h3 class="step-title">Elige tu herramienta</h3>
            <p class="step-description">Haz una consulta, adjunta un contrato para analizarlo, o completa una plantilla con ayuda de la IA.</p>
          </div>

          <div class="step-card">
            <div class="step-number">03</div>
            <h3 class="step-title">Obtén resultados</h3>
            <p class="step-description">Recibe respuestas, análisis de riesgos y contratos listos para descargar o editar en Word.</p>
          </div>

        </div>
      </section>

      <!-- Nosotros / Dirección -->
      <section class="nosotros-section" id="nosotros">
        <div class="section-header reveal">
          <span class="section-label">Nosotros</span>
          <h2 class="section-title">Quiénes están detrás de LexIT</h2>
          <p class="nosotros-intro">
            LexIT nace para poner una IA jurídica entrenada en derecho peruano al alcance de
            cualquier abogado o estudio, sin perder el rigor de citar la norma exacta.
          </p>
        </div>

        <div class="proposito-split reveal">
          <div class="proposito-content">
            <p class="proposito-quote">
              LexIT nace para hacer el derecho más comprensible y fácil de consultar, tanto
              para quienes no son abogados como para quienes lo ejercen a diario.
            </p>

            <span class="proposito-label">Propósito</span>
            <p class="proposito-tagline">Confianza - Certeza - Utilidad</p>
          </div>

          <div class="proposito-image-wrap">
            <img :src="imagenProposito" alt="" class="proposito-image" />
          </div>
        </div>

        <div class="mv-split reveal">
          <div class="mv-image-wrap">
            <img :src="imagenMisionVision" alt="" class="mv-image" />
          </div>

          <div class="mv-block">
            <p class="mv-text"><span class="mv-label">Misión</span><br />
              Facilitar el acceso a información jurídica clara mediante una herramienta de
              inteligencia artificial, para que personas, abogados y practicantes puedan
              consultar y trabajar con mayor seguridad.
            </p>

            <p class="mv-text"><span class="mv-label">Visión</span><br />
              Ser una herramienta presente en el trabajo diario de estudiantes, practicantes y
              abogados, y una primera puerta de entrada al derecho para quienes no lo son.
            </p>
          </div>
        </div>

        <h3 class="nosotros-subheading reveal">Dirección</h3>

        <div class="nosotros-grid">

          <article class="persona-card reveal">
            <div class="persona-photo-wrap">
              <img :src="fotoAlexZegarra" alt="Alex Zegarra" class="persona-photo" />
            </div>
            <div class="persona-caption">
              <h3 class="persona-nombre">Alex Zegarra</h3>
              <p class="persona-cargo">Presidente</p>
              <p class="persona-area">Derecho Corporativo</p>
            </div>
          </article>

          <article class="persona-card reveal">
            <div class="persona-photo-wrap">
              <img :src="fotoMijhailMedina" alt="Mijhail Medina" class="persona-photo" />
            </div>
            <div class="persona-caption">
              <h3 class="persona-nombre">Mijhail Medina</h3>
              <p class="persona-cargo">Vicepresidente</p>
              <p class="persona-area">Ingeniería de Tecnologías de Información y Sistemas</p>
            </div>
          </article>

        </div>

        <h3 class="nosotros-subheading reveal">Equipo</h3>

        <div class="equipo-grid">

          <article class="miembro-card reveal">
            <div class="miembro-photo-wrap">
              <img :src="fotoJoeMantilla" alt="Joe Mantilla" class="miembro-photo" />
            </div>
            <h4 class="miembro-nombre">Joe Mantilla</h4>
            <p class="miembro-cargo">Ingeniería de Tecnologías de Información y Sistemas</p>
          </article>

          <article class="miembro-card reveal">
            <div class="miembro-photo-wrap">
              <img :src="fotoSandroAvila" alt="Sandro Avila" class="miembro-photo" />
            </div>
            <h4 class="miembro-nombre">Sandro Avila</h4>
            <p class="miembro-cargo">Ingeniería de Tecnologías de Información y Sistemas</p>
          </article>

          <article class="miembro-card reveal">
            <div class="miembro-photo-wrap">
              <img :src="fotoDayanaCoello" alt="Irene Paye" class="miembro-photo" />
            </div>
            <h4 class="miembro-nombre">Irene Paye</h4>
            <p class="miembro-cargo">Derecho Corporativo</p>
          </article>

          <article class="miembro-card reveal">
            <div class="miembro-photo-wrap">
              <img :src="fotoIrenePaye" alt="Dayana Coello" class="miembro-photo" />
            </div>
            <h4 class="miembro-nombre">Dayana Coello</h4>
            <p class="miembro-cargo">Derecho Corporativo</p>
          </article>

          <article class="miembro-card reveal">
            <div class="miembro-photo-wrap">
              <img :src="fotoTarishGonzales" alt="Tarish Gonzales" class="miembro-photo" />
            </div>
            <h4 class="miembro-nombre">Tarish Gonzales</h4>
            <p class="miembro-cargo">Derecho Corporativo</p>
          </article>

        </div>
      </section>

    </main>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span class="footer-logo-text">LexIT</span>
        </div>
        <p class="footer-copy">© 2026 LexIT AI. Todos los derechos reservados.</p>
      </div>
    </footer>

  </div>
</template>

<!-- --------------------------------------------------- -->

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'
import AuthButtons from '../components/Auth/AuthButtons.vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import fotoAlexZegarra from '../assets/equipo/alex-zegarra.jpg'
import fotoMijhailMedina from '../assets/equipo/mijhail-medina.jpg'
import fotoJoeMantilla from '../assets/equipo/joe-mantilla.jpg'
import fotoSandroAvila from '../assets/equipo/sandro-avila.jpg'
import fotoDayanaCoello from '../assets/equipo/dayana-coello.jpg'
import fotoIrenePaye from '../assets/equipo/irene-paye.jpg'
import fotoTarishGonzales from '../assets/equipo/tarish-gonzales.jpg'
import imagenMisionVision from '../assets/equipo/mision-vision.jpg'
import imagenProposito from '../assets/nosotros/proposito.jpg'

gsap.registerPlugin(ScrollTrigger)

const router = useRouter()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

const pageRoot = ref<HTMLElement | null>(null)

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

let handleMouseMove: ((e: MouseEvent) => void) | null = null
const scrollTriggers: ScrollTrigger[] = []

const authButtonsRef = ref<InstanceType<typeof AuthButtons> | null>(null)

function abrirAuth() {
  authButtonsRef.value?.abrirLogin()
}

// El router usa modo hash (#/ruta) — un <a href="#producto"> normal lo
// interpreta como navegación a una ruta inexistente y cae en el 404, así
// que el scroll a las secciones se hace a mano en vez de dejarlo al navegador.
function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Revela las cards y encabezados de sección con una animación a medida que
// entran en pantalla al hacer scroll, en vez de mostrarse todos de golpe.
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (isAuthenticated.value) {
    void router.replace('/app/consultas')
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-visible')
        observer?.unobserve(entry.target)
      }
    },
    // rootMargin negativo en la base: el elemento revela recién cuando ya
    // entró bien a la vista (no apenas roza el borde inferior), para que
    // el efecto se note mientras se sigue bajando, no antes de llegar.
    { threshold: 0.1, rootMargin: '0px 0px -10% 0px' }
  )

  document.querySelectorAll('.reveal').forEach((el) => observer?.observe(el))

  // Animaciones GSAP (hero, tarjetas, parallax) — se omiten si el usuario
  // pidió reducir el movimiento en su sistema.
  const root = pageRoot.value
  if (!root || prefersReducedMotion()) return

  // --- Entrada del hero: más dinámica (3D y elastic) ---
  const heroLogo = root.querySelector('.hero-logo')
  const heroTexts = [
    '.hero-title',
    '.hero-subtitle',
    '.hero-heading',
    '.hero-description',
  ]
    .map((sel) => root.querySelector(sel))
    .filter(Boolean) as HTMLElement[]

  const tlHero = gsap.timeline({ delay: 0.1 })
  
  if (heroLogo) {
    gsap.set(heroLogo, { scale: 0.5, opacity: 0 })
    tlHero.to(heroLogo, {
      scale: 1,
      opacity: 1,
      duration: 1.2,
      ease: 'elastic.out(1, 0.5)'
    })
  }

  gsap.set(heroTexts, { opacity: 0, y: 40, rotationX: -45, transformPerspective: 800 })
  tlHero.to(heroTexts, {
    opacity: 1,
    y: 0,
    rotationX: 0,
    duration: 1,
    ease: 'power3.out',
    stagger: 0.15,
  }, "-=0.9") // Empezar un poco antes de que termine el logo

  // --- Feature cards: entrada elástica ---
  const featureCards = root.querySelectorAll<HTMLElement>('.feature-card')
  gsap.set(featureCards, { opacity: 0, y: 50, scale: 0.9 })
  scrollTriggers.push(
    ScrollTrigger.create({
      trigger: '.features-grid',
      start: 'top 85%',
      once: true,
      onEnter: () =>
        gsap.to(featureCards, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: 'back.out(1.5)',
          stagger: 0.15,
        }),
    }),
  )

  // --- Step cards: rebote secuencial ---
  const stepCards = root.querySelectorAll<HTMLElement>('.step-card')
  gsap.set(stepCards, { opacity: 0, y: 60 })
  scrollTriggers.push(
    ScrollTrigger.create({
      trigger: '.steps-grid',
      start: 'top 85%',
      once: true,
      onEnter: () =>
        gsap.to(stepCards, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'elastic.out(1, 0.75)',
          stagger: 0.2,
        }),
    }),
  )

  // --- Floating Mockup (Continua) ---
  const heroMock = root.querySelector('.hero-mock')
  if (heroMock) {
    gsap.to(heroMock, {
      y: 15,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    })
  }

  // --- Fondo reactivo al mouse (blob-wrap) y Scroll Parallax (blob inner) ---
  const wraps = root.querySelectorAll<HTMLElement>('.blob-wrap')
  const depths = [18, 26, 14]

  const quickBlobs = Array.from(wraps).map((el) => ({
    x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3.out' }),
    y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3.out' }),
  }))

  // Magnetic Buttons & 3D Cards variables
  const magneticLinks = root.querySelectorAll<HTMLElement>('.header-nav-link')
  const interactiveCards = root.querySelectorAll<HTMLElement>('.feature-card, .step-card')
  const allCards = Array.from(interactiveCards)

  // Prepare quickTo for 3D tilt
  const tiltCards = allCards.map(card => {
    gsap.set(card, { transformPerspective: 1000 })
    return {
      el: card,
      rx: gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' }),
      ry: gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' })
    }
  })

  // Mockup hover events for glow effect
  if (heroMock) {
    heroMock.addEventListener('mouseenter', () => {
      gsap.to(heroMock, { scale: 1.02, duration: 0.4, ease: 'back.out(2)', boxShadow: '0 25px 50px rgba(10, 37, 92, 0.2)' })
    })
    heroMock.addEventListener('mouseleave', () => {
      gsap.to(heroMock, { scale: 1, duration: 0.4, ease: 'power2.out', boxShadow: '0 20px 40px rgba(10, 37, 92, 0.08)' })
    })
  }

  // Magnetic events
  magneticLinks.forEach(link => {
    link.addEventListener('mousemove', (e) => {
      const rect = link.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2
      gsap.to(link, { x: x * 0.4, y: y * 0.4, duration: 0.3, ease: 'power2.out' })
    })
    link.addEventListener('mouseleave', () => {
      gsap.to(link, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.3)' })
    })
  })

  handleMouseMove = (e: MouseEvent) => {
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    const nx = (e.clientX - cx) / cx
    const ny = (e.clientY - cy) / cy

    // Blobs
    quickBlobs.forEach((q, i) => {
      const depth = depths[i] ?? 16
      q.x(nx * depth)
      q.y(ny * depth)
    })

    // 3D Cards Tilt effect
    tiltCards.forEach(cardData => {
      const rect = cardData.el.getBoundingClientRect()
      // Check if mouse is hovering the card
      if (e.clientX > rect.left && e.clientX < rect.right && e.clientY > rect.top && e.clientY < rect.bottom) {
        const cardCx = rect.left + rect.width / 2
        const cardCy = rect.top + rect.height / 2
        // Calculate relative position to card center (-1 to 1)
        const cnx = (e.clientX - cardCx) / (rect.width / 2)
        const cny = (e.clientY - cardCy) / (rect.height / 2)
        // Tilt intensity
        cardData.rx(-cny * 10) // Rotate around X axis based on Y position
        cardData.ry(cnx * 10)  // Rotate around Y axis based on X position
      } else {
        // Reset if not hovering
        cardData.rx(0)
        cardData.ry(0)
      }
    })
  }

  window.addEventListener('mousemove', handleMouseMove, { passive: true })

  // Scroll Parallax para los blobs (añade profundidad vertical al hacer scroll)
  const innerBlobs = root.querySelectorAll<HTMLElement>('.blob')
  innerBlobs.forEach((blob, index) => {
    const speed = index === 0 ? 0.15 : index === 1 ? -0.2 : 0.1
    const st = ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      animation: gsap.to(blob, {
        y: () => window.innerHeight * speed,
        ease: 'none'
      })
    })
    scrollTriggers.push(st)
  })

  // Parallax sutil para las imágenes editoriales de "Propósito" y "Misión/Visión"
  // (misma técnica que los blobs: la imagen se mueve más lento/rápido que el
  // scroll, recortada por el contenedor con overflow:hidden).
  const parallaxImages: { selector: string; trigger: string }[] = [
    { selector: '.proposito-image', trigger: '.proposito-split' },
    { selector: '.mv-image', trigger: '.mv-split' }
  ]
  parallaxImages.forEach(({ selector, trigger }) => {
    const el = root.querySelector<HTMLElement>(selector)
    if (!el) return
    const st = ScrollTrigger.create({
      trigger,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
      animation: gsap.fromTo(el, { y: -30 }, { y: 30, ease: 'none' })
    })
    scrollTriggers.push(st)
  })

  // Advanced text parallax
  heroTexts.forEach((el, index) => {
    const st = ScrollTrigger.create({
      trigger: '.hero-section',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      animation: gsap.to(el, {
        y: (index + 1) * -30,
        opacity: 0,
        ease: 'none'
      })
    })
    scrollTriggers.push(st)
  })
})

onUnmounted(() => {
  observer?.disconnect()
  if (handleMouseMove) window.removeEventListener('mousemove', handleMouseMove)
  scrollTriggers.forEach((st) => st.kill())
})
</script>

<!-- --------------------------------------------------- -->

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Figtree:wght@400;500;600;700&display=swap');

/* Baskervville (SIL Open Font License, ver src/assets/fonts/baskervville/
   OFL.txt) para los títulos de la landing. Fuentes variables: un archivo
   cubre los pesos 400-700. */
@font-face {
  font-family: 'Baskervville';
  src: url('../assets/fonts/baskervville/Baskervville-VariableFont_wght.ttf') format('truetype');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Baskervville';
  src: url('../assets/fonts/baskervville/Baskervville-Italic-VariableFont_wght.ttf') format('truetype');
  font-weight: 400 700;
  font-style: italic;
  font-display: swap;
}

/* ==============================
   Base — misma paleta verde-bosque/beige, ahora invertida a fondo claro
   (Blanco Cálido) a pedido explícito del usuario: el verde oscuro pasa
   de ser el canvas a ser el texto/acento, y el beige claro/blanco pasa
   de ser el texto a ser la superficie. Mismos 8 tonos, otra jerarquía.
   ============================== */
.landing-page {
  --sp-canvas: #FFFFFF;          /* blanco puro, a pedido explícito ("eso es color crema") */
  --sp-surface: #FFFFFF;
  --sp-surface-alt: #D9D4C6;     /* Marfil Claro — hover de tarjetas */
  --sp-border: rgba(23, 33, 27, 0.10);
  --sp-border-strong: rgba(23, 33, 27, 0.18);
  --sp-text: #17211B;            /* Verde Bosque Profundo */
  --sp-text-muted: #3D473A;      /* Verde Grisáceo */
  --sp-text-faint: #686A57;      /* Oliva Medio */
  /* --sp-accent (Verde Grisáceo) cumple doble rol: como texto (labels,
     links, cargos) se distingue del texto normal por ser un poco más
     cálido/menos oscuro que --sp-text; como fondo de botón (CTA) es lo
     bastante oscuro para que el texto claro (--sp-ink) encima se lea
     bien — por eso NO es el mismo tono que --sp-text ni tan claro como
     --sp-text-muted. */
  --sp-accent: #3D473A;
  --sp-accent-hover: #17211B;
  --sp-accent-soft: rgba(61, 71, 58, 0.08);
  --sp-accent-soft-strong: rgba(61, 71, 58, 0.16);
  /* Acento secundario (Oliva Medio) para contenido editorial/de confianza
     (badges de fuentes legales) — un tercer tono, más cálido, distinto
     del acento principal (más frío/verdoso). */
  --sp-accent-secondary: #686A57;
  --sp-accent-secondary-soft: rgba(104, 106, 87, 0.12);
  --sp-accent-secondary-soft-strong: rgba(104, 106, 87, 0.28);
  --sp-ink: #F8F7F2;              /* texto claro sobre superficies oscuras (--sp-accent) */

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
  background: var(--sp-canvas);
  color: var(--sp-text);
  font-family: 'Baskervville', 'EB Garamond', Georgia, serif;
  font-kerning: normal;
  font-variant-ligatures: common-ligatures;
  -webkit-font-smoothing: antialiased;
}

/* ==============================
   Blob decorations
   - .blob-wrap: posición en pantalla + lo mueve GSAP (mouse parallax)
   - .blob: animación orgánica de CSS (scale + micro-drift)
   Separados para que ambos transforms no se peleen.
   ============================== */
@keyframes blob {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(12px, -10px) scale(1.06); }
}

.blob-wrap {
  position: absolute;
  pointer-events: none;
  will-change: transform;
}

.blob-wrap-1 { top: -120px; right: -80px; width: 420px; height: 420px; }
.blob-wrap-2 { top: 180px; left: -140px; width: 380px; height: 380px; }
.blob-wrap-3 { top: 520px; right: -100px; width: 340px; height: 340px; }

.blob {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  filter: blur(8px);
}

/* Mismo tono cálido de la paleta (Beige Oliva), mucho más sutil ahora
   que el fondo es claro — sobre blanco, la misma opacidad de antes se
   vería sucia en vez de atmosférica. */
.blob-1 {
  background: radial-gradient(circle at 30% 30%, rgba(156, 146, 117, 0.14), transparent 70%);
}

.blob-2 {
  background: radial-gradient(circle at 40% 40%, rgba(156, 146, 117, 0.10), transparent 70%);
}

.blob-3 {
  background: radial-gradient(circle at 50% 50%, rgba(61, 71, 58, 0.05), transparent 70%);
}

@media (prefers-reduced-motion: no-preference) {
  .blob-1 { animation: blob 14s ease-in-out infinite; }
  .blob-2 { animation: blob 18s ease-in-out infinite; }
  .blob-3 { animation: blob 16s ease-in-out infinite; }
}

@keyframes driftGlow {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(2%, -3%, 0) scale(1.06); }
}

/* ==============================
   Revelado al hacer scroll (ver IntersectionObserver en el script)
   ============================== */
.reveal {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}

.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.features-grid .feature-card.reveal { transition-delay: 0.08s; }
.features-grid .feature-card.reveal:nth-child(2) { transition-delay: 0.2s; }
.features-grid .feature-card.reveal:nth-child(3) { transition-delay: 0.32s; }

.steps-grid .step-card.reveal { transition-delay: 0.08s; }
.steps-grid .step-card.reveal:nth-child(2) { transition-delay: 0.2s; }
.steps-grid .step-card.reveal:nth-child(3) { transition-delay: 0.32s; }

@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

/* ==============================
   Header
   ============================== */
.landing-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(248, 247, 242, 0.86);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--sp-border);
}

/* AuthButtons.vue trae sus propios colores de "Iniciar Sesión"/
   "Registrarse" — ya estaban pensados para un header claro, así que acá
   alcanza con acercarlos a la paleta verde en vez de su terracota por
   defecto, sin tocar ese componente. */
:deep(.auth-buttons .login-btn) {
  color: var(--sp-text) !important;
}

:deep(.auth-buttons .login-btn:hover) {
  background: rgba(23, 33, 27, 0.05) !important;
}

:deep(.auth-buttons .register-btn) {
  background: var(--sp-accent) !important;
  color: var(--sp-ink) !important;
}

:deep(.auth-buttons .register-btn:hover) {
  background: var(--sp-accent-hover) !important;
}

/* Misma tipografía que el resto de la landing (el componente usa Figtree,
   que se mantiene dentro de la app). */
:deep(.auth-buttons .auth-btn) {
  font-family: 'Baskervville', 'EB Garamond', serif;
}

.header-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 14px 28px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 11px;
  flex-shrink: 0;
}

.header-logo-text {
  font-family: 'Baskervville', 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 1.7rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--sp-text);
}

.header-nav {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
}

.header-nav-link {
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--sp-text-muted);
  text-decoration: none;
  transition: color 0.18s;
}

.header-nav-link:hover {
  color: var(--sp-accent);
}

/* ==============================
   Main
   ============================== */
.main-content {
  flex: 1;
  position: relative;
  z-index: 1;
}

/* ==============================
   Hero — fondo blanco cálido, atmósfera muy sutil (los glows de acá
   abajo quedan casi imperceptibles a propósito: sobre fondo oscuro
   sumaban drama, sobre blanco lo que suma es que el texto respire).
   ============================== */
.hero-section {
  position: relative;
  overflow: hidden;
  background: var(--sp-canvas);
  padding: 96px 28px 110px;
  animation: floatUp 0.7s ease-out both;
}

.hero-atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.55;
  animation: driftGlow 14s ease-in-out infinite;
}

.hero-glow--1 {
  width: 520px;
  height: 520px;
  top: -180px;
  left: -120px;
  background: radial-gradient(circle, rgba(156, 146, 117, 0.22), transparent 70%);
}

.hero-glow--2 {
  width: 460px;
  height: 460px;
  bottom: -220px;
  right: -100px;
  background: radial-gradient(circle, rgba(156, 146, 117, 0.14), transparent 70%);
  animation-delay: -6s;
}

.hero-glow--3 {
  width: 380px;
  height: 380px;
  top: 30%;
  left: 55%;
  background: radial-gradient(circle, rgba(61, 71, 58, 0.06), transparent 70%);
  animation-delay: -3s;
}

.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(23, 33, 27, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(23, 33, 27, 0.05) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, #000 40%, transparent 100%);
}

.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 760px;
  margin: 0 auto;
  text-align: center;
}

.hero-logo {
  height: 78px;
  width: 78px;
  display: block;
  margin: 0 auto 22px;
  filter: drop-shadow(0 8px 22px rgba(139, 92, 246, 0.22));
}

.hero-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--sp-surface);
  border: 1px solid var(--sp-border-strong);
  color: var(--sp-text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-bottom: 24px;
}

/* Serif editorial (equivalente a "Arizona Mix" de la referencia) con
   tracking negativo agresivo — nada de texto en gradiente, un solo color
   sólido por línea, como pide la referencia. */
.hero-title {
  font-family: 'Baskervville', 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: clamp(2.6rem, 5vw + 1rem, 4.6rem);
  line-height: 1.04;
  font-weight: 500;
  margin: 0 0 22px;
  letter-spacing: -0.03em;
  color: var(--sp-text);
}

.hero-title em {
  font-style: italic;
  color: var(--sp-accent);
}

.hero-description {
  font-size: 1.14rem;
  line-height: 1.65;
  color: var(--sp-text-muted);
  max-width: 580px;
  margin: 0 auto 14px;
}

.hero-caption {
  font-size: 0.85rem;
  color: var(--sp-text-faint);
  margin: 0 0 48px;
}

/* Vista previa ilustrativa — es un <button>: al hacer clic abre el login */
.hero-mock {
  display: block;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  cursor: pointer;
  filter: drop-shadow(0 30px 60px rgba(0, 0, 0, 0.45));
  transition: transform 0.25s ease, filter 0.25s ease;
}

.hero-mock:hover,
.hero-mock:focus-visible {
  transform: translateY(-3px);
  filter: drop-shadow(0 36px 70px rgba(0, 0, 0, 0.5));
}

.hero-mock:active {
  transform: translateY(-1px) scale(0.99);
}

/* Blanco puro + borde visible: el canvas del hero ya es casi blanco
   (Blanco Cálido), así que sin esto la ventana del mock se perdería
   contra el fondo en vez de leerse como una tarjeta flotando. */
.mock-window {
  background: #FFFFFF;
  border: 1px solid var(--sp-border);
  border-radius: 14px;
  overflow: hidden;
  text-align: left;
}

.mock-cta {
  padding: 12px 16px;
  background: var(--ink);
  color: #FAFAF7;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
}

.mock-window-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #efefe9;
  border-bottom: 1px solid rgba(27, 27, 30, 0.07);
}

.mock-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(27, 27, 30, 0.18);
}

.mock-window-title {
  margin-left: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #8a8a90;
}

.mock-chat {
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mock-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.85rem;
  line-height: 1.5;
}

.mock-bubble--user {
  align-self: flex-end;
  background: var(--ink);
  color: #FAFAF7;
  border-bottom-right-radius: 4px;
  max-width: 80%;
}

.mock-bubble--ai {
  align-self: flex-start;
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.08);
  color: #3a3a40;
  border-bottom-left-radius: 4px;
  max-width: 90%;
}

.mock-bubble-tag {
  display: block;
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 4px;
}

/* ==============================
   Section headers (compartido)
   ============================== */
.section-header {
  text-align: center;
  margin-bottom: 46px;
}

.section-label {
  display: inline-block;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--sp-accent);
  margin-bottom: 12px;
}

.section-title {
  font-family: 'Baskervville', 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 2.3rem;
  font-weight: 500;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--sp-text);
}

/* ==============================
   Feature cards
   ============================== */
.features-section {
  max-width: 1080px;
  margin: 0 auto;
  padding: 90px 28px 30px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 22px;
}

/* Tarjeta plana (ver "Dark Card" de la referencia): sin vidrio esmerilado
   ni sombra fuerte — la profundidad sale del cambio de fondo (canvas →
   surface) y de un borde fino, no de blur/shadow. El tilt 3D de GSAP
   sigue funcionando igual, solo cambia qué se ve debajo del cursor. */
.feature-card {
  background: var(--sp-surface);
  border: 1px solid var(--sp-border);
  border-radius: 4px;
  padding: 30px 26px;
  box-shadow: none;
  transition: transform 0.3s ease, border-color 0.3s ease, background-color 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  border-color: var(--sp-accent-soft-strong);
  background: var(--sp-surface-alt);
}

.feature-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 22px;
  background: var(--sp-accent-soft);
  color: var(--sp-accent);
  transition: background 0.25s, color 0.25s, transform 0.25s;
}

.feature-card:hover .feature-icon-wrap {
  background: var(--sp-accent);
  color: var(--sp-ink);
  transform: scale(1.06);
}

.feature-title {
  font-family: 'Baskervville', 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 1.45rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin: 0 0 9px;
  color: var(--sp-text);
}

.feature-description {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--sp-text-muted);
  margin: 0;
}

/* ==============================
   Fuentes legales / credibilidad
   ============================== */
.fuentes-section {
  max-width: 780px;
  margin: 0 auto;
  padding: 40px 28px 70px;
  text-align: center;
}

.fuentes-subtitle {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--sp-text-muted);
  max-width: 560px;
  margin: 14px auto 0;
}

.fuentes-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 30px;
}

.fuente-badge {
  display: inline-flex;
  align-items: center;
  padding: 9px 18px;
  border-radius: 999px;
  background: var(--sp-accent-secondary-soft);
  border: 1px solid var(--sp-accent-secondary-soft-strong);
  color: var(--sp-accent-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* ==============================
   Steps / How it works
   ============================== */
.steps-section {
  max-width: 1080px;
  margin: 0 auto;
  padding: 60px 28px 60px;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.step-card {
  position: relative;
  overflow: hidden;
  background: var(--sp-surface);
  border: 1px solid var(--sp-border);
  border-radius: 4px;
  padding: 30px 26px;
  box-shadow: none;
  transition: border-color 0.25s, background-color 0.25s;
}

.step-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--sp-accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
}

.step-card:hover {
  transform: translateY(-6px);
  border-color: var(--sp-accent-soft-strong);
  background: var(--sp-surface-alt);
}

.step-card:hover::before {
  transform: scaleX(1);
}

.step-card:active {
  transform: translateY(-2px) scale(0.99);
}

.step-number {
  font-family: 'Baskervville', 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 2.6rem;
  font-weight: 500;
  line-height: 1;
  color: var(--sp-accent-soft-strong);
  margin-bottom: 14px;
  transition: color 0.25s;
}

.step-card:hover .step-number {
  color: var(--sp-accent);
}

.step-title {
  font-family: 'Baskervville', 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 1.35rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin: 0 0 8px;
  color: var(--sp-text);
}

.step-description {
  font-size: 0.98rem;
  line-height: 1.6;
  color: var(--sp-text-muted);
  margin: 0;
}

/* ==============================
   Nosotros / Dirección
   ============================== */
.nosotros-section {
  max-width: 1080px;
  margin: 0 auto;
  padding: 60px 28px 100px;
}

.nosotros-intro {
  font-size: 1.05rem;
  line-height: 1.65;
  color: var(--sp-text-muted);
  max-width: 620px;
  margin: 14px auto 0;
}

/* Propósito — cita editorial a la izquierda + fotografía institucional
   (blanco y negro) a la derecha, con leve parallax de scroll (ver script)
   para que se sienta interactiva sin salirse del tono editorial. */
.proposito-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: 56px;
  align-items: center;
  max-width: 1080px;
  margin: 48px auto 0;
}

.proposito-content {
  text-align: left;
}

.proposito-quote {
  font-family: 'Baskervville', 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 1.5rem;
  line-height: 1.5;
  font-weight: 400;
  color: var(--sp-text);
  text-align: justify;
  margin: 0 0 32px;
}

.proposito-label {
  display: inline-block;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--sp-accent);
  margin-bottom: 14px;
}

.proposito-tagline {
  font-family: 'Baskervville', 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 1.3rem;
  font-weight: 500;
  color: var(--sp-text);
  margin: 0;
}

.proposito-image-wrap {
  position: relative;
  aspect-ratio: 1500 / 1434;
  border-radius: 4px;
  overflow: hidden;
}

.proposito-image {
  position: absolute;
  top: -10%;
  left: 0;
  width: 100%;
  height: 120%;
  object-fit: cover;
  display: block;
  will-change: transform;
}

/* Misión / Visión — imagen a la izquierda, texto plano editorial a la
   derecha (sin caja ni borde en el texto: solo título en negrita +
   párrafo debajo, como una cita de catálogo/galería). */
.mv-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 48px;
  align-items: center;
  max-width: 1080px;
  margin: 48px auto 0;
}

.mv-image-wrap {
  position: relative;
  aspect-ratio: 1500 / 1105;
  border-radius: 4px;
  overflow: hidden;
}

.mv-image {
  position: absolute;
  top: -10%;
  left: 0;
  width: 100%;
  height: 120%;
  object-fit: cover;
  display: block;
  will-change: transform;
}

.mv-block {
  text-align: left;
}

.mv-text {
  font-size: 1.02rem;
  line-height: 1.7;
  color: var(--sp-text-muted);
  margin: 0 0 28px;
}

.mv-text:last-child {
  margin-bottom: 0;
}

.mv-label {
  display: inline;
  font-weight: 700;
  color: var(--sp-text);
}

/* Subtítulo que separa "Equipo" (grilla general) de "Dirección" (las dos
   tarjetas grandes que ya había) dentro de la misma sección Nosotros. */
.nosotros-subheading {
  font-family: 'Baskervville', 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 1.1rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--sp-text);
  text-align: center;
  margin: 56px 0 24px;
}

/* Grilla "Equipo" — más chica que la de Dirección pero no tan angosta
   como antes, en fila, sin recuadro (mismo criterio que Dirección: solo
   la foto y el texto debajo, nada de caja). */
.equipo-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
  max-width: 1080px;
  margin: 0 auto;
}

/* 5 en fila solo cuando entran; en tablet y celular, menos columnas para
   que las fotos no queden diminutas. */
@media (max-width: 900px) {
  .equipo-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 520px) {
  .equipo-grid { grid-template-columns: repeat(2, 1fr); }
}

.miembro-card {
  text-align: center;
}

.miembro-photo-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4.3;
  overflow: hidden;
  border-radius: 4px;
  background: var(--sp-canvas);
}

.miembro-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
  transition: transform 0.4s ease;
}

.miembro-card:hover .miembro-photo {
  transform: scale(1.04);
}

.miembro-nombre {
  font-family: 'Baskervville', 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 0.95rem;
  font-weight: 500;
  letter-spacing: -0.005em;
  margin: 14px 0 3px;
  color: var(--sp-text);
}

.miembro-cargo {
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--sp-text-faint);
  margin: 0;
  padding: 0 4px;
}

.nosotros-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  max-width: 920px;
  margin: 0 auto;
}

/* Retrato grande sin recuadro — solo la foto "flotando" sobre el fondo
   de la página, con el nombre/cargo debajo, también sin caja. Antes
   tenían una tarjeta (fondo + borde) alrededor; a pedido del usuario se
   quitó ese encierro. */
.persona-card {
  text-align: center;
}

.persona-photo-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-radius: 4px;
  background: var(--sp-canvas);
}

.persona-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
  transition: transform 0.4s ease;
}

.persona-card:hover .persona-photo {
  transform: scale(1.03);
}

.persona-caption {
  padding: 18px 6px 0;
}

.persona-nombre {
  font-family: 'Baskervville', 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 1.3rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin: 0 0 4px;
  color: var(--sp-text);
}

.persona-cargo {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--sp-accent);
  margin: 0;
}

.persona-area {
  font-size: 0.85rem;
  color: var(--sp-text-muted);
  margin: 4px 0 0;
}

/* ==============================
   Footer
   ============================== */
.landing-footer {
  border-top: 1px solid var(--sp-border);
  padding: 30px 28px;
  position: relative;
  z-index: 1;
}

.footer-inner {
  max-width: 1180px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 9px;
}

.footer-logo-text {
  font-family: 'Baskervville', 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--sp-text);
}

.footer-copy {
  font-size: 0.85rem;
  color: var(--sp-text-faint);
  margin: 0;
}

/* ==============================
   Responsive
   ============================== */
@media (max-width: 768px) {
  .header-inner {
    padding: 12px 16px;
  }

  .header-logo-text {
    font-size: 1.2rem;
  }

  .header-nav {
    display: none;
  }

  .hero-section {
    padding: 64px 20px 70px;
  }

  .hero-title {
    font-size: 2.6rem;
  }

  .features-section {
    padding: 60px 16px 20px;
  }

  .steps-section {
    padding: 40px 16px 40px;
  }

  .nosotros-section {
    padding: 40px 16px 60px;
  }

  .features-grid,
  .steps-grid,
  .nosotros-grid {
    grid-template-columns: 1fr;
  }

  .proposito-split,
  .mv-split {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .proposito-quote {
    font-size: 1.25rem;
  }

  .equipo-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .footer-inner {
    flex-direction: column;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 2.15rem;
  }

  .hero-description {
    font-size: 1.02rem;
  }
}
</style>