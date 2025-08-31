import { defineStore } from 'pinia';
import axios from 'axios';

export const useConsultasStore = defineStore('consultas', {
  state: () => ({
    pregunta: '',
    respuesta: '',
    referencias: [],
    loading: false,
    error: '',
  }),
  actions: {
    async enviarConsulta(pregunta: string) {
      this.loading = true;
      this.error = '';
      this.respuesta = '';
      this.referencias = [];
      try {
        // Cambia el endpoint para usar Gemini
        const res = await axios.post('https://localhost:5001/api/ia/consultar', { pregunta });
        this.respuesta = res.data.respuesta;
        // Si Gemini devuelve referencias, asígnalas aquí
        this.referencias = res.data.referencias || [];
      } catch {
        this.error = 'Error al consultar la IA jurídica';
      } finally {
        this.loading = false;
      }
    },
    limpiar() {
      this.pregunta = '';
      this.respuesta = '';
      this.referencias = [];
      this.error = '';
    }
  }
});
