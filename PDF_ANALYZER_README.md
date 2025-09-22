# 📄 Analizador de Contratos PDF con Vue 3 + Quasar

## 🎯 Descripción

Este componente permite analizar contratos PDF utilizando inteligencia artificial. Extrae el texto del PDF y lo envía a Google Gemini para obtener un análisis estructurado que incluye:

- ✅ **Resumen del contrato** en lenguaje simple
- ✅ **Cláusulas principales** identificadas
- ✅ **Riesgos y ambigüedades** detectadas
- ✅ **Información del archivo** procesado

## 🚀 Características

- **Subida de archivos PDF** con drag & drop
- **Extracción de texto** usando PDF.js
- **Análisis con IA** usando Google Gemini 1.5 Flash
- **Interfaz responsiva** con modo oscuro/claro
- **Manejo de errores** robusto
- **Notificaciones** informativas
- **Soporte TypeScript** completo

## 📦 Dependencias Requeridas

```json
{
  "@google/generative-ai": "^0.24.1",
  "pdfjs-dist": "^5.4.149",
  "quasar": "^2.16.0",
  "vue": "^3.4.18"
}
```

## ⚙️ Configuración

### 1. Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
VITE_GEMINI_API_KEY=tu_api_key_de_google_gemini
```

### 2. Tipos TypeScript

El archivo `src/types/env.d.ts` ya está configurado:

```typescript
interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

## 🛠️ Uso del Componente

### Importación Básica

```vue
<template>
  <div>
    <PdfAnalyzer />
  </div>
</template>

<script setup lang="ts">
import PdfAnalyzer from './components/PdfAnalyzer.vue';
</script>
```

### En una Página Quasar

```vue
<template>
  <q-page class="flex flex-center">
    <PdfAnalyzer />
  </q-page>
</template>

<script setup lang="ts">
import PdfAnalyzer from '../components/PdfAnalyzer.vue';
</script>
```

## 🎨 Personalización

### Estilos

El componente incluye estilos CSS para:
- **Modo oscuro/claro** automático
- **Responsive design** para móviles y desktop
- **Animaciones** suaves de carga
- **Formato de texto** enriquecido

### Configuración de Gemini

Puedes personalizar los parámetros de la IA:

```typescript
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.3,        // Creatividad (0-1)
    topK: 40,               // Diversidad de respuestas
    topP: 0.95,             // Probabilidad acumulada
    maxOutputTokens: 4096,  // Longitud máxima
  },
});
```

## 🔧 Funcionalidades Técnicas

### Extracción de Texto PDF

- Usa **PDF.js** para procesar archivos PDF
- Extrae texto **página por página**
- Maneja **PDFs escaneados** (con advertencia)
- **Límite de 20MB** por archivo

### Análisis con IA

- **Prompt estructurado** para resultados consistentes
- **Parsing automático** de la respuesta
- **Detección de secciones** específicas
- **Manejo de errores** de API

### Interfaz de Usuario

- **q-uploader** para subida de archivos
- **q-card** para mostrar resultados
- **q-notify** para notificaciones
- **q-linear-progress** para estado de carga

## 🚨 Manejo de Errores

El componente maneja los siguientes errores:

- ❌ **Archivo no PDF**: Validación de tipo de archivo
- ❌ **Archivo demasiado grande**: Límite de 20MB
- ❌ **Texto no extraíble**: PDFs escaneados o protegidos
- ❌ **API Key faltante**: Configuración de entorno
- ❌ **Error de API**: Problemas con Google Gemini
- ❌ **Red**: Problemas de conectividad

## 📱 Responsive Design

- **Mobile**: Interfaz optimizada para pantallas pequeñas
- **Tablet**: Layout adaptativo
- **Desktop**: Utilización completa del espacio
- **Modo oscuro**: Soporte completo para tema oscuro

## 🔍 Troubleshooting

### Error: "VITE_GEMINI_API_KEY is not defined"

**Solución**: Verificar que el archivo `.env` existe y contiene:
```env
VITE_GEMINI_API_KEY=tu_api_key_aqui
```

### Error: "No se pudo extraer texto del PDF"

**Posibles causas**:
- PDF escaneado (imagen, no texto)
- PDF protegido con contraseña
- PDF corrupto

### Error: "Error al analizar el contrato con la IA"

**Solución**:
- Verificar conexión a internet
- Verificar cuota de API de Google Gemini
- Revisar logs de consola para detalles

## 📊 Logs de Debug

El componente incluye logs detallados:
- Extracción de texto del PDF
- Envío a Gemini y respuestas
- Errores y problemas encontrados

**Para ver logs**: Abrir la consola del navegador (F12)

## 🎯 Próximas Mejoras

- [ ] **Múltiples archivos**: Cargar varios PDFs simultáneamente
- [ ] **Historial**: Guardar análisis previos
- [ ] **Exportar**: Descargar análisis en PDF
- [ ] **Comparación**: Comparar múltiples contratos
- [ ] **Búsqueda**: Buscar términos específicos en contratos

## 📝 Licencia

Este componente es parte del proyecto IA Jurídica Frontend.

---

**Desarrollado con ❤️ usando Vue 3 + Quasar Framework + Google Gemini**
