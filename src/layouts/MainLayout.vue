<template>
  <q-layout view="hHh Lpr fFf">
    <!-- Modern Top Navbar -->
    <q-header
      class="modern-navbar navbar-light"
      height-hint="64"
    >
      <q-toolbar class="navbar-toolbar q-px-lg">
        <!-- Logo/Brand -->
        <div class="brand-section q-mr-lg">
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
import AuthButtons from '../components/Auth/AuthButtons.vue';

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
</script>

<style scoped>
.main-container {
  flex: 1;
  position: relative;
  z-index: 1;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 24px;
  min-height: calc(100vh - 112px);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

/* Modern Navbar Styles */
.modern-navbar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  z-index: 2000;
}

.navbar-dark {
  background: rgba(18, 18, 18, 0.85);
  color: #ffffff;
}

.navbar-light {
  background: rgba(255, 255, 255, 0.95);
  color: #1a1a1a;
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
  border-radius: 8px;
  transition: all 0.3s ease;
}

.nav-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.nav-btn-active {
  background: rgba(0, 0, 0, 0.1);
  font-weight: 600;
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

.brand-section {
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.brand-logo { display:inline-block; width:36px; height:36px; margin-right:8px; }

.brand-icon {
  color: #667eea;
  transition: all 0.3s ease;
}

.brand-text {
  background: linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 1px;
}

.nav-group {
  display: flex;
  align-items: center;
}

.nav-buttons {
  display: flex;
  align-items: center;
}

.nav-btn {
  margin: 0 2px;
  padding: 8px 12px;
  font-weight: 600;
  font-size: 0.9rem;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  border-radius: 0;
  height: 40px;
}

.nav-btn:first-child {
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

.nav-btn:last-child {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

.nav-btn:hover {
  background: rgba(102, 126, 234, 0.1);
}

.nav-btn-active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white !important;
}

.nav-btn-active:hover {
  opacity: 0.9;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  border-radius: 50%;
  transition: all 0.3s ease;
  position: relative;
}

.action-btn:hover {
  background: rgba(102, 126, 234, 0.1);
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* Main Container */
.main-container {
  background: transparent;
}

.page-wrapper {
  min-height: calc(100vh - 64px);
  padding: 24px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
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

  .action-buttons {
    gap: 4px;
  }

  .brand-section {
    margin-right: 16px;
  }
}

/* Transiciones */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.transitioning {
  background: transparent !important;
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

  .action-btn {
    width: 40px;
    height: 40px;
  }
}

/* Dark mode adjustments */
.navbar-dark .nav-btn:hover {
  background: rgba(102, 126, 234, 0.2);
}

.navbar-dark .action-btn:hover {
  background: rgba(102, 126, 234, 0.2);
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
