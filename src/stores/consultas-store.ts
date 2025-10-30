import { defineStore } from 'pinia';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ArchivoPDF, AnalisisContrato } from '../components/models';

interface Mensaje {
  contenido: string;
  esIA: boolean;
  timestamp: Date;
  referencias?: string[];
}

// Debug log para verificar la API key
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyD29u6VTcZz93zuALe5k1Ri7u4l__5eUHI';
console.log('API Key presente:', !!API_KEY);
console.log('API Key (primeros 10 caracteres):', API_KEY.substring(0, 10) + '...');

// Inicializar Gemini con la configuración correcta
const genAI = new GoogleGenerativeAI(API_KEY);

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

// Prompt específico para análisis de contratos
const PROMPT_ANALISIS_CONTRATO: string = [
  'Analiza el siguiente contrato PDF y proporciona un análisis detallado estructurado.',
  '',
  'INSTRUCCIONES IMPORTANTES:',
  '- El PDF del contrato está incluido en esta solicitud',
  '- Debes leer y analizar el contenido completo del PDF',
  '- Proporciona un análisis exhaustivo del documento',
  '',
  'ESTRUCTURA REQUERIDA DEL ANÁLISIS:',
  '',
  '# Resumen ejecutivo',
  'Una síntesis clara y concisa del contrato completo.',
  '',
  '## Tipo de contrato',
  'Identifica qué tipo de contrato es (compraventa, arrendamiento, servicios, etc.).',
  '',
  '## Partes involucradas',
  'Nombres completos de todas las partes contratantes.',
  '',
  '## Cláusulas principales',
  'Lista numerada de las cláusulas más importantes del contrato.',
  '',
  '## Riesgos potenciales',
  'Identifica cláusulas que puedan ser problemáticas o desfavorables.',
  '',
  '## Recomendaciones',
  'Sugiere mejoras o puntos a negociar en el contrato.',
  '',
  'IMPORTANTE:',
  '- Sé específico y detallado en tu análisis',
  '- Usa **negrita** para términos importantes',
  '- Incluye ⚠️ para riesgos identificados',
  '- Estructura la respuesta con encabezados claros'
].join('\n');

export const useConsultasStore = defineStore('consultas', {
  state: () => ({
    pregunta: '',
    respuesta: '',
    referencias: [],
    loading: false,
    error: '',
    mensajes: [] as Mensaje[],
    archivosPDF: [] as ArchivoPDF[],
    archivoActual: null as ArchivoPDF | null,
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
          model: "gemini-2.5-flash-lite",
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        });

        console.log('Configuración del modelo:', model);

        // Preparar el contenido de la consulta
        let promptCompleto = PROMPT_BASE;

        // Si hay un archivo PDF cargado, incluirlo en el contexto
        if (this.archivoActual) {
          promptCompleto += `\n\nContexto del contrato analizado:\n${this.archivoActual.analisis?.resumen || 'Contrato cargado pero no analizado aún'}`;
          promptCompleto += `\n\nConsulta del usuario sobre el contrato: ${pregunta}`;
        } else {
          promptCompleto += `\n\nConsulta del usuario: ${pregunta}`;
        }

        const contents = [{
          role: "user",
          parts: [{ text: promptCompleto }]
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
        console.error('Error completo:', error);

        let errorMessage = 'Error desconocido';
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        // Crear mensaje de error para mostrar en el chat
        let mensajeError = `❌ **Error al consultar la IA jurídica**\n\n${errorMessage}`;

        // Manejo específico de errores de API key
        if (errorMessage.includes('API Key not found') || errorMessage.includes('API_KEY_INVALID')) {
          mensajeError = `❌ **Error de API Key**\n\nLa clave API no es válida para Google Generative AI.

🔧 **Soluciones:**
1. Verifica que tienes habilitada la API de Generative Language en Google Cloud Console
2. Asegúrate de que la API key tenga permisos para usar Gemini
3. Si usas una API key de Google Maps, necesitas una específica para AI

📋 Tu API key actual: ${API_KEY.substring(0, 10)}...

💡 Para obtener una API key válida:
- Ve a https://makersuite.google.com/app/apikey
- Crea una nueva API key
- Asegúrate de que tenga habilitada la facturación (necesario para usar Gemini)`;
        } else if (errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('RATE_LIMIT_EXCEEDED')) {
          mensajeError = `⚠️ **Límite de cuota excedido**\n\nHas alcanzado el límite de uso de la API.

🔧 **Soluciones:**
1. Espera unos minutos antes de intentar nuevamente
2. Verifica tu plan de facturación en Google Cloud Console
3. Considera actualizar tu plan si necesitas más uso`;
        }

        // Agregar mensaje de error al chat
        this.mensajes.push({
          contenido: mensajeError,
          esIA: true,
          timestamp: new Date(),
          referencias: []
        });

        // Force reactivity update for mensajes array
        this.mensajes = [...this.mensajes];

        this.error = `Error al consultar la IA jurídica: ${errorMessage}`;
        console.error('Error detallado:', error);
      } finally {
        this.loading = false;
      }
    },

    async subirYAnalizarPDF(archivo: File) {
      console.log('Subiendo y analizando PDF:', archivo.name, 'Tamaño:', archivo.size, 'bytes');
      this.loading = true;
      this.error = '';

      try {
        // Crear objeto para el archivo
        const nuevoArchivo: ArchivoPDF = {
          id: Date.now().toString(),
          nombre: archivo.name,
          tamano: archivo.size,
          fechaSubida: new Date(),
        };

        // Agregar archivo a la lista
        this.archivosPDF.push(nuevoArchivo);
        this.archivoActual = nuevoArchivo;

        // Verificar tamaño del archivo (Gemini tiene límites)
        if (archivo.size > 20 * 1024 * 1024) { // 20MB límite
          throw new Error('El archivo es demasiado grande. El límite es 20MB.');
        }

        console.log('Convirtiendo PDF a base64...');
        const base64Data = await this.fileToBase64(archivo);
        if (!base64Data) {
          throw new Error('No se pudo convertir el archivo a base64');
        }

        console.log('Base64 generado, longitud:', base64Data.length);

        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash-lite",
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          },
        });

        // Crear el contenido con el PDF
        const contents = [
          {
            role: "user",
            parts: [
              {
                text: PROMPT_ANALISIS_CONTRATO
              },
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Data
                }
              }
            ]
          }
        ];

        console.log('Enviando PDF para análisis...');
        console.log('Contenido del request:', {
          model: 'gemini-pro',
          hasPDF: !!base64Data,
          pdfSize: base64Data.length,
          mimeType: 'application/pdf'
        });

        const result = await model.generateContent({
          contents: contents
        });

        console.log('Respuesta recibida de Gemini:', result);

        if (!result.response) {
          throw new Error('No se recibió respuesta del análisis');
        }

        const analisisTexto = result.response.text();
        console.log('Análisis del contrato recibido, longitud:', analisisTexto.length);

        if (analisisTexto.includes('no puedo analizar un contrato sin tener acceso al texto')) {
          throw new Error('Gemini no pudo procesar el PDF. Esto puede deberse a que el PDF está escaneado o protegido.');
        }

        // Parsear el análisis para estructurarlo
        const analisis: AnalisisContrato = {
          resumen: this.extraerResumen(analisisTexto),
          clausulas: this.extraerClausulas(analisisTexto),
          tipoContrato: this.extraerTipoContrato(analisisTexto),
          partes: this.extraerPartes(analisisTexto),
          fechaAnalisis: new Date()
        };

        // Actualizar el archivo con el análisis
        nuevoArchivo.analisis = analisis;

        // Agregar mensaje al chat sobre el análisis
        this.mensajes.push({
          contenido: `✅ **Contrato analizado exitosamente**\n\n**Archivo:** ${archivo.name}\n**Tamaño:** ${(archivo.size / 1024).toFixed(1)} KB\n\n**Resumen del análisis:**\n${analisis.resumen}`,
          esIA: true,
          timestamp: new Date(),
          referencias: []
        });

        this.mensajes = [...this.mensajes];

      } catch (error) {
        console.error('Error completo en análisis PDF:', error);

        let errorMessage = 'Error desconocido';
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        // Agregar mensaje de error al chat con información específica
        let mensajeError = `❌ **Error al analizar el contrato**\n\n${errorMessage}`;

        // Manejo específico de errores de API key en análisis PDF
        if (errorMessage.includes('API Key not found') || errorMessage.includes('API_KEY_INVALID')) {
          mensajeError = `❌ **Error de API Key en análisis PDF**

La clave API no es válida para Google Generative AI.

🔧 **Para solucionarlo:**
1. Ve a https://makersuite.google.com/app/apikey
2. Crea una nueva API key específica para AI
3. Asegúrate de tener facturación habilitada

📋 Tu API key actual: ${API_KEY.substring(0, 10)}...`;
        } else if (errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('RATE_LIMIT_EXCEEDED')) {
          mensajeError = `⚠️ **Límite de cuota excedido**

Has alcanzado el límite de uso de la API para análisis de PDFs.

🔧 **Soluciones:**
1. Espera unos minutos antes de intentar nuevamente
2. Verifica tu plan de facturación en Google Cloud Console
3. Considera actualizar tu plan si necesitas más uso`;
        }

        this.error = `Error al analizar el PDF: ${errorMessage}`;

        this.mensajes.push({
          contenido: mensajeError,
          esIA: true,
          timestamp: new Date(),
          referencias: []
        });
        this.mensajes = [...this.mensajes];

        console.error('Error detallado:', error);
      } finally {
        this.loading = false;
      }
    },

    // Métodos auxiliares
    async fileToBase64(file: File): Promise<string | null> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          try {
            const base64 = reader.result as string;
            console.log('FileReader completado, resultado tipo:', typeof base64);

            // Verificar que tenemos el resultado correcto
            if (!base64 || !base64.startsWith('data:application/pdf;base64,')) {
              console.error('Formato base64 incorrecto:', base64?.substring(0, 50));
              resolve(null);
              return;
            }

            // Remover el prefijo "data:application/pdf;base64," para obtener solo el base64
            const data = base64.split(',')[1];
            console.log('Base64 extraído, longitud:', data?.length || 0);

            resolve(data || null);
          } catch (error) {
            console.error('Error en fileToBase64:', error);
            resolve(null);
          }
        };

        reader.onerror = () => {
          console.error('Error en FileReader');
          reject(new Error('Error al leer el archivo PDF'));
        };

        console.log('Iniciando lectura del archivo:', file.name);
        reader.readAsDataURL(file);
      });
    },

    extraerResumen(texto: string): string {
      const match = texto.match(/# Resumen ejecutivo[:\n](.*?)(?=#|$)/is);
      return match && match[1] ? match[1].trim() : 'No se pudo extraer el resumen';
    },

    extraerClausulas(texto: string): Array<{numero: number, texto: string, riesgo?: string}> {
      const clausulas: Array<{numero: number, texto: string, riesgo?: string}> = [];
      const matches = texto.match(/Cláusula (\d+):([^#]*?)(?=(Cláusula \d+|$))/g);

      if (matches) {
        matches.forEach((match, index) => {
          const numero = index + 1;
          const textoLimpio = match.replace(/Cláusula \d+:/, '').trim();
          clausulas.push({
            numero,
            texto: textoLimpio
          });
        });
      }

      return clausulas;
    },

    extraerTipoContrato(texto: string): string {
      const match = texto.match(/## Tipo de contrato[:\n](.*?)(?=\n|$)/i);
      return match && match[1] ? match[1].trim() : 'No especificado';
    },

    extraerPartes(texto: string): string[] {
      const match = texto.match(/## Partes involucradas[:\n](.*?)(?=\n|$)/i);
      if (match && match[1]) {
        return match[1].split(/[,y]/).map(p => p.trim()).filter(p => p);
      }
      return [];
    },

    limpiar() {
      this.pregunta = '';
      this.respuesta = '';
      this.referencias = [];
      this.error = '';
      this.mensajes = [];
      this.archivosPDF = [];
      this.archivoActual = null;
    },

    // Método para probar la API key
    async probarAPIKey() {
      console.log('Probando API key...');
      this.loading = true;
      this.error = '';

      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash-lite",
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.1,
            maxOutputTokens: 50,
          },
        });

        const result = await model.generateContent({
          contents: [{
            role: "user",
            parts: [{ text: "Responde solo con 'OK' si puedes leer este mensaje." }]
          }]
        });

        if (result.response) {
          const respuesta = result.response.text();
          console.log('✅ API Key funciona correctamente. Respuesta:', respuesta);

          this.mensajes.push({
            contenido: `✅ **API Key válida**\n\nLa API key funciona correctamente. Puedes usar todas las funciones de IA jurídica.`,
            esIA: true,
            timestamp: new Date(),
            referencias: []
          });
          this.mensajes = [...this.mensajes];

          return true;
        } else {
          throw new Error('No se recibió respuesta de la API');
        }

      } catch (error) {
        console.error('❌ Error al probar API key:', error);

        let errorMessage = 'Error desconocido';
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        this.error = `❌ Error al probar API key: ${errorMessage}`;

        this.mensajes.push({
          contenido: `❌ **API Key no válida**\n\nError: ${errorMessage}\n\n**Solución:**\n1. Ve a https://makersuite.google.com/app/apikey\n2. Crea una nueva API key\n3. Asegúrate de tener facturación habilitada`,
          esIA: true,
          timestamp: new Date(),
          referencias: []
        });
        this.mensajes = [...this.mensajes];

        return false;
      } finally {
        this.loading = false;
      }
    }
  }
});
