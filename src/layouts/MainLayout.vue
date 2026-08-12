<template>
  <q-layout view="hHh Lpr fFf">

    <!-- Top Navbar -->
    <q-header class="app-navbar" height-hint="60">
      <q-toolbar class="navbar-toolbar">

        <!-- Logo -->
        <div class="brand-section" @click="$router.push('/')" style="cursor: pointer">
          <img src="../assets/logo.svg" alt="LEXIT AI" class="brand-logo" />
          <span class="brand-name">LEXIT AI</span>
        </div>

        <!-- Hamburger (mobile) -->
        <q-btn
          flat dense round icon="menu"
          class="lt-lg q-mr-sm hamburger-btn"
          @click="drawerOpen = !drawerOpen"
          aria-label="Menú de navegación"
        />

        <!-- Nav links (desktop) -->
        <nav class="nav-links gt-md">

          <q-btn flat no-caps to="/app/analizador" class="nav-btn nav-btn--teal"
            :class="{ 'nav-btn--active': $route.path === '/app/analizador' }">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="q-mr-xs">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>
            </svg>
            Analizar PDF
          </q-btn>

          <q-btn flat no-caps to="/app/consultas" class="nav-btn nav-btn--blue"
            :class="{ 'nav-btn--active': $route.path === '/app/consultas' }">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="q-mr-xs">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Consultas
          </q-btn>

          <q-btn flat no-caps to="/app/contratos" class="nav-btn nav-btn--purple"
            :class="{ 'nav-btn--active': $route.path === '/app/contratos' }">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="q-mr-xs">
              <path d="M3 7h18"/><path d="M3 7l2-3h14l2 3"/><path d="M5 7v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7"/><path d="M9 12h6"/>
            </svg>
            Contratos
          </q-btn>

          <q-btn flat no-caps to="/app/normas" class="nav-btn nav-btn--orange"
            :class="{ 'nav-btn--active': $route.path === '/app/normas' }">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="q-mr-xs">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            Normas
          </q-btn>

          <q-btn
            v-if="profileStore.isAdmin"
            flat no-caps to="/app/admin"
            class="nav-btn nav-btn--admin"
            :class="{ 'nav-btn--active': $route.path === '/app/admin' }"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="q-mr-xs">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Admin
          </q-btn>

        </nav>

        <q-space />
        <auth-buttons />

      </q-toolbar>
    </q-header>

    <!-- Mobile drawer -->
    <q-drawer v-model="drawerOpen" side="left" overlay behavior="mobile" class="mobile-drawer">
      <q-list padding>
        <q-item-label header class="drawer-header">Navegación</q-item-label>

        <q-item clickable v-ripple to="/app/analizador" @click="drawerOpen = false" active-class="drawer-item--active">
          <q-item-section avatar><q-icon name="description" /></q-item-section>
          <q-item-section>Analizar PDF</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/app/consultas" @click="drawerOpen = false" active-class="drawer-item--active">
          <q-item-section avatar><q-icon name="chat" /></q-item-section>
          <q-item-section>Consultas</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/app/contratos" @click="drawerOpen = false" active-class="drawer-item--active">
          <q-item-section avatar><q-icon name="gavel" /></q-item-section>
          <q-item-section>Contratos</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/app/normas" @click="drawerOpen = false" active-class="drawer-item--active">
          <q-item-section avatar><q-icon name="menu_book" /></q-item-section>
          <q-item-section>Normas</q-item-section>
        </q-item>

        <q-separator v-if="profileStore.isAdmin" class="q-my-sm" />

        <q-item v-if="profileStore.isAdmin" clickable v-ripple to="/app/admin" @click="drawerOpen = false" active-class="drawer-item--active">
          <q-item-section avatar><q-icon name="admin_panel_settings" /></q-item-section>
          <q-item-section>Administración</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- Page content -->
    <q-page-container class="page-container">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in" @before-leave="beforeLeave" @enter="enter" @after-enter="afterEnter">
          <component :is="Component" class="q-page" />
        </transition>
      </router-view>
    </q-page-container>

  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AuthButtons from '../components/Auth/AuthButtons.vue'
import { useUserProfileStore } from '../stores/userProfile'

const profileStore = useUserProfileStore()
const drawerOpen = ref(false)

const beforeLeave = (el: Element) => { el.classList.add('transitioning') }
const enter = (el: Element) => { el.classList.remove('transitioning') }
const afterEnter = (el: Element) => { el.classList.remove('transitioning') }

const handleScroll = () => { /* reserved for future scroll effects */ }
onMounted(() => window.addEventListener('scroll', handleScroll))
onUnmounted(() => window.removeEventListener('scroll', handleScroll))
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Figtree:wght@400;500;600;700&display=swap');

/* ==============================
   Navbar
   ============================== */
.app-navbar {
  background: rgba(250, 250, 247, 0.88) !important;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(27, 27, 30, 0.07) !important;
  box-shadow: none !important;
}

.navbar-toolbar {
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
  min-height: 60px;
  padding: 0 24px;
  gap: 18px;
  font-family: 'Figtree', sans-serif;
}

/* ==============================
   Brand
   ============================== */
.brand-section {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.brand-logo {
  height: 32px;
  width: 32px;
}

.brand-name {
  font-family: 'EB Garamond', serif;
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: #1b1b1e;
}

/* ==============================
   Nav links
   ============================== */
.nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 14px;
  flex-wrap: wrap;
}

.nav-btn {
  font-family: 'Figtree', sans-serif !important;
  font-size: 0.9rem !important;
  font-weight: 500 !important;
  color: #6a6a72 !important;
  border-radius: 11px !important;
  padding: 8px 14px !important;
  transition: background 0.2s, color 0.2s !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.nav-btn:hover {
  background: rgba(27, 27, 30, 0.05) !important;
  color: #1b1b1e !important;
}

/* Per-section active colors */
.nav-btn--teal.nav-btn--active {
  background: rgba(57, 199, 216, 0.14) !important;
  color: #1fa8bb !important;
  font-weight: 600 !important;
}

.nav-btn--blue.nav-btn--active {
  background: rgba(79, 127, 214, 0.13) !important;
  color: #3f6fc9 !important;
  font-weight: 600 !important;
}

.nav-btn--purple.nav-btn--active {
  background: rgba(139, 92, 246, 0.13) !important;
  color: #7c47e0 !important;
  font-weight: 600 !important;
}

.nav-btn--orange.nav-btn--active,
.nav-btn--admin.nav-btn--active {
  background: rgba(255, 155, 106, 0.15) !important;
  color: #d97a3e !important;
  font-weight: 600 !important;
}

.hamburger-btn {
  color: #3a3a40 !important;
}

/* ==============================
   Page content
   ============================== */
.page-container {
  background: #FAFAF7;
}

.q-page {
  background: #FAFAF7;
  min-height: calc(100vh - 60px);
  padding: 34px 24px 60px;
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
}

/* ==============================
   Page transitions
   ============================== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(14px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.transitioning {
  background: transparent !important;
}

/* ==============================
   Mobile drawer
   ============================== */
.mobile-drawer {
  padding-top: 60px;
  background: #fff !important;
}

.drawer-header {
  font-family: 'Figtree', sans-serif;
  font-weight: 600;
  color: #6a6a72;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.drawer-item--active {
  color: #8b5cf6 !important;
  font-weight: 600;
  background: rgba(139, 92, 246, 0.07);
  border-radius: 9px;
}

/* ==============================
   Responsive
   ============================== */
@media (max-width: 1024px) {
  .navbar-toolbar {
    padding: 0 16px;
  }
}

@media (max-width: 768px) {
  .q-page {
    padding: 20px 16px 40px;
  }
}

@media (max-width: 480px) {
  .q-page {
    padding: 16px 12px 32px;
  }

  .brand-name {
    font-size: 1.1rem;
  }
}
</style>
