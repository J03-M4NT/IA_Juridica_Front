<template>
  <div class="fullscreen text-center q-pa-md flex flex-center" style="background: var(--bg); color: var(--ink);">
    <div>
      <div style="font-family: 'EB Garamond', serif; font-weight: 600; font-size: 20vh; color: var(--ink);">
        404
      </div>

      <div class="text-h5" style="font-family: 'Figtree', sans-serif; color: var(--text-secondary); margin-top: -12px;">
        Esta página no existe.
      </div>

      <q-btn
        class="q-mt-xl"
        style="background: var(--ink); color: #fff;"
        unelevated
        to="/"
        label="Volver al inicio"
        no-caps
      />
    </div>
  </div>
</template>

<script setup lang="ts">
//
</script>
