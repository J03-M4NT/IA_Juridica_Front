<template>
  <div class="landing-page">

    <!-- Header -->
    <header class="landing-header">
      <div class="header-inner">
        <div class="header-logo">
          <span class="header-logo-text">LEXIT</span>
        </div>
        <nav class="header-nav">
          <a href="#producto" class="header-nav-link" @click.prevent="scrollToSection('producto')">Producto</a>
          <a href="#como-funciona" class="header-nav-link" @click.prevent="scrollToSection('como-funciona')">Cómo funciona</a>
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
            Todo tu trabajo legal.<br />
            <em>Una sola plataforma.</em>
          </h1>

          <p class="hero-description">
            Analiza contratos, resuelve consultas legales y gestiona documentos con una
            inteligencia artificial entrenada en derecho peruano — de principio a fin, sin
            salir de LEXIT AI.
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
                <span class="mock-window-title">Consultas — LEXIT AI</span>
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

          <article class="feature-card reveal">
            <div class="feature-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M14 2v6h6"/>
                <path d="M8 13h8"/>
                <path d="M8 17h5"/>
              </svg>
            </div>
            <h3 class="feature-title">Análisis de PDF</h3>
            <p class="feature-description">Extrae información clave de contratos y documentos legales automáticamente.</p>
          </article>

          <article class="feature-card reveal">
            <div class="feature-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                <path d="M8 9h8"/>
                <path d="M8 13h5"/>
              </svg>
            </div>
            <h3 class="feature-title">Consultas Legales</h3>
            <p class="feature-description">Obtén respuestas precisas a tus preguntas jurídicas con IA especializada.</p>
          </article>

          <article class="feature-card reveal">
            <div class="feature-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
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
      <section class="steps-section" id="como-funciona">
        <div class="section-header reveal">
          <span class="section-label">Cómo funciona</span>
          <h2 class="section-title">Empieza en tres pasos</h2>
        </div>

        <div class="steps-grid">

          <div class="step-card reveal">
            <div class="step-number">01</div>
            <h3 class="step-title">Crea tu cuenta</h3>
            <p class="step-description">Regístrate gratis en segundos y accede a todas las herramientas.</p>
          </div>

          <div class="step-card reveal">
            <div class="step-number">02</div>
            <h3 class="step-title">Sube o consulta</h3>
            <p class="step-description">Carga un contrato en PDF o haz tu pregunta legal directamente a la IA.</p>
          </div>

          <div class="step-card reveal">
            <div class="step-number">03</div>
            <h3 class="step-title">Obtén resultados</h3>
            <p class="step-description">Recibe análisis, resúmenes, riesgos y respuestas claras al instante.</p>
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
        <p class="footer-copy">© 2026 LEXIT AI. Todos los derechos reservados.</p>
      </div>
    </footer>

  </div>
</template>

<!-- --------------------------------------------------- -->

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'
import AuthButtons from '../components/Auth/AuthButtons.vue'

const router = useRouter()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

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
    { threshold: 0.15 }
  )

  document.querySelectorAll('.reveal').forEach((el) => observer?.observe(el))
})

onUnmounted(() => {
  observer?.disconnect()
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

@keyframes floatUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
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
  transform: translateY(28px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}

.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.features-grid .feature-card.reveal { transition-delay: 0.05s; }
.features-grid .feature-card.reveal:nth-child(2) { transition-delay: 0.15s; }
.features-grid .feature-card.reveal:nth-child(3) { transition-delay: 0.25s; }

.steps-grid .step-card.reveal { transition-delay: 0.05s; }
.steps-grid .step-card.reveal:nth-child(2) { transition-delay: 0.15s; }
.steps-grid .step-card.reveal:nth-child(3) { transition-delay: 0.25s; }

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
   Hero — sección oscura y atmosférica
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

.hero-badge {
  display: inline-block;
  padding: 7px 16px;
  border-radius: 999px;
  border: 1px solid rgba(250, 250, 247, 0.18);
  background: rgba(250, 250, 247, 0.06);
  backdrop-filter: blur(6px);
  font-size: 0.82rem;
  font-weight: 500;
  color: rgba(250, 250, 247, 0.85);
  margin-bottom: 26px;
}

.hero-title {
  font-family: 'EB Garamond', serif;
  font-size: 3.6rem;
  line-height: 1.08;
  font-weight: 600;
  margin: 0 0 22px;
  letter-spacing: -0.01em;
  color: #FAFAF7;
}

.hero-title em {
  font-style: italic;
  color: #e8b381;
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
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.09);
  border-radius: 16px;
  padding: 32px 28px;
  cursor: default;
  transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
}

.feature-card:hover {
  transform: translateY(-6px);
  border-color: var(--accent);
  box-shadow: 0 20px 42px rgba(27, 27, 30, 0.1);
}

.feature-card:active {
  transform: translateY(-2px) scale(0.99);
}

.feature-icon-wrap {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 22px;
  background: var(--accent-soft);
  color: var(--accent);
  transition: background 0.25s, color 0.25s, transform 0.25s;
}

.feature-card:hover .feature-icon-wrap {
  background: var(--accent);
  color: #fff;
  transform: scale(1.06);
}

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
  padding: 60px 28px 60px;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.step-card {
  position: relative;
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.09);
  border-radius: 16px;
  padding: 32px 28px;
  overflow: hidden;
  cursor: default;
  transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
}

.step-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
}

.step-card:hover {
  transform: translateY(-6px);
  border-color: var(--accent);
  box-shadow: 0 20px 42px rgba(27, 27, 30, 0.1);
}

.step-card:hover::before {
  transform: scaleX(1);
}

.step-card:active {
  transform: translateY(-2px) scale(0.99);
}

.step-number {
  font-family: 'EB Garamond', serif;
  font-size: 2.6rem;
  font-weight: 600;
  line-height: 1;
  color: var(--accent-soft-strong);
  margin-bottom: 14px;
  transition: color 0.25s;
}

.step-card:hover .step-number {
  color: var(--accent);
}

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
