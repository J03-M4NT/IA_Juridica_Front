<template>
  <q-page class="analyzer-page flex flex-center fade-in">
    <PdfAnalyzer />
  </q-page>
</template>

<script setup lang="ts">
import PdfAnalyzer from '../components/PdfAnalyzer.vue';
</script>

<style scoped>
.analyzer-page {
  background: var(--background-color);
  min-height: 100vh;
}
</style>
