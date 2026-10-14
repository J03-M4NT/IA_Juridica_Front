<template>
  <q-layout view="lHh Lpr fFf">
    <!-- Accesibilidad: primer elemento al tabular, lleva el foco al contenido -->
    <button type="button" class="saltar-contenido" @click="saltarAlContenido">Saltar al contenido</button>

    <!-- Panel lateral — abierto por defecto en desktop, drawer superpuesto
         en mobile. Sin show-if-above: así drawerOpen controla la
         visibilidad en TODOS los tamaños, y se puede plegar/desplegar
         también en desktop (antes show-if-above lo forzaba siempre
         visible ahí, ignorando el botón). -->
    <q-drawer
      :model-value="esEscritorio || drawerOpen"
      :mini="esEscritorio && !drawerOpen"
      :mini-width="76"
      :breakpoint="1023"
      :width="252"
      bordered
      class="app-sidebar"
      @update:model-value="val => { if (!esEscritorio) drawerOpen = val }"
    >
      <div class="sidebar-inner">

        <div class="sidebar-brand">
          <span class="sidebar-brand-text q-mini-drawer-hide" role="link" tabindex="0" @click="$router.push('/')" @keydown.enter="$router.push('/')">LexIT</span>
          <button
            type="button"
            class="sidebar-plegar"
            :aria-label="drawerOpen ? 'Plegar el panel lateral' : 'Desplegar el panel lateral'"
            :aria-expanded="drawerOpen"
            :title="drawerOpen ? 'Plegar panel (Ctrl + .)' : 'Desplegar panel (Ctrl + .)'"
            @click="alternarPanel"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>
              <path v-if="drawerOpen" d="M16 10l-2 2 2 2"/>
              <path v-else d="M14 10l2 2-2 2"/>
            </svg>
          </button>
        </div>

        <nav class="sidebar-nav">

          <router-link to="/app/consultas" class="sidebar-link" aria-label="Consultas"
            :class="{ 'sidebar-link--active': $route.path === '/app/consultas' }"
            @click="cerrarDrawerEnMobile">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="sidebar-link-texto q-mini-drawer-hide">Consultas</span>
            <q-tooltip v-if="esEscritorio && !drawerOpen" anchor="center right" self="center left" :offset="[12, 0]">Consultas</q-tooltip>
          </router-link>

          <router-link to="/app/analisis" class="sidebar-link" aria-label="Análisis"
            :class="{ 'sidebar-link--active': $route.path === '/app/analisis' }"
            @click="cerrarDrawerEnMobile">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>
              <circle cx="11.5" cy="14.5" r="2.5"/><path d="M13.3 16.3L15 18"/>
            </svg>
            <span class="sidebar-link-texto q-mini-drawer-hide">Análisis</span>
            <q-tooltip v-if="esEscritorio && !drawerOpen" anchor="center right" self="center left" :offset="[12, 0]">Análisis</q-tooltip>
          </router-link>

          <router-link to="/app/contratos" class="sidebar-link" aria-label="Contratos"
            :class="{ 'sidebar-link--active': $route.path === '/app/contratos' }"
            @click="cerrarDrawerEnMobile">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7h18"/><path d="M3 7l2-3h14l2 3"/><path d="M5 7v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7"/><path d="M9 12h6"/>
            </svg>
            <span class="sidebar-link-texto q-mini-drawer-hide">Contratos</span>
            <q-tooltip v-if="esEscritorio && !drawerOpen" anchor="center right" self="center left" :offset="[12, 0]">Contratos</q-tooltip>
          </router-link>

          <router-link to="/app/normas" class="sidebar-link" aria-label="Normas"
            :class="{ 'sidebar-link--active': $route.path === '/app/normas' }"
            @click="cerrarDrawerEnMobile">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span class="sidebar-link-texto q-mini-drawer-hide">Normas</span>
            <q-tooltip v-if="esEscritorio && !drawerOpen" anchor="center right" self="center left" :offset="[12, 0]">Normas</q-tooltip>
          </router-link>

          <router-link
            v-if="profileStore.isAdmin"
            to="/app/admin"
            class="sidebar-link"
            aria-label="Admin"
            :class="{ 'sidebar-link--active': $route.path === '/app/admin' }"
            @click="cerrarDrawerEnMobile">
            <!-- Sin ícono: espacio del ancho del ícono para que el texto quede
                 alineado con los demás ítems. -->
            <span class="sidebar-link-sin-icono q-mini-drawer-hide" aria-hidden="true"></span>
            <svg class="q-mini-drawer-only" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/>
            </svg>
            <span class="sidebar-link-texto q-mini-drawer-hide">Admin</span>
            <q-tooltip v-if="esEscritorio && !drawerOpen" anchor="center right" self="center left" :offset="[12, 0]">Admin</q-tooltip>
          </router-link>


        </nav>

        <!-- Separator -->
        <div class="sidebar-separator q-mini-drawer-hide" v-if="authStore.user"></div>

        <!-- Chat History -->
        <div class="sidebar-history q-mini-drawer-hide" v-if="authStore.user">
          <div class="history-header">
            <span class="history-title">Consultas Recientes</span>
            <q-btn flat dense round icon="add" size="sm" class="new-chat-btn" @click="nuevaConsulta" />
          </div>
          
          <div class="history-list">
            <div 
              v-for="sesion in consultasStore.historialSesiones" 
              :key="sesion.id"
              class="history-item"
              :class="{ 'history-item--active': consultasStore.sesionActualId === sesion.id }"
              @click="cargarConsulta(sesion.id)"
            >
              <span class="history-item-text">{{ sesion.titulo }}</span>
              <button
                type="button"
                class="history-item-delete"
                title="Borrar conversación"
                aria-label="Borrar conversación"
                @click.stop="borrarConsulta(sesion.id, sesion.titulo)"
              >
                <q-icon name="delete_outline" size="16px" />
              </button>
            </div>
          </div>
        </div>

        <div class="sidebar-footer">
          <div class="q-mini-drawer-hide">
            <auth-buttons />
          </div>
          <button
            type="button"
            class="sidebar-usuario-mini q-mini-drawer-only"
            aria-label="Desplegar el panel para ver tu cuenta"
            title="Tu cuenta"
            @click="alternarPanel"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>
            </svg>
          </button>
        </div>

      </div>
    </q-drawer>

    <!-- Barra superior del contenido: sección actual y subtítulo -->
    <q-header class="app-barra">
      <div class="app-barra-inner">
        <button
          v-if="!esEscritorio"
          type="button"
          class="app-barra-menu"
          aria-label="Abrir el menú"
          @click="drawerOpen = true"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16"/>
          </svg>
        </button>
        <!-- El nombre de la sección cambia con un fundido corto -->
        <transition name="barra-titulo" mode="out-in">
          <div :key="seccionActual.titulo" class="app-barra-texto">
            <span class="app-barra-titulo">{{ seccionActual.titulo }}</span>
            <span class="app-barra-sub">{{ seccionActual.subtitulo }}</span>
          </div>
        </transition>
      </div>
      <!-- Línea de avance que recorre la barra al cambiar de sección (decorativa) -->
      <span :key="route.path" class="app-barra-progreso" aria-hidden="true"></span>
    </q-header>

    <!-- Page content -->
    <q-page-container id="contenido-principal" class="page-container" tabindex="-1">
      <!-- Fondo de la app: blanco con retícula de puntos muy suave y una luz
           que sigue al mouse (solo decorativo, ver moverLuzFondo). -->
      <div ref="fondoRef" class="app-fondo" aria-hidden="true">
        <span class="app-fondo-luz"></span>
      </div>

      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" class="q-page" />
        </transition>
      </router-view>
    </q-page-container>

  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import AuthButtons from '../components/Auth/AuthButtons.vue'
import { useUserProfileStore } from '../stores/userProfile'
import { useConsultasStore } from '../stores/consultas-store'
import { useAnalisisContratosStore } from '../stores/analisis-contratos-store'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const consultasStore = useConsultasStore()
const authStore = useAuthStore()

watch(() => authStore.user, (user) => {
  if (user) {
    void consultasStore.cargarHistorial()
  } else {
    consultasStore.historialSesiones = []
    consultasStore.sesionActualId = null
  }
}, { immediate: true })

function nuevaConsulta() {
  consultasStore.nuevaSesion()
  if (router.currentRoute.value.path !== '/app/consultas') {
    void router.push('/app/consultas')
  }
  cerrarDrawerEnMobile()
}

function cargarConsulta(id: string) {
  consultasStore.cargarSesion(id)
  if (router.currentRoute.value.path !== '/app/consultas') {
    void router.push('/app/consultas')
  }
  cerrarDrawerEnMobile()
}

const $q = useQuasar()
const profileStore = useUserProfileStore()

function borrarConsulta(id: string, titulo: string) {
  $q.dialog({
    title: 'Borrar conversación',
    message: `¿Borrar "${titulo}"? Esta acción no se puede deshacer.`,
    // La app activa el modo oscuro de Quasar (boot/dark.ts) de forma
    // global vía la clase body--dark, y app.scss fuerza fondo blanco en
    // TODAS las .q-card (!important) — el resultado es texto claro (del
    // modo oscuro ambiental, que dark:false por sí solo no anula del
    // todo) sobre fondo blanco: invisible. class + :deep() más abajo
    // fuerza el color de texto explícito para este diálogo puntual.
    dark: false,
    class: 'borrar-consulta-dialog',
    cancel: { label: 'Cancelar', flat: true, noCaps: true, color: 'grey-8' },
    ok: { label: 'Borrar', color: 'negative', unelevated: true, noCaps: true },
    persistent: true
  }).onOk(() => {
    consultasStore.borrarSesion(id).catch(err => {
      console.error('No se pudo borrar la conversación:', err)
      $q.notify({ type: 'negative', message: 'No se pudo borrar la conversación. Intenta de nuevo.' })
    })
  })
}
// Abierto por defecto en desktop (mismo umbral que :breakpoint="1023" del
// q-drawer), cerrado por defecto en mobile — el valor solo se usa como
// estado inicial, después el botón hamburguesa/toggle lo controla.
const drawerOpen = ref($q.screen.width > 1023)

// Mientras se trabaja un documento en Análisis de Contratos, el menú
// lateral se oculta para dar más espacio (el botón de la flecha lo vuelve a
// mostrar). Al salir de esa vista, el menú vuelve a como estaba.
const analisisStore = useAnalisisContratosStore()
let drawerAntesDeTrabajo: boolean | null = null
watch(() => analisisStore.vistaTrabajoActiva, activa => {
  if (activa) {
    drawerAntesDeTrabajo = drawerOpen.value
    drawerOpen.value = false
  } else if (drawerAntesDeTrabajo !== null) {
    drawerOpen.value = drawerAntesDeTrabajo
    drawerAntesDeTrabajo = null
  }
})

// El panel lateral es un overlay en mobile — cerrarlo incondicionalmente
// al navegar evita que quede tapando la pantalla después de elegir una
// opción del menú.
// "Saltar al contenido": lleva el foco del teclado al área principal
function saltarAlContenido() {
  document.getElementById('contenido-principal')?.focus()
}

function cerrarDrawerEnMobile() {
  if (window.innerWidth < 1024) drawerOpen.value = false
}

// =========================
// PANEL LATERAL PLEGABLE POR USUARIO (como en el chat de Claude)
// En escritorio cada usuario decide si lo quiere desplegado o como riel de
// íconos; se recuerda en este navegador para su cuenta. Atajo: Ctrl + .
// (o Cmd + . en Mac). En celular sigue siendo un menú que se abre y cierra.
// =========================
const clavePanel = (uid: string) => `lexit.panelLateral.${uid}`

function leerPreferenciaPanel(uid: string): boolean | null {
  try {
    const valor = localStorage.getItem(clavePanel(uid))
    return valor === null ? null : valor === '1'
  } catch {
    return null
  }
}

function guardarPreferenciaPanel(abierto: boolean) {
  const uid = authStore.user?.uid
  if (!uid || !esEscritorio.value) return
  try {
    localStorage.setItem(clavePanel(uid), abierto ? '1' : '0')
  } catch {
    // Sin almacenamiento (modo privado): solo no se recuerda.
  }
}

function alternarPanel() {
  drawerOpen.value = !drawerOpen.value
  // Si el usuario lo cambia a mano mientras trabaja en Análisis, su
  // elección manda al salir de esa vista.
  drawerAntesDeTrabajo = null
  guardarPreferenciaPanel(drawerOpen.value)
}

watch(() => authStore.user?.uid, (uid) => {
  if (!uid || $q.screen.width <= 1023 || analisisStore.vistaTrabajoActiva) return
  const preferencia = leerPreferenciaPanel(uid)
  if (preferencia !== null) drawerOpen.value = preferencia
}, { immediate: true })

function atajoPanel(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key === '.') {
    if (!esEscritorio.value) return
    e.preventDefault()
    alternarPanel()
  }
}
onMounted(() => window.addEventListener('keydown', atajoPanel))
onUnmounted(() => window.removeEventListener('keydown', atajoPanel))

const handleScroll = () => { /* reserved for future scroll effects */ }
onMounted(() => window.addEventListener('scroll', handleScroll))
onUnmounted(() => window.removeEventListener('scroll', handleScroll))

// =========================
// FONDO INTERACTIVO (solo presentación)
// La luz y la retícula más marcada siguen al mouse; se actualiza una vez
// por cuadro. Con pantalla táctil no se activa.
// =========================
const fondoRef = ref<HTMLElement | null>(null)
let cuadroFondo = 0

function moverLuzFondo(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || cuadroFondo) return
  const { clientX, clientY } = event
  cuadroFondo = requestAnimationFrame(() => {
    cuadroFondo = 0
    const fondo = fondoRef.value
    if (!fondo) return
    fondo.style.setProperty('--mx', `${clientX}px`)
    fondo.style.setProperty('--my', `${clientY}px`)
    fondo.style.setProperty('--foco', '1')
  })
}

function apagarLuzFondo() {
  fondoRef.value?.style.setProperty('--foco', '0')
}

onMounted(() => {
  window.addEventListener('pointermove', moverLuzFondo, { passive: true })
  document.documentElement.addEventListener('mouseleave', apagarLuzFondo)
})

// Estilo plano (2D) también en menús, diálogos y avisos que Quasar monta
// en <body>: solo mientras se está dentro de la app (no en la Landing).
onMounted(() => document.body.classList.add('lexit-app-plana'))

// =========================
// BARRA SUPERIOR Y PANEL LATERAL (solo presentación)
// En escritorio el panel se pliega a un riel de íconos en vez de
// ocultarse; en celular sigue siendo un panel que se abre y cierra.
// =========================
const route = useRoute()
const esEscritorio = computed(() => $q.screen.width > 1023)

const SECCIONES: Record<string, { titulo: string; subtitulo: string }> = {
  '/app/consultas': { titulo: 'Consultas', subtitulo: 'Asistente jurídico · Derecho peruano' },
  '/app/analisis': { titulo: 'Análisis de contratos', subtitulo: 'Revisión jurídica de documentos' },
  '/app/contratos': { titulo: 'Gestión de contratos', subtitulo: 'Plantillas jurídicas · Derecho peruano' },
  '/app/normas': { titulo: 'Normas', subtitulo: 'Diario Oficial El Peruano' },
  '/app/admin': { titulo: 'Administración', subtitulo: 'Base jurídica y plantillas' }
}

const seccionActual = computed(() => SECCIONES[route.path] ?? { titulo: 'LexIT', subtitulo: 'IA jurídica · Derecho peruano' })
onUnmounted(() => document.body.classList.remove('lexit-app-plana'))

onUnmounted(() => {
  window.removeEventListener('pointermove', moverLuzFondo)
  document.documentElement.removeEventListener('mouseleave', apagarLuzFondo)
  if (cuadroFondo) cancelAnimationFrame(cuadroFondo)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Figtree:wght@400;500;600;700&display=swap');

/* ==============================
   Toggle del panel lateral (en todos los tamaños)
   ============================== */
.sidebar-toggle-btn {
  position: fixed;
  top: 18px;
  z-index: 4000;
  background: var(--lexit-blanco);
  color: var(--lexit-verde) !important;
  border: 1px solid var(--lexit-marfil);
  box-shadow: 0 2px 8px rgba(var(--lexit-verde-rgb), 0.10);
  transition: left 0.2s ease;
}

.sidebar-toggle-btn {
  transition: left 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.sidebar-toggle-btn:hover {
  background: var(--lexit-blanco-calido);
  transform: scale(1.06);
  box-shadow: 0 6px 16px -6px rgba(var(--lexit-verde-rgb), 0.35);
}

/* ==============================
   Panel lateral — Blanco cálido con un borde derecho fino en Marfil
   claro (colores en app.scss, --lexit-*). El :deep() de abajo es necesario porque el fondo
   real de Quasar en modo oscuro (activado globalmente en
   boot/dark.ts) vive en .q-drawer__content, no en la raíz .q-drawer
   donde cae la clase .app-sidebar — sin este override, esa capa
   interna se queda con el negro por defecto de Quasar.
   ============================== */
.app-sidebar {
  background: var(--lexit-blanco-calido) !important;
}

:deep(.app-sidebar .q-drawer__content) {
  background: var(--lexit-blanco-calido);
  border-right: 1px solid var(--lexit-marfil);
  color: var(--lexit-verde);
}

.sidebar-inner {
  position: relative;
  min-height: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 22px 16px 18px;
  /* Blanco cálido con una luz muy suave arriba */
  background:
    radial-gradient(120% 40% at 0% 0%, rgba(255, 255, 255, 0.9), transparent 70%),
    var(--lexit-blanco-calido);
  color: var(--lexit-verde);
  font-family: 'Baskervville', 'Figtree', sans-serif;
  overflow: hidden;
}

/* ---- Marca ---- */
.sidebar-brand {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 4px 8px 24px;
  cursor: pointer;
}

.sidebar-brand-text {
  position: relative;
  font-family: 'Times New Roman', Times, serif;
  font-size: 1.75rem;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--lexit-verde);
}

/* Línea fina que se dibuja bajo "LexIT" al pasar el mouse */
.sidebar-brand-text::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2px;
  height: 1px;
  background: var(--lexit-piedra);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.sidebar-brand:hover .sidebar-brand-text::after {
  transform: scaleX(1);
}

.sidebar-seccion {
  padding: 0 12px 8px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--lexit-texto-tenue);
}

/* ---- Navegación ---- */
.sidebar-nav {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sidebar-link {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 11px;
  font-size: 0.94rem;
  font-weight: 500;
  color: var(--lexit-texto-secundario);
  text-decoration: none;
  transition: color 0.2s ease, background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

/* Relleno que entra desde la izquierda al pasar el mouse */
.sidebar-link::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: var(--lexit-marfil-suave);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.sidebar-link:hover::after {
  transform: scaleX(1);
}

.sidebar-link svg {
  flex-shrink: 0;
  transition: transform 0.25s ease;
}

.sidebar-link:hover svg {
  transform: translateX(2px);
}

/* Admin no lleva ícono: este espacio (mismo ancho) alinea su texto. */
.sidebar-link-sin-icono {
  flex-shrink: 0;
  width: 19px;
}

.sidebar-link:hover {
  color: var(--lexit-verde);
}

.sidebar-link:focus-visible {
  outline: 2px solid var(--lexit-verde);
  outline-offset: 2px;
}

/* Activo: tarjeta blanca con sombra suave y barra a la izquierda */
.sidebar-link--active {
  background: var(--lexit-blanco);
  border-color: var(--lexit-marfil);
  color: var(--lexit-verde);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(var(--lexit-verde-rgb), 0.06), 0 8px 18px -12px rgba(var(--lexit-verde-rgb), 0.35);
}

.sidebar-link--active::after {
  display: none;
}

.sidebar-link--active::before {
  content: '';
  position: absolute;
  left: -17px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--lexit-terracota, var(--lexit-verde));
  animation: barraActiva 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes barraActiva {
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
}

/* Sin recuadro: solo el nombre del usuario (con su menú). */
.sidebar-footer {
  position: relative;
  margin-top: auto;
  padding: 8px 0 0;
}

.sidebar-separator {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--lexit-marfil) 20%, var(--lexit-marfil) 80%, transparent);
  margin: 18px 0 16px;
}

.sidebar-history {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-bottom: 12px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px 10px;
}

.history-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--lexit-texto-secundario);
  font-weight: 600;
}

.new-chat-btn {
  color: var(--lexit-verde);
  opacity: 0.75;
  border: 1px solid var(--lexit-marfil);
  transition: opacity 0.2s, transform 0.3s ease, background-color 0.2s;
}
.new-chat-btn:hover {
  opacity: 1;
  background: var(--lexit-blanco);
  transform: rotate(90deg);
}

.history-list {
  flex-grow: 1;
  overflow-y: auto;
  /* Se desvanece abajo en vez de cortarse en seco */
  -webkit-mask-image: linear-gradient(180deg, #000 calc(100% - 28px), transparent);
  mask-image: linear-gradient(180deg, #000 calc(100% - 28px), transparent);
  padding-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  scrollbar-width: thin;
  scrollbar-color: var(--lexit-marfil) transparent;
}
.history-list::-webkit-scrollbar {
  width: 4px;
}
.history-list::-webkit-scrollbar-thumb {
  background: var(--lexit-marfil);
  border-radius: 4px;
}

.history-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 8px 10px 8px 20px;
  border: 1px solid transparent;
  border-radius: 9px;
  font-size: 0.85rem;
  color: var(--lexit-texto-secundario);
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, border-color 0.2s, padding-left 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Puntito a la izquierda de cada conversación */
.history-item::before {
  content: '';
  position: absolute;
  left: 9px;
  top: 50%;
  width: 4px;
  height: 4px;
  margin-top: -2px;
  border-radius: 50%;
  background: var(--lexit-marfil);
  transition: background-color 0.2s, transform 0.2s;
}

.history-item:hover {
  background: var(--lexit-marfil-suave);
  color: var(--lexit-verde);
  padding-left: 22px;
}

.history-item:hover::before {
  background: var(--lexit-piedra);
  transform: scale(1.3);
}

.history-item--active {
  background: var(--lexit-blanco);
  border-color: var(--lexit-marfil);
  color: var(--lexit-verde);
  font-weight: 600;
}

.history-item--active::before {
  background: var(--lexit-verde);
  transform: scale(1.4);
}
.history-item-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Botón de borrar: aparece al pasar el mouse sobre la conversación. */
.history-item-delete {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-left: 4px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--lexit-texto-secundario);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background-color 0.15s, color 0.15s;
}
.history-item:hover .history-item-delete,
.history-item-delete:focus-visible {
  opacity: 1;
}
.history-item-delete:hover {
  background: rgba(194, 59, 46, 0.10);
  color: #C23B2E;
}
/* En pantallas táctiles no hay "hover": el botón se ve siempre. */
@media (hover: none) {
  .history-item-delete { opacity: 1; }
}

.sidebar-footer :deep(.auth-buttons) {
  width: 100%;
}

/* Botón del usuario en el panel claro: nombre en Verde bosque. Solo el
   botón visible aquí (no el menú desplegable, que Quasar renderiza
   aparte, flotando sobre toda la página). */
.sidebar-footer :deep(.user-profile-btn) {
  width: 100%;
  justify-content: flex-start;
  color: var(--lexit-verde) !important;
}

.sidebar-footer :deep(.user-profile-btn .text-primary) {
  color: var(--lexit-verde) !important;
}

.sidebar-footer :deep(.user-profile-btn .q-icon) {
  color: var(--lexit-texto-secundario) !important;
}

.sidebar-footer :deep(.user-profile-btn:hover) {
  background: var(--lexit-marfil-suave);
}

/* En el panel solo se muestra el nombre (sin el cuadro del avatar). */
.sidebar-footer :deep(.user-profile-btn .avatar-usuario) {
  display: none;
}

.sidebar-footer :deep(.user-profile-btn .text-profile-name) {
  margin-left: 0 !important;
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 0.98rem;
  font-weight: 600;
}

/* ==============================
   Page content
   ============================== */
/* Transparente: el fondo blanco (con la retícula) lo pinta .app-fondo */
.page-container {
  background: transparent;
}

.q-page {
  background: transparent;
  min-height: 100vh;
  padding: 34px 32px 60px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

/* ==============================
   Fondo de la app — blanco, retícula de puntos muy suave que se desvanece
   hacia abajo, dos manchas beige casi imperceptibles que flotan despacio y
   una luz que sigue al mouse revelando la retícula (--mx, --my, --foco los
   pone moverLuzFondo). Queda detrás de todo (z-index -1) y no recibe clics.
   ============================== */
.app-fondo {
  --mx: 70vw;
  --my: -30vh;
  --foco: 0;
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  background: var(--lexit-blanco);
}

.app-fondo::before,
.app-fondo::after {
  content: '';
  position: absolute;
  inset: 0;
  background-size: 26px 26px;
}

/* Retícula base, visible sobre todo arriba */
.app-fondo::before {
  background-image: radial-gradient(rgba(var(--lexit-verde-rgb), 0.07) 1px, transparent 1.3px);
  -webkit-mask-image: radial-gradient(ellipse 90% 70% at 60% 0%, #000 0%, transparent 75%);
  mask-image: radial-gradient(ellipse 90% 70% at 60% 0%, #000 0%, transparent 75%);
}

/* Retícula más marcada solo alrededor del mouse */
.app-fondo::after {
  background-image: radial-gradient(rgba(var(--lexit-verde-rgb), 0.12) 1px, transparent 1.3px);
  -webkit-mask-image: radial-gradient(170px circle at var(--mx) var(--my), #000 0%, transparent 70%);
  mask-image: radial-gradient(170px circle at var(--mx) var(--my), #000 0%, transparent 70%);
  /* Muy sutil: apenas se insinúa alrededor del mouse */
  opacity: calc(var(--foco) * 0.7);
  transition: opacity 0.8s ease;
}

.app-fondo-luz {
  position: absolute;
  left: 0;
  top: 0;
  width: 560px;
  height: 560px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(var(--lexit-marfil-rgb), 0.13), rgba(var(--lexit-marfil-rgb), 0.04) 55%, transparent);
  transform: translate3d(calc(var(--mx) - 50%), calc(var(--my) - 50%), 0);
  opacity: var(--foco);
  transition: opacity 0.8s ease;
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .app-fondo-luz,
  .app-fondo::after { display: none; }
}

@media (hover: none) {
  .app-fondo-luz,
  .app-fondo::after { display: none; }
}

/* ==============================
   Page transitions
   ============================== */
/* Antes, durante el "leave" (out-in), un handler en JS forzaba
   background:transparent en la página saliente — eso dejaba ver de golpe
   el fondo claro de .page-container por debajo (Consultas/Contratos/
   Normas ahora tienen fondo oscuro propio), un "flash" blanco notorio
   antes de que entrara la página siguiente. Con un fade simple de
   opacidad, cada página se desvanece sobre SU PROPIO fondo en vez de
   volverse transparente de golpe — sin ese salto de color. */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ==============================
   Responsive
   ============================== */
@media (max-width: 1023px) {
  .q-page {
    padding: 24px 20px 50px;
  }
}

@media (max-width: 480px) {
  .q-page {
    padding: 16px 12px 32px;
  }
}
</style>

<!-- Sin scoped a propósito: $q.dialog() (ver borrarConsulta) crea el
     diálogo por fuera del árbol de este componente (lo monta aparte, no
     lo declara en el template), así que el atributo de scope normal no
     es un mecanismo confiable para llegar a él. La clase
     "borrar-consulta-dialog" es única para este diálogo puntual (se la
     pone el propio $q.dialog()), así que esta regla global no puede
     afectar a ningún otro componente. -->
<style>
/* Panel lateral claro. El modo oscuro global de Quasar (boot/dark.ts)
   pinta el panel con .q-dark (fondo #1C1C1E, texto blanco); la regla
   scoped de arriba no llega a ese elemento, por eso va aquí, sin scoped.
   Solo afecta al panel con la clase "app-sidebar". */
.q-drawer.app-sidebar,
.q-drawer.app-sidebar.q-dark,
.app-sidebar .q-drawer__content {
  background: var(--lexit-blanco-calido) !important;
  color: var(--lexit-verde) !important;
}

.app-sidebar .q-drawer__content {
  border-right: 1px solid var(--lexit-marfil);
  box-shadow: 1px 0 0 rgba(255, 255, 255, 0.8), 8px 0 24px -20px rgba(var(--lexit-verde-rgb), 0.35);
}

/* Cada página pintaba su propio fondo blanco encima del de la app; solo la
   raíz de la página se deja transparente para que se vea .app-fondo (sus
   tarjetas y paneles conservan su color). */
.page-container > .q-page {
  background: transparent !important;
}

.q-drawer--bordered.app-sidebar {
  border-color: var(--lexit-marfil) !important;
}

.borrar-consulta-dialog .q-dialog__title,
.borrar-consulta-dialog .q-dialog__message {
  color: var(--lexit-verde) !important;
}

/* ==========================================================================
   PALETA DE LAS FUNCIONES (Consultas, Análisis, Contratos, Normas, Admin)
   Paleta corporativa (Documentos_Lexit/PaletasColores):
     Abyssal Anchorfish Blue #1B2632  texto, íconos y botones principales
     Blue Fantastic          #2C3B4D  hover de botones principales
     Palladian               #EEE9DF  barra lateral y superficies suaves
     Oatmeal                 #C9C1B1  bordes y separadores (en tinte)
     Burning Flame           #FFB162  detalles puntuales (subrayados, foco)
     Truffle Trouble         #A35139  indicador de la sección activa
   Se redefinen las mismas variables --lexit-* que ya usan todas las
   pantallas, solo mientras se está dentro de la app (clase del <body>
   que pone este layout): la Landing no las usa y no cambia. Las páginas
   siguen blancas. Los colores de estado (éxito, error, riesgo) no cambian.
   ========================================================================== */
body.lexit-app-plana {
  --lexit-blanco: #FFFFFF;
  --lexit-blanco-calido: #EEE9DF;
  --lexit-verde: #1B2632;
  --lexit-verde-rgb: 27, 38, 50;
  --lexit-texto-secundario: rgba(27, 38, 50, 0.72);
  --lexit-texto-tenue: rgba(27, 38, 50, 0.64);
  --lexit-marfil: #DFD9CE;
  --lexit-marfil-rgb: 201, 193, 177;
  --lexit-marfil-suave: rgba(238, 233, 223, 0.8);
  --lexit-piedra: #FFB162;
  --lexit-piedra-rgb: 255, 177, 98;
  --lexit-azul: #2C3B4D;
  --lexit-terracota: #A35139;

  /* Variables globales derivadas (app.scss las resuelve en :root con la
     paleta anterior; aquí se recalculan con la nueva). */
  --ink: #1B2632;
  --ink-soft: rgba(27, 38, 50, 0.85);
  --text-secondary: rgba(27, 38, 50, 0.72);
  --text-muted: rgba(27, 38, 50, 0.64);
  --accent: #1B2632;
  --accent-hover: #2C3B4D;
  --accent-soft: rgba(238, 233, 223, 0.8);
  --accent-soft-strong: #DFD9CE;
  --border-color: #DFD9CE;
  --border-color-strong: rgba(27, 38, 50, 0.18);
  --surface-alt: #EEE9DF;
  --surface-sunken: rgba(238, 233, 223, 0.8);

  /* Colores de marca de Quasar (botones color="primary"/"accent", etc.) */
  --q-primary: #1B2632;
  --q-secondary: #2C3B4D;
  --q-accent: #1B2632;
}

/* --------------------------------------------------------------------------
   DISEÑO LOVABLE: barra superior, panel lateral con riel plegado
   -------------------------------------------------------------------------- */
body.lexit-app-plana {
  /* Alto de la barra superior (incluye su borde inferior) */
  --lx-barra: 65px;
}

.q-header.app-barra {
  background: #FFFFFF !important;
  color: #1B2632 !important;
  border-bottom: 1px solid #E6E1D6;
}

.app-barra-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 64px;
  padding: 0 32px;
}

.app-barra-texto {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}

.app-barra-titulo {
  font-size: 1rem;
  font-weight: 600;
  color: #1B2632;
}

.app-barra-sub {
  font-size: 0.8rem;
  color: rgba(27, 38, 50, 0.62);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-barra-menu {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-left: -8px;
  border: none;
  border-radius: 6px;
  background: none;
  color: #1B2632;
  cursor: pointer;
}

.app-barra-menu:hover { background: #F4F2EC; }

@media (max-width: 1023px) {
  .app-barra-inner { padding: 0 16px; }
}

/* Las pantallas que usan el alto completo descuentan la barra superior */
body.lexit-app-plana .page-container .q-page.consultas-page {
  height: calc(100vh - 94px - var(--lx-barra));
}

body.lexit-app-plana .page-container .q-page.consultas-page.consultas-page--vacia {
  height: calc(100vh - var(--lx-barra));
  min-height: calc(100vh - var(--lx-barra));
}

body.lexit-app-plana .page-container .q-page.analisis-page {
  height: calc(100vh - 94px - var(--lx-barra));
}

body.lexit-app-plana .page-container .q-page.analisis-page.analisis-page--trabajo {
  height: calc(100vh - 24px - var(--lx-barra));
}

body.lexit-app-plana .normas-page .pdf-panel {
  top: var(--lx-barra);
}

body.lexit-app-plana .normas-page .sectores-filtro {
  top: var(--lx-barra);
}

body.lexit-app-plana .contratos-page .chat-con-documento > .chat-edicion-panel {
  top: calc(var(--lx-barra) + 16px);
  max-height: calc(100vh - var(--lx-barra) - 32px);
}

/* Panel lateral: marca + botón de plegar */
.app-sidebar .sidebar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 4px 22px 10px;
  margin-bottom: 14px;
  border-bottom: 1px solid rgba(238, 233, 223, 0.14);
}

.app-sidebar .sidebar-brand-text {
  font-size: 2.1rem !important;
  line-height: 1;
  color: #FFFFFF;
  cursor: pointer;
}

.app-sidebar .sidebar-brand-text::after { display: none; }

.sidebar-plegar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: none;
  border-radius: 6px;
  background: none;
  color: rgba(238, 233, 223, 0.85);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.sidebar-plegar:hover {
  background: rgba(238, 233, 223, 0.08);
  color: #FFFFFF;
}

/* Menú: sin el borde de "tarjeta"; activo con fondo azul y barrita Truffle */
.app-sidebar .sidebar-link {
  min-height: 48px;
  border: none;
  font-size: 0.97rem;
}

.app-sidebar .sidebar-link--active {
  border: none;
}

body.lexit-app-plana .app-sidebar .sidebar-link--active svg {
  color: inherit !important;
}

body.lexit-app-plana .app-sidebar {
  --lexit-terracota: #C0603F;
}

.sidebar-usuario-mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: 0 auto;
  border: none;
  border-radius: 6px;
  background: none;
  color: rgba(238, 233, 223, 0.85);
  cursor: pointer;
}

.sidebar-usuario-mini:hover { background: rgba(238, 233, 223, 0.08); }

/* Riel plegado (escritorio): solo íconos, centrados */
.app-sidebar.q-drawer--mini .sidebar-inner {
  padding-left: 12px;
  padding-right: 12px;
}

.app-sidebar.q-drawer--mini .sidebar-brand {
  justify-content: center;
  padding: 6px 0 22px;
}

.app-sidebar.q-drawer--mini .sidebar-link {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}

.app-sidebar.q-drawer--mini .sidebar-link--active::before {
  left: -12px;
}

.app-sidebar.q-drawer--mini .sidebar-footer {
  display: flex;
  justify-content: center;
}

/* --------------------------------------------------------------------------
   Barra lateral en Abyssal Anchorfish Blue (navy), texto Palladian y la
   sección activa en Blue Fantastic con acento Burning Flame. Se hace
   redefiniendo las mismas variables solo dentro del panel, así todas sus
   reglas (hover, activo, historial, usuario) toman los colores nuevos.
   -------------------------------------------------------------------------- */
body.lexit-app-plana .app-sidebar {
  --lexit-blanco-calido: #1B2632;          /* fondo del panel */
  --lexit-blanco: #2C3B4D;                 /* ítem activo */
  --lexit-verde: #EEE9DF;                  /* texto e íconos */
  --lexit-verde-rgb: 238, 233, 223;
  --lexit-texto-secundario: rgba(238, 233, 223, 0.74);
  --lexit-texto-tenue: rgba(238, 233, 223, 0.56);
  --lexit-marfil: rgba(238, 233, 223, 0.14);      /* bordes y separadores */
  --lexit-marfil-suave: rgba(238, 233, 223, 0.07); /* hover */
  --lexit-piedra: #FFB162;
  --lexit-terracota: #FFB162;              /* barrita de la sección activa */
}

body.lexit-app-plana .app-sidebar .sidebar-inner {
  background: #1B2632;
}

body.lexit-app-plana .app-sidebar .q-drawer__content {
  border-right-color: #1B2632;
}

/* Ícono de la sección activa y "+" en Burning Flame */
body.lexit-app-plana .app-sidebar .sidebar-link--active svg,
body.lexit-app-plana .app-sidebar .new-chat-btn {
  color: #FFB162 !important;
}

/* Punto de la conversación abierta en Burning Flame */
body.lexit-app-plana .app-sidebar .history-item--active::before {
  background: #FFB162;
}

/* Botón para abrir/cerrar el panel, a juego */
body.lexit-app-plana .sidebar-toggle-btn {
  background: #1B2632;
  color: #EEE9DF !important;
  border-color: #1B2632;
}

body.lexit-app-plana .sidebar-toggle-btn:hover {
  background: #2C3B4D;
}

/* --------------------------------------------------------------------------
   Contenido (blanco predominante) con acentos de la paleta
   -------------------------------------------------------------------------- */
/* Botones principales de Quasar en Blue Fantastic */
body.lexit-app-plana {
  --q-primary: #2C3B4D;
  --q-accent: #2C3B4D;
}

/* Foco de los campos de escritura: anillo Burning Flame suave */
body.lexit-app-plana .page-container.page-container.page-container :is(.composer-pill, .asistente-composer):focus-within {
  border-color: #FFB162 !important;
  box-shadow: 0 0 0 3px rgba(255, 177, 98, 0.22) !important;
}

/* Botón de enviar del chat en Blue Fantastic, hover en Truffle */
body.lexit-app-plana .page-container .ask-btn-round {
  background: #2C3B4D;
  color: #FFFFFF;
}

body.lexit-app-plana .page-container .ask-btn-round:hover:not(:disabled) {
  background: #A35139;
}

/* Paso actual (Contratos) y número de cita en Burning Flame / Truffle */
body.lexit-app-plana .page-container .paso--actual .paso-num {
  background: #FFB162;
  border-color: #FFB162;
  color: #1B2632;
}

body.lexit-app-plana .page-container .fuente-chip-num {
  background: #A35139;
  color: #FFFFFF;
}

/* Encabezados de tarjetas en Palladian (franja suave sobre el blanco) */
body.lexit-app-plana .page-container .lx-card-header {
  background: #F6F3ED;
}

/* --------------------------------------------------------------------------
   Tipografía corporativa: todo el texto corrido de la interfaz en
   Urbanist (fuente local, @font-face en app.scss; Figtree de respaldo) y
   serif solo para los títulos grandes de cada página y la marca. Los documentos (vista del Word, documento de Análisis, editor y
   vista previa del contrato) conservan su propia fuente, y los íconos
   (Material Icons) no se tocan.
   -------------------------------------------------------------------------- */
body.lexit-app-plana.lexit-app-plana.lexit-app-plana :is(.page-container, .app-sidebar, .q-menu, .q-dialog .q-card, .q-tooltip, .q-notification) *:not(:where(
  .q-icon, .material-icons, [class*="material-icons"], [class*="material-symbols"],
  .page-title, .page-title *, .sidebar-brand-text, .asistente-titular, .asistente-titular *,
  .vista-word, .vista-word *, .documento-word, .documento-word *, .documento-page, .documento-page *,
  .documento-texto, .documento-texto *, .documento-original, .documento-original *,
  .tiptap-editor, .tiptap-editor *, .document-preview, .document-preview *
)) {
  font-family: 'Urbanist', 'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

/* --------------------------------------------------------------------------
   Títulos y subtítulos en Baskervville (serif); el resto del texto queda en
   Urbanist (regla anterior). Se declara explícito porque varios subtítulos
   no tienen fuente propia y heredarían Urbanist de su contenedor.
   Las etiquetas chicas en mayúsculas (contadores, "Editando", "Plantillas"
   del menú, etc.) siguen en Urbanist.
   -------------------------------------------------------------------------- */
body.lexit-app-plana.lexit-app-plana.lexit-app-plana :is(.page-container, .app-sidebar, .q-menu, .q-dialog .q-card, .q-tooltip, .q-notification) :is(
  h1, h2, h3, h4,
  .page-title, .page-subtitle,
  .sidebar-brand-text,
  .lx-card-header-title, .vista-titulo-nombre,
  .asistente-titular, .asistente-bajada, .asistente-idea-titulo, .asistente-chat-nombre,
  .contrato-listo-titulo, .download-bar-titulo, .finalizando-titulo,
  .doc-en-vivo-titulo, .lx-dialogo-error-titulo,
  .analisis-vacio-titulo, .documento-panel-titulo, .elegir-titulo, .elegir-opcion-titulo,
  .sugerencias-aplicadas-titulo, .sugerencias-cargando-titulo, .sugerencias-error-titulo,
  .estado-titulo, .norma-titulo, .resumen-title, .destacada-titulo, .pdf-panel-titulo,
  .lx-dialog-title, .normas-grupo-titulo, .pd-title
):not(:where(.vista-word *, .documento-word *, .documento-page *, .documento-texto *, .documento-original *, .tiptap-editor *, .document-preview *)),
body.lexit-app-plana.lexit-app-plana.lexit-app-plana :is(.page-container, .app-sidebar, .q-menu, .q-dialog .q-card, .q-tooltip, .q-notification) :is(
  h1, h2, h3, h4,
  .page-title, .page-subtitle,
  .sidebar-brand-text,
  .lx-card-header-title, .vista-titulo-nombre,
  .asistente-titular, .asistente-bajada, .asistente-idea-titulo, .asistente-chat-nombre,
  .contrato-listo-titulo, .download-bar-titulo, .finalizando-titulo,
  .doc-en-vivo-titulo, .lx-dialogo-error-titulo,
  .analisis-vacio-titulo, .documento-panel-titulo, .elegir-titulo, .elegir-opcion-titulo,
  .sugerencias-aplicadas-titulo, .sugerencias-cargando-titulo, .sugerencias-error-titulo,
  .estado-titulo, .norma-titulo, .resumen-title, .destacada-titulo, .pdf-panel-titulo,
  .lx-dialog-title, .normas-grupo-titulo, .pd-title
) *:not(:where(
  .q-icon, .material-icons, [class*="material-icons"], [class*="material-symbols"],
  .lx-contador, .lx-formato, .vista-titulo-etiqueta
)):not(:where(.vista-word *, .documento-word *, .documento-page *, .documento-texto *, .documento-original *, .tiptap-editor *, .document-preview *)) {
  font-family: 'Baskervville', 'EB Garamond', Georgia, serif !important;
}

/* Aviso discreto dentro de la app con la paleta nueva (en la Landing
   sigue el de siempre). */
body.lexit-app-plana .q-notification.lexit-toast:not(.lexit-toast--error) {
  background: #EEE9DF;
  color: #1B2632;
  border-color: rgba(27, 38, 50, 0.14);
}

body.lexit-app-plana .q-notification.lexit-toast:not(.lexit-toast--error) .q-notification__icon {
  color: #A35139;
}

/* ==========================================================================
   ESTILO PLANO (2D) EN LAS FUNCIONES DE LA APP
   Rectángulos con las puntas apenas redondeadas (4px) y sin sombras en las
   pantallas de la app (Consultas, Análisis, Contratos, Normas, Admin), la
   barra lateral y los menús, diálogos, tooltips y avisos que abren.
   Excepción: el "dock" del chat (campo para escribir de Consultas y
   Análisis, y el del asistente de Contratos) conserva su forma redonda.
   No alcanza a la Landing: depende de .page-container / .app-sidebar (solo
   existen en este layout) o de la clase lexit-app-plana del <body> (se
   quita al salir de la app). El selector repite la clase para ganarle a
   las reglas de cada página (algunas usan !important).
   ========================================================================== */
.page-container.page-container.page-container,
.page-container.page-container.page-container *:not(:where(.composer-pill, .composer-pill *, .asistente-composer, .asistente-composer *)),
.page-container.page-container.page-container *:not(:where(.composer-pill, .composer-pill *, .asistente-composer, .asistente-composer *))::before,
.page-container.page-container.page-container *:not(:where(.composer-pill, .composer-pill *, .asistente-composer, .asistente-composer *))::after,
.app-sidebar.app-sidebar.app-sidebar,
.app-sidebar.app-sidebar.app-sidebar *,
.app-sidebar.app-sidebar.app-sidebar *::before,
.app-sidebar.app-sidebar.app-sidebar *::after,
.sidebar-toggle-btn.sidebar-toggle-btn.sidebar-toggle-btn,
.sidebar-toggle-btn.sidebar-toggle-btn.sidebar-toggle-btn *,
.sidebar-toggle-btn.sidebar-toggle-btn.sidebar-toggle-btn *::before,
.sidebar-toggle-btn.sidebar-toggle-btn.sidebar-toggle-btn *::after,
body.lexit-app-plana.lexit-app-plana :is(.q-menu, .q-dialog .q-card, .q-tooltip, .q-notification),
body.lexit-app-plana.lexit-app-plana :is(.q-menu, .q-dialog .q-card, .q-tooltip, .q-notification) *,
body.lexit-app-plana.lexit-app-plana :is(.q-menu, .q-dialog .q-card, .q-tooltip, .q-notification) *::before,
body.lexit-app-plana.lexit-app-plana :is(.q-menu, .q-dialog .q-card, .q-tooltip, .q-notification) *::after {
  border-radius: 4px !important;
  box-shadow: none !important;
  text-shadow: none !important;
}

/* Dock del chat: forma redonda de siempre, pero plano (sin sombra); al
   escribir, solo un anillo suave. */
.page-container.page-container.page-container :is(.composer-pill, .asistente-composer),
.page-container.page-container.page-container :is(.composer-pill, .asistente-composer) * {
  box-shadow: none !important;
}

.page-container.page-container.page-container :is(.composer-pill, .asistente-composer):focus-within {
  box-shadow: 0 0 0 3px var(--lexit-marfil-suave) !important;
}

/* Se mantienen circulares solo los puntitos animados, el spinner de Normas,
   el check de "contrato listo" y la luz/manchas del fondo (si fueran
   rectángulos dejarían de leerse como lo que son). */
.page-container.page-container.page-container :is(
  .pensando-marca > span,
  .lx-pensando-puntos span,
  .typing-dots span,
  .asistente-insignia-punto,
  .asistente-estado-punto,
  .doc-en-vivo-latido,
  .spinner,
  .contrato-listo-check,
  .app-fondo-luz
),
.page-container.page-container.page-container :is(
  .pensando-marca,
  .asistente-insignia-punto,
  .asistente-estado-punto--activo
)::before,
.page-container.page-container.page-container :is(
  .pensando-marca,
  .asistente-insignia-punto,
  .asistente-estado-punto--activo
)::after,
.app-sidebar.app-sidebar.app-sidebar .history-item::before {
  border-radius: 50% !important;
}

/* ==========================================================================
   ESTILO MODERNO E INTERACTIVO (inspirado en apps fintech tipo Revolut)
   Solo presentación: tarjetas con esquinas amplias, botones tipo píldora,
   barra superior translúcida, elevación al pasar el mouse, "presión" al
   hacer clic y entradas suaves escalonadas. Va después de la regla plana
   y con un selector más específico para ganarle donde corresponde. Las
   animaciones solo corren si el sistema no pide reducir movimiento.
   ========================================================================== */
body.lexit-app-plana {
  --lx-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --lx-radio-tarjeta: 20px;
  --lx-radio-fila: 14px;
  --lx-sombra-hover: 0 18px 40px -18px rgba(27, 38, 50, 0.28), 0 2px 6px -2px rgba(27, 38, 50, 0.08);
}

/* --- Barra superior translúcida (efecto vidrio) --- */
body.lexit-app-plana .q-header.app-barra {
  background: rgba(255, 255, 255, 0.78) !important;
  -webkit-backdrop-filter: saturate(1.6) blur(16px);
  backdrop-filter: saturate(1.6) blur(16px);
  border-bottom-color: rgba(27, 38, 50, 0.08);
}

body.lexit-app-plana .app-barra-titulo {
  font-size: 1.05rem;
  letter-spacing: -0.01em;
}

/* --- Tarjetas y superficies: esquinas amplias --- */
.page-container.page-container.page-container.page-container :is(
  .lx-card,
  .norma-card,
  .normas-banner,
  .subir-zona,
  .sugerencia-card,
  .sugerencias-rail,
  .resumen-card,
  .estado-card,
  .plantillas-disponibles,
  .asistente-plantilla,
  .asistente-idea,
  .fuente-detalle,
  .norma-resumen,
  .sugerencias-error-state
) {
  border-radius: var(--lx-radio-tarjeta) !important;
}

/* La cabecera de la tarjeta sigue la curva de arriba */
.page-container.page-container.page-container.page-container .lx-card > .lx-card-header {
  border-radius: var(--lx-radio-tarjeta) var(--lx-radio-tarjeta) 0 0 !important;
}

/* Filas, burbujas y bloques medianos */
.page-container.page-container.page-container.page-container :is(
  .plantilla-fila,
  .metrica-bloque,
  .msg-bubble-user,
  .chat-edicion-burbuja,
  .asistente-bloque--user,
  .subir-icono,
  .normas-cifra,
  .documento-aviso,
  .vista-aviso,
  .download-aviso
) {
  border-radius: var(--lx-radio-fila) !important;
}

/* Botones y chips: forma de píldora */
.page-container.page-container.page-container.page-container :is(
  .q-btn,
  .subir-boton,
  .lx-btn-sutil,
  .lx-action-btn,
  .refresh-btn,
  .open-btn,
  .pdf-panel-boton,
  .sector-chip,
  .asistente-chip,
  .acceso-rapido,
  .paginador-btn,
  .sugerencia-aplicar,
  .sugerencia-ver,
  .sugerencia-deshacer,
  .sugerencias-reintentar-btn,
  .norma-resumen-reintentar,
  .especialidad-selector,
  .fuente-chip,
  .panel-tab,
  .documento-tab,
  .plantillas-actualizar,
  .msg-action-btn,
  .riesgo-badge,
  .norma-sector,
  .asistente-rotulo
),
.page-container.page-container.page-container.page-container .q-btn .q-focus-helper {
  border-radius: 999px !important;
}

/* Menús, diálogos y avisos que se abren encima */
body.lexit-app-plana.lexit-app-plana.lexit-app-plana .q-dialog .q-card {
  border-radius: var(--lx-radio-tarjeta) !important;
  box-shadow: 0 30px 80px -24px rgba(27, 38, 50, 0.35) !important;
}

body.lexit-app-plana.lexit-app-plana.lexit-app-plana :is(.q-menu, .q-notification) {
  border-radius: 16px !important;
  box-shadow: 0 16px 40px -16px rgba(27, 38, 50, 0.25) !important;
}

body.lexit-app-plana.lexit-app-plana.lexit-app-plana .q-menu .q-item {
  border-radius: 10px !important;
}

body.lexit-app-plana.lexit-app-plana.lexit-app-plana .q-tooltip {
  border-radius: 8px !important;
}

/* Barra lateral: opciones con esquinas suaves */
.app-sidebar.app-sidebar.app-sidebar.app-sidebar :is(
  .sidebar-link,
  .history-item,
  .new-chat-btn,
  .sidebar-plegar,
  .sidebar-usuario-mini
) {
  border-radius: 12px !important;
}

.app-sidebar.app-sidebar.app-sidebar.app-sidebar .sidebar-link--active::before {
  border-radius: 999px !important;
}

/* --- Interacción: elevación al pasar el mouse --- */
.page-container :is(
  .norma-card,
  .plantilla-fila,
  .asistente-plantilla,
  .asistente-idea,
  .sugerencia-card,
  .metrica-bloque,
  .subir-zona
) {
  transition:
    transform 0.35s var(--lx-ease),
    box-shadow 0.35s var(--lx-ease),
    background-color 0.25s ease,
    border-color 0.25s ease;
}

@media (hover: hover) {
  .page-container.page-container.page-container.page-container :is(
    .norma-card,
    .asistente-plantilla,
    .asistente-idea,
    .sugerencia-card
  ):hover {
    transform: translateY(-3px);
    box-shadow: var(--lx-sombra-hover) !important;
  }

  .page-container.page-container.page-container.page-container :is(.plantilla-fila, .metrica-bloque):hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px -18px rgba(27, 38, 50, 0.3) !important;
  }

  .page-container.page-container.page-container.page-container .subir-zona:hover {
    transform: scale(1.006);
  }
}

/* Botones: crecen un poco al pasar el mouse y se "hunden" al hacer clic */
.page-container :is(
  .q-btn,
  .subir-boton,
  .lx-btn-sutil,
  .lx-action-btn,
  .refresh-btn,
  .open-btn,
  .pdf-panel-boton,
  .sector-chip,
  .asistente-chip,
  .acceso-rapido,
  .paginador-btn,
  .sugerencia-aplicar,
  .sugerencia-ver,
  .especialidad-selector,
  .fuente-chip,
  .ask-btn-round,
  .asistente-composer-enviar,
  .plantilla-fila
),
.app-sidebar :is(.sidebar-link, .new-chat-btn, .history-item) {
  transition-property: transform, background-color, color, border-color, box-shadow, opacity;
  transition-duration: 0.25s;
  transition-timing-function: var(--lx-ease);
}

.page-container :is(
  .q-btn,
  .subir-boton,
  .lx-btn-sutil,
  .lx-action-btn,
  .refresh-btn,
  .open-btn,
  .pdf-panel-boton,
  .sector-chip,
  .asistente-chip,
  .acceso-rapido,
  .paginador-btn,
  .sugerencia-aplicar,
  .sugerencia-ver,
  .especialidad-selector,
  .fuente-chip,
  .ask-btn-round,
  .asistente-composer-enviar,
  .plantilla-fila
):active:not(:disabled),
.app-sidebar :is(.sidebar-link, .new-chat-btn, .history-item):active {
  transform: scale(0.96);
  transition-duration: 0.1s;
}

/* Accesos rápidos de Consultas como chips suaves */
.page-container .acceso-rapido {
  padding: 8px 16px;
}

@media (hover: hover) {
  .page-container .acceso-rapido:hover {
    background: #F2EFE8;
  }

  .page-container :is(.subir-boton, .ask-btn-round:not(:disabled), .asistente-composer-enviar:not(:disabled)):hover {
    transform: translateY(-1px) scale(1.03);
  }

  .app-sidebar .sidebar-link:not(.sidebar-link--active):hover {
    transform: translateX(3px);
  }
}

/* "Usar →" y las flechas avanzan un poco al pasar sobre la fila */
.page-container :is(.plantilla-fila-usar, .norma-titulo-flecha) {
  display: inline-block;
  transition: transform 0.3s var(--lx-ease);
}

@media (hover: hover) {
  .page-container .plantilla-fila:hover .plantilla-fila-usar,
  .page-container .norma-card:hover .norma-titulo-flecha {
    transform: translateX(4px);
  }
}

/* Campo de consulta: se eleva al escribir */
.page-container :is(.composer-pill, .asistente-composer) {
  transition: background-color 0.25s ease, border-color 0.25s ease, transform 0.35s var(--lx-ease);
}

.page-container.page-container.page-container :is(.composer-pill, .asistente-composer):focus-within {
  box-shadow: 0 0 0 4px var(--lexit-marfil-suave), 0 18px 40px -22px rgba(27, 38, 50, 0.35) !important;
}

/* --- Títulos con más presencia --- */
.page-container :is(.page-title, .asistente-titular) {
  letter-spacing: -0.02em;
}

/* --- Animaciones de entrada (solo si no se pidió reducir movimiento) --- */
@keyframes lx-aparecer {
  from {
    opacity: 0;
    transform: translateY(16px);
    filter: blur(6px);
  }
  to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}

@keyframes lx-aparecer-suave {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: no-preference) {
  /* Cambio de sección: la página entra deslizando y enfocando */
  .fade-enter-active {
    transition: opacity 0.4s var(--lx-ease), transform 0.5s var(--lx-ease), filter 0.4s var(--lx-ease);
  }

  .fade-leave-active {
    transition: opacity 0.15s ease, transform 0.15s ease;
  }

  .fade-enter-from {
    opacity: 0;
    transform: translateY(14px);
    filter: blur(4px);
  }

  /* Encabezados y portadas */
  .page-container :is(
    .page-header,
    .page-saludo,
    .asistente-rotulo,
    .asistente-titular,
    .normas-banner,
    .subir-zona,
    .sectores-filtro
  ) {
    animation: lx-aparecer 0.7s var(--lx-ease) backwards;
  }

  .page-container :is(.page-saludo, .asistente-titular) { animation-delay: 0.08s; }
  .page-container :is(.subir-zona, .sectores-filtro) { animation-delay: 0.16s; }

  .page-container .consultas-page--vacia .input-area {
    animation: lx-aparecer 0.7s var(--lx-ease) 0.18s backwards;
  }

  /* Listas: cada elemento entra un poco después del anterior */
  .page-container :is(
    .accesos-rapidos > *,
    .asistente-chips > *,
    .plantilla-fila,
    .norma-card,
    .sector-chip,
    .metrica-bloque,
    .sugerencia-card,
    .normas-cifra
  ) {
    animation: lx-aparecer-suave 0.55s var(--lx-ease) backwards;
    animation-delay: 0.3s;
  }

  .page-container :is(.accesos-rapidos > *, .asistente-chips > *, .plantilla-fila, .norma-card, .sector-chip, .metrica-bloque, .sugerencia-card, .normas-cifra):nth-child(1) { animation-delay: 0.22s; }
  .page-container :is(.accesos-rapidos > *, .asistente-chips > *, .plantilla-fila, .norma-card, .sector-chip, .metrica-bloque, .sugerencia-card, .normas-cifra):nth-child(2) { animation-delay: 0.27s; }
  .page-container :is(.accesos-rapidos > *, .asistente-chips > *, .plantilla-fila, .norma-card, .sector-chip, .metrica-bloque, .sugerencia-card, .normas-cifra):nth-child(3) { animation-delay: 0.32s; }
  .page-container :is(.accesos-rapidos > *, .asistente-chips > *, .plantilla-fila, .norma-card, .sector-chip, .metrica-bloque, .sugerencia-card, .normas-cifra):nth-child(4) { animation-delay: 0.37s; }
  .page-container :is(.accesos-rapidos > *, .asistente-chips > *, .plantilla-fila, .norma-card, .sector-chip, .metrica-bloque, .sugerencia-card, .normas-cifra):nth-child(5) { animation-delay: 0.42s; }
  .page-container :is(.accesos-rapidos > *, .asistente-chips > *, .plantilla-fila, .norma-card, .sector-chip, .metrica-bloque, .sugerencia-card, .normas-cifra):nth-child(6) { animation-delay: 0.47s; }
  .page-container :is(.accesos-rapidos > *, .asistente-chips > *, .plantilla-fila, .norma-card, .sector-chip, .metrica-bloque, .sugerencia-card, .normas-cifra):nth-child(n+7) { animation-delay: 0.52s; }

  /* Normas: las tarjetas de más abajo aparecen al llegar a ellas con el
     scroll (en navegadores que lo soportan; en el resto, entrada normal). */
  @supports (animation-timeline: view()) {
    .page-container .norma-card:nth-child(n+7) {
      animation: lx-aparecer-suave linear backwards;
      animation-delay: 0s;
      animation-timeline: view();
      animation-range: entry 0% entry 45%;
    }
  }

  /* Mensajes del chat: cada uno entra al aparecer */
  .page-container :is(.msg-block, .chat-edicion-fila, .asistente-bloque) {
    animation: lx-aparecer-suave 0.45s var(--lx-ease) backwards;
  }

  /* Ventanas emergentes: entran con un leve zoom */
  body.lexit-app-plana .q-dialog .q-card {
    animation: lx-aparecer 0.45s var(--lx-ease) backwards;
  }
}

/* ==========================================================================
   ESTILO APPLE: sobrio, corporativo y con mucho aire
   Se apoya en el bloque anterior y lo refina: lienzo gris muy claro
   (#F5F5F7) con tarjetas blancas de borde finísimo y sombra difusa,
   controles segmentados, anillos de foco suaves, movimiento contenido
   (sin desenfoques ni saltos) y la barra superior como vidrio esmerilado.
   Mantiene la paleta (navy, beige, naranja) y la tipografía (Baskervville
   en títulos, Urbanist en el texto). Solo presentación.
   ========================================================================== */
body.lexit-app-plana {
  --lx-ease: cubic-bezier(0.25, 0.1, 0.25, 1);
  --lx-ease-salida: cubic-bezier(0.16, 1, 0.3, 1);
  --lx-lienzo: #F5F5F7;
  --lx-linea: rgba(0, 0, 0, 0.07);
  --lx-radio-tarjeta: 18px;
  --lx-radio-fila: 12px;
  --lx-sombra-tarjeta: 0 1px 2px rgba(27, 38, 50, 0.04), 0 6px 20px -6px rgba(27, 38, 50, 0.08);
  --lx-sombra-hover: 0 2px 4px rgba(27, 38, 50, 0.04), 0 16px 36px -12px rgba(27, 38, 50, 0.16);
  --lx-foco: 0 0 0 4px rgba(44, 59, 77, 0.16);
}

/* --- Lienzo: gris Apple liso, sin retícula ni luz que sigue al mouse --- */
body.lexit-app-plana .app-fondo {
  background: var(--lx-lienzo);
}

body.lexit-app-plana .app-fondo::before,
body.lexit-app-plana .app-fondo::after,
body.lexit-app-plana .app-fondo-luz {
  display: none;
}

/* Cada página pintaba su propio fondo blanco: pasa al mismo lienzo gris
   (solo el fondo; tarjetas y superficies siguen blancas). */
body.lexit-app-plana .page-container :is(.consultas-page, .analisis-page) {
  --lc-bg: var(--lx-lienzo);
}

body.lexit-app-plana .page-container .contratos-page {
  --lx-bg: var(--lx-lienzo);
}

body.lexit-app-plana .page-container .normas-page {
  --ln-bg: var(--lx-lienzo);
}

/* --- Barra superior: vidrio esmerilado sobre el lienzo --- */
body.lexit-app-plana .q-header.app-barra {
  background: rgba(245, 245, 247, 0.72) !important;
  -webkit-backdrop-filter: saturate(1.8) blur(20px);
  backdrop-filter: saturate(1.8) blur(20px);
  border-bottom: 1px solid var(--lx-linea);
}

body.lexit-app-plana .app-barra-titulo {
  font-weight: 600;
  letter-spacing: -0.015em;
}

body.lexit-app-plana .app-barra-sub {
  color: rgba(27, 38, 50, 0.5);
}

/* --- Tarjetas blancas: borde finísimo y sombra difusa --- */
.page-container.page-container.page-container.page-container :is(
  .lx-card,
  .norma-card,
  .subir-zona,
  .sugerencia-card,
  .sugerencias-rail,
  .resumen-card,
  .estado-card,
  .plantillas-disponibles,
  .norma-resumen,
  .sugerencias-error-state
) {
  background-color: #FFFFFF;
  border: 1px solid var(--lx-linea) !important;
  box-shadow: var(--lx-sombra-tarjeta) !important;
}

/* La zona de carga conserva su borde punteado (indica "suelta aquí") */
.page-container.page-container.page-container.page-container .subir-zona {
  border: 1.5px dashed rgba(27, 38, 50, 0.2) !important;
  box-shadow: none !important;
}

.page-container.page-container.page-container.page-container :is(.subir-zona:hover, .subir-zona--arrastrando) {
  border-color: rgba(27, 38, 50, 0.45) !important;
  background-color: #FFFFFF;
}

/* Cabecera de tarjeta: blanca, separada por una línea fina */
body.lexit-app-plana .page-container .lx-card-header {
  background: #FFFFFF;
  border-bottom: 1px solid var(--lx-linea);
}

/* Filas de la lista de plantillas: separadores finos, fondo al pasar */
.page-container.page-container.page-container.page-container .plantilla-fila {
  border-color: var(--lx-linea) !important;
}

@media (hover: hover) {
  .page-container.page-container.page-container.page-container .plantilla-fila:hover {
    transform: none;
    background-color: #F5F5F7;
    box-shadow: none !important;
  }
}

/* Elevación al pasar: más contenida, como en las tarjetas de Apple */
@media (hover: hover) {
  .page-container.page-container.page-container.page-container :is(
    .norma-card,
    .asistente-plantilla,
    .asistente-idea,
    .sugerencia-card
  ):hover {
    transform: translateY(-2px);
    box-shadow: var(--lx-sombra-hover) !important;
  }

  .page-container.page-container.page-container.page-container .metrica-bloque:hover {
    transform: none;
    box-shadow: none !important;
  }

  .page-container.page-container.page-container.page-container .subir-zona:hover {
    transform: none;
  }

  .page-container :is(.subir-boton, .ask-btn-round:not(:disabled), .asistente-composer-enviar:not(:disabled)):hover {
    transform: none;
  }

  .app-sidebar .sidebar-link:not(.sidebar-link--active):hover {
    transform: none;
  }

  .page-container .acceso-rapido:hover {
    background: rgba(27, 38, 50, 0.05);
  }
}

/* Presión al hacer clic: leve */
.page-container :is(
  .q-btn,
  .subir-boton,
  .lx-btn-sutil,
  .lx-action-btn,
  .refresh-btn,
  .open-btn,
  .pdf-panel-boton,
  .sector-chip,
  .asistente-chip,
  .acceso-rapido,
  .paginador-btn,
  .sugerencia-aplicar,
  .sugerencia-ver,
  .especialidad-selector,
  .fuente-chip,
  .ask-btn-round,
  .asistente-composer-enviar,
  .plantilla-fila
):active:not(:disabled),
.app-sidebar :is(.sidebar-link, .new-chat-btn, .history-item):active {
  transform: scale(0.98);
}

/* --- Campo de consulta: blanco, borde fino, foco con anillo suave --- */
.page-container.page-container.page-container.page-container :is(.composer-pill, .asistente-composer) {
  background: #FFFFFF;
  border: 1px solid var(--lx-linea);
  box-shadow: var(--lx-sombra-tarjeta) !important;
}

.page-container.page-container.page-container.page-container :is(.composer-pill, .asistente-composer):focus-within {
  border-color: rgba(44, 59, 77, 0.35);
  box-shadow: var(--lx-foco), var(--lx-sombra-tarjeta) !important;
}

/* Foco de teclado en botones y enlaces: anillo suave, no contorno duro */
.page-container :is(button, a, [role="tab"], .q-btn):focus-visible {
  outline: none;
  box-shadow: var(--lx-foco) !important;
}

/* --- Controles segmentados (pestañas de Análisis y de Editar contrato) --- */
.page-container.page-container.page-container.page-container :is(.documento-tabs, .panel-tabs, .lx-tabs, .periodo-segmento) {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border: none;
  border-radius: 10px !important;
  background: rgba(118, 118, 128, 0.12);
}

.page-container.page-container.page-container.page-container :is(.documento-tab, .panel-tab, .lx-tabs .q-tab, .periodo-opcion) {
  border: none;
  border-radius: 8px !important;
  background: transparent;
  color: rgba(27, 38, 50, 0.72);
  transition: background-color 0.2s var(--lx-ease), color 0.2s var(--lx-ease), box-shadow 0.2s var(--lx-ease);
}

.page-container.page-container.page-container.page-container :is(.documento-tab--active, .panel-tab--activa, .lx-tabs .q-tab--active, .periodo-opcion--activa) {
  background: #FFFFFF;
  color: #1B2632 !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 0.5px rgba(0, 0, 0, 0.04) !important;
}

.page-container.page-container.page-container.page-container :is(.documento-tab, .panel-tab, .lx-tabs .q-tab)::after,
.page-container .lx-tabs .q-tab__indicator {
  display: none;
}

/* --- Barra lateral: resaltado relleno, sin la barrita lateral --- */
.app-sidebar.app-sidebar.app-sidebar.app-sidebar :is(.sidebar-link, .history-item, .new-chat-btn, .sidebar-plegar, .sidebar-usuario-mini) {
  border-radius: 10px !important;
}

body.lexit-app-plana .app-sidebar .sidebar-link--active::before {
  display: none;
}

body.lexit-app-plana .app-sidebar .sidebar-link--active {
  background: rgba(255, 255, 255, 0.12) !important;
}

body.lexit-app-plana .app-sidebar .sidebar-link:not(.sidebar-link--active):hover {
  background: rgba(255, 255, 255, 0.06);
}

/* --- Títulos: más grandes y con el interletrado cerrado de Apple --- */
.page-container :is(.page-title, .asistente-titular) {
  letter-spacing: -0.025em;
  line-height: 1.08;
}

.page-container :is(.page-subtitle, .page-saludo) {
  color: rgba(27, 38, 50, 0.56);
}

/* --- Menús y ventanas: vidrio claro --- */
body.lexit-app-plana.lexit-app-plana.lexit-app-plana .q-menu {
  background: rgba(255, 255, 255, 0.86);
  -webkit-backdrop-filter: saturate(1.8) blur(20px);
  backdrop-filter: saturate(1.8) blur(20px);
  border: 1px solid var(--lx-linea);
  border-radius: 14px !important;
  box-shadow: 0 12px 40px -8px rgba(0, 0, 0, 0.18) !important;
}

body.lexit-app-plana.lexit-app-plana.lexit-app-plana .q-dialog .q-card {
  border-radius: 18px !important;
  box-shadow: 0 24px 70px -12px rgba(0, 0, 0, 0.28) !important;
}

/* --- Movimiento contenido: sin desenfoque, desplazamiento corto --- */
@keyframes lx-aparecer {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes lx-aparecer-suave {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .fade-enter-active {
    transition: opacity 0.45s var(--lx-ease-salida), transform 0.55s var(--lx-ease-salida);
  }

  .fade-enter-from {
    opacity: 0;
    transform: translateY(10px);
    filter: none;
  }

  body.lexit-app-plana .q-dialog .q-card {
    animation: none;
  }
}

/* ==========================================================================
   ACABADO CORPORATIVO
   Detalles de movimiento y acabado sobre el estilo anterior: transición del
   nombre de sección, línea de avance al navegar, brillo en los botones
   principales, tarjetas que se definen al pasar el mouse, textos de carga
   con destello y entrada escalonada del menú lateral. Solo presentación.
   ========================================================================== */

/* --- Barra superior: nombre de sección con fundido y línea de avance --- */
body.lexit-app-plana .q-header.app-barra {
  overflow: hidden;
}

.barra-titulo-enter-active,
.barra-titulo-leave-active {
  transition: opacity 0.28s var(--lx-ease-salida, ease), transform 0.35s var(--lx-ease-salida, ease);
}

.barra-titulo-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.barra-titulo-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.app-barra-progreso {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: linear-gradient(90deg, #1B2632, #2C3B4D 45%, #A35139 80%, #FFB162);
  transform-origin: left center;
  transform: scaleX(0);
  opacity: 0;
  pointer-events: none;
}

@keyframes lx-progreso {
  0% { transform: scaleX(0); opacity: 1; }
  65% { transform: scaleX(1); opacity: 1; }
  100% { transform: scaleX(1); opacity: 0; }
}

/* --- Botones principales: destello que cruza al pasar el mouse --- */
.page-container :is(.lx-action-btn, .subir-boton, .ask-btn-round, .asistente-composer-enviar) {
  background-image: linear-gradient(110deg, transparent 35%, rgba(255, 255, 255, 0.22) 50%, transparent 65%) !important;
  background-size: 250% 100% !important;
  background-position: 130% 0 !important;
  background-repeat: no-repeat !important;
}

@media (hover: hover) {
  .page-container :is(.lx-action-btn, .subir-boton, .ask-btn-round:not(:disabled), .asistente-composer-enviar:not(:disabled)):hover {
    background-position: -30% 0 !important;
    transition: background-position 0.8s var(--lx-ease-salida, ease), transform 0.2s ease, background-color 0.2s ease;
  }

  /* Tarjetas: el borde se define al pasar el mouse */
  .page-container.page-container.page-container.page-container :is(
    .norma-card,
    .asistente-plantilla,
    .asistente-idea,
    .sugerencia-card
  ):hover {
    border-color: rgba(27, 38, 50, 0.16) !important;
  }

  /* Íconos del menú lateral: pequeño avance al pasar */
  .app-sidebar .sidebar-link svg {
    transition: transform 0.3s var(--lx-ease-salida, ease);
  }

  .app-sidebar .sidebar-link:hover svg {
    transform: translateX(2px);
  }

  /* Ícono de la zona de carga: sube un poco al acercarse */
  .page-container .subir-icono {
    transition: transform 0.4s var(--lx-ease-salida, ease), background-color 0.3s ease;
  }

  .page-container .subir-zona:hover .subir-icono {
    transform: translateY(-4px);
    background-color: #EEE9DF;
  }
}

/* --- Textos de carga con destello (Cargando plantillas, Preparando...) --- */
@keyframes lx-destello-texto {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

/* --- Gestión de contratos: sin el marco de tarjeta alrededor --- */
.page-container.page-container.page-container.page-container .contratos-page .lx-card:not(.lx-card--editor) {
  border: none !important;
  box-shadow: none !important;
  background-color: transparent;
}

.page-container.page-container.page-container.page-container .contratos-page .lx-card:not(.lx-card--editor) > .lx-card-header {
  background: transparent;
  padding-left: 4px;
  padding-right: 4px;
}

@media (prefers-reduced-motion: no-preference) {
  .app-barra-progreso {
    animation: lx-progreso 0.9s var(--lx-ease-salida, ease) 0.05s;
  }

  .page-container :is(.pdf-loading-texto, .plantillas-disponibles-vacio, .sugerencias-cargando-titulo) {
    background-image: linear-gradient(90deg, rgba(27, 38, 50, 0.45) 40%, #1B2632 50%, rgba(27, 38, 50, 0.45) 60%);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: lx-destello-texto 1.8s linear infinite;
  }

  /* Menú lateral: las opciones entran una tras otra al abrir la app */
  .app-sidebar .sidebar-nav > * {
    animation: lx-aparecer-suave 0.5s var(--lx-ease-salida, ease) backwards;
  }

  .app-sidebar .sidebar-nav > *:nth-child(1) { animation-delay: 0.05s; }
  .app-sidebar .sidebar-nav > *:nth-child(2) { animation-delay: 0.1s; }
  .app-sidebar .sidebar-nav > *:nth-child(3) { animation-delay: 0.15s; }
  .app-sidebar .sidebar-nav > *:nth-child(4) { animation-delay: 0.2s; }
  .app-sidebar .sidebar-nav > *:nth-child(n+5) { animation-delay: 0.25s; }
}

/* ==========================================================================
   ESTILO REVOLUT (FUNCIONES)
   Basado en revolut.com: lienzo blanco, superficies grises rellenas sin
   bordes ni sombras y con esquinas muy amplias (24px), botones y chips en
   píldora (primario sólido navy, secundario gris), pestañas en píldora,
   títulos grandes y compactos, y movimiento con un leve rebote. Va al final
   para refinar los estilos anteriores; mantiene la paleta (navy, beige,
   naranja) y la tipografía (Baskervville títulos, Urbanist texto). Solo
   presentación.
   ========================================================================== */
body.lexit-app-plana {
  --rv-lienzo: #FFFFFF;
  --rv-gris: #F4F4F6;
  --rv-gris-hover: #ECECEF;
  --rv-gris-fuerte: #E4E4E8;
  --rv-texto: #1B2632;
  --rv-texto-suave: rgba(27, 38, 50, 0.6);
  --rv-radio: 24px;
  --rv-radio-medio: 18px;
  --rv-rebote: cubic-bezier(0.34, 1.4, 0.64, 1);
  --lx-lienzo: #FFFFFF;
}

/* --- Lienzo blanco --- */
body.lexit-app-plana .app-fondo {
  background: var(--rv-lienzo);
}

body.lexit-app-plana .q-header.app-barra {
  background: rgba(255, 255, 255, 0.82) !important;
  border-bottom-color: rgba(0, 0, 0, 0.05);
}

/* --- Superficies grises rellenas, sin borde ni sombra --- */
.page-container.page-container.page-container.page-container :is(
  .lx-card--editor,
  .norma-card,
  .resumen-card,
  .estado-card,
  .plantillas-disponibles,
  .norma-resumen,
  .sugerencias-rail,
  .sugerencias-error-state,
  .asistente-plantilla,
  .asistente-idea
) {
  background-color: var(--rv-gris) !important;
  border: none !important;
  border-radius: var(--rv-radio) !important;
  box-shadow: none !important;
}

.page-container.page-container.page-container.page-container .lx-card--editor > .lx-card-header {
  background: transparent;
  border-bottom-color: rgba(0, 0, 0, 0.06);
  border-radius: var(--rv-radio) var(--rv-radio) 0 0 !important;
}

/* Dentro de una superficie gris, las tarjetas van en blanco */
.page-container.page-container.page-container.page-container .sugerencias-rail :is(.sugerencia-card, .metrica-bloque) {
  background-color: #FFFFFF !important;
  border: none !important;
  border-radius: var(--rv-radio-medio) !important;
  box-shadow: none !important;
}

/* Zona de carga: gris relleno con borde punteado suave */
.page-container.page-container.page-container.page-container .subir-zona {
  background-color: var(--rv-gris) !important;
  border: 1.5px dashed rgba(27, 38, 50, 0.16) !important;
  border-radius: var(--rv-radio) !important;
}

.page-container.page-container.page-container.page-container :is(.subir-zona:hover, .subir-zona--arrastrando) {
  background-color: var(--rv-gris-hover) !important;
  border-color: rgba(27, 38, 50, 0.4) !important;
}

/* Lista de plantillas: filas que se rellenan al pasar */
.page-container.page-container.page-container.page-container .plantillas-disponibles {
  padding: 8px 10px 10px;
}

.page-container.page-container.page-container.page-container .plantilla-fila {
  border-bottom: none !important;
  border-radius: var(--rv-radio-medio) !important;
  padding-left: 16px;
  padding-right: 16px;
}

@media (hover: hover) {
  .page-container.page-container.page-container.page-container .plantilla-fila:hover {
    background-color: #FFFFFF !important;
    transform: none;
  }

  /* Tarjetas: se oscurecen un poco y crecen apenas, sin sombra */
  .page-container.page-container.page-container.page-container :is(
    .norma-card,
    .asistente-plantilla,
    .asistente-idea
  ):hover {
    background-color: var(--rv-gris-hover) !important;
    border: none !important;
    box-shadow: none !important;
    transform: scale(1.012);
  }

  .page-container.page-container.page-container.page-container .sugerencias-rail .sugerencia-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px -16px rgba(27, 38, 50, 0.3) !important;
  }
}

.page-container :is(.norma-card, .asistente-plantilla, .asistente-idea, .plantilla-fila) {
  transition: transform 0.45s var(--rv-rebote), background-color 0.25s ease;
}

/* Norma abierta: superficie blanca con anillo navy */
.page-container.page-container.page-container.page-container .normas-page .norma-card--activa,
.page-container.page-container.page-container.page-container .normas-page .norma-card--activa:hover {
  background-color: #FFFFFF !important;
  box-shadow: 0 0 0 2px #1B2632 !important;
  transform: none;
}

/* --- Botones en píldora: primario navy sólido, secundario gris --- */
.page-container.page-container.page-container.page-container :is(
  .lx-action-btn,
  .subir-boton,
  .sugerencia-aplicar,
  .ask-btn-round,
  .asistente-composer-enviar
):not(:disabled) {
  background-color: #1B2632 !important;
  color: #FFFFFF !important;
  border: none !important;
  border-radius: 999px !important;
}

.page-container.page-container.page-container.page-container :is(
  .lx-btn-secundario,
  .lx-btn-sutil,
  .refresh-btn,
  .matriz-boton,
  .sugerencia-ver,
  .sugerencias-reintentar-btn,
  .norma-resumen-reintentar,
  .pdf-panel-boton,
  .open-btn
) {
  background-color: var(--rv-gris) !important;
  color: var(--rv-texto) !important;
  border: none !important;
  border-radius: 999px !important;
}

@media (hover: hover) {
  .page-container.page-container.page-container.page-container :is(
    .lx-btn-secundario,
    .lx-btn-sutil,
    .refresh-btn,
    .matriz-boton,
    .sugerencia-ver,
    .sugerencias-reintentar-btn,
    .norma-resumen-reintentar,
    .pdf-panel-boton,
    .open-btn
  ):hover:not(:disabled) {
    background-color: var(--rv-gris-fuerte) !important;
  }

  .page-container.page-container.page-container.page-container :is(
    .lx-action-btn,
    .subir-boton,
    .sugerencia-aplicar
  ):hover:not(:disabled) {
    background-color: #2C3B4D !important;
  }
}

/* Encabezado de Normas: Actualizar como píldora gris */
.page-container.page-container.page-container.page-container .normas-page .normas-banner .refresh-btn {
  padding: 10px 20px;
}

/* --- Chips en píldora: gris relleno; activo navy --- */
.page-container.page-container.page-container.page-container :is(
  .sector-chip,
  .asistente-chip,
  .acceso-rapido
) {
  background-color: var(--rv-gris) !important;
  border: none !important;
  border-radius: 999px !important;
  color: var(--rv-texto) !important;
  text-decoration: none;
}

.page-container.page-container.page-container.page-container .acceso-rapido {
  padding: 9px 18px;
}

@media (hover: hover) {
  .page-container.page-container.page-container.page-container :is(
    .sector-chip,
    .asistente-chip,
    .acceso-rapido
  ):hover {
    background-color: var(--rv-gris-fuerte) !important;
  }
}

.page-container.page-container.page-container.page-container :is(
  .sector-chip--activo,
  .asistente-chip--elegido,
  .acceso-rapido--activo
),
.page-container.page-container.page-container.page-container :is(
  .sector-chip--activo,
  .asistente-chip--elegido,
  .acceso-rapido--activo
):hover {
  background-color: #1B2632 !important;
  color: #FFFFFF !important;
}

/* Filtro de sectores: barra blanca translúcida */
.page-container .normas-page .sectores-filtro {
  background: rgba(255, 255, 255, 0.86);
  border-bottom-color: rgba(0, 0, 0, 0.05);
}

/* --- Pestañas en píldora (Análisis, Editar contrato, Normas) --- */
.page-container.page-container.page-container.page-container :is(.documento-tabs, .panel-tabs, .lx-tabs, .periodo-segmento) {
  padding: 4px;
  border-radius: 999px !important;
  background: var(--rv-gris);
}

.page-container.page-container.page-container.page-container :is(.documento-tab, .panel-tab, .lx-tabs .q-tab, .periodo-opcion) {
  border-radius: 999px !important;
  padding-left: 16px;
  padding-right: 16px;
}

.page-container.page-container.page-container.page-container :is(.documento-tab--active, .panel-tab--activa, .lx-tabs .q-tab--active, .periodo-opcion--activa) {
  background: #1B2632 !important;
  color: #FFFFFF !important;
  box-shadow: none !important;
}

/* --- Campo de consulta: gris relleno; al escribir, blanco con anillo --- */
.page-container.page-container.page-container.page-container :is(.composer-pill, .asistente-composer) {
  background: var(--rv-gris);
  border: 1px solid transparent;
  box-shadow: none !important;
}

.page-container.page-container.page-container.page-container :is(.composer-pill, .asistente-composer):focus-within {
  background: #FFFFFF;
  border-color: rgba(27, 38, 50, 0.18);
  box-shadow: 0 0 0 4px rgba(27, 38, 50, 0.08) !important;
}

/* --- Títulos grandes y compactos --- */
.page-container :is(.page-title, .asistente-titular) {
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.04;
}

.page-container .normas-page .normas-banner .page-title {
  font-size: clamp(2.2rem, 4vw, 3.4rem);
}

.page-container .normas-page .normas-cifra-num {
  font-weight: 700;
  letter-spacing: -0.03em;
}

/* --- Barra lateral: opción activa como píldora clara --- */
body.lexit-app-plana .app-sidebar .sidebar-link {
  border-radius: 999px !important;
}

body.lexit-app-plana .app-sidebar .sidebar-link--active {
  background: #FFFFFF !important;
  color: #1B2632 !important;
}

body.lexit-app-plana .app-sidebar .sidebar-link--active :is(svg, .sidebar-link-texto) {
  color: #1B2632 !important;
}

/* --- Movimiento: entradas con un leve rebote --- */
@keyframes lx-aparecer {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes lx-aparecer-suave {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .page-container :is(
    .page-header,
    .page-saludo,
    .asistente-rotulo,
    .asistente-titular,
    .normas-banner,
    .subir-zona,
    .sectores-filtro
  ) {
    animation-duration: 0.8s;
    animation-timing-function: var(--rv-rebote);
  }

  .page-container :is(
    .accesos-rapidos > *,
    .asistente-chips > *,
    .plantilla-fila,
    .norma-card,
    .sector-chip,
    .metrica-bloque,
    .sugerencia-card,
    .normas-cifra
  ) {
    animation-timing-function: var(--rv-rebote);
  }

  /* Al hacer clic, botones y chips se "hunden" y rebotan al soltar */
  .page-container :is(
    .q-btn,
    .subir-boton,
    .lx-btn-sutil,
    .lx-action-btn,
    .refresh-btn,
    .matriz-boton,
    .sector-chip,
    .asistente-chip,
    .acceso-rapido,
    .sugerencia-aplicar,
    .sugerencia-ver,
    .especialidad-selector,
    .ask-btn-round,
    .asistente-composer-enviar
  ) {
    transition: transform 0.35s var(--rv-rebote), background-color 0.2s ease, color 0.2s ease;
  }

  .page-container :is(
    .q-btn,
    .subir-boton,
    .lx-btn-sutil,
    .lx-action-btn,
    .refresh-btn,
    .matriz-boton,
    .sector-chip,
    .asistente-chip,
    .acceso-rapido,
    .sugerencia-aplicar,
    .sugerencia-ver,
    .especialidad-selector,
    .ask-btn-round,
    .asistente-composer-enviar
  ):active:not(:disabled) {
    transform: scale(0.95);
    transition-duration: 0.08s;
  }
}

/* ==========================================================================
   REDISEÑO (auditoría redesign-existing-projects)
   Ajustes de calidad sobre lo existente, solo presentación y accesibilidad:
   - Tipografía: títulos sin palabras huérfanas, cifras tabulares, rótulos
     en tipo oración en vez de MAYÚSCULAS.
   - Superficie: grano muy sutil en el lienzo (rompe lo "plano digital").
   - Estados: anillo de foco visible (el estilo plano anulaba el anterior,
     hecho con sombra), insignias de riesgo como etiquetas, scroll suave.
   - Diseño: alturas con 100dvh (evita saltos en el navegador del celular).
   - Navegación: enlace "Saltar al contenido".
   ========================================================================== */

/* --- Tipografía --- */
.page-container :is(h1, h2, h3, .page-title, .asistente-titular, .carrusel-nombre, .norma-titulo, .resumen-title, .estado-titulo) {
  text-wrap: balance;
}

.page-container :is(p, .norma-sumilla, .carrusel-desc, .sugerencia-explicacion, .resumen-texto, .destacada-razon) {
  text-wrap: pretty;
}

.page-container :is(
  .metrica-numero,
  .normas-cifra-num,
  .carrusel-contador,
  .panel-tab-cuenta,
  .plantillas-disponibles-meta,
  .page-indicator-text,
  .norma-fecha
) {
  font-variant-numeric: tabular-nums;
}

/* Rótulos en tipo oración (antes en MAYÚSCULAS espaciadas) */
body.lexit-app-plana :is(.page-container, .app-sidebar, .q-menu) :is(
  .sidebar-seccion,
  .history-title,
  .especialidades-lista-titulo,
  .metrica-label,
  .fuente-doc-name,
  .sugerencia-clausula,
  .sugerencia-base-etiqueta,
  .sugerencias-aplicadas-titulo,
  .page-eyebrow,
  .vista-titulo-etiqueta,
  .asistente-ideas-titulo,
  .carrusel-rotulo,
  .normas-eyebrow
) {
  text-transform: none !important;
  letter-spacing: 0.005em !important;
  font-size: 0.8rem !important;
}

/* --- Grano muy sutil sobre el lienzo --- */
body.lexit-app-plana .app-fondo {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.106 0 0 0 0 0.149 0 0 0 0 0.196 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 160px 160px;
}

/* --- Anillo de foco visible (teclado) --- */
.page-container :is(button, a, [role="tab"], [tabindex="0"], .q-btn, summary):focus-visible {
  outline: 2px solid #2C3B4D !important;
  outline-offset: 2px;
}

.app-sidebar :is(button, a, [tabindex="0"]):focus-visible {
  outline: 2px solid #FFB162 !important;
  outline-offset: 2px;
}

.page-container #contenido-principal:focus,
#contenido-principal:focus {
  outline: none;
}

/* --- Insignias de riesgo: etiqueta con punto, no píldora --- */
.page-container.page-container.page-container.page-container .riesgo-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 6px !important;
  text-transform: none;
  letter-spacing: 0.01em;
  font-size: 0.76rem;
  font-weight: 600;
}

.page-container .riesgo-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  background: currentColor;
}

.page-container.page-container.page-container.page-container .riesgo-badge::before {
  border-radius: 50% !important;
}

/* --- Scroll suave para saltos de la página --- */
@media (prefers-reduced-motion: no-preference) {
  html:has(body.lexit-app-plana) {
    scroll-behavior: smooth;
  }
}

/* --- Alturas con 100dvh (la barra del navegador del celular no hace saltar el diseño) --- */
@supports (height: 100dvh) {
  .q-page {
    min-height: 100dvh;
  }

  body.lexit-app-plana .page-container .q-page.consultas-page {
    height: calc(100dvh - 94px - var(--lx-barra));
  }

  body.lexit-app-plana .page-container .q-page.consultas-page.consultas-page--vacia {
    height: calc(100dvh - var(--lx-barra));
    min-height: calc(100dvh - var(--lx-barra));
  }

  body.lexit-app-plana .page-container .q-page.analisis-page {
    height: calc(100dvh - 94px - var(--lx-barra));
  }

  body.lexit-app-plana .page-container .q-page.analisis-page.analisis-page--trabajo {
    height: calc(100dvh - 24px - var(--lx-barra));
  }

  body.lexit-app-plana .contratos-page .chat-con-documento > .chat-edicion-panel {
    max-height: calc(100dvh - var(--lx-barra) - 32px);
  }
}

/* --- "Saltar al contenido": oculto hasta recibir el foco --- */
.saltar-contenido {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 3000;
  padding: 10px 18px;
  border: none;
  border-radius: 999px;
  background: #1B2632;
  color: #FFFFFF;
  font: inherit;
  font-weight: 600;
  transform: translateY(-160%);
  transition: transform 0.2s ease;
}

.saltar-contenido:focus-visible {
  transform: none;
  outline: 2px solid #FFB162;
  outline-offset: 2px;
}

/* ==========================================================================
   ACABADO CORPORATIVO FINAL
   1) Al hacer clic para escribir no aparece ningún recuadro extra: los
      campos de escritura (Consultas, Análisis, asistente de Contratos,
      chat de edición y el documento editable) se ven igual con o sin foco.
   2) Movimiento sobrio: sin rebotes ni tarjetas que crecen; transiciones
      cortas y suaves, "presión" mínima al hacer clic.
   ========================================================================== */

/* --- 1. Sin recuadro al escribir --- */
.page-container.page-container.page-container.page-container :is(.composer-pill, .asistente-composer),
.page-container.page-container.page-container.page-container :is(.composer-pill, .asistente-composer):focus-within {
  background: var(--rv-gris, #F4F4F6) !important;
  border-color: transparent !important;
  box-shadow: none !important;
  transform: none !important;
}

.page-container :is(input, textarea, select, [contenteditable="true"]):is(:focus, :focus-visible),
.page-container .q-field__native:is(:focus, :focus-visible) {
  outline: none !important;
  box-shadow: none !important;
}

.page-container .documento-texto--editable:focus,
.page-container .documento-word:focus {
  outline: none !important;
  box-shadow: none !important;
}

/* Campos de Quasar con contorno (chat de edición): el borde no se engrosa
   ni cambia de color al enfocarlos */
.page-container .q-field--outlined.q-field--focused .q-field__control::after {
  border-width: 1px !important;
  border-color: rgba(27, 38, 50, 0.24) !important;
}

.page-container .q-field--outlined.q-field--focused .q-field__control::before {
  border-color: rgba(27, 38, 50, 0.24) !important;
}

.page-container .q-field--standard.q-field--focused .q-field__control::after {
  transform: scale3d(0, 1, 1) !important;
}

/* --- 2. Movimiento sobrio --- */
body.lexit-app-plana {
  --rv-rebote: cubic-bezier(0.22, 1, 0.36, 1);
}

@media (hover: hover) {
  .page-container.page-container.page-container.page-container :is(
    .norma-card,
    .asistente-plantilla,
    .asistente-idea,
    .sugerencia-card,
    .metrica-bloque
  ):hover {
    transform: none !important;
  }

  .page-container.page-container.page-container.page-container .sugerencias-rail .sugerencia-card:hover {
    box-shadow: none !important;
  }

  .page-container :is(.subir-boton, .ask-btn-round, .asistente-composer-enviar):hover {
    transform: none !important;
  }

  .app-sidebar .sidebar-link:hover svg {
    transform: none;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .page-container :is(
    .q-btn,
    .subir-boton,
    .lx-btn-sutil,
    .lx-action-btn,
    .refresh-btn,
    .matriz-boton,
    .sector-chip,
    .asistente-chip,
    .acceso-rapido,
    .sugerencia-aplicar,
    .sugerencia-ver,
    .especialidad-selector,
    .ask-btn-round,
    .asistente-composer-enviar,
    .plantilla-fila
  ):active:not(:disabled),
  .app-sidebar :is(.sidebar-link, .new-chat-btn, .history-item):active {
    transform: scale(0.985) !important;
  }

  /* Entradas: fundido corto y desplazamiento mínimo */
  .page-container :is(
    .page-header,
    .page-saludo,
    .asistente-rotulo,
    .asistente-titular,
    .normas-banner,
    .subir-zona,
    .sectores-filtro
  ) {
    animation-duration: 0.5s;
  }
}

@keyframes lx-aparecer {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes lx-aparecer-suave {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
