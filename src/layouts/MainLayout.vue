<template>
  <q-layout view="hHh Lpr fFf">
    <!-- Modern Top Navbar -->
    <q-header
      class="modern-navbar navbar-light"
      height-hint="64"
      :class="{ 'navbar-scrolled': scrolled }"
    >
      <q-toolbar class="navbar-toolbar q-px-lg">

        <!-- Logo -->
        <div class="brand-section q-mr-lg" @click="$router.push('/')" style="cursor: pointer">
          <img src="../assets/logo.svg" alt="LEXIT AI" class="brand-logo q-mr-sm" />
          <span class="brand-text text-h6 text-weight-bold">LEXIT AI</span>
        </div>

        <!-- NAVBAR -->
        <div class="nav-group q-ml-md">
          <div class="nav-buttons">

            <q-btn-group flat>

              <!-- ANALIZAR PDF -->
              <q-btn
                flat
                no-caps
                :class="{ 'nav-btn-active': $route.path === '/app/analizador' }"
                to="/app/analizador"
                class="nav-btn"
                icon="analytics"
                label="ANALIZAR PDF"
              >
                <q-tooltip>Analizar contrato PDF</q-tooltip>
              </q-btn>

              <!-- CONSULTAS -->
              <q-btn
                flat
                no-caps
                :class="{ 'nav-btn-active': $route.path === '/app/consultas' }"
                to="/app/consultas"
                class="nav-btn"
                icon="chat"
                label="CONSULTAS"
              >
                <q-tooltip>Consultas legales</q-tooltip>
              </q-btn>

              <!-- CONTRATOS -->
              <q-btn
                flat
                no-caps
                :class="{ 'nav-btn-active': $route.path === '/app/contratos' }"
                to="/app/contratos"
                class="nav-btn"
                icon="gavel"
                label="CONTRATOS"
              >
                <q-tooltip>Gestión de contratos</q-tooltip>
              </q-btn>

              <!-- ✅ NUEVO BOTÓN NORMAS -->
              <q-btn
                flat
                no-caps
                :class="{ 'nav-btn-active': $route.path === '/app/normas' }"
                to="/app/normas"
                class="nav-btn"
                icon="menu_book"
                label="NORMAS"
              >
                <q-tooltip>Normas del Diario El Peruano</q-tooltip>
              </q-btn>

            </q-btn-group>

          </div>
        </div>

        <!-- Auth -->
        <q-space />
        <auth-buttons />

      </q-toolbar>
    </q-header>

    <!-- CONTENIDO -->
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
import { ref, onMounted, onUnmounted } from 'vue'
import AuthButtons from '../components/Auth/AuthButtons.vue'

const scrolled = ref(false)

const beforeLeave = (el: Element) => {
  el.classList.add('transitioning')
}

const enter = (el: Element) => {
  el.classList.remove('transitioning')
}

const afterEnter = (el: Element) => {
  el.classList.remove('transitioning')
}

const handleScroll = () => {
  scrolled.value = window.scrollY > 10
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>

/* TODO tu estilo igual (no lo toqué) */

</style>
