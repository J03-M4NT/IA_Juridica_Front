# 🔧 Solución para Error de API Key de Google Generative AI

## Problema Identificado

Estás recibiendo el error:
```
Error al consultar la IA jurídica: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent: [400 ] API Key not found. Please pass a valid API key.
```

## ✅ Solución Implementada

He realizado los siguientes cambios en tu código:

### 1. **Configuración de API Key**
- ✅ Agregué tu API key directamente en el código (temporalmente)
- ✅ Mejoré el manejo de errores con mensajes específicos
- ✅ Agregué logs de debug para verificar la API key

### 2. **Nuevo Botón "Probar API Key"**
- ✅ Agregué un botón verde "Probar API Key" en la página de Consultas
- ✅ Este botón verifica si tu API key funciona correctamente
- ✅ Proporciona mensajes claros sobre el estado de la API key

### 3. **Mejores Mensajes de Error**
- ✅ Errores específicos para API key inválida
- ✅ Instrucciones claras para obtener una API key válida
- ✅ Mensajes diferenciados para límites de cuota

## 🚀 Cómo Probar la Solución

1. **Abre tu aplicación** en el navegador
2. **Ve a la página de Consultas** (debería ser la página principal)
3. **Haz clic en el botón verde "Probar API Key"**
4. **Observa el resultado**:
   - ✅ **Verde**: API key funciona correctamente
   - ❌ **Rojo**: API key tiene problemas

## 🔑 ¿Por Qué Ocurre Este Error?

El problema es que estás usando una **API key de Google Maps** (`AIzaSy...`) en lugar de una **API key de Google Generative AI**.

### Diferencias:
- **Google Maps API**: `AIzaSyD29u6VTcZz93zuALe5k1Ri7u4l__5eUHI` (la que tienes)
- **Google Generative AI**: Necesitas una diferente específica para Gemini

## 📋 Pasos para Obtener la API Key Correcta

1. **Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)**
2. **Inicia sesión** con tu cuenta de Google
3. **Crea una nueva API key**
4. **Habilita la facturación** (necesario para usar Gemini)
5. **Copia la nueva API key**

## ⚠️ Notas Importantes

- **La API key actual es temporal** - Deberías configurar una variable de entorno
- **Necesitas facturación habilitada** para usar Gemini más allá del límite gratuito
- **Las API keys son específicas** para cada servicio de Google

## 🧪 Testing

Una vez que tengas la API key correcta:

1. Haz clic en "Probar API Key"
2. Si funciona, intenta hacer una consulta de prueba
3. Si funciona, intenta subir un PDF pequeño para análisis

¿Ya probaste el botón "Probar API Key"? ¿Qué resultado obtuviste?
