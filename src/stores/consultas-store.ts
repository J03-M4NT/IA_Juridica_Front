import { defineStore } from 'pinia';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Mensaje {
  contenido: string;
  esIA: boolean;
  timestamp: Date;
  referencias?: string[];
}

// Debug log para verificar la API key
console.log('API Key presente:', !!import.meta.env.VITE_GEMINI_API_KEY);

// Inicializar Gemini con la configuración correcta
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Prompt base para el asistente legal
const PROMPT_BASE: string = [
  'Eres un asistente legal especializado en derecho contractual y civil.',
  'Tu objetivo es ayudar a interpretar y explicar conceptos legales de manera clara y precisa.',
  'Debes:',
  '1. Analizar consultas legales relacionadas con contratos',
  '2. Explicar términos jurídicos en lenguaje simple',
  '3. Proporcionar referencias a leyes relevantes cuando sea apropiado',
  '4. Mantener una postura neutral y objetiva',
  '5. Aclarar cuando un tema requiera consulta con un abogado',
  '6. Proporcionar ejemplos prácticos cuando sea posible',
  '7. Citar artículos específicos del código civil cuando corresponda',
  '',
  'Importante:',
  '- Tus respuestas deben ser informativas pero no constituyen asesoramiento legal formal',
  '- Debes mantener un tono profesional pero accesible',
  '- Si una consulta está fuera de tu alcance, indicarlo claramente',
  '',
  'Formato de respuesta:',
  '- Usa **negrita** para resaltar términos importantes',
  '- Usa *cursiva* para énfasis',
  '- Usa encabezados como # Título, ## Subtítulo para estructurar la información',
  '- Incluye emojis relevantes para hacer las respuestas más amigables (ej: 📋, ⚖️, 📖)',
  '- Mantén las respuestas bien estructuradas y fáciles de leer'
].join('\n');

export const useConsultasStore = defineStore('consultas', {
  state: () => ({
    pregunta: '',
    respuesta: '',
    referencias: [],
    loading: false,
    error: '',
    mensajes: [] as Mensaje[],
  }),

  actions: {
    async enviarConsulta(pregunta: string) {
      console.log('Método enviarConsulta llamado con:', pregunta);
      this.loading = true;
      this.error = '';
      this.respuesta = '';
      this.referencias = [];

      // Agregamos el mensaje del usuario
      this.mensajes.push({
        contenido: pregunta,
        esIA: false,
        timestamp: new Date()
      });

      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        });

        console.log('Configuración del modelo:', model);

        // Preparar el contenido de la consulta
        const contents = [{
          role: "user",
          parts: [{ text: `${PROMPT_BASE}\n\nConsulta del usuario: ${pregunta}` }]
        }];

        console.log('Enviando consulta a Gemini...', contents);

        // Enviar consulta
        const result = await model.generateContent({
          contents: contents
        });

        console.log('Resultado recibido de Gemini:', result);
        
        if (!result.response) {
          throw new Error('No se recibió respuesta de la IA');
        }

        const respuestaIA = result.response.text();
        console.log('Respuesta de la IA:', respuestaIA);

        // Agregar respuesta al historial solo si tenemos contenido
        if (respuestaIA) {
          this.mensajes.push({
            contenido: respuestaIA,
            esIA: true,
            timestamp: new Date(),
            referencias: []
          });

          // Force reactivity update for mensajes array
          this.mensajes = [...this.mensajes];

          this.respuesta = respuestaIA;
        } else {
          throw new Error('La respuesta de la IA está vacía');
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        this.error = `Error al consultar la IA jurídica: ${errorMessage}`;
        console.error('Error detallado:', error);
      } finally {
        this.loading = false;
      }
    },

    limpiar() {
      this.pregunta = '';
      this.respuesta = '';
      this.referencias = [];
      this.error = '';
      this.mensajes = [];
    }
  }
});