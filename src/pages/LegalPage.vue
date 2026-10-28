<template>
  <div class="legal">
    <header class="legal-barra">
      <div class="legal-barra-inner">
        <router-link to="/" class="legal-logo" aria-label="LexIT, ir al inicio">LexIT</router-link>
        <span class="legal-barra-sep" aria-hidden="true" />
        <router-link to="/legal" class="legal-barra-seccion">Legal</router-link>
        <router-link to="/" class="legal-barra-volver">
          <q-icon name="arrow_back" size="16px" />
          <span>Volver a LexIT</span>
        </router-link>
      </div>
    </header>

    <!-- ÍNDICE: /legal -->
    <main v-if="!documento" id="contenido" class="legal-indice">
      <div class="legal-portada">
        <p class="legal-antetitulo">LexIT AI</p>
        <h1 class="legal-titulo">Legal</h1>
        <p class="legal-bajada">Los documentos que rigen el uso de la plataforma y el tratamiento de tus datos personales.</p>
      </div>

      <ul class="legal-lista legal-hoja">
        <li v-for="doc in DOCUMENTOS_LEGALES" :key="doc.slug">
          <router-link :to="`/legal/${doc.slug}`" class="legal-fila">
            <div class="legal-fila-texto">
              <span class="legal-fila-titulo">{{ doc.titulo }}</span>
              <span class="legal-fila-desc">{{ doc.descripcion }}</span>
            </div>
            <span class="legal-fila-fecha">Actualizado el {{ doc.actualizado }}</span>
            <q-icon name="arrow_forward" size="18px" class="legal-fila-flecha" />
          </router-link>
        </li>
      </ul>
    </main>

    <!-- DOCUMENTO: /legal/:documento -->
    <div v-else class="legal-documento">
      <div class="legal-portada legal-portada--doc">
        <nav class="legal-migas" aria-label="Ruta">
          <router-link to="/legal">Legal</router-link>
          <q-icon name="chevron_right" size="16px" />
          <span>{{ documento.titulo }}</span>
        </nav>

        <h1 class="legal-titulo legal-titulo--doc">{{ documento.titulo }}</h1>
        <p class="legal-meta">
          <span>Versión {{ documento.version }}</span>
          <span aria-hidden="true">·</span>
          <span>Última actualización: {{ documento.actualizado }}</span>
        </p>
      </div>

      <div class="legal-doc legal-hoja">
      <aside class="legal-indice-lateral" aria-label="Contenido del documento">
        <nav class="legal-toc">
          <p class="legal-toc-titulo">Contenido</p>
          <button
            v-for="s in documento.secciones"
            :key="s.id"
            type="button"
            class="legal-toc-item"
            :class="{ 'legal-toc-item--activo': seccionActiva === s.id }"
            @click="irASeccion(s.id)"
          >
            <span class="legal-toc-num">{{ s.numero }}.</span>
            <span>{{ s.titulo }}</span>
          </button>
        </nav>
      </aside>

      <main id="contenido" class="legal-cuerpo">
        <section v-if="documento.aviso" class="legal-aviso">
          <p class="legal-aviso-titulo">{{ documento.aviso.titulo }}</p>
          <p v-for="(p, i) in documento.aviso.parrafos" :key="i">
            <template v-for="(tramo, j) in tramos(p)" :key="j"><strong v-if="tramo.negrita">{{ tramo.texto }}</strong><template v-else>{{ tramo.texto }}</template></template>
          </p>
        </section>

        <p v-for="(p, i) in documento.intro" :key="`intro-${i}`" class="legal-parrafo">
          <template v-for="(tramo, j) in tramos(p)" :key="j"><strong v-if="tramo.negrita">{{ tramo.texto }}</strong><template v-else>{{ tramo.texto }}</template></template>
        </p>

        <section
          v-for="s in documento.secciones"
          :id="s.id"
          :key="s.id"
          :ref="el => registrarSeccion(s.id, el)"
          class="legal-seccion"
        >
          <h2 class="legal-seccion-titulo">
            <span class="legal-seccion-num">{{ s.numero }}.</span>
            {{ s.titulo }}
          </h2>

          <template v-for="(b, i) in s.bloques" :key="i">
            <p v-if="b.tipo === 'p'" class="legal-parrafo">
              <template v-for="(tramo, j) in tramos(b.texto)" :key="j"><strong v-if="tramo.negrita">{{ tramo.texto }}</strong><template v-else>{{ tramo.texto }}</template></template>
            </p>

            <ul v-else-if="b.tipo === 'lista'" class="legal-vinetas">
              <li v-for="(item, k) in b.items" :key="k">
                <template v-for="(tramo, j) in tramos(item)" :key="j"><strong v-if="tramo.negrita">{{ tramo.texto }}</strong><template v-else>{{ tramo.texto }}</template></template>
              </li>
            </ul>

            <div v-else class="legal-tabla-envoltura">
              <table class="legal-tabla">
                <thead>
                  <tr><th v-for="c in b.columnas" :key="c" scope="col">{{ c }}</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(fila, k) in b.filas" :key="k">
                    <td v-for="(celda, m) in fila" :key="m" :data-columna="b.columnas[m]">{{ celda }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </section>

        <p class="legal-cierre">{{ documento.cierre }}</p>

        <footer class="legal-pie">
          <router-link v-for="otro in otrosDocumentos" :key="otro.slug" :to="`/legal/${otro.slug}`" class="legal-pie-otro">
            <span class="legal-pie-etiqueta">Ver también</span>
            <span class="legal-pie-titulo">{{ otro.titulo }}</span>
            <q-icon name="arrow_forward" size="18px" />
          </router-link>
          <p class="legal-pie-contacto">
            Consultas: <a href="mailto:lexitiajuridica@gmail.com">lexitiajuridica@gmail.com</a>
          </p>
        </footer>
      </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// =========================
// LEGAL (/legal y /legal/:documento)
// Términos y condiciones y Política de privacidad como páginas de LexIT,
// al estilo de harvey.ai/legal: un índice con los documentos y, en cada
// documento, el contenido a la izquierda y el texto a la derecha. El texto
// viene tal cual de src/constants/legal.ts. De fondo, la misma pintura de
// la Landing ("La tormenta en el mar de Galilea", Rembrandt, dominio
// público) bajo un velo azul; el texto va sobre una hoja blanca.
// =========================
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DOCUMENTOS_LEGALES } from 'src/constants/legal'

const route = useRoute()
const router = useRouter()

const documento = computed(() => {
  const slug = route.params.documento
  return typeof slug === 'string' && slug ? DOCUMENTOS_LEGALES.find(d => d.slug === slug) ?? null : null
})
const otrosDocumentos = computed(() => DOCUMENTOS_LEGALES.filter(d => d.slug !== documento.value?.slug))

// Un documento que no existe vuelve al índice
watch(() => route.params.documento, slug => {
  if (typeof slug === 'string' && slug && !documento.value) void router.replace('/legal')
}, { immediate: true })

// "**así**" en el texto marca las negritas del documento original
function tramos(texto: string) {
  return texto.split('**').map((t, i) => ({ texto: t, negrita: i % 2 === 1 })).filter(t => t.texto)
}

// =========================
// ÍNDICE LATERAL: sección visible y salto a cada sección. El router usa
// modo hash, así que no se usan anclas (#s1 se leería como una ruta).
// =========================
const seccionActiva = ref('')
const elementos = new Map<string, Element>()
let observador: IntersectionObserver | null = null

function registrarSeccion(id: string, el: unknown) {
  if (el instanceof Element) elementos.set(id, el)
  else elementos.delete(id)
}

function irASeccion(id: string) {
  const el = elementos.get(id)
  if (!el) return
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' })
  seccionActiva.value = id
}

function observar() {
  observador?.disconnect()
  if (!documento.value) return
  seccionActiva.value = documento.value.secciones[0]?.id ?? ''
  observador = new IntersectionObserver(entradas => {
    const visibles = entradas.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
    if (visibles[0]) seccionActiva.value = visibles[0].target.id
  }, { rootMargin: '-90px 0px -65% 0px' })
  elementos.forEach(el => observador?.observe(el))
}

watch(documento, () => {
  void nextTick(observar)
  window.scrollTo({ top: 0 })
}, { immediate: true })

onBeforeUnmount(() => observador?.disconnect())
</script>

<style scoped>
.legal {
  --legal-fondo: #ffffff;
  --legal-texto: #1a1f2b;
  --legal-sec: #5b6475;
  --legal-tenue: #8a92a3;
  --legal-linea: #e4e7ec;
  --legal-suave: #f6f7f9;
  --legal-azul: #1d4e89;

  --legal-crema: #f4f1ea;
  --legal-crema-sec: rgba(244, 241, 234, 0.78);
  --legal-oro: #c9a774;

  position: relative;
  isolation: isolate;
  min-height: 100vh;
  background: #0f1d33;
  color: var(--legal-texto);
  font-family: 'Urbanist', system-ui, sans-serif;
}

/* Pintura fija de fondo (un elemento fijo en vez de background-attachment,
   que en iPhone no funciona) con un velo azul para que todo se lea */
.legal::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(180deg, rgba(13, 27, 48, 0.78) 0%, rgba(13, 27, 48, 0.55) 38%, rgba(13, 27, 48, 0.88) 100%),
    radial-gradient(900px circle at 70% 30%, rgba(201, 167, 116, 0.14), transparent 65%),
    url('../assets/especializaciones/fondo-tormenta.jpg') center 40% / cover no-repeat;
}

/* ===== PORTADA (sobre la pintura) ===== */
.legal-portada {
  max-width: 1180px;
  margin: 0 auto;
  padding: 104px 24px 64px;
  animation: legal-entrada 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.legal-portada--doc { padding: 72px 24px 56px; }

/* ===== HOJA BLANCA ===== */
.legal-hoja {
  background: var(--legal-fondo);
  border-radius: 4px;
  box-shadow: 0 30px 80px -20px rgba(5, 12, 24, 0.55);
  animation: legal-entrada 0.7s 0.12s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes legal-entrada {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: none; }
}

/* ===== BARRA SUPERIOR ===== */
.legal-barra {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(13, 27, 48, 0.55);
  backdrop-filter: saturate(140%) blur(14px);
  border-bottom: 1px solid rgba(244, 241, 234, 0.14);
}

.legal-barra-inner {
  max-width: 1180px;
  height: 64px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.legal-logo {
  font-family: 'Baskervville', Georgia, serif;
  font-size: 1.55rem;
  font-weight: 600;
  color: var(--legal-texto);
  text-decoration: none;
  letter-spacing: -0.01em;
  color: var(--legal-crema);
}

.legal-barra-sep { width: 1px; height: 20px; background: rgba(244, 241, 234, 0.25); }

.legal-barra-seccion {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--legal-crema-sec);
  text-decoration: none;
}

.legal-barra-volver {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--legal-crema-sec);
  text-decoration: none;
  transition: color 0.15s ease;
}

:is(.legal-barra-seccion, .legal-barra-volver):hover { color: #fff; }

/* ===== TÍTULOS ===== */
.legal-antetitulo {
  margin: 0 0 14px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--legal-oro);
}

.legal-titulo {
  margin: 0;
  font-family: 'Baskervville', Georgia, serif;
  font-weight: 500;
  font-size: clamp(2.6rem, 6vw, 4rem);
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--legal-crema);
}

.legal-titulo--doc { font-size: clamp(2rem, 4.5vw, 3rem); line-height: 1.12; }

.legal-bajada {
  max-width: 560px;
  margin: 18px 0 0;
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--legal-crema-sec);
}

/* ===== ÍNDICE ===== */
.legal-indice { padding-bottom: 120px; }

.legal-lista {
  list-style: none;
  max-width: 1132px;
  margin: 0 auto;
  padding: 8px 40px;
}

.legal-lista li + li { border-top: 1px solid var(--legal-linea); }

.legal-fila {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 32px;
  padding: 30px 4px;
  color: inherit;
  text-decoration: none;
}

.legal-fila-texto { display: flex; flex-direction: column; gap: 6px; }

.legal-fila-titulo {
  font-family: 'Baskervville', Georgia, serif;
  font-size: 1.6rem;
  font-weight: 500;
  line-height: 1.2;
}

.legal-fila-desc { font-size: 0.98rem; color: var(--legal-sec); }
.legal-fila-fecha { font-size: 0.88rem; color: var(--legal-tenue); white-space: nowrap; }

.legal-fila-flecha {
  color: var(--legal-tenue);
  transition: transform 0.2s ease, color 0.2s ease;
}

.legal-fila:hover .legal-fila-titulo { color: var(--legal-azul); }
.legal-fila:hover .legal-fila-flecha { color: var(--legal-azul); transform: translateX(4px); }

/* ===== DOCUMENTO ===== */
.legal-documento { padding-bottom: 96px; }

.legal-doc {
  max-width: 1132px;
  margin: 0 auto;
  padding: 0 56px;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 72px;
}

.legal-indice-lateral { padding-top: 56px; }

.legal-toc {
  position: sticky;
  top: 96px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding-bottom: 24px;
}

.legal-toc-titulo {
  margin: 0 0 12px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--legal-tenue);
}

.legal-toc-item {
  display: flex;
  gap: 8px;
  padding: 7px 0 7px 14px;
  border: 0;
  border-left: 2px solid var(--legal-linea);
  background: none;
  font: inherit;
  font-size: 0.9rem;
  line-height: 1.35;
  text-align: left;
  color: var(--legal-sec);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.legal-toc-item:hover { color: var(--legal-texto); }

.legal-toc-item--activo {
  color: var(--legal-texto);
  font-weight: 600;
  border-left-color: var(--legal-azul);
}

.legal-toc-num { min-width: 1.4em; color: var(--legal-tenue); font-variant-numeric: tabular-nums; }
.legal-toc-item--activo .legal-toc-num { color: var(--legal-azul); }

.legal-cuerpo { max-width: 740px; padding: 40px 0 72px; }

.legal-migas {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 24px;
  font-size: 0.88rem;
  color: var(--legal-crema-sec);
}

.legal-migas a { color: var(--legal-crema); text-decoration: none; }
.legal-migas a:hover { text-decoration: underline; }

.legal-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0 0;
  font-size: 0.92rem;
  color: var(--legal-crema-sec);
}

.legal-aviso {
  margin: 16px 0 8px;
  padding: 24px 28px;
  background: var(--legal-suave);
  border-left: 3px solid var(--legal-azul);
}

.legal-aviso-titulo {
  margin: 0 0 10px !important;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--legal-azul);
}

.legal-aviso p { margin: 0 0 12px; font-size: 1rem; line-height: 1.7; }
.legal-aviso p:last-child { margin-bottom: 0; }

.legal-seccion { padding-top: 44px; scroll-margin-top: 80px; }

.legal-seccion-titulo {
  margin: 0 0 16px;
  font-family: 'Baskervville', Georgia, serif;
  font-size: 1.6rem;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--legal-texto);
}

.legal-seccion-num { color: var(--legal-azul); margin-right: 4px; }

.legal-parrafo,
.legal-vinetas li {
  font-size: 1.03rem;
  line-height: 1.75;
  color: #2b3240;
}

.legal-parrafo { margin: 0 0 16px; }

.legal-parrafo strong,
.legal-vinetas strong,
.legal-aviso strong { font-weight: 700; color: var(--legal-texto); }

.legal-vinetas { margin: 0 0 16px; padding-left: 20px; }
.legal-vinetas li { margin-bottom: 8px; padding-left: 4px; }
.legal-vinetas li::marker { color: var(--legal-azul); }

.legal-tabla-envoltura { margin: 8px 0 20px; overflow-x: auto; }

.legal-tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
  line-height: 1.55;
}

.legal-tabla th {
  padding: 12px 14px;
  text-align: left;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--legal-sec);
  border-bottom: 1px solid var(--legal-texto);
}

.legal-tabla td {
  padding: 14px;
  vertical-align: top;
  border-bottom: 1px solid var(--legal-linea);
  color: #2b3240;
}

.legal-cierre {
  margin: 48px 0 0;
  padding-top: 24px;
  border-top: 1px solid var(--legal-linea);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--legal-sec);
}

.legal-pie { margin-top: 56px; }

.legal-pie-otro {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 4px 16px;
  padding: 24px 0;
  border-top: 1px solid var(--legal-linea);
  border-bottom: 1px solid var(--legal-linea);
  color: inherit;
  text-decoration: none;
}

.legal-pie-etiqueta {
  grid-column: 1 / -1;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--legal-tenue);
}

.legal-pie-titulo { font-family: 'Baskervville', Georgia, serif; font-size: 1.4rem; font-weight: 500; }
.legal-pie-otro .q-icon { color: var(--legal-tenue); transition: transform 0.2s ease, color 0.2s ease; }
.legal-pie-otro:hover .legal-pie-titulo,
.legal-pie-otro:hover .q-icon { color: var(--legal-azul); }
.legal-pie-otro:hover .q-icon { transform: translateX(4px); }

.legal-pie-contacto { margin: 24px 0 0; font-size: 0.92rem; color: var(--legal-sec); }
.legal-pie-contacto a { color: var(--legal-azul); }

/* Foco visible para teclado */
.legal :is(a, button):focus-visible {
  outline: 2px solid var(--legal-azul);
  outline-offset: 3px;
  border-radius: 2px;
}

.legal-barra :is(a, button):focus-visible,
.legal-portada :is(a, button):focus-visible { outline-color: var(--legal-crema); }

/* ===== RESPONSIVE ===== */
@media (max-width: 960px) {
  .legal-doc { grid-template-columns: minmax(0, 1fr); gap: 0; padding: 0 32px; }
  .legal-indice-lateral { display: none; }
  .legal-cuerpo { padding-top: 40px; }
}

@media (max-width: 640px) {
  .legal-barra-inner { padding: 0 16px; }
  .legal-barra-volver span { display: none; }
  .legal-portada { padding: 64px 16px 40px; }
  .legal-portada--doc { padding: 48px 16px 36px; }
  .legal-hoja { margin: 0 12px; }
  .legal-lista { padding: 4px 20px; }
  .legal-doc { padding: 0 20px; }
  .legal-fila { grid-template-columns: 1fr auto; gap: 12px; padding: 24px 0; }
  .legal-fila-fecha { grid-row: 2; grid-column: 1; }
  .legal-fila-flecha { grid-row: 1 / 3; grid-column: 2; }
  .legal-fila-titulo { font-size: 1.35rem; }
  .legal-aviso { padding: 20px; }
  .legal-seccion-titulo { font-size: 1.35rem; }

  /* La tabla se apila: cada celda con el nombre de su columna */
  .legal-tabla thead { display: none; }
  .legal-tabla tr { display: block; padding: 12px 0; border-bottom: 1px solid var(--legal-linea); }
  .legal-tabla td { display: block; padding: 4px 0; border: 0; }
  .legal-tabla td::before {
    content: attr(data-columna);
    display: block;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--legal-tenue);
  }
}

@media (prefers-reduced-motion: reduce) {
  .legal * { transition: none !important; animation: none !important; }
}
</style>
