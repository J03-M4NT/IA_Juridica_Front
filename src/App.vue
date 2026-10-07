<template>
  <router-view />
  <!-- Mosaico de bienvenida tras iniciar sesión (ver stores/bienvenida.ts) -->
  <BienvenidaLexit v-if="bienvenida.activa" />
</template>

<script setup lang="ts">
import BienvenidaLexit from './components/BienvenidaLexit.vue'
import { useBienvenidaStore } from './stores/bienvenida'

const bienvenida = useBienvenidaStore()
</script>
