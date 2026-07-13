import { defineStore } from 'pinia';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ArchivoPDF, AnalisisContrato } from '../types/contracts';
import { GEMINI_MODEL_STANDARD } from '../constants/gemini'
import { getErrorMessage } from '../utils/errors'

interface Mensaje {
  contenido: string;
  esIA: boolean;
  timestamp: Date;
  referencias?: string[];
}

interface ConsultasState {
  pregunta: string;
  respuesta: string;
  referencias: string[];
  loading: boolean;
  error: string;
  mensajes: Mensaje[];
  archivosPDF: ArchivoPDF[];
  archivoActual: ArchivoPDF | null;
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error('Error: La API Key no está definida en las variables de entorno');
}

const genAI = new GoogleGenerativeAI(API_KEY);
const MODELO = GEMINI_MODEL_STANDARD


const PROMPT_BASE = [
  'Eres Letxi , una IA jurídica especializada en derecho peruano.',
  'Tu objetivo es ayudar a interpretar y explicar conceptos legales de manera clara y precisa.',
  'Debes:',
  '1. Analizar consultas legales relacionadas con contratos.',
  '2. Responder de forma estructurada usando markdown (negritas, listas, etc.).',
  '3. Mantener un tono profesional pero accesible.',
  '4. Citar artículos y normas legales peruanas cuando sea relevante.'
].join('\n');

const PROMPT_ANALISIS_CONTRATO = `
Analiza el siguiente contrato en PDF y proporciona un resumen estructurado en formato markdown.
El análisis debe incluir:
# Resumen ejecutivo: Un resumen claro y conciso del propósito del contrato.
## Tipo de contrato: Identifica el tipo de contrato (ej. arrendamiento, prestación de servicios, etc.).
## Partes involucradas: Lista las partes mencionadas en el contrato.
## Cláusulas principales: Detalla las cláusulas más importantes y su significado.
`;

export const useConsultasStore = defineStore('consultas', {
  state: (): ConsultasState => ({
    pregunta: '',
    respuesta: '',
    referencias: [],
    loading: false,
    error: '',
    mensajes: [],
    archivosPDF: [],
    archivoActual: null,
  }),

  actions: {
    async enviarConsulta(pregunta: string) {
      this.loading = true;
      this.error = '';
      this.respuesta = '';
      this.referencias = [];

      this.mensajes.push({
        contenido: pregunta,
        esIA: false,
        timestamp: new Date()
      });

      try {
        const model = genAI.getGenerativeModel({
          model: MODELO,  // ✅ usa la constante
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        });

        let promptCompleto = PROMPT_BASE;

        if (this.archivoActual) {
          promptCompleto += `\n\nContexto del contrato analizado:\n${this.archivoActual.analisis?.resumen || 'Contrato cargado pero no analizado aún'}`;
          promptCompleto += `\n\nConsulta del usuario sobre el contrato: ${pregunta}`;
        } else {
          promptCompleto += `\n\nConsulta del usuario: ${pregunta}`;
        }

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: promptCompleto }] }]
        });

        if (!result.response) {
          throw new Error('No se recibió respuesta de la IA');
        }

        const respuestaIA = result.response.text();

        if (respuestaIA) {
          this.mensajes.push({
            contenido: respuestaIA,
            esIA: true,
            timestamp: new Date(),
            referencias: []
          });
          this.mensajes = [...this.mensajes];
          this.respuesta = respuestaIA;
        } else {
          throw new Error('La respuesta de la IA está vacía');
        }

      } catch (err) {
        const message = getErrorMessage(err)
        console.error('Error al consultar la IA:', err);

        this.mensajes.push({
          contenido: `**Error al consultar la IA juridica**\n\n${message}`,
          esIA: true,
          timestamp: new Date(),
          referencias: []
        });
        this.mensajes = [...this.mensajes];
        this.error = `Error al consultar la IA juridica: ${message}`;
      } finally {
        this.loading = false;
      }
    },

    async subirYAnalizarPDF(archivo: File) {
      this.loading = true;
      this.error = '';

      try {
        const nuevoArchivo: ArchivoPDF = {
          id: Date.now().toString(),
          nombre: archivo.name,
          tamano: archivo.size,
          fechaSubida: new Date(),
        };

        this.archivosPDF.push(nuevoArchivo);
        this.archivoActual = nuevoArchivo;

        if (archivo.size > 20 * 1024 * 1024) {
          throw new Error('El archivo es demasiado grande. El límite es 20MB.');
        }

        const base64Data = await this.fileToBase64(archivo);
        if (!base64Data) {
          throw new Error('No se pudo convertir el archivo a base64');
        }

        const model = genAI.getGenerativeModel({
          model: MODELO,  // ✅ usa la constante
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          },
        });

        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [
              { text: PROMPT_ANALISIS_CONTRATO },
              { inlineData: { mimeType: 'application/pdf', data: base64Data } }
            ]
          }]
        });

        if (!result.response) {
          throw new Error('No se recibió respuesta del análisis');
        }

        const analisisTexto = result.response.text();

        const analisis: AnalisisContrato = {
          resumen: this.extraerResumen(analisisTexto),
          clausulas: this.extraerClausulas(analisisTexto),
          tipoContrato: this.extraerTipoContrato(analisisTexto),
          partes: this.extraerPartes(analisisTexto),
          fechaAnalisis: new Date()
        };

        nuevoArchivo.analisis = analisis;

        this.mensajes.push({
          contenido: `✅ **Contrato analizado exitosamente**\n\n**Archivo:** ${archivo.name}\n**Tamaño:** ${(archivo.size / 1024).toFixed(1)} KB\n\n**Resumen del análisis:**\n${analisis.resumen}`,
          esIA: true,
          timestamp: new Date(),
          referencias: []
        });
        this.mensajes = [...this.mensajes];

      } catch (err) {
        const message = getErrorMessage(err)
        console.error('Error en analisis PDF:', err);

        this.mensajes.push({
          contenido: `**Error al analizar el contrato**\n\n${message}`,
          esIA: true,
          timestamp: new Date(),
          referencias: []
        });
        this.mensajes = [...this.mensajes];
        this.error = `Error al analizar el PDF: ${message}`;
      } finally {
        this.loading = false;
      }
    },

    async fileToBase64(file: File): Promise<string | null> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const base64 = reader.result as string;
            if (!base64 || !base64.startsWith('data:application/pdf;base64,')) {
              resolve(null);
              return;
            }
            const data = base64.split(',')[1];
            resolve(data || null);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (err) {
            resolve(null);
          }
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo PDF'));
        reader.readAsDataURL(file);
      });
    },

    extraerResumen(texto: string): string {
      const match = texto.match(/# Resumen ejecutivo[:\n](.*?)(?=#|$)/is);
      return match?.[1]?.trim() ?? 'No se pudo extraer el resumen';
    },

    extraerClausulas(texto: string): Array<{ numero: number, texto: string, riesgo?: string }> {
      const clausulas: Array<{ numero: number, texto: string, riesgo?: string }> = [];
      const matches = texto.match(/Cláusula (\d+):([^#]*?)(?=(Cláusula \d+|$))/g);
      if (matches) {
        matches.forEach((match, index) => {
          clausulas.push({
            numero: index + 1,
            texto: match.replace(/Cláusula \d+:/, '').trim()
          });
        });
      }
      return clausulas;
    },

    extraerTipoContrato(texto: string): string {
      const match = texto.match(/## Tipo de contrato[:\n](.*?)(?=\n|$)/i);
      return match?.[1]?.trim() ?? 'No especificado';
    },

    extraerPartes(texto: string): string[] {
      const match = texto.match(/## Partes involucradas[:\n](.*?)(?=\n|$)/i);
      if (match?.[1]) {
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

    async probarAPIKey() {
      this.loading = true;
      this.error = '';

      try {
        const model = genAI.getGenerativeModel({
          model: MODELO,  // ✅ usa la constante
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 50,
          },
        });

        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [{ text: "Responde solo con 'OK' si puedes leer este mensaje." }]
          }]
        });

        if (result.response) {
          this.mensajes.push({
            contenido: `✅ **API Key válida**\n\nLetsy IA está funcionando correctamente.`,
            esIA: true,
            timestamp: new Date(),
            referencias: []
          });
          this.mensajes = [...this.mensajes];
          return true;
        } else {
          throw new Error('No se recibió respuesta de la API');
        }

      } catch (err) {
        const message = getErrorMessage(err)
        this.error = `Error al probar API key: ${message}`;
        this.mensajes.push({
          contenido: `**API Key no valida**\n\nError: ${message}`,
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
