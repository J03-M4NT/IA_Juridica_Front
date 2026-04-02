<template>
  <q-page class="q-pa-md">

    <div class="text-h5 q-mb-md Title">
      Normas del Diario Oficial El Peruano
    </div>

    <div class="row justify-center q-mt-xl">
      <div class="col-12 col-sm-8 col-md-6">
        <q-card bordered class="q-pa-lg text-center">
          <div class="text-subtitle1 q-mb-md Title2">
            Modo vista previa (haz click dentro del cuadro para ir al sitio)
          </div>

          <div class="text-subtitle2 q-mb-md Title2">
            Vista previa de Normas (carga automática)
          </div>

          <div v-if="mostrarPreview" class="q-mt-md">
            <div class="q-pa-sm bg-grey-2" style="height: 70vh; border: 1px solid var(--q-color-grey-4); position: relative;">
            <iframe
              :src="diarioUrl"
              style="width:100%; height:100%; border:none; pointer-events: none;"
              sandbox="allow-scripts allow-same-origin allow-popups"
            ></iframe>
            <div
              class="fullscreen-overlay"
              style="position: absolute; inset: 0; cursor: pointer;"
              @click="abrirEnPestaniaDirecta"
            ></div>
          </div>
            <div class="text-caption q-mt-sm">Click dentro del preview para ir al Diario Oficial</div>
          </div>

        </q-card>
      </div>
    </div>

  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const diarioUrl = 'https://diariooficial.elperuano.pe/Normas'
const mostrarPreview = ref(true)

function abrirEnPestaniaDirecta() {
  window.open(diarioUrl, '_blank')
}
</script>

<style scoped>
.q-card {
  transition: transform 0.2s ease;
}

.q-card:hover {
  transform: scale(1.02);
}

.Title {
  color: var(--primary-color);
  font-weight: bold;
}

.Title2 {
  color: var(--secondary-color);
  font-weight: bold;
}

.Title3 {
  color: var(--secondary-color);
  font-weight: bold;
}

</style>
