<template>
  <q-layout view="hHh Lpr fFf">

    <!-- Panel lateral — abierto por defecto en desktop, drawer superpuesto
         en mobile. Sin show-if-above: así drawerOpen controla la
         visibilidad en TODOS los tamaños, y se puede plegar/desplegar
         también en desktop (antes show-if-above lo forzaba siempre
         visible ahí, ignorando el botón). -->
    <q-drawer
      v-model="drawerOpen"
      :breakpoint="1023"
      :width="252"
      bordered
      class="app-sidebar"
    >
      <div class="sidebar-inner">

        <div class="sidebar-brand" @click="$router.push('/')">
          <span class="sidebar-brand-text">LexIT</span>
        </div>

        <span class="sidebar-seccion">Herramientas</span>
        <nav class="sidebar-nav">

          <router-link to="/app/consultas" class="sidebar-link"
            :class="{ 'sidebar-link--active': $route.path === '/app/consultas' }"
            @click="cerrarDrawerEnMobile">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Consultas
          </router-link>

          <router-link to="/app/analisis" class="sidebar-link"
            :class="{ 'sidebar-link--active': $route.path === '/app/analisis' }"
            @click="cerrarDrawerEnMobile">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>
              <circle cx="11.5" cy="14.5" r="2.5"/><path d="M13.3 16.3L15 18"/>
            </svg>
            Análisis
          </router-link>

          <router-link to="/app/contratos" class="sidebar-link"
            :class="{ 'sidebar-link--active': $route.path === '/app/contratos' }"
            @click="cerrarDrawerEnMobile">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7h18"/><path d="M3 7l2-3h14l2 3"/><path d="M5 7v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7"/><path d="M9 12h6"/>
            </svg>
            Contratos
          </router-link>

          <router-link to="/app/normas" class="sidebar-link"
            :class="{ 'sidebar-link--active': $route.path === '/app/normas' }"
            @click="cerrarDrawerEnMobile">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            Normas
          </router-link>

          <router-link
            v-if="profileStore.isAdmin"
            to="/app/admin"
            class="sidebar-link"
            :class="{ 'sidebar-link--active': $route.path === '/app/admin' }"
            @click="cerrarDrawerEnMobile">
            <!-- Sin ícono: espacio del ancho del ícono para que el texto quede
                 alineado con los demás ítems. -->
            <span class="sidebar-link-sin-icono" aria-hidden="true"></span>
            Admin
          </router-link>


        </nav>

        <!-- Separator -->
        <div class="sidebar-separator" v-if="authStore.user"></div>

        <!-- Chat History -->
        <div class="sidebar-history" v-if="authStore.user">
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

          <auth-buttons />
        </div>

      </div>
    </q-drawer>

    <!-- Botón para mostrar u ocultar el panel lateral en cualquier tamaño de
         pantalla (ya no hay barra superior). -->
    <q-btn
      round flat dense
      :icon="drawerOpen ? 'chevron_left' : 'chevron_right'"
      class="sidebar-toggle-btn"
      :style="{ left: drawerOpen ? '224px' : '10px' }"
      @click="drawerOpen = !drawerOpen"
      aria-label="Mostrar u ocultar el panel lateral"
    />

    <!-- Page content -->
    <q-page-container class="page-container">
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
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
function cerrarDrawerEnMobile() {
  if (window.innerWidth < 1024) drawerOpen.value = false
}

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

/* "LexIT" del saludo de Consultas: "IT" en Truffle Trouble */
body.lexit-app-plana .page-title .page-title-letra:nth-child(n + 4),
body.lexit-app-plana .page-title:hover .page-title-letra:nth-child(n + 4) {
  color: #A35139;
}

/* Línea bajo el saludo en Burning Flame */
body.lexit-app-plana .consultas-page .page-header:not(.page-header--compact)::after {
  height: 2px;
  background: #FFB162;
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
  .page-title, .page-subtitle, .page-saludo,
  .sidebar-brand-text,
  .lx-card-header-title, .vista-titulo-nombre,
  .asistente-titular, .asistente-bajada, .asistente-idea-titulo, .asistente-chat-nombre,
  .contrato-listo-titulo, .download-bar-titulo, .finalizando-titulo,
  .doc-en-vivo-titulo, .lx-dialogo-error-titulo,
  .analisis-vacio-titulo, .documento-panel-titulo, .elegir-titulo, .elegir-opcion-titulo,
  .subir-titulo, .sugerencias-aplicadas-titulo, .sugerencias-cargando-titulo, .sugerencias-error-titulo,
  .estado-titulo, .norma-titulo, .resumen-title, .destacada-titulo, .pdf-panel-titulo,
  .lx-dialog-title, .normas-grupo-titulo, .pd-title
):not(:where(.vista-word *, .documento-word *, .documento-page *, .documento-texto *, .documento-original *, .tiptap-editor *, .document-preview *)),
body.lexit-app-plana.lexit-app-plana.lexit-app-plana :is(.page-container, .app-sidebar, .q-menu, .q-dialog .q-card, .q-tooltip, .q-notification) :is(
  h1, h2, h3, h4,
  .page-title, .page-subtitle, .page-saludo,
  .sidebar-brand-text,
  .lx-card-header-title, .vista-titulo-nombre,
  .asistente-titular, .asistente-bajada, .asistente-idea-titulo, .asistente-chat-nombre,
  .contrato-listo-titulo, .download-bar-titulo, .finalizando-titulo,
  .doc-en-vivo-titulo, .lx-dialogo-error-titulo,
  .analisis-vacio-titulo, .documento-panel-titulo, .elegir-titulo, .elegir-opcion-titulo,
  .subir-titulo, .sugerencias-aplicadas-titulo, .sugerencias-cargando-titulo, .sugerencias-error-titulo,
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
</style>
