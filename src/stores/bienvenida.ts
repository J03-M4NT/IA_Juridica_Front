import { defineStore } from 'pinia'
import { ref } from 'vue'

// Animación de bienvenida (mosaico de fotos) que se muestra justo después de
// iniciar sesión o registrarse — ver components/BienvenidaLexit.vue. La
// activa AuthButtons tras un ingreso exitoso; recargar la página ya con
// sesión iniciada no la muestra.
export const useBienvenidaStore = defineStore('bienvenida', () => {
  const activa = ref(false)

  function mostrar() {
    activa.value = true
  }

  function cerrar() {
    activa.value = false
  }

  return { activa, mostrar, cerrar }
})
