<template>
  <q-layout view="hHh Lpr fFf" class="modern-layout">
    <!-- Modern Top Navbar -->
    <q-header
      class="modern-navbar navbar-light"
      height-hint="64"
    >
      <q-toolbar class="navbar-toolbar q-px-lg">
        <!-- Logo/Brand -->
        <div class="brand-section q-mr-lg">
          <q-icon name="gavel" size="28px" class="brand-icon q-mr-sm" />
          <span class="brand-text text-h6 text-weight-bold">LEXIT AI</span>
        </div>

        <!-- Navigation Buttons - Centered -->
        <div class="nav-buttons flex justify-center items-center">
          <q-btn
            flat
            no-caps
            :class="{ 'nav-btn-active': $route.path === '/' }"
            to="/"
            class="nav-btn q-mx-md"
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
            class="nav-btn q-mx-md"
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
            class="nav-btn q-mx-md"
            icon="description"
            label="CONTRATOS"
          >
            <q-tooltip>Gestión de contratos</q-tooltip>
          </q-btn>
        </div>


      </q-toolbar>
    </q-header>

    <!-- Main Content Area -->
    <q-page-container class="main-container">
      <div class="page-wrapper">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
// No functions needed for the simplified navbar
</script>

<style scoped>
.modern-layout {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

/* Modern Navbar Styles */
.modern-navbar {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
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
  min-height: 64px;
  padding: 0 24px;
}

.brand-section {
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

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

.nav-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-btn {
  border-radius: 12px;
  padding: 8px 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.nav-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.nav-btn:hover::before {
  left: 100%;
}

.nav-btn:hover {
  background: rgba(102, 126, 234, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.nav-btn-active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white !important;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}

.nav-btn-active:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
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
