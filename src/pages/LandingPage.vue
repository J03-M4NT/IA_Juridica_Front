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
          <img src="../assets/logo.svg" alt="LEXIT AI" class="header-logo-img" />
          <span class="header-logo-text">LEXIT AI</span>
        </div>
        <auth-buttons />
      </div>
    </header>

    <!-- Main -->
    <main class="main-content">

      <!-- Hero -->
      <section class="hero-section">
        <img src="../assets/logo.svg" alt="LEXIT AI" class="hero-logo" />
        <h1 class="hero-title">LEXIT AI</h1>
        <p class="hero-subtitle">Inteligencia Artificial para el Análisis Jurídico</p>
        <h2 class="hero-heading">Revoluciona tu práctica legal</h2>
        <p class="hero-description">
          Analiza contratos, realiza consultas legales y gestiona documentos con la ayuda de
          nuestra inteligencia artificial especializada en derecho.
        </p>
      </section>

      <!-- Feature cards -->
      <section class="features-section">
        <div class="features-grid">

          <article class="feature-card">
            <div class="feature-icon-wrap icon-teal">
              <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#1fa8bb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M14 2v6h6"/>
                <path d="M8 13h8"/>
                <path d="M8 17h5"/>
              </svg>
            </div>
            <h3 class="feature-title">Análisis de PDF</h3>
            <p class="feature-description">Extrae información clave de contratos y documentos legales automáticamente.</p>
          </article>

          <article class="feature-card">
            <div class="feature-icon-wrap icon-pink">
              <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#e0508f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                <path d="M8 9h8"/>
                <path d="M8 13h5"/>
              </svg>
            </div>
            <h3 class="feature-title">Consultas Legales</h3>
            <p class="feature-description">Obtén respuestas precisas a tus preguntas jurídicas con IA especializada.</p>
          </article>

          <article class="feature-card">
            <div class="feature-icon-wrap icon-purple">
              <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#7c47e0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 7h18"/>
                <path d="M3 7l2-3h14l2 3"/>
                <path d="M5 7v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7"/>
                <path d="M9 12h6"/>
              </svg>
            </div>
            <h3 class="feature-title">Gestión de Contratos</h3>
            <p class="feature-description">Organiza, analiza y administra todos tus contratos de manera eficiente.</p>
          </article>

        </div>
      </section>

      <!-- How it works -->
      <section class="steps-section">
        <div class="steps-header">
          <span class="steps-label">Cómo funciona</span>
          <h2 class="steps-title">Empieza en tres pasos</h2>
        </div>
        <div class="steps-grid">

          <div class="step-card">
            <div class="step-number step-1">1</div>
            <h3 class="step-title">Crea tu cuenta</h3>
            <p class="step-description">Regístrate gratis en segundos y accede a todas las herramientas.</p>
          </div>

          <div class="step-card">
            <div class="step-number step-2">2</div>
            <h3 class="step-title">Sube o consulta</h3>
            <p class="step-description">Carga un contrato en PDF o haz tu pregunta legal directamente a la IA.</p>
          </div>

          <div class="step-card">
            <div class="step-number step-3">3</div>
            <h3 class="step-title">Obtén resultados</h3>
            <p class="step-description">Recibe análisis, resúmenes, riesgos y respuestas claras al instante.</p>
          </div>

        </div>
      </section>

    </main>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="footer-brand">
        <img src="../assets/logo.svg" alt="" class="footer-logo-img" />
        <span class="footer-logo-text">LEXIT AI</span>
      </div>
      <p class="footer-copy">© 2026 LEXIT AI. Todos los derechos reservados.</p>
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

gsap.registerPlugin(ScrollTrigger)

const router = useRouter()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

const pageRoot = ref<HTMLElement | null>(null)

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

let handleMouseMove: ((e: MouseEvent) => void) | null = null
const scrollTriggers: ScrollTrigger[] = []

onMounted(() => {
  if (isAuthenticated.value) {
    void router.replace('/app/consultas')
    return
  }

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

  // --- Fondo reactivo al mouse (blob-wrap) y Scroll Parallax (blob inner) ---
  const wraps = root.querySelectorAll<HTMLElement>('.blob-wrap')
  const depths = [18, 26, 14]

  const quickBlobs = Array.from(wraps).map((el) => ({
    x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3.out' }),
    y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3.out' }),
  }))

  handleMouseMove = (e: MouseEvent) => {
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    const nx = (e.clientX - cx) / cx
    const ny = (e.clientY - cy) / cy

    quickBlobs.forEach((q, i) => {
      const depth = depths[i] ?? 16
      q.x(nx * depth)
      q.y(ny * depth)
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
})

onUnmounted(() => {
  if (handleMouseMove) window.removeEventListener('mousemove', handleMouseMove)
  scrollTriggers.forEach((st) => st.kill())
})
</script>

<!-- --------------------------------------------------- -->

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Figtree:wght@400;500;600;700&display=swap');

/* ==============================
   Base
   ============================== */
.landing-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
  background: #FAFAF7;
  color: #1b1b1e;
  font-family: 'Figtree', -apple-system, BlinkMacSystemFont, sans-serif;
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

.blob-1 {
  background: radial-gradient(circle at 30% 30%, rgba(57, 199, 216, 0.28), transparent 70%);
}

.blob-2 {
  background: radial-gradient(circle at 40% 40%, rgba(255, 100, 176, 0.20), transparent 70%);
}

.blob-3 {
  background: radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.18), transparent 70%);
}

@media (prefers-reduced-motion: no-preference) {
  .blob-1 { animation: blob 14s ease-in-out infinite; }
  .blob-2 { animation: blob 18s ease-in-out infinite; }
  .blob-3 { animation: blob 16s ease-in-out infinite; }
}

/* ==============================
   Header
   ============================== */
.landing-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(250, 250, 247, 0.82);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(27, 27, 30, 0.07);
}

.header-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 14px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 11px;
}

.header-logo-img {
  height: 34px;
  width: 34px;
}

.header-logo-text {
  font-family: 'EB Garamond', serif;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: #1b1b1e;
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
   Hero
   ============================== */
.hero-section {
  max-width: 820px;
  margin: 0 auto;
  padding: 90px 28px 20px;
  text-align: center;
}

.hero-logo {
  height: 78px;
  width: 78px;
  display: block;
  margin: 0 auto 22px;
  filter: drop-shadow(0 8px 22px rgba(139, 92, 246, 0.22));
}

.hero-title {
  font-family: 'EB Garamond', serif;
  font-size: 4rem;
  line-height: 1.02;
  font-weight: 600;
  margin: 0 0 14px;
  letter-spacing: -0.01em;
  background: linear-gradient(135deg, #16161a 0%, #3a3a44 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-family: 'EB Garamond', serif;
  font-style: italic;
  font-size: 1.35rem;
  color: #6a6a72;
  margin: 0 0 40px;
}

.hero-heading {
  font-family: 'EB Garamond', serif;
  font-size: 2.3rem;
  font-weight: 600;
  margin: 0 0 16px;
  color: #16161a;
}

.hero-description {
  font-size: 1.12rem;
  line-height: 1.65;
  color: #55555c;
  max-width: 600px;
  margin: 0 auto;
}

/* ==============================
   Feature cards
   ============================== */
.features-section {
  max-width: 1080px;
  margin: 0 auto;
  padding: 54px 28px 20px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 22px;
}

.feature-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  padding: 30px 26px;
  box-shadow: 0 4px 12px rgba(27, 27, 30, 0.02);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  border-color: rgba(255, 255, 255, 1);
}

.feature-card:nth-child(1):hover {
  box-shadow: 0 16px 40px rgba(57, 199, 216, 0.25);
}
.feature-card:nth-child(2):hover {
  box-shadow: 0 16px 40px rgba(255, 100, 176, 0.22);
}
.feature-card:nth-child(3):hover {
  box-shadow: 0 16px 40px rgba(139, 92, 246, 0.22);
}

.feature-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.icon-teal   { background: rgba(57, 199, 216, 0.14); }
.icon-pink   { background: rgba(255, 100, 176, 0.13); }
.icon-purple { background: rgba(139, 92, 246, 0.13); }

.feature-title {
  font-family: 'EB Garamond', serif;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 9px;
  color: #16161a;
}

.feature-description {
  font-size: 1rem;
  line-height: 1.6;
  color: #5c5c63;
  margin: 0;
}

/* ==============================
   Steps / How it works
   ============================== */
.steps-section {
  max-width: 1080px;
  margin: 0 auto;
  padding: 70px 28px 40px;
}

.steps-header {
  text-align: center;
  margin-bottom: 46px;
}

.steps-label {
  display: inline-block;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #8b5cf6;
  margin-bottom: 12px;
}

.steps-title {
  font-family: 'EB Garamond', serif;
  font-size: 2.3rem;
  font-weight: 600;
  margin: 0;
  color: #16161a;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.step-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  padding: 30px 26px;
  box-shadow: 0 4px 12px rgba(27, 27, 30, 0.02);
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'EB Garamond', serif;
  font-size: 1.35rem;
  font-weight: 600;
  margin-bottom: 18px;
}

.step-1 { background: linear-gradient(135deg, #39c7d8 0%, #29a0af 100%); box-shadow: 0 4px 12px rgba(57, 199, 216, 0.3); }
.step-2 { background: linear-gradient(135deg, #ff64b0 0%, #e04a92 100%); box-shadow: 0 4px 12px rgba(255, 100, 176, 0.3); }
.step-3 { background: linear-gradient(135deg, #8b5cf6 0%, #6d42d3 100%); box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3); }

.step-title {
  font-family: 'EB Garamond', serif;
  font-size: 1.35rem;
  font-weight: 600;
  margin: 0 0 8px;
  color: #16161a;
}

.step-description {
  font-size: 0.98rem;
  line-height: 1.6;
  color: #5c5c63;
  margin: 0;
}

/* ==============================
   Footer
   ============================== */
.landing-footer {
  border-top: 1px solid rgba(27, 27, 30, 0.07);
  padding: 26px 28px;
  text-align: center;
  position: relative;
  z-index: 1;
}

.footer-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-bottom: 8px;
}

.footer-logo-img {
  height: 22px;
  width: 22px;
}

.footer-logo-text {
  font-family: 'EB Garamond', serif;
  font-size: 1.05rem;
  font-weight: 600;
  color: #3a3a40;
}

.footer-copy {
  font-size: 0.85rem;
  color: #9a9aa2;
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

  .hero-section {
    padding: 70px 20px 20px;
  }

  .hero-title {
    font-size: 3rem;
  }

  .hero-heading {
    font-size: 1.75rem;
  }

  .features-section,
  .steps-section {
    padding-left: 16px;
    padding-right: 16px;
  }

  .features-grid,
  .steps-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .hero-logo {
    height: 60px;
    width: 60px;
  }

  .hero-subtitle {
    font-size: 1.1rem;
  }
}
</style>