<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          Prototipado de IA Juridica
        </q-toolbar-title>

        <q-btn
          flat
          round
          dense
          :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          @click="toggleDark"
          aria-label="Alternar modo oscuro"
        />
        <div>Quasar v{{ $q.version }}</div>

      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
    >
      <q-list>
        <q-item clickable v-ripple to="/contratos">
          <q-item-section avatar>
            <q-icon name="description" />
          </q-item-section>
          <q-item-section>Contratos</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/subir-contrato">
          <q-item-section avatar>
            <q-icon name="upload_file" />
          </q-item-section>
          <q-item-section>Subir Contrato</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/consultas">
          <q-item-section avatar>
            <q-icon name="question_answer" />
          </q-item-section>
          <q-item-section>Consultas</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/casos">
          <q-item-section avatar>
            <q-icon name="gavel" />
          </q-item-section>
          <q-item-section>Casos</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/plantillas">
          <q-item-section avatar>
            <q-icon name="article" />
          </q-item-section>
          <q-item-section>Plantillas</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
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
