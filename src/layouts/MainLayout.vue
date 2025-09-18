<template>
  <q-layout view="lHh Lpr lFf">
    <q-header :class="isDark ? 'bg-dark text-white shadow-1' : 'bg-white text-dark shadow-1'" :style="isDark ? 'border-bottom: 1px solid #404040;' : 'border-bottom: 1px solid #e5e5e5;'">
      <q-toolbar class="q-px-md">
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
          class="q-mr-sm"
        />

        <q-toolbar-title class="text-h6 text-weight-medium">
          LexIT AI
        </q-toolbar-title>

        <q-space />

        <q-btn
          flat
          round
          dense
          :icon="isDark ? 'light_mode' : 'dark_mode'"
          @click="toggleDark"
          aria-label="Alternar modo"
          size="sm"
        />

      </q-toolbar>
    </q-header>

    <transition name="slide-left">
      <q-drawer
          v-if="leftDrawerOpen"
          v-model="leftDrawerOpen"
          show-if-above
          :width="280"
          :class="isDark ? 'bg-dark text-white' : 'bg-white text-dark'"
          :style="isDark ? 'border-right: 1px solid #404040;' : 'border-right: 1px solid #e5e5e5;'"
      >
        <q-list class="q-pa-md">
          <q-item clickable v-ripple to="/" class="q-mb-sm">
            <q-item-section avatar>
              <q-icon name="home" color="primary" />
            </q-item-section>
            <q-item-section class="text-body1">Inicio</q-item-section>
          </q-item>
          <q-item clickable v-ripple to="/consultas" class="q-mb-sm">
            <q-item-section avatar>
              <q-icon name="chat" color="primary" />
            </q-item-section>
            <q-item-section class="text-body1">Consultas</q-item-section>
          </q-item>
          <q-item clickable v-ripple to="/contratos" class="q-mb-sm">
            <q-item-section avatar>
              <q-icon name="description" color="primary" />
            </q-item-section>
            <q-item-section class="text-body1">Contratos</q-item-section>
          </q-item>
          <q-item clickable v-ripple to="/subir-contrato" class="q-mb-sm">
            <q-item-section avatar>
              <q-icon name="upload" color="primary" />
            </q-item-section>
            <q-item-section class="text-body1">Subir Contrato</q-item-section>
          </q-item>
          <q-item clickable v-ripple to="/casos" class="q-mb-sm">
            <q-item-section avatar>
              <q-icon name="gavel" color="primary" />
            </q-item-section>
            <q-item-section class="text-body1">Casos</q-item-section>
          </q-item>
          <q-item clickable v-ripple to="/plantillas" class="q-mb-sm">
            <q-item-section avatar>
              <q-icon name="article" color="primary" />
            </q-item-section>
            <q-item-section class="text-body1">Plantillas</q-item-section>
          </q-item>
        </q-list>
      </q-drawer>
    </transition>

    <q-page-container>
      <transition name="fade">
        <router-view />
      </transition>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Dark } from 'quasar';

const leftDrawerOpen = ref(false);
const isDark = computed(() => Dark.isActive);

// Abrir/Cerrar Barra Lateral
function toggleLeftDrawer () {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

// Modo Oscuro
function toggleDark () {
  Dark.toggle();
}
</script>
