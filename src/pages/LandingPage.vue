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
          <span class="header-logo-text">LEXIT</span>
        </div>
        <nav class="header-nav">
          <a href="#producto" class="header-nav-link" @click.prevent="scrollToSection('producto')">Producto</a>
          <a href="#como-funciona" class="header-nav-link" @click.prevent="scrollToSection('como-funciona')">C├│mo funciona</a>
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
          <span class="hero-badge">IA jur├¡dica especializada en derecho peruano</span>

          <h1 class="hero-title">
            Todo tu trabajo legal.<br />
            <em>Una sola plataforma.</em>
          </h1>

          <p class="hero-description">
            Resuelve consultas legales y analiza el riesgo de tus contratos por chat, completa
            plantillas de contratos conversando con la IA, y mantente al d├¡a con las normas de
            El Peruano ÔÇö de principio a fin, sin salir de LEXIT AI.
          </p>

          <p class="hero-caption">Hecho para abogados y estudios jur├¡dicos en Per├║</p>

          <!-- Vista previa ilustrativa del producto ÔÇö al hacer clic invita a
               iniciar sesi├│n/registrarse, no ejecuta ninguna consulta real. -->
          <button type="button" class="hero-mock" @click="abrirAuth">
            <div class="mock-window">
              <div class="mock-window-bar">
                <span class="mock-dot"></span>
                <span class="mock-dot"></span>
                <span class="mock-dot"></span>
                <span class="mock-window-title">Consultas ÔÇö LEXIT AI</span>
              </div>
              <div class="mock-chat">
                <div class="mock-bubble mock-bubble--user">
                  ┬┐Esta cl├íusula de resoluci├│n cumple el C├│digo Civil?
                </div>
                <div class="mock-bubble mock-bubble--ai">
                  <span class="mock-bubble-tag">Art├¡culo 1430┬░</span>
                  S├¡, siempre que la condici├│n resolutoria se pacte expresamente. Te muestro
                  la cita textual y c├│mo aplica a tu cl├íusulaÔÇª
                </div>
              </div>
              <div class="mock-cta">Inicia sesi├│n para probarlo ÔåÆ</div>
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
          <article class="feature-card reveal">
            <div class="feature-icon-wrap icon-teal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                <path d="M8 9h8"/>
                <path d="M8 13h5"/>
              </svg>
            </div>
            <h3 class="feature-title">Consultas Legales</h3>
            <p class="feature-description">Chatea con una IA especializada en derecho peruano ÔÇö o adjunta un contrato (PDF o Word) para un an├ílisis de riesgos cl├íusula por cl├íusula, con base legal citada.</p>
          </article>

          <article class="feature-card reveal">
            <div class="feature-icon-wrap icon-pink">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 7h18"/>
                <path d="M3 7l2-3h14l2 3"/>
                <path d="M5 7v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7"/>
                <path d="M9 12h6"/>
              </svg>
            </div>
            <h3 class="feature-title">Gesti├│n de Contratos</h3>
            <p class="feature-description">Elige una plantilla y compl├®tala conversando con la IA, o ed├¡tala t├║ mismo. Desc├írgala lista, con marca de agua, o sigue edit├índola en Word con el complemento de LEXIT.</p>
          </article>

          <article class="feature-card reveal">
            <div class="feature-icon-wrap icon-purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <h3 class="feature-title">Normas del D├¡a</h3>
            <p class="feature-description">Las normas publicadas en El Peruano, organizadas por sector, con un resumen diario generado por IA y lo m├ís relevante para tu pr├íctica.</p>
          </article>
        </div>
      </section>

      <!-- How it works -->
      <section class="steps-section" id="como-funciona">
        <div class="section-header reveal">
          <span class="section-label">C├│mo funciona</span>
          <h2 class="section-title">Empieza en tres pasos</h2>
        </div>

        <div class="steps-grid">

          <div class="step-card reveal">
            <div class="step-number">01</div>
            <h3 class="step-title">Crea tu cuenta</h3>
            <p class="step-description">Reg├¡strate gratis en segundos y accede a todas las herramientas.</p>
          </div>

          <div class="step-card reveal">
            <div class="step-number">02</div>
            <h3 class="step-title">Elige tu herramienta</h3>
            <p class="step-description">Haz una consulta, adjunta un contrato para analizarlo, o completa una plantilla con ayuda de la IA.</p>
          </div>

          <div class="step-card reveal">
            <div class="step-number">03</div>
            <h3 class="step-title">Obt├®n resultados</h3>
            <p class="step-description">Recibe respuestas, an├ílisis de riesgos y contratos listos para descargar o editar en Word.</p>
          </div>

        </div>
      </section>

    </main>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span class="footer-logo-text">LEXIT</span>
        </div>
        <p class="footer-copy">┬® 2026 LEXIT AI. Todos los derechos reservados.</p>
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

gsap.registerPlugin(ScrollTrigger)

const router = useRouter()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

const pageRoot = ref<HTMLElement | null>(null)
const authButtonsRef = ref<InstanceType<typeof AuthButtons> | null>(null)

function abrirAuth() {
  authButtonsRef.value?.abrirLogin()
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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

  // --- Entrada del hero: m├ís din├ímica (3D y elastic) ---
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

  // --- Feature cards: entrada el├ística ---
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

  // Scroll Parallax para los blobs (a├▒ade profundidad vertical al hacer scroll)
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
   - .blob-wrap: posici├│n en pantalla + lo mueve GSAP (mouse parallax)
   - .blob: animaci├│n org├ínica de CSS (scale + micro-drift)
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
  gap: 16px;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 11px;
  flex-shrink: 0;
}

.header-logo-text {
  font-family: 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 1.7rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #1b1b1e;
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
  color: #55555c;
  text-decoration: none;
  transition: color 0.18s;
}

.header-nav-link:hover {
  color: var(--accent);
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
   Hero ÔÇö secci├│n oscura y atmosf├®rica
   ============================== */
.hero-section {
  position: relative;
  overflow: hidden;
  background: linear-gradient(165deg, #14151c 0%, #1c2130 38%, #262a22 72%, #332a1c 100%);
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
  background: radial-gradient(circle, rgba(181, 80, 46, 0.55), transparent 70%);
}

.hero-glow--2 {
  width: 460px;
  height: 460px;
  bottom: -220px;
  right: -100px;
  background: radial-gradient(circle, rgba(223, 168, 97, 0.35), transparent 70%);
  animation-delay: -6s;
}

.hero-glow--3 {
  width: 380px;
  height: 380px;
  top: 30%;
  left: 55%;
  background: radial-gradient(circle, rgba(90, 110, 140, 0.35), transparent 70%);
  animation-delay: -3s;
}

.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(250, 250, 247, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(250, 250, 247, 0.05) 1px, transparent 1px);
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
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #C9D9F2;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-bottom: 24px;
}

.hero-title {
  font-family: 'Figtree', -apple-system, sans-serif;
  font-size: 3.6rem;
  line-height: 1.08;
  font-weight: 700;
  margin: 0 0 22px;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #FFFFFF 0%, #C9D9F2 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-title em {
  font-style: normal;
  background: linear-gradient(135deg, #7EA2F2 0%, #4B79D8 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-description {
  font-size: 1.14rem;
  line-height: 1.65;
  color: rgba(250, 250, 247, 0.72);
  max-width: 580px;
  margin: 0 auto 14px;
}

.hero-caption {
  font-size: 0.85rem;
  color: rgba(250, 250, 247, 0.45);
  margin: 0 0 48px;
}

/* Vista previa ilustrativa ÔÇö es un <button>: al hacer clic abre el login */
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

.mock-window {
  background: #FAFAF7;
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
  font-family: 'EB Garamond', serif;
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
  color: var(--accent);
  margin-bottom: 12px;
}

.section-title {
  font-family: 'EB Garamond', serif;
  font-size: 2.3rem;
  font-weight: 600;
  margin: 0;
  color: #16161a;
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
  margin-bottom: 22px;
  background: var(--accent-soft);
  color: var(--accent);
  transition: background 0.25s, color 0.25s, transform 0.25s;
}

.icon-teal   { background: rgba(57, 199, 216, 0.14); }
.icon-pink   { background: rgba(255, 100, 176, 0.13); }
.icon-purple { background: rgba(139, 92, 246, 0.13); }

.feature-title {
  font-family: 'EB Garamond', serif;
  font-size: 1.45rem;
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
  font-size: 2.6rem;
  font-weight: 600;
  line-height: 1;
  color: var(--accent-soft-strong);
  margin-bottom: 14px;
  transition: color 0.25s;
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
  font-family: 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: -0.01em;
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

  .features-grid,
  .steps-grid {
    grid-template-columns: 1fr;
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
