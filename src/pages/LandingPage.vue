<template>
  <div class="landing-page" ref="pageRoot">

    <div class="scroll-progress" ref="progresoRef" aria-hidden="true"></div>

    <!-- Header: transparente sobre el hero oscuro; al bajar se vuelve claro. -->
    <header class="landing-header" :class="{ 'landing-header--solido': headerSolido }">
      <div class="header-inner">
        <button type="button" class="header-logo" @click="scrollToSection('inicio')">LexIT</button>
        <nav class="header-nav" aria-label="Secciones">
          <a
            v-for="item in NAV"
            :key="item.id"
            :href="`#${item.id}`"
            class="header-nav-link"
            :class="{ 'header-nav-link--activo': seccionActiva === item.id }"
            :aria-current="seccionActiva === item.id ? 'true' : undefined"
            @click.prevent="scrollToSection(item.id)"
          >{{ item.etiqueta }}</a>
        </nav>
        <auth-buttons ref="authButtonsRef" />
      </div>
    </header>

    <main class="main-content">

      <!-- ============ HERO (verde bosque) ============ -->
      <section class="hero" id="inicio" ref="heroRef" @pointermove="moverFoco">
        <div class="hero-fondo" aria-hidden="true">
          <span class="hero-foco"></span>
          <span class="hero-rejilla"></span>
          <span class="hero-grano"></span>
        </div>

        <div class="hero-inner">
          <div class="hero-texto">
            <span class="hero-badge">
              <span class="hero-badge-punto"></span>
              IA jurídica especializada en derecho peruano
            </span>

            <h1 class="hero-title">
              El derecho peruano,<br />
              <em>al alcance de tu práctica.</em>
            </h1>

            <p class="hero-description">
              Consultas con la cita textual del artículo, análisis de riesgos de tus contratos,
              plantillas que se completan conversando y las normas de El Peruano resumidas cada día.
            </p>

            <div class="hero-acciones">
              <button type="button" class="btn btn--primario" @click="abrirRegistro">
                Crear cuenta gratis
                <span class="btn-flecha" aria-hidden="true">→</span>
              </button>
              <button type="button" class="btn btn--contorno" @click="scrollToSection('producto')">
                Ver la plataforma
              </button>
            </div>

            <p class="hero-caption">Hecho para abogados, estudios jurídicos y estudiantes de derecho en Perú</p>
          </div>

          <!-- Demo del producto: pestañas reales (cambia el contenido). Al
               hacer clic en la ventana invita a iniciar sesión. -->
          <div
            class="demo"
            @pointerenter="demoPausada = true"
            @pointerleave="demoPausada = false"
            @focusin="demoPausada = true"
            @focusout="demoPausada = false"
          >
            <div class="demo-tabs" role="tablist" aria-label="Vista previa de LexIT">
              <button
                v-for="(tab, i) in DEMO_TABS"
                :id="`demo-tab-${i}`"
                :key="tab.id"
                type="button"
                role="tab"
                class="demo-tab"
                :class="{ 'demo-tab--activa': demoActiva === i }"
                :aria-selected="demoActiva === i"
                :aria-controls="`demo-panel-${i}`"
                :tabindex="demoActiva === i ? 0 : -1"
                @click="elegirDemo(i)"
                @keydown.right.prevent="elegirDemo((i + 1) % DEMO_TABS.length, true)"
                @keydown.left.prevent="elegirDemo((i + DEMO_TABS.length - 1) % DEMO_TABS.length, true)"
              >{{ tab.etiqueta }}</button>
              <span class="demo-tabs-progreso" :style="{ '--i': demoActiva }" aria-hidden="true">
                <span :key="demoActiva" class="demo-tabs-progreso-relleno" :class="{ 'demo-tabs-progreso-relleno--pausa': demoPausada }"></span>
              </span>
            </div>

            <button type="button" class="demo-ventana" aria-label="Inicia sesión para probar LexIT" @click="abrirAuth">
              <span class="demo-barra">
                <span class="demo-punto"></span><span class="demo-punto"></span><span class="demo-punto"></span>
                <span class="demo-barra-titulo">{{ DEMO_TABS[demoActiva]!.titulo }}</span>
              </span>

              <Transition name="demo" mode="out-in">
                <!-- Consultas -->
                <span v-if="demoActiva === 0" id="demo-panel-0" key="c" class="demo-panel" role="tabpanel" aria-labelledby="demo-tab-0">
                  <span class="demo-chip-esp">Derecho Civil</span>
                  <span class="demo-msg demo-msg--user">¿Qué requisitos de validez tiene el acto jurídico?</span>
                  <span class="demo-msg demo-msg--ia">
                    <span class="demo-msg-autor">LexIT</span>
                    {{ textoEscrito }}<span v-if="escribiendo" class="demo-cursor" aria-hidden="true"></span>
                    <span v-if="!escribiendo" class="demo-cita">Código Civil · Art. 140°</span>
                  </span>
                </span>

                <!-- Análisis de contratos -->
                <span v-else-if="demoActiva === 1" id="demo-panel-1" key="a" class="demo-panel demo-panel--analisis" role="tabpanel" aria-labelledby="demo-tab-1">
                  <span class="demo-doc">
                    <span class="demo-linea demo-linea--titulo"></span>
                    <span class="demo-linea"></span>
                    <span class="demo-linea demo-linea--marca demo-linea--alto"></span>
                    <span class="demo-linea"></span>
                    <span class="demo-linea demo-linea--corta"></span>
                    <span class="demo-linea demo-linea--marca demo-linea--medio"></span>
                    <span class="demo-linea"></span>
                    <span class="demo-linea demo-linea--marca demo-linea--bajo"></span>
                    <span class="demo-linea demo-linea--corta"></span>
                  </span>
                  <span class="demo-riesgos">
                    <span class="demo-riesgo"><b class="demo-riesgo-n demo-riesgo-n--alto">2</b>Alto</span>
                    <span class="demo-riesgo"><b class="demo-riesgo-n demo-riesgo-n--medio">3</b>Medio</span>
                    <span class="demo-riesgo"><b class="demo-riesgo-n demo-riesgo-n--bajo">1</b>Bajo</span>
                    <span class="demo-observacion">Cláusula de penalidad sin tope: <em>Ver observación</em></span>
                  </span>
                </span>

                <!-- Contratos -->
                <span v-else-if="demoActiva === 2" id="demo-panel-2" key="t" class="demo-panel" role="tabpanel" aria-labelledby="demo-tab-2">
                  <span class="demo-msg demo-msg--ia">
                    <span class="demo-msg-autor">LexIT</span>
                    ¿Qué tipo de contrato necesitas?
                  </span>
                  <span class="demo-msg demo-msg--user">Quiero alquilar mi departamento</span>
                  <span class="demo-plantilla">
                    <span class="demo-plantilla-icono" aria-hidden="true">§</span>
                    <span class="demo-plantilla-texto"><b>Contrato de Arrendamiento</b>Plantilla en Word, lista para completar</span>
                    <span class="demo-plantilla-accion">Usar →</span>
                  </span>
                </span>

                <!-- Normas -->
                <span v-else id="demo-panel-3" key="n" class="demo-panel" role="tabpanel" aria-labelledby="demo-tab-3">
                  <span class="demo-resumen"><b>Resumen del día con IA</b>Tres normas de impacto en materia tributaria y laboral publicadas hoy.</span>
                  <span class="demo-norma"><span class="demo-sector">Economía</span>Decreto Supremo que modifica el Reglamento…</span>
                  <span class="demo-norma"><span class="demo-sector">Trabajo</span>Resolución Ministerial sobre jornada…</span>
                  <span class="demo-norma"><span class="demo-sector">Justicia</span>Ley que precisa plazos procesales…</span>
                </span>
              </Transition>

              <span class="demo-cta">Inicia sesión para probarlo <span aria-hidden="true">→</span></span>
            </button>
          </div>
        </div>
      </section>

      <!-- ============ BASE JURÍDICA (marfil): cifras + cinta de normas ============ -->
      <section class="base" aria-label="Base jurídica">
        <div class="base-cifras">
          <div v-for="cifra in CIFRAS" :key="cifra.etiqueta" class="cifra reveal">
            <span class="cifra-numero">
              <span class="cifra-valor" :data-hasta="cifra.valor">{{ cifra.prefijo }}{{ cifra.valor.toLocaleString('es-PE') }}</span>
            </span>
            <span class="cifra-etiqueta">{{ cifra.etiqueta }}</span>
          </div>
        </div>

        <div class="cinta" aria-label="Normas indexadas en la base jurídica">
          <div class="cinta-pista">
            <template v-for="vuelta in 2" :key="vuelta">
              <span v-for="norma in NORMAS_CINTA" :key="`${vuelta}-${norma}`" class="cinta-item" :aria-hidden="vuelta === 2 ? 'true' : undefined">
                <span class="cinta-sep" aria-hidden="true">§</span>{{ norma }}
              </span>
            </template>
          </div>
        </div>
      </section>

      <!-- ============ PRODUCTO (blanco cálido) ============ -->
      <section class="producto" id="producto">
        <div class="section-header reveal">
          <span class="section-label">Producto</span>
          <h2 class="section-title">Una plataforma, <em>cuatro herramientas</em></h2>
          <p class="section-subtitle">Todo el trabajo jurídico del día, sin cambiar de pantalla.</p>
        </div>

        <div class="producto-grid">
          <div class="producto-lista" role="tablist" aria-label="Herramientas de LexIT" aria-orientation="vertical">
            <button
              v-for="(h, i) in HERRAMIENTAS"
              :id="`herr-tab-${i}`"
              :key="h.id"
              type="button"
              role="tab"
              class="herr"
              :class="{ 'herr--activa': herramientaActiva === i }"
              :aria-selected="herramientaActiva === i"
              :aria-controls="`herr-panel-${i}`"
              :tabindex="herramientaActiva === i ? 0 : -1"
              @click="herramientaActiva = i"
              @mouseenter="herramientaActiva = i"
              @keydown.down.prevent="moverHerramienta(i, 1)"
              @keydown.up.prevent="moverHerramienta(i, -1)"
            >
              <span class="herr-num">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="herr-texto">
                <span class="herr-titulo">{{ h.titulo }}</span>
                <span class="herr-desc">{{ h.descripcion }}</span>
              </span>
            </button>
          </div>

          <div
            :id="`herr-panel-${herramientaActiva}`"
            class="producto-vista reveal"
            role="tabpanel"
            :aria-labelledby="`herr-tab-${herramientaActiva}`"
            :data-tono="HERRAMIENTAS[herramientaActiva]!.tono"
          >
            <Transition name="vista" mode="out-in">
              <div :key="herramientaActiva" class="vista">
                <span class="vista-etiqueta">{{ HERRAMIENTAS[herramientaActiva]!.etiqueta }}</span>
                <p class="vista-frase">{{ HERRAMIENTAS[herramientaActiva]!.frase }}</p>
                <ul class="vista-puntos">
                  <li v-for="p in HERRAMIENTAS[herramientaActiva]!.puntos" :key="p">{{ p }}</li>
                </ul>
              </div>
            </Transition>
          </div>
        </div>
      </section>

      <!-- ============ ESPECIALIZACIONES (oliva oscuro) ============ -->
      <section class="especialidades" id="especializaciones">
        <div class="section-header reveal">
          <span class="section-label">Especializaciones</span>
          <h2 class="section-title">Respuestas dentro de <em>tu rama del derecho</em></h2>
          <p class="section-subtitle">
            Elige una especialización en el chat y LexIT busca solo en sus normas — con la cita
            textual del artículo, no un resumen genérico.
          </p>
        </div>

        <div class="esp-grid">
          <article
            v-for="(esp, i) in ESPECIALIDADES_LANDING"
            :key="esp.id"
            class="esp reveal"
            :class="`esp--${esp.tono}`"
          >
            <div class="esp-cabecera">
              <span class="esp-num">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="esp-icono" aria-hidden="true">§</span>
            </div>
            <h3 class="esp-titulo">{{ esp.titulo }}</h3>
            <p class="esp-desc">{{ esp.descripcion }}</p>
            <ul class="esp-normas" :aria-label="`Normas de ${esp.titulo}`">
              <li v-for="n in esp.normas" :key="n">{{ n }}</li>
            </ul>
            <button type="button" class="esp-cta" @click="abrirRegistro">
              Consultar en {{ esp.titulo }} <span aria-hidden="true">→</span>
            </button>
          </article>
        </div>
      </section>

      <!-- ============ CÓMO FUNCIONA (marfil) ============ -->
      <section class="pasos" id="como-funciona">
        <div class="section-header reveal">
          <span class="section-label">Cómo funciona</span>
          <h2 class="section-title">Empieza en <em>tres pasos</em></h2>
        </div>

        <div class="pasos-linea" ref="pasosRef">
          <span class="pasos-linea-base" aria-hidden="true"></span>
          <span class="pasos-linea-relleno" aria-hidden="true" :style="{ transform: `scaleX(${progresoPasos})` }"></span>
          <ol class="pasos-grid">
            <li v-for="(paso, i) in PASOS" :key="paso.titulo" class="paso" :class="{ 'paso--hecho': progresoPasos >= i / (PASOS.length - 1) - 0.01 }">
              <span class="paso-punto" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
              <h3 class="paso-titulo">{{ paso.titulo }}</h3>
              <p class="paso-desc">{{ paso.descripcion }}</p>
            </li>
          </ol>
        </div>
      </section>

      <!-- ============ NOSOTROS ============ -->
      <section class="nosotros" id="nosotros">
        <div class="section-header reveal">
          <span class="section-label">Nosotros</span>
          <h2 class="section-title">Quiénes están <em>detrás de LexIT</em></h2>
          <p class="section-subtitle">
            LexIT nace para poner una IA jurídica entrenada en derecho peruano al alcance de
            cualquier abogado o estudio, sin perder el rigor de citar la norma exacta.
          </p>
        </div>

        <div class="proposito reveal">
          <div class="proposito-texto">
            <span class="proposito-comilla" aria-hidden="true">“</span>
            <p class="proposito-quote">
              LexIT nace para hacer el derecho más comprensible y fácil de consultar, tanto
              para quienes no son abogados como para quienes lo ejercen a diario.
            </p>
            <span class="proposito-label">Propósito</span>
            <p class="proposito-valores">
              <span>Confianza</span><span>Certeza</span><span>Utilidad</span>
            </p>
          </div>
          <div class="proposito-imagen">
            <img :src="imagenProposito" alt="" class="parallax-img" />
          </div>
        </div>
      </section>

      <!-- Misión y visión: banda oscura a todo el ancho -->
      <section class="mv" aria-label="Misión y visión">
        <div class="mv-inner">
          <div class="mv-imagen reveal">
            <img :src="imagenMisionVision" alt="" class="parallax-img" />
          </div>
          <div class="mv-bloques">
            <div class="mv-bloque reveal">
              <span class="mv-label">Misión</span>
              <p class="mv-texto">
                Facilitar el acceso a información jurídica clara mediante una herramienta de
                inteligencia artificial, para que personas, abogados y practicantes puedan
                consultar y trabajar con mayor seguridad.
              </p>
            </div>
            <div class="mv-bloque reveal">
              <span class="mv-label">Visión</span>
              <p class="mv-texto">
                Ser una herramienta presente en el trabajo diario de estudiantes, practicantes y
                abogados, y una primera puerta de entrada al derecho para quienes no lo son.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="equipo" aria-label="Equipo">
        <h3 class="equipo-subtitulo reveal">Dirección</h3>
        <div class="direccion-grid">
          <article v-for="p in DIRECCION" :key="p.nombre" class="persona reveal">
            <div class="persona-foto">
              <img :src="p.foto" :alt="p.nombre" />
            </div>
            <div class="persona-info">
              <h4 class="persona-nombre">{{ p.nombre }}</h4>
              <p class="persona-cargo">{{ p.cargo }}</p>
              <p class="persona-area">{{ p.area }}</p>
            </div>
          </article>
        </div>

        <h3 class="equipo-subtitulo reveal">Equipo</h3>
        <div class="equipo-grid">
          <article v-for="m in EQUIPO" :key="m.nombre" class="miembro reveal">
            <div class="miembro-foto">
              <img :src="m.foto" :alt="m.nombre" />
            </div>
            <h4 class="miembro-nombre">{{ m.nombre }}</h4>
            <p class="miembro-area">{{ m.area }}</p>
          </article>
        </div>
      </section>

      <!-- ============ CTA FINAL (verde bosque) ============ -->
      <section class="cta" aria-label="Empieza ahora">
        <div class="cta-inner reveal">
          <h2 class="cta-titulo">Trabaja con la norma exacta, <em>desde hoy.</em></h2>
          <p class="cta-texto">Crea tu cuenta gratis y haz tu primera consulta en menos de un minuto.</p>
          <div class="hero-acciones">
            <button type="button" class="btn btn--primario" @click="abrirRegistro">
              Crear cuenta gratis <span class="btn-flecha" aria-hidden="true">→</span>
            </button>
            <button type="button" class="btn btn--contorno" @click="abrirAuth">Ya tengo cuenta</button>
          </div>
        </div>
      </section>

    </main>

    <footer class="landing-footer">
      <div class="footer-inner">
        <div class="footer-marca">
          <span class="footer-logo">LexIT</span>
          <p class="footer-lema">IA jurídica especializada en derecho peruano.</p>
        </div>
        <nav class="footer-nav" aria-label="Pie de página">
          <a v-for="item in NAV" :key="item.id" :href="`#${item.id}`" @click.prevent="scrollToSection(item.id)">{{ item.etiqueta }}</a>
          <a :href="URL_TERMINOS" target="_blank" rel="noopener">Términos y condiciones</a>
          <a href="mailto:lexitiajuridica@gmail.com">lexitiajuridica@gmail.com</a>
        </nav>
      </div>
      <p class="footer-copy">© 2026 LexIT AI. Todos los derechos reservados. Las respuestas son orientativas y no sustituyen la asesoría de un abogado.</p>
    </footer>

  </div>
</template>

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
const heroRef = ref<HTMLElement | null>(null)
const progresoRef = ref<HTMLElement | null>(null)
const pasosRef = ref<HTMLElement | null>(null)
const authButtonsRef = ref<InstanceType<typeof AuthButtons> | null>(null)

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const URL_TERMINOS = `${import.meta.env.BASE_URL}terminos-y-condiciones.pdf`

// =========================
// CONTENIDO
// =========================
const NAV = [
  { id: 'producto', etiqueta: 'Producto' },
  { id: 'especializaciones', etiqueta: 'Especializaciones' },
  { id: 'como-funciona', etiqueta: 'Cómo funciona' },
  { id: 'nosotros', etiqueta: 'Nosotros' }
]

const DEMO_TABS = [
  { id: 'consultas', etiqueta: 'Consultas', titulo: 'Consultas — LexIT' },
  { id: 'analisis', etiqueta: 'Análisis', titulo: 'Análisis de contratos — LexIT' },
  { id: 'contratos', etiqueta: 'Contratos', titulo: 'Gestión de contratos — LexIT' },
  { id: 'normas', etiqueta: 'Normas', titulo: 'Normas del día — LexIT' }
]

const RESPUESTA_DEMO = 'Según el artículo 140° del Código Civil, el acto jurídico requiere: agente capaz, objeto física y jurídicamente posible, fin lícito y observancia de la forma prescrita bajo sanción de nulidad.'

// Solo normas que existen en la base jurídica (no cifras ni nombres inventados).
const CIFRAS = [
  { valor: 4, prefijo: '', etiqueta: 'especializaciones del derecho' },
  { valor: 3700, prefijo: '+', etiqueta: 'artículos citables, uno por uno' },
  { valor: 365, prefijo: '', etiqueta: 'resúmenes al año de El Peruano' }
]

const NORMAS_CINTA = [
  'Constitución Política del Perú', 'Código Civil', 'Código Penal', 'Código Procesal Civil',
  'Código Procesal Penal', 'Ley de Conciliación', 'Código de Protección y Defensa del Consumidor',
  'Ley contra el Crimen Organizado', 'Ley de Delitos Informáticos', 'Ley de los Delitos Aduaneros'
]

const HERRAMIENTAS = [
  {
    id: 'consultas', tono: 'bosque', etiqueta: 'Consultas jurídicas',
    titulo: 'Consultas jurídicas',
    descripcion: 'Pregunta en lenguaje natural y recibe la respuesta con la cita textual del artículo.',
    frase: 'La norma exacta, no un resumen genérico.',
    puntos: ['Citas desplegables con el texto del artículo', 'Filtro por especialización: Penal, Civil, Tributario, Comercial', 'Historial de conversaciones']
  },
  {
    id: 'analisis', tono: 'grisaceo', etiqueta: 'Análisis de contratos',
    titulo: 'Análisis de contratos',
    descripcion: 'Sube tu contrato en Word: la IA marca los riesgos cláusula por cláusula, con su base legal.',
    frase: 'Cada riesgo, en su lugar del documento.',
    puntos: ['Riesgos alto, medio y bajo con su explicación', '"Ver observación" te lleva a la cláusula exacta', 'Aplica los cambios y descarga el mismo Word']
  },
  {
    id: 'contratos', tono: 'oliva', etiqueta: 'Gestión de contratos',
    titulo: 'Gestión de contratos',
    descripcion: 'Dile qué necesitas y LexIT te ofrece la plantilla; complétala conversando o a mano.',
    frase: 'De la idea al contrato, sin perder el formato.',
    puntos: ['Asistente que encuentra la plantilla correcta', 'Completar con IA, dato por dato', 'Descarga en Word con el formato original']
  },
  {
    id: 'normas', tono: 'piedra', etiqueta: 'Normas del día',
    titulo: 'Normas del día',
    descripcion: 'Las normas publicadas en El Peruano, por sector, con un resumen diario hecho con IA.',
    frase: 'Al día con El Peruano, en minutos.',
    puntos: ['Resumen del día y lo más relevante para tu práctica', 'Resumen de cada norma a partir de su PDF oficial', 'Filtro por sector']
  }
]

const ESPECIALIDADES_LANDING = [
  {
    id: 'penal', tono: 'bosque', titulo: 'Derecho Penal',
    descripcion: 'Delitos, penas y proceso penal, con el artículo exacto.',
    normas: ['Código Penal', 'Código Procesal Penal', 'Ley contra el Crimen Organizado', 'Ley de Delitos Informáticos']
  },
  {
    id: 'civil', tono: 'grisaceo', titulo: 'Derecho Civil',
    descripcion: 'Contratos, obligaciones, familia y proceso civil.',
    normas: ['Código Civil', 'Código Procesal Civil', 'Ley de Conciliación', 'Código de Protección y Defensa del Consumidor']
  },
  {
    id: 'tributario', tono: 'oliva', titulo: 'Derecho Tributario',
    descripcion: 'Tributos, aduanas y régimen tributario constitucional.',
    normas: ['Ley de los Delitos Aduaneros', 'Constitución Política (régimen tributario)']
  },
  {
    id: 'comercial', tono: 'beige', titulo: 'Derecho Comercial',
    descripcion: 'Sociedades, mercado de valores, concursal y consumidor.',
    normas: ['Ley General de Sociedades', 'Ley del Mercado de Valores', 'Ley General del Sistema Concursal', 'Ley de Protección de Datos Personales']
  }
]

const PASOS = [
  { titulo: 'Crea tu cuenta', descripcion: 'Regístrate gratis en segundos y accede a todas las herramientas.' },
  { titulo: 'Elige tu herramienta', descripcion: 'Haz una consulta, sube un contrato para analizarlo o completa una plantilla con ayuda de la IA.' },
  { titulo: 'Obtén resultados', descripcion: 'Respuestas con la norma citada, análisis de riesgos y contratos listos para descargar en Word.' }
]

const DIRECCION = [
  { nombre: 'Alex Zegarra', cargo: 'Presidente', area: 'Derecho Corporativo', foto: fotoAlexZegarra },
  { nombre: 'Mijhail Medina', cargo: 'Vicepresidente', area: 'Ingeniería de Tecnologías de Información y Sistemas', foto: fotoMijhailMedina }
]

const EQUIPO = [
  { nombre: 'Joe Mantilla', area: 'Ingeniería de Tecnologías de Información y Sistemas', foto: fotoJoeMantilla },
  { nombre: 'Sandro Avila', area: 'Ingeniería de Tecnologías de Información y Sistemas', foto: fotoSandroAvila },
  { nombre: 'Irene Paye', area: 'Derecho Corporativo', foto: fotoDayanaCoello },
  { nombre: 'Dayana Coello', area: 'Derecho Corporativo', foto: fotoIrenePaye },
  { nombre: 'Tarish Gonzales', area: 'Derecho Corporativo', foto: fotoTarishGonzales }
]

// =========================
// AUTENTICACIÓN (los botones abren las ventanas de AuthButtons)
// =========================
function abrirAuth() {
  authButtonsRef.value?.abrirLogin()
}

function abrirRegistro() {
  authButtonsRef.value?.abrirRegistro()
}

// El router usa modo hash (#/ruta): un <a href="#producto"> normal lo
// interpretaría como una ruta y caería en el 404, así que el scroll a las
// secciones se hace a mano.
function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
}

// =========================
// DEMO DEL HERO: pestañas que rotan solas (se pausan con mouse o teclado)
// =========================
const demoActiva = ref(0)
const demoPausada = ref(false)
const DEMO_MS = 7000
let demoTimer: ReturnType<typeof setInterval> | null = null

const textoEscrito = ref(RESPUESTA_DEMO)
const escribiendo = ref(false)
let escrituraTimer: ReturnType<typeof setInterval> | null = null

function escribirRespuesta() {
  if (escrituraTimer) clearInterval(escrituraTimer)
  if (prefersReducedMotion()) {
    textoEscrito.value = RESPUESTA_DEMO
    escribiendo.value = false
    return
  }
  let n = 0
  textoEscrito.value = ''
  escribiendo.value = true
  escrituraTimer = setInterval(() => {
    n += 3
    textoEscrito.value = RESPUESTA_DEMO.slice(0, n)
    if (n >= RESPUESTA_DEMO.length) {
      if (escrituraTimer) clearInterval(escrituraTimer)
      escrituraTimer = null
      escribiendo.value = false
    }
  }, 28)
}

function elegirDemo(i: number, enfocar = false) {
  demoActiva.value = i
  if (i === 0) escribirRespuesta()
  reiniciarDemo()
  if (enfocar) document.getElementById(`demo-tab-${i}`)?.focus()
}

function reiniciarDemo() {
  if (demoTimer) clearInterval(demoTimer)
  demoTimer = null
  if (prefersReducedMotion()) return
  demoTimer = setInterval(() => {
    if (demoPausada.value) return
    demoActiva.value = (demoActiva.value + 1) % DEMO_TABS.length
    if (demoActiva.value === 0) escribirRespuesta()
  }, DEMO_MS)
}

// =========================
// HERRAMIENTAS Y ESPECIALIZACIONES
// =========================
const herramientaActiva = ref(0)
function moverHerramienta(i: number, paso: number) {
  const siguiente = (i + paso + HERRAMIENTAS.length) % HERRAMIENTAS.length
  herramientaActiva.value = siguiente
  document.getElementById(`herr-tab-${siguiente}`)?.focus()
}


// =========================
// HEADER, SECCIÓN ACTIVA, PROGRESO, FOCO DEL HERO
// =========================
const headerSolido = ref(false)
const seccionActiva = ref('')
const progresoPasos = ref(0)

// Un solo cálculo por cuadro de pantalla para todo lo que depende del scroll.
let cuadroScroll: number | null = null
function alHacerScroll() {
  if (cuadroScroll !== null) return
  cuadroScroll = requestAnimationFrame(() => {
    cuadroScroll = null
    const total = document.documentElement.scrollHeight - window.innerHeight
    const avance = total > 0 ? window.scrollY / total : 0
    if (progresoRef.value) progresoRef.value.style.transform = `scaleX(${avance})`
    headerSolido.value = window.scrollY > 40
    // Línea de "Cómo funciona": se llena mientras la sección cruza la pantalla.
    const pasos = pasosRef.value
    if (pasos) {
      const r = pasos.getBoundingClientRect()
      const inicio = window.innerHeight * 0.85
      const fin = window.innerHeight * 0.35
      progresoPasos.value = prefersReducedMotion() ? 1 : Math.min(1, Math.max(0, (inicio - r.top) / (inicio - fin)))
    }
  })
}

// Luz que sigue al cursor en el hero.
let cuadroFoco: number | null = null
function moverFoco(e: PointerEvent) {
  if (prefersReducedMotion() || e.pointerType !== 'mouse') return
  const hero = heroRef.value
  if (!hero || cuadroFoco !== null) return
  const x = e.clientX
  const y = e.clientY
  cuadroFoco = requestAnimationFrame(() => {
    cuadroFoco = null
    const r = hero.getBoundingClientRect()
    hero.style.setProperty('--hx', `${x - r.left}px`)
    hero.style.setProperty('--hy', `${y - r.top}px`)
  })
}

// Contadores que suben al entrar en pantalla.
function animarCifra(el: HTMLElement) {
  const hasta = Number(el.dataset.hasta ?? 0)
  const prefijo = el.textContent?.startsWith('+') ? '+' : ''
  if (prefersReducedMotion() || !hasta) return
  const inicio = performance.now()
  const DURACION = 1400
  const paso = (t: number) => {
    const p = Math.min(1, (t - inicio) / DURACION)
    const suave = 1 - Math.pow(1 - p, 3)
    el.textContent = prefijo + Math.round(hasta * suave).toLocaleString('es-PE')
    if (p < 1) requestAnimationFrame(paso)
  }
  requestAnimationFrame(paso)
}

let observerReveal: IntersectionObserver | null = null
let observerSecciones: IntersectionObserver | null = null
const scrollTriggers: ScrollTrigger[] = []

onMounted(() => {
  if (isAuthenticated.value) {
    void router.replace('/app/consultas')
    return
  }

  window.addEventListener('scroll', alHacerScroll, { passive: true })
  alHacerScroll()
  escribirRespuesta()
  reiniciarDemo()

  // Revelado al entrar en pantalla (+ contadores).
  observerReveal = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.classList.add('is-visible')
      entry.target.querySelectorAll<HTMLElement>('.cifra-valor').forEach(animarCifra)
      observerReveal?.unobserve(entry.target)
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
  document.querySelectorAll('.landing-page .reveal').forEach((el) => observerReveal?.observe(el))

  // Sección visible → resalta su enlace en el header.
  observerSecciones = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) seccionActiva.value = entry.target.id
    }
  }, { rootMargin: '-45% 0px -50% 0px' })
  for (const { id } of NAV) {
    const el = document.getElementById(id)
    if (el) observerSecciones.observe(el)
  }

  const root = pageRoot.value
  if (!root || prefersReducedMotion()) return

  // Entrada del hero.
  gsap.from(root.querySelectorAll('.hero-texto > *'), {
    opacity: 0, y: 28, duration: 0.9, ease: 'power3.out', stagger: 0.1, delay: 0.1
  })
  gsap.from(root.querySelector('.demo'), {
    opacity: 0, y: 40, scale: 0.97, duration: 1.1, ease: 'power3.out', delay: 0.35
  })

  // Parallax suave de las imágenes editoriales.
  root.querySelectorAll<HTMLElement>('.parallax-img').forEach((img) => {
    scrollTriggers.push(ScrollTrigger.create({
      trigger: img.parentElement ?? img,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
      animation: gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none' })
    }))
  })
})

onUnmounted(() => {
  observerReveal?.disconnect()
  observerSecciones?.disconnect()
  scrollTriggers.forEach((st) => st.kill())
  if (demoTimer) clearInterval(demoTimer)
  if (escrituraTimer) clearInterval(escrituraTimer)
  window.removeEventListener('scroll', alHacerScroll)
  if (cuadroScroll !== null) cancelAnimationFrame(cuadroScroll)
  if (cuadroFoco !== null) cancelAnimationFrame(cuadroFoco)
})
</script>

<style scoped>
@import '@fontsource/geist/300.css';
@import '@fontsource/geist/400.css';
@import '@fontsource/geist/500.css';

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
   PALETA EN TONOS CLAROS: los fondos son blanco, blanco cálido (crema),
   marfil y piedra; el verde bosque queda para textos y botones
   principales. El resto de la paleta (oliva, beige oliva, grisáceo) da
   acentos. Variables solo dentro de .landing-page.
   ============================== */
.landing-page {
  --bosque: #17211B;
  --grisaceo: #3D473A;
  --oliva: #686A57;
  --beige-oliva: #9C9275;
  --piedra: #BDB59B;
  --marfil: #D9D4C6;
  --crema: #F8F7F2;
  --blanco: #FFFFFF;
  /* Tonos intermedios entre crema y marfil, para variar las bandas */
  --crema-2: #F1EEE6;
  --marfil-claro: #E9E5DA;

  /* 75%: contraste ≥ 4.5:1 incluso sobre piedra */
  --texto: var(--bosque);
  --texto-sec: rgba(23, 33, 27, 0.75);
  --borde: rgba(23, 33, 27, 0.12);
  --borde-fuerte: rgba(23, 33, 27, 0.24);

  --serif: 'Baskervville', 'EB Garamond', Georgia, serif;
  --sans: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --radio: 18px;
  --radio-sm: 12px;
  --ancho: 1200px;
  --gutter: clamp(20px, 5vw, 56px);
  --ease: cubic-bezier(0.16, 1, 0.3, 1);

  min-height: 100vh;
  background: var(--crema);
  color: var(--texto);
  font-family: var(--sans);
  font-weight: 400;
  letter-spacing: 0.005em;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

.landing-page em { font-style: italic; }

/* Barra de progreso de lectura */
.scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--beige-oliva);
  transform-origin: 0 50%;
  transform: scaleX(0);
  z-index: 60;
}

/* ==============================
   HEADER
   ============================== */
.landing-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  border-bottom: 1px solid transparent;
  transition: background-color 0.35s var(--ease), border-color 0.35s, backdrop-filter 0.35s;
}

.landing-header--solido {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: saturate(140%) blur(10px);
  border-bottom-color: var(--borde);
}

.header-inner {
  max-width: var(--ancho);
  margin: 0 auto;
  padding: 14px var(--gutter);
  display: flex;
  align-items: center;
  gap: 28px;
}

.header-logo {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: var(--serif);
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--texto);
}

.header-nav {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.header-nav-link {
  position: relative;
  padding: 8px 12px;
  font-size: 0.9rem;
  color: var(--texto-sec);
  text-decoration: none;
  transition: color 0.25s;
}

.header-nav-link:hover,
.header-nav-link--activo { color: var(--texto); }

.header-nav-link::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 3px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.35s var(--ease);
}

.header-nav-link:hover::after,
.header-nav-link--activo::after { transform: scaleX(1); }

:deep(.auth-buttons .auth-btn) {
  font-family: var(--sans);
  font-weight: 500;
  border-radius: 999px !important;
  box-shadow: none !important;
}

:deep(.auth-buttons .login-btn) { color: var(--texto) !important; }
:deep(.auth-buttons .login-btn:hover) { background: rgba(23, 33, 27, 0.06) !important; }
:deep(.auth-buttons .register-btn) { background: var(--bosque) !important; color: var(--crema) !important; }
:deep(.auth-buttons .register-btn:hover) { background: var(--grisaceo) !important; }

/* ==============================
   BOTONES
   ============================== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  border-radius: 999px;
  font-family: var(--sans);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color 0.25s, color 0.25s, border-color 0.25s, transform 0.25s var(--ease);
}

.btn:hover { transform: translateY(-2px); }
.btn:focus-visible { outline: 2px solid var(--beige-oliva); outline-offset: 3px; }

.btn--primario {
  background: var(--bosque);
  color: var(--crema);
}

.btn--primario:hover { background: var(--grisaceo); }

.btn--contorno {
  background: var(--blanco);
  color: var(--texto);
  border-color: var(--borde-fuerte);
}

.btn--contorno:hover { border-color: var(--texto); }

.btn-flecha { transition: transform 0.3s var(--ease); }
.btn:hover .btn-flecha { transform: translateX(4px); }

/* ==============================
   HERO (crema, con luces suaves de piedra y marfil)
   ============================== */
.hero {
  --hx: 70%;
  --hy: 30%;
  position: relative;
  overflow: hidden;
  background: var(--crema);
  padding: 140px var(--gutter) 110px;
}

.hero-fondo { position: absolute; inset: 0; pointer-events: none; }

.hero-foco {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(520px circle at var(--hx) var(--hy), rgba(189, 181, 155, 0.28), transparent 60%),
    radial-gradient(900px circle at 90% 105%, rgba(217, 212, 198, 0.75), transparent 60%),
    radial-gradient(700px circle at 0% 0%, rgba(255, 255, 255, 0.9), transparent 70%);
}

.hero-rejilla {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(23, 33, 27, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(23, 33, 27, 0.05) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, #000 25%, transparent 80%);
}

.hero-grano {
  position: absolute;
  inset: 0;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.hero-inner {
  position: relative;
  max-width: var(--ancho);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: clamp(32px, 5vw, 72px);
  align-items: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  border: 1px solid var(--borde-fuerte);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  color: var(--texto-sec);
}

.hero-badge-punto {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--beige-oliva);
  animation: latido 2.4s infinite;
}

@keyframes latido {
  0% { box-shadow: 0 0 0 0 rgba(156, 146, 117, 0.55); }
  70% { box-shadow: 0 0 0 10px rgba(156, 146, 117, 0); }
  100% { box-shadow: 0 0 0 0 rgba(156, 146, 117, 0); }
}

.hero-title {
  font-family: var(--serif);
  font-weight: 500;
  font-size: clamp(2.6rem, 5.4vw, 4.6rem);
  line-height: 1.04;
  letter-spacing: -0.02em;
  margin: 26px 0 22px;
  color: var(--texto);
}

.hero-title em { color: var(--oliva); }

.hero-description {
  max-width: 540px;
  font-size: 1.08rem;
  line-height: 1.65;
  color: var(--texto-sec);
  margin: 0 0 32px;
}

.hero-acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-caption {
  margin: 26px 0 0;
  font-size: 0.85rem;
  color: var(--texto-sec);
}

/* ---------- Demo del hero ---------- */
.demo { position: relative; }

.demo-tabs {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 4px;
  margin-bottom: 14px;
  background: var(--blanco);
  border: 1px solid var(--borde);
  border-radius: 999px;
}

.demo-tab {
  padding: 9px 6px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--texto-sec);
  font-family: var(--sans);
  font-size: 0.86rem;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s;
}

.demo-tab:hover { color: var(--texto); }

.demo-tab--activa {
  background: var(--marfil);
  color: var(--texto);
  font-weight: 500;
}

.demo-tab:focus-visible { outline: 2px solid var(--beige-oliva); outline-offset: 2px; }

.demo-tabs-progreso {
  position: absolute;
  left: calc(4px + var(--i) * (100% - 8px) / 4);
  width: calc((100% - 8px) / 4 - 4px);
  bottom: -9px;
  height: 2px;
  overflow: hidden;
  border-radius: 2px;
  transition: left 0.4s var(--ease);
}

.demo-tabs-progreso-relleno {
  display: block;
  height: 100%;
  background: var(--beige-oliva);
  transform-origin: left;
  animation: llenar 7s linear forwards;
}

.demo-tabs-progreso-relleno--pausa { animation-play-state: paused; }

@keyframes llenar {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

.demo-ventana {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0;
  border: 1px solid var(--borde);
  border-radius: var(--radio);
  background: var(--crema-2);
  color: var(--texto);
  font: inherit;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 30px 70px -32px rgba(23, 33, 27, 0.35);
  transition: transform 0.4s var(--ease), box-shadow 0.4s;
}

.demo-ventana:hover {
  transform: translateY(-4px);
  box-shadow: 0 40px 80px -30px rgba(23, 33, 27, 0.4);
}

.demo-ventana:focus-visible { outline: 2px solid var(--beige-oliva); outline-offset: 4px; }

.demo-barra {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--borde);
  background: var(--blanco);
}

.demo-punto {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--marfil);
}

.demo-barra-titulo {
  margin-left: 10px;
  font-size: 0.78rem;
  color: var(--texto-sec);
}

.demo-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 268px;
  padding: 20px;
}

.demo-chip-esp {
  align-self: center;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--blanco);
  border: 1px solid var(--borde-fuerte);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
}

.demo-msg {
  display: block;
  max-width: 88%;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 0.88rem;
  line-height: 1.55;
}

.demo-msg--user {
  align-self: flex-end;
  background: var(--marfil);
  border-bottom-right-radius: 4px;
}

.demo-msg--ia {
  align-self: flex-start;
  background: var(--blanco);
  border: 1px solid var(--borde);
  border-bottom-left-radius: 4px;
}

.demo-msg-autor {
  display: block;
  margin-bottom: 4px;
  font-family: var(--serif);
  font-weight: 600;
  color: var(--oliva);
}

.demo-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: var(--texto);
  animation: parpadeo 0.9s steps(1) infinite;
}

@keyframes parpadeo { 50% { opacity: 0; } }

.demo-cita {
  display: inline-block;
  margin-top: 10px;
  padding: 4px 10px;
  border-radius: 8px;
  background: var(--crema-2);
  border: 1px solid var(--borde);
  font-size: 0.74rem;
  font-weight: 500;
}

/* Análisis */
.demo-panel--analisis {
  flex-direction: row;
  gap: 16px;
}

.demo-doc {
  flex: 1.4;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 16px;
  background: var(--blanco);
  border: 1px solid var(--borde);
  border-radius: 10px;
}

.demo-linea {
  display: block;
  height: 7px;
  border-radius: 4px;
  background: var(--marfil-claro);
}

.demo-linea--titulo { width: 55%; height: 10px; background: var(--piedra); margin-bottom: 4px; }
.demo-linea--corta { width: 62%; }
.demo-linea--marca { height: 9px; }
.demo-linea--alto { background: #F2B8B0; box-shadow: inset 0 -2px 0 #C23B2E; }
.demo-linea--medio { background: #F6D3B5; box-shadow: inset 0 -2px 0 #B9791E; width: 80%; }
.demo-linea--bajo { background: #CFE6D7; box-shadow: inset 0 -2px 0 #2F8F5E; width: 70%; }

.demo-riesgos {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo-riesgo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--borde);
  border-radius: 10px;
  background: var(--blanco);
  font-size: 0.82rem;
}

.demo-riesgo-n {
  font-family: var(--serif);
  font-size: 1.25rem;
}

.demo-riesgo-n--alto { color: #C23B2E; }
.demo-riesgo-n--medio { color: #8F5B10; }
.demo-riesgo-n--bajo { color: #2F8F5E; }

.demo-observacion {
  margin-top: auto;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--texto-sec);
}

.demo-observacion em {
  font-style: normal;
  font-weight: 500;
  color: var(--texto);
  text-decoration: underline;
}

/* Contratos */
.demo-plantilla {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
  padding: 12px 14px;
  border: 1px solid var(--borde-fuerte);
  border-radius: 12px;
  background: var(--blanco);
}

.demo-plantilla-icono {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--marfil);
  font-family: var(--serif);
}

.demo-plantilla-texto {
  flex: 1;
  display: flex;
  flex-direction: column;
  font-size: 0.78rem;
  color: var(--texto-sec);
}

.demo-plantilla-texto b {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--texto);
}

.demo-plantilla-accion { font-size: 0.82rem; font-weight: 500; }

/* Normas */
.demo-resumen {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  border-radius: 12px;
  background: var(--marfil);
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--texto-sec);
}

.demo-resumen b {
  font-family: var(--serif);
  font-size: 1rem;
  font-weight: 600;
  color: var(--texto);
}

.demo-norma {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--borde);
  border-radius: 10px;
  background: var(--blanco);
  font-size: 0.82rem;
}

.demo-sector {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--crema-2);
  border: 1px solid var(--borde);
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.demo-cta {
  display: block;
  padding: 13px 20px;
  border-top: 1px solid var(--borde);
  background: var(--blanco);
  font-size: 0.86rem;
  font-weight: 500;
  color: var(--texto);
}

.demo-enter-active,
.demo-leave-active { transition: opacity 0.3s var(--ease), transform 0.3s var(--ease); }
.demo-enter-from { opacity: 0; transform: translateY(10px); }
.demo-leave-to { opacity: 0; transform: translateY(-6px); }

/* ==============================
   ENCABEZADOS DE SECCIÓN
   ============================== */
.section-header {
  max-width: 760px;
  margin: 0 auto clamp(40px, 6vw, 64px);
  text-align: center;
}

.section-label {
  display: inline-block;
  margin-bottom: 14px;
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  /* grisáceo: se lee bien también sobre marfil (oliva quedaba en 3.7:1) */
  color: var(--grisaceo);
}

.section-title {
  margin: 0;
  font-family: var(--serif);
  font-weight: 500;
  font-size: clamp(2rem, 4vw, 3.1rem);
  line-height: 1.1;
  letter-spacing: -0.015em;
  color: var(--texto);
}

.section-title em { color: var(--oliva); }

.section-subtitle {
  margin: 18px auto 0;
  max-width: 620px;
  font-size: 1.04rem;
  line-height: 1.65;
  color: var(--texto-sec);
}

/* ==============================
   BASE JURÍDICA (marfil + cinta en piedra)
   ============================== */
.base {
  background: var(--marfil);
  padding: 56px 0 0;
}

.base-cifras {
  max-width: var(--ancho);
  margin: 0 auto;
  padding: 0 var(--gutter) 48px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.cifra {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 20px;
  border-left: 1px solid var(--borde-fuerte);
}

.cifra-numero {
  font-family: var(--serif);
  font-size: clamp(2.4rem, 4.6vw, 3.6rem);
  font-weight: 500;
  line-height: 1;
}

.cifra-etiqueta {
  font-size: 0.95rem;
  color: var(--texto-sec);
}

.cinta {
  overflow: hidden;
  padding: 18px 0;
  border-top: 1px solid var(--borde);
  background: var(--piedra);
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}

.cinta-pista {
  display: flex;
  width: max-content;
  animation: cinta 48s linear infinite;
}

.cinta:hover .cinta-pista { animation-play-state: paused; }

.cinta-item {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 0 22px;
  font-family: var(--serif);
  font-size: 1.15rem;
  white-space: nowrap;
}

.cinta-sep { color: var(--grisaceo); opacity: 0.7; }

@keyframes cinta {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

/* ==============================
   PRODUCTO (blanco)
   ============================== */
.producto {
  padding: clamp(80px, 10vw, 130px) var(--gutter);
  background: var(--blanco);
}

.producto-grid {
  max-width: var(--ancho);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: clamp(28px, 4vw, 56px);
  align-items: stretch;
}

.producto-lista { display: flex; flex-direction: column; }

.herr {
  display: flex;
  gap: 20px;
  padding: 22px 8px;
  border: none;
  border-top: 1px solid var(--borde);
  background: none;
  text-align: left;
  font: inherit;
  color: var(--texto);
  cursor: pointer;
  transition: padding 0.35s var(--ease);
}

.herr:last-child { border-bottom: 1px solid var(--borde); }

.herr-num {
  font-family: var(--serif);
  font-size: 0.95rem;
  color: var(--texto-sec);
  padding-top: 4px;
}

.herr-texto { display: flex; flex-direction: column; gap: 6px; }

.herr-titulo {
  font-family: var(--serif);
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--texto-sec);
  transition: color 0.3s;
}

.herr-desc {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--texto-sec);
  transition: max-height 0.45s var(--ease), opacity 0.35s;
}

.herr--activa { padding-left: 18px; }
.herr--activa .herr-num,
.herr--activa .herr-titulo { color: var(--texto); }
.herr--activa .herr-desc { max-height: 120px; opacity: 1; }
.herr:hover .herr-titulo { color: var(--texto); }
.herr:focus-visible { outline: 2px solid var(--beige-oliva); outline-offset: -2px; }

.producto-vista {
  position: relative;
  overflow: hidden;
  min-height: 380px;
  border-radius: var(--radio);
  border: 1px solid var(--borde);
  padding: clamp(28px, 4vw, 48px);
  display: flex;
  align-items: flex-end;
  background: var(--crema);
  transition: background-color 0.6s var(--ease);
}

.producto-vista::before {
  content: '§';
  position: absolute;
  top: -40px;
  right: 10px;
  font-family: var(--serif);
  font-size: 320px;
  line-height: 1;
  color: var(--texto);
  opacity: 0.06;
  pointer-events: none;
}

/* Cada herramienta tiñe el panel con un tono claro distinto */
.producto-vista[data-tono='bosque'] { background: var(--crema); }
.producto-vista[data-tono='grisaceo'] { background: var(--marfil-claro); }
.producto-vista[data-tono='oliva'] { background: var(--marfil); }
.producto-vista[data-tono='piedra'] { background: var(--piedra); }

.vista { position: relative; }

.vista-etiqueta {
  display: inline-block;
  padding: 5px 12px;
  border: 1px solid var(--borde-fuerte);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--texto);
}

.vista-frase {
  margin: 18px 0 22px;
  font-family: var(--serif);
  font-size: clamp(1.7rem, 3vw, 2.4rem);
  line-height: 1.15;
}

.vista-puntos {
  list-style: none;
  margin: 0;
  padding: 0;
}

.vista-puntos li {
  position: relative;
  padding: 12px 0 12px 22px;
  border-top: 1px solid var(--borde-fuerte);
  font-size: 0.95rem;
}

.vista-puntos li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 8px;
  height: 8px;
  margin-top: -4px;
  border-radius: 50%;
  background: var(--oliva);
}

.vista-enter-active,
.vista-leave-active { transition: opacity 0.35s var(--ease), transform 0.35s var(--ease); }
.vista-enter-from { opacity: 0; transform: translateY(14px); }
.vista-leave-to { opacity: 0; transform: translateY(-8px); }

/* ==============================
   ESPECIALIZACIONES (crema) — 4 tarjetas, todas visibles
   ============================== */
.especialidades {
  padding: clamp(80px, 10vw, 130px) var(--gutter);
  background: var(--crema-2);
}

.esp-grid {
  max-width: var(--ancho);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
}

.esp {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 26px 24px 22px;
  border-radius: var(--radio);
  border: 1px solid var(--borde);
  background: var(--blanco);
  transition: transform 0.4s var(--ease), box-shadow 0.4s var(--ease), border-color 0.3s;
}

/* Franja de color arriba: cada área con un tono de la paleta */
.esp::before {
  content: '';
  position: absolute;
  top: 0;
  left: 24px;
  right: 24px;
  height: 3px;
  border-radius: 0 0 3px 3px;
}

.esp--bosque::before { background: var(--grisaceo); }
.esp--grisaceo::before { background: var(--oliva); }
.esp--oliva::before { background: var(--beige-oliva); }
.esp--beige::before { background: var(--piedra); }

.esp:hover {
  transform: translateY(-6px);
  border-color: var(--borde-fuerte);
  box-shadow: 0 24px 50px -28px rgba(23, 33, 27, 0.35);
}

.esp-cabecera {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.esp-num {
  font-family: var(--serif);
  font-size: 0.95rem;
  color: var(--texto-sec);
}

.esp-icono {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--crema-2);
  font-family: var(--serif);
  font-size: 1.1rem;
  transition: background-color 0.3s;
}

.esp:hover .esp-icono { background: var(--marfil); }

.esp-titulo {
  margin: 22px 0 8px;
  font-family: var(--serif);
  font-size: 1.55rem;
  font-weight: 500;
  line-height: 1.15;
}

.esp-desc {
  margin: 0 0 18px;
  font-size: 0.94rem;
  line-height: 1.55;
  color: var(--texto-sec);
}

.esp-normas {
  list-style: none;
  margin: 0 0 20px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.esp-normas li {
  position: relative;
  padding-left: 16px;
  font-size: 0.86rem;
  line-height: 1.4;
}

.esp-normas li::before {
  content: '§';
  position: absolute;
  left: 0;
  top: 0;
  font-family: var(--serif);
  color: var(--oliva);
}

.esp-cta {
  margin-top: auto;
  padding: 10px 0 0;
  border: none;
  border-top: 1px solid var(--borde);
  background: none;
  text-align: left;
  font-family: var(--sans);
  font-size: 0.86rem;
  font-weight: 500;
  color: var(--texto);
  cursor: pointer;
}

.esp-cta span { display: inline-block; transition: transform 0.3s var(--ease); }
.esp-cta:hover span { transform: translateX(4px); }
.esp-cta:focus-visible { outline: 2px solid var(--beige-oliva); outline-offset: 3px; }

/* ==============================
   CÓMO FUNCIONA (marfil)
   ============================== */
.pasos {
  padding: clamp(80px, 10vw, 130px) var(--gutter);
  background: var(--marfil);
}

.pasos-linea {
  position: relative;
  max-width: var(--ancho);
  margin: 0 auto;
}

.pasos-linea-base,
.pasos-linea-relleno {
  position: absolute;
  top: 27px;
  left: calc(100% / 6);
  right: calc(100% / 6);
  height: 2px;
}

.pasos-linea-base { background: var(--borde-fuerte); }

.pasos-linea-relleno {
  background: var(--oliva);
  transform-origin: left;
  transform: scaleX(0);
}

.pasos-grid {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
}

.paso { text-align: center; }

.paso-punto {
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid var(--borde-fuerte);
  background: var(--marfil);
  font-family: var(--serif);
  font-size: 1.15rem;
  color: var(--texto-sec);
  transition: background-color 0.4s, color 0.4s, border-color 0.4s, transform 0.4s var(--ease);
}

.paso--hecho .paso-punto {
  background: var(--blanco);
  border-color: var(--oliva);
  color: var(--texto);
  transform: scale(1.06);
}

.paso-titulo {
  margin: 20px 0 8px;
  font-family: var(--serif);
  font-size: 1.45rem;
  font-weight: 500;
}

.paso-desc {
  max-width: 300px;
  margin: 0 auto;
  font-size: 0.98rem;
  line-height: 1.6;
  color: var(--texto-sec);
}

/* ==============================
   NOSOTROS
   ============================== */
.nosotros {
  padding: clamp(80px, 10vw, 130px) var(--gutter) clamp(56px, 7vw, 90px);
  background: var(--blanco);
}

.proposito {
  max-width: var(--ancho);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: clamp(28px, 5vw, 72px);
  align-items: center;
}

.proposito-comilla {
  display: block;
  font-family: var(--serif);
  font-size: 6rem;
  line-height: 0.6;
  color: var(--piedra);
}

.proposito-quote {
  margin: 10px 0 28px;
  font-family: var(--serif);
  font-size: clamp(1.5rem, 2.6vw, 2.1rem);
  line-height: 1.3;
}

.proposito-label {
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--oliva);
}

.proposito-valores {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 0;
}

.proposito-valores span {
  padding: 7px 16px;
  border-radius: 999px;
  background: var(--crema-2);
  border: 1px solid var(--borde);
  font-size: 0.88rem;
}

.proposito-imagen,
.mv-imagen {
  overflow: hidden;
  border-radius: var(--radio);
  aspect-ratio: 4 / 3;
}

.parallax-img {
  width: 100%;
  height: 112%;
  object-fit: cover;
  display: block;
}

.mv {
  background: var(--crema-2);
  padding: clamp(72px, 9vw, 120px) var(--gutter);
}

.mv-inner {
  max-width: var(--ancho);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: clamp(28px, 5vw, 72px);
  align-items: center;
}

.mv-bloques { display: flex; flex-direction: column; gap: 36px; }

.mv-bloque {
  padding-left: 22px;
  border-left: 2px solid var(--beige-oliva);
}

.mv-label {
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--oliva);
}

.mv-texto {
  margin: 10px 0 0;
  font-family: var(--serif);
  font-size: clamp(1.15rem, 1.8vw, 1.4rem);
  line-height: 1.5;
}

.equipo {
  padding: clamp(64px, 8vw, 110px) var(--gutter);
  max-width: var(--ancho);
  margin: 0 auto;
}

.equipo-subtitulo {
  margin: 0 0 28px;
  font-family: var(--serif);
  font-size: 1.6rem;
  font-weight: 500;
  text-align: center;
}

.equipo-subtitulo:not(:first-child) { margin-top: 72px; }

.direccion-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 340px));
  justify-content: center;
  gap: 28px;
}

.persona-foto,
.miembro-foto {
  overflow: hidden;
  border-radius: var(--radio);
  background: var(--marfil);
}

.persona-foto { aspect-ratio: 4 / 5; }
.miembro-foto { aspect-ratio: 1; border-radius: 50%; }

.persona-foto img,
.miembro-foto img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: grayscale(1) contrast(1.02);
  transition: filter 0.6s var(--ease), transform 0.8s var(--ease);
}

.persona:hover img,
.miembro:hover img {
  filter: grayscale(0);
  transform: scale(1.04);
}

.persona-info { padding: 18px 4px 0; }

.persona-nombre,
.miembro-nombre {
  margin: 0;
  font-family: var(--serif);
  font-size: 1.35rem;
  font-weight: 500;
}

.persona-cargo {
  margin: 4px 0 2px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--oliva);
}

.persona-area,
.miembro-area {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--texto-sec);
}

.equipo-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 24px;
  text-align: center;
}

.miembro-nombre { margin-top: 14px; font-size: 1.15rem; }
.miembro-area { margin-top: 4px; font-size: 0.8rem; }

/* ==============================
   CIERRE (marfil con luces suaves)
   ============================== */
.cta {
  position: relative;
  overflow: hidden;
  padding: clamp(80px, 10vw, 130px) var(--gutter);
  background:
    radial-gradient(700px circle at 15% 0%, rgba(255, 255, 255, 0.7), transparent 60%),
    radial-gradient(600px circle at 90% 100%, rgba(189, 181, 155, 0.55), transparent 60%),
    var(--marfil);
  text-align: center;
}

.cta-inner { max-width: 760px; margin: 0 auto; }

.cta-titulo {
  margin: 0;
  font-family: var(--serif);
  font-size: clamp(2.2rem, 4.6vw, 3.6rem);
  font-weight: 500;
  line-height: 1.08;
  letter-spacing: -0.015em;
}

.cta-titulo em { color: var(--oliva); }

.cta-texto {
  margin: 18px 0 32px;
  font-size: 1.05rem;
  color: var(--texto-sec);
}

.cta .hero-acciones { justify-content: center; }

/* ==============================
   FOOTER (crema)
   ============================== */
.landing-footer {
  background: var(--crema);
  border-top: 1px solid var(--borde);
  padding: 56px var(--gutter) 28px;
}

.footer-inner {
  max-width: var(--ancho);
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  gap: 32px;
  flex-wrap: wrap;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--borde);
}

.footer-logo {
  font-family: var(--serif);
  font-size: 1.8rem;
  font-weight: 600;
}

.footer-lema { margin: 6px 0 0; font-size: 0.9rem; color: var(--texto-sec); }

.footer-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 26px;
  align-content: flex-start;
}

.footer-nav a {
  color: var(--texto-sec);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.25s;
}

.footer-nav a:hover { color: var(--texto); text-decoration: underline; }

.footer-copy {
  max-width: var(--ancho);
  margin: 22px auto 0;
  font-size: 0.8rem;
  color: var(--texto-sec);
}

/* ==============================
   REVELADO AL HACER SCROLL
   ============================== */
.reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.9s var(--ease), transform 0.9s var(--ease);
}

.reveal.is-visible { opacity: 1; transform: none; }

/* Las tarjetas de especialización entran una tras otra */
.esp-grid .esp.reveal:nth-child(2) { transition-delay: 0.08s; }
.esp-grid .esp.reveal:nth-child(3) { transition-delay: 0.16s; }
.esp-grid .esp.reveal:nth-child(4) { transition-delay: 0.24s; }

/* ==============================
   RESPONSIVE
   ============================== */
@media (max-width: 1024px) {
  .hero-inner,
  .producto-grid,
  .proposito,
  .mv-inner { grid-template-columns: 1fr; }

  .hero { padding-top: 120px; }
  .demo { max-width: 620px; }

  .esp-grid { grid-template-columns: repeat(2, 1fr); }
  .equipo-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
  .header-nav { display: none; }
  .header-inner { justify-content: space-between; }

  .base-cifras { grid-template-columns: 1fr; gap: 20px; }

  .pasos-linea-base,
  .pasos-linea-relleno { display: none; }
  .pasos-grid { grid-template-columns: 1fr; gap: 36px; }

  .direccion-grid { grid-template-columns: minmax(0, 340px); }
}

@media (max-width: 560px) {
  .esp-grid { grid-template-columns: 1fr; }
}

@media (max-width: 520px) {
  .demo-tab { font-size: 0.76rem; padding: 8px 2px; }
  .demo-panel--analisis { flex-direction: column; }
  .equipo-grid { grid-template-columns: repeat(2, 1fr); }
  .btn { width: 100%; justify-content: center; }
}

/* ==============================
   MOVIMIENTO REDUCIDO
   ============================== */
@media (prefers-reduced-motion: reduce) {
  .landing-page *,
  .landing-page *::before,
  .landing-page *::after {
    animation: none !important;
    transition: none !important;
  }

  .reveal { opacity: 1; transform: none; }
  .cinta-pista { transform: none; }
}
</style>
