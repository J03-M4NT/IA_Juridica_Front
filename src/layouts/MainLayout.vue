<template>
  <q-layout view="hHh Lpr fFf">
    <!-- Modern Top Navbar -->
    <q-header
      class="modern-navbar navbar-light"
      height-hint="64"
      :class="{ 'navbar-scrolled': scrolled }"
    >
      <q-toolbar class="navbar-toolbar q-px-lg">
        <!-- Logo/Brand -->
        <div class="brand-section q-mr-lg" @click="$router.push('/')" style="cursor: pointer">
          <img src="../assets/logo.svg" alt="LEXIT AI" class="brand-logo q-mr-sm" />
          <span class="brand-text text-h6 text-weight-bold">LEXIT AI</span>
        </div>

        <!-- Navigation and Auth Buttons - Centered -->
        <div class="nav-group q-ml-md">
          <div class="nav-buttons">
            <q-btn-group flat>
              <q-btn
                flat
                no-caps
                :class="{ 'nav-btn-active': $route.path === '/' }"
                to="/"
                class="nav-btn"
                icon="analytics"
                label="ANALIZAR PDF"
              >
                <q-tooltip>Analizar contrato PDF</q-tooltip>
              </q-btn>

              <q-btn
                flat
                no-caps
                :class="{ 'nav-btn-active': $route.path === '/consultas' }"
                to="/consultas"
                class="nav-btn"
                icon="chat"
                label="CONSULTAS"
              >
                <q-tooltip>Consultas legales</q-tooltip>
              </q-btn>

              <q-btn
                flat
                no-caps
                :class="{ 'nav-btn-active': $route.path === '/contratos' }"
                to="/contratos"
                class="nav-btn"
                icon="gavel"
                label="CONTRATOS"
              >
                <q-tooltip>Gestión de contratos</q-tooltip>
              </q-btn>
            </q-btn-group>
          </div>
        </div>

        <!-- Auth Buttons - Right aligned -->
        <q-space />
        <auth-buttons />
      </q-toolbar>
    </q-header>

    <!-- Main Content Area -->
    <q-page-container class="main-container">
      <div class="page-wrapper">
        <router-view v-slot="{ Component }">
          <transition
            name="fade"
            mode="out-in"
            @before-leave="beforeLeave"
            @enter="enter"
            @after-enter="afterEnter"
          >
            <component :is="Component" class="q-page" />
          </transition>
        </router-view>
      </div>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import AuthButtons from '../components/Auth/AuthButtons.vue';

// Estado para el scroll
const scrolled = ref(false);

// Métodos de transición
const beforeLeave = (el: Element) => {
  el.classList.add('transitioning');
};

const enter = (el: Element) => {
  el.classList.remove('transitioning');
};

const afterEnter = (el: Element) => {
  el.classList.remove('transitioning');
};

// Función para manejar el scroll
const handleScroll = () => {
  scrolled.value = window.scrollY > 10;
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
.main-container {
  flex: 1;
  position: relative;
  z-index: 1;
  min-height: 100vh;
  background: var(--background-color);
}

.page-wrapper {
  min-height: calc(100vh - 64px);
  padding: 24px;
  margin: 64px auto 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: transparent;
  max-width: 1200px;
  width: 100%;
}

.q-page {
  background: var(--card-background);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-light);
  padding: 24px;
  min-height: calc(100vh - 112px);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.q-page:hover {
  box-shadow: var(--shadow-medium);
}

/* Modern Navbar Styles */
.modern-navbar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow-light);
  z-index: 2000;
  transition: all 0.3s ease;
}

.modern-navbar.navbar-scrolled {
  background: rgba(255, 255, 255, 0.98);
  box-shadow: var(--shadow-medium);
}

.navbar-light {
  background: rgba(255, 255, 255, 0.95);
  color: var(--text-color);
}

.navbar-toolbar {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.nav-buttons {
  flex: 1;
  justify-content: center;
}

.nav-btn {
  font-weight: 500;
  padding: 8px 16px;
  border-radius: var(--border-radius-small);
  transition: all 0.3s ease;
  color: var(--text-color);
}

.nav-btn:hover {
  background: rgba(0, 123, 255, 0.1);
  color: var(--primary-color);
}

.nav-btn-active {
  background: var(--primary-color);
  color: white !important;
  font-weight: 600;
}

.nav-btn-active:hover {
  background: var(--hover-color);
}

.brand-section {
  display: flex;
  align-items: center;
}

.brand-logo {
  height: 32px;
  width: auto;
}

.navbar-toolbar {
  min-height: 64px;
  padding: 0 24px;
}

.brand-text {
  color: var(--primary-color);
  font-weight: 600;
  letter-spacing: 1px;
}

/* Transiciones */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.transitioning {
  background: transparent !important;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .nav-buttons {
    display: none;
  }

  .navbar-toolbar {
    padding: 0 16px;
  }

  .brand-text {
    display: none;
  }
}

@media (max-width: 768px) {
  .page-wrapper {
    padding: 16px;
  }

  .brand-section {
    margin-right: 16px;
  }
}

@media (max-width: 480px) {
  .navbar-toolbar {
    padding: 0 12px;
    min-height: 56px;
  }

  .modern-navbar {
    height: 56px;
  }

  .page-wrapper {
    padding: 12px;
  }
}
</style>
