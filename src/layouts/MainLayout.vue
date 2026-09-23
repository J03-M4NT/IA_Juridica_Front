<template>
  <q-layout view="hHh Lpr fFf">

    <!-- Barra superior — solo en mobile/tablet, la marca y navegación viven
         en el panel lateral en pantallas grandes (ver q-drawer abajo) -->
    <q-header class="mobile-topbar lt-lg" height-hint="56">
      <q-toolbar class="mobile-toolbar">
        <q-btn
          flat dense round icon="menu"
          class="q-mr-sm hamburger-btn"
          @click="drawerOpen = !drawerOpen"
          aria-label="Menú de navegación"
        />
        <span class="mobile-brand" @click="$router.push('/')">LEXIT</span>
      </q-toolbar>
    </q-header>

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
          <span class="sidebar-brand-text">LEXIT</span>
        </div>

        <nav class="sidebar-nav">

          <router-link to="/app/consultas" class="sidebar-link"
            :class="{ 'sidebar-link--active': $route.path === '/app/consultas' }"
            @click="cerrarDrawerEnMobile">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Consultas
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
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Admin
          </router-link>

        </nav>

        <div class="sidebar-footer">
          <auth-buttons />
        </div>

      </div>
    </q-drawer>

    <!-- Toggle del panel lateral en desktop (>= lg) — en pantallas más
         chicas ya existe el botón hamburguesa del topbar de arriba
         (.mobile-topbar, visible con lt-lg), así que este solo hace
         falta donde ese topbar está oculto. -->
    <q-btn
      round flat dense
      :icon="drawerOpen ? 'chevron_left' : 'chevron_right'"
      class="sidebar-toggle-btn gt-md"
      :style="{ left: drawerOpen ? '224px' : '10px' }"
      @click="drawerOpen = !drawerOpen"
      aria-label="Mostrar u ocultar el panel lateral"
    />

    <!-- Page content -->
    <q-page-container class="page-container">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" class="q-page" />
        </transition>
      </router-view>
    </q-page-container>

  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import AuthButtons from '../components/Auth/AuthButtons.vue'
import { useUserProfileStore } from '../stores/userProfile'

const $q = useQuasar()
const profileStore = useUserProfileStore()
// Abierto por defecto en desktop (mismo umbral que :breakpoint="1023" del
// q-drawer), cerrado por defecto en mobile — el valor solo se usa como
// estado inicial, después el botón hamburguesa/toggle lo controla.
const drawerOpen = ref($q.screen.width > 1023)

// El panel lateral es un overlay en mobile — cerrarlo incondicionalmente
// al navegar evita que quede tapando la pantalla después de elegir una
// opción del menú.
function cerrarDrawerEnMobile() {
  if ($q.screen.lt.lg) drawerOpen.value = false
}

const handleScroll = () => { /* reserved for future scroll effects */ }
onMounted(() => window.addEventListener('scroll', handleScroll))
onUnmounted(() => window.removeEventListener('scroll', handleScroll))
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Figtree:wght@400;500;600;700&display=swap');

/* ==============================
   Barra superior (mobile/tablet) — mismo tono oscuro que el panel
   lateral, para que la transición entre ambos sea continua.
   ============================== */
.mobile-topbar {
  background: var(--ink) !important;
  border-bottom: 1px solid rgba(250, 250, 247, 0.08) !important;
  box-shadow: none !important;
}

.mobile-toolbar {
  min-height: 56px;
  padding: 0 14px;
}

.mobile-brand {
  font-family: 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #FAFAF7;
  cursor: pointer;
}

.hamburger-btn {
  color: rgba(250, 250, 247, 0.85) !important;
}

/* ==============================
   Toggle del panel lateral (desktop, >= lg)
   ============================== */
.sidebar-toggle-btn {
  position: fixed;
  top: 18px;
  z-index: 4000;
  background: var(--ink);
  color: rgba(250, 250, 247, 0.85) !important;
  border: 1px solid rgba(250, 250, 247, 0.12);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  transition: left 0.2s ease;
}

.sidebar-toggle-btn:hover {
  background: #262019;
}

/* ==============================
   Panel lateral — oscuro a propósito (identidad "legal tech" seria),
   con el mismo tinta que el resto de la marca (var(--ink)), no un
   negro genérico. El :deep() de abajo es necesario porque el fondo
   real de Quasar en modo oscuro (activado globalmente en
   boot/dark.ts) vive en .q-drawer__content, no en la raíz .q-drawer
   donde cae la clase .app-sidebar — sin este override, esa capa
   interna se queda con el negro por defecto de Quasar.
   ============================== */
.app-sidebar {
  background: var(--ink) !important;
}

:deep(.app-sidebar .q-drawer__content) {
  background: var(--ink);
  border-right: 1px solid rgba(250, 250, 247, 0.08);
}

.sidebar-inner {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 22px 16px 18px;
  font-family: 'Figtree', sans-serif;
  overflow: hidden;
}

.sidebar-inner::before {
  content: '';
  position: absolute;
  top: -140px;
  left: -80px;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(181, 80, 46, 0.28), transparent 70%);
  pointer-events: none;
}

.sidebar-brand {
  position: relative;
  padding: 6px 10px 22px;
  cursor: pointer;
}

.sidebar-brand-text {
  font-family: 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 1.45rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #FAFAF7;
}

.sidebar-nav {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sidebar-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 0.94rem;
  font-weight: 500;
  color: rgba(250, 250, 247, 0.62);
  text-decoration: none;
  transition: background 0.18s, color 0.18s;
}

.sidebar-link svg {
  flex-shrink: 0;
}

.sidebar-link:hover {
  background: rgba(250, 250, 247, 0.06);
  color: rgba(250, 250, 247, 0.92);
}

.sidebar-link--active {
  background: rgba(181, 80, 46, 0.2);
  color: #e8b381;
  font-weight: 600;
}

.sidebar-link--active::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--accent);
}

.sidebar-footer {
  position: relative;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid rgba(250, 250, 247, 0.1);
}

.sidebar-footer :deep(.auth-buttons) {
  width: 100%;
}

/* AuthButtons.vue está pensado para fondos claros (usa el color
   "primary" de Quasar, casi negro, para el texto) — se sobreescribe
   solo el botón visible aquí (no el menú desplegable, que Quasar
   renderiza aparte, flotando sobre toda la página) para que el
   nombre del usuario se lea sobre este panel oscuro. */
.sidebar-footer :deep(.user-profile-btn) {
  width: 100%;
  justify-content: flex-start;
  color: rgba(250, 250, 247, 0.92) !important;
}

.sidebar-footer :deep(.user-profile-btn .text-primary) {
  color: rgba(250, 250, 247, 0.92) !important;
}

.sidebar-footer :deep(.user-profile-btn .q-icon) {
  color: rgba(250, 250, 247, 0.55) !important;
}

.sidebar-footer :deep(.q-avatar) {
  background: var(--accent) !important;
}

/* ==============================
   Page content
   ============================== */
.page-container {
  background: #FAFAF7;
}

.q-page {
  background: #FAFAF7;
  min-height: 100vh;
  padding: 34px 32px 60px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
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
