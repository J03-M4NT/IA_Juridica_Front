# 🔍 Análisis General — LEXIT AI Frontend
## Plan de Mejoras Semanal

> Basado en revisión completa de: [LandingPage.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/pages/LandingPage.vue), [MainLayout.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/layouts/MainLayout.vue), [HomePage.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/pages/HomePage.vue), [ConsultasPage.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/pages/ConsultasPage.vue), [ContratosPage.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/pages/ContratosPage.vue), [PdfAnalyzer.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/components/PdfAnalyzer.vue), stores ([auth.ts](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/stores/auth.ts), [userProfile.ts](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/stores/userProfile.ts), [contratos-store.ts](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/stores/contratos-store.ts), [consultas-store.ts](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/stores/consultas-store.ts)) y router.

---

## 🚨 Hallazgos Críticos (Urgentes)

### 1. Sin sistema de roles / autorización
El store [auth.ts](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/stores/auth.ts) solo sabe si el usuario está autenticado o no. **No existe distinción entre usuario regular y administrador.** Cualquier usuario autenticado accede a todo.

- No hay campo `role` en `UserProfile`
- No hay guardas de ruta por rol
- No hay panel de administración
- No hay manera de distinguir qué usuario creó qué contrato o consulta

### 2. [HomePage.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/pages/HomePage.vue) tiene un bug visible
La línea 1 del archivo empieza con `6<template>` (un `6` sobrante al inicio del archivo). Es un bug de contenido que puede causar errores de parsing.

### 3. [SubirContrato.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/pages/SubirContrato.vue) está vacía
El archivo solo tiene 193 bytes — prácticamente sin contenido. La funcionalidad de subir contratos está pendiente o abandonada.

### 4. Navegación rota en móvil (< 1024px)
El CSS de [MainLayout.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/layouts/MainLayout.vue) oculta completamente los botones de navegación (`.nav-buttons { display: none }`) en tablets y móviles, sin un menú hamburguesa de reemplazo. Los usuarios móviles no pueden navegar.

### 5. Dark mode inconsistente
[ContratosPage.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/pages/ContratosPage.vue) tiene valores de dark mode incorrectos (ej: `.body--dark .templates-header { background-color: #d3d3d3 }` — gris claro en modo oscuro). El dark mode de [ConsultasPage.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/pages/ConsultasPage.vue) usa variables CSS correctamente, pero [ContratosPage.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/pages/ContratosPage.vue) usa hex directamente.

---

## 🎨 Mejoras de UI/UX

### Landing Page ([LandingPage.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/pages/LandingPage.vue))
- [ ] **Botón de CTA faltante** — No hay ningún botón "Comenzar ahora" o "Iniciar sesión" en el hero. Solo el header tiene los botones de auth (pequeños). Un CTA prominente en el centro aumentaría conversión.
- [ ] **Sin sección de precios/planes** — Un landing de SaaS legal debería comunicar al menos si es gratis, freemium o de pago.
- [ ] **Sin testimonios ni social proof** — Para un producto legal, la confianza es clave.
- [ ] **Animaciones de entrada** — Las feature cards aparecen sin animación. Un `fade-in` con delay escalonado mejoraría la percepción de calidad.

### App Principal ([MainLayout.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/layouts/MainLayout.vue))
- [ ] **Menú hamburguesa móvil** — Crítico. Sin él, la app es inutilizable en móvil.
- [ ] **Perfil de usuario en navbar** — [AuthButtons.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/components/Auth/AuthButtons.vue) existe pero no muestra avatar/nombre del usuario logueado en la barra. Sería elegante mostrar la foto de perfil.
- [ ] **Breadcrumb o título de página activa** — El usuario no sabe fácilmente en qué sección está.

### HomePage (Dashboard post-login)
- [ ] **Actualmente es solo un logo + 3 botones** sin ningún valor real.
- [ ] Debería convertirse en un **dashboard** con: últimas consultas, contratos recientes, estadísticas de uso.
- [ ] **Saludo personalizado** — "Bienvenido, [nombre]" usando el `displayName` del perfil.

### ConsultasPage
- [ ] **Sin historial persistente** — Cada vez que se entra, `store.limpiar()` borra todo el chat. No hay manera de ver conversaciones anteriores.
- [ ] **Sin opción de copiar respuestas** — Las respuestas de la IA no tienen botón de copiar.
- [ ] **Sin adjuntar PDF al chat** — El analizador de PDF y el chat son módulos separados; sería poderoso poder preguntar sobre un PDF cargado directamente desde el chat.

### ContratosPage
- [ ] **Sin buscador de plantillas** — Con pocas plantillas no importa, pero escala mal.
- [ ] **Sin categorías/filtros** — Todas las plantillas en una lista plana.
- [ ] **Sin vista previa rápida** (hover o tooltip) antes de seleccionar una plantilla.

---

## 🔐 Sistema de Roles (Propuesta de Arquitectura)

### Roles propuestos
| Rol | Descripción |
|-----|-------------|
| `user` | Usuario estándar. Acceso a analizador, consultas, contratos. |
| `admin` | Gestiona plantillas de contratos, ve todos los usuarios, puede subir nuevos PDFs. |
| `superadmin` | Control total del sistema. |

### Cambios necesarios para implementar roles
1. **`UserProfile` type** → añadir campo `role: 'user' | 'admin' | 'superadmin'`
2. **[userProfile.ts](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/stores/userProfile.ts) store** → exponer computed `isAdmin`, `isSuperAdmin`
3. **Router guards** → nueva meta `requiresAdmin` en rutas de administración
4. **`AdminPage.vue`** → nueva página solo para admins:
   - Gestión de usuarios (listar, cambiar rol, desactivar)
   - Subir nuevas plantillas de contratos a Supabase
   - Ver estadísticas globales de uso
5. **Navbar** → mostrar enlace "Admin" condicionalmente si `isAdmin`
6. **Firestore rules** → (backend pendiente de verificar) asegurar que solo admins puedan escribir plantillas

---

## 🛠️ Deuda Técnica

| Problema | Archivo | Impacto |
|----------|---------|---------|
| `console.log` de debug en producción | `ConsultasPage.vue:185`, `auth.ts:22` | Bajo |
| `error.value = null` desde fuera del store | `ContratosPage.vue:250` | Medio |
| `AuthStore` duplicado ([auth.ts](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/stores/auth.ts) + [auth-store.ts](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/stores/auth-store.ts)) | `/stores/` | Medio |
| Rutas hardcodeadas (`'/analizar'`) que no coinciden con el router real (`/app/analizador`) | [HomePage.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/pages/HomePage.vue) | Alto |
| `import { watch }` dentro de `<script setup>` después de usarlo | `ConsultasPage.vue:212` | Bajo |
| [example-store.ts](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/stores/example-store.ts) sin usar | `/stores/` | Bajo |
| [ExampleComponent.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/components/ExampleComponent.vue) sin usar | `/components/` | Bajo |

---

## 📅 Plan Semanal Propuesto

### Día 1 — Lunes: Fundamentos y Bugs Críticos
**Objetivo:** Dejar la app estable antes de añadir features.

- [ ] Corregir el bug del `6` en [HomePage.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/pages/HomePage.vue) (5 min)
- [ ] Añadir menú hamburguesa móvil en [MainLayout.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/layouts/MainLayout.vue) (2h)
- [ ] Corregir rutas hardcodeadas en [HomePage.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/pages/HomePage.vue) (30 min)
- [ ] Eliminar archivos sin usar ([example-store.ts](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/stores/example-store.ts), [ExampleComponent.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/components/ExampleComponent.vue)) (15 min)
- [ ] Corregir dark mode inconsistente en [ContratosPage.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/pages/ContratosPage.vue) (1h)

---

### Día 2 — Martes: Sistema de Roles (Base)
**Objetivo:** Infraestructura mínima para que admins y usuarios sean distinguibles.

- [ ] Añadir campo `role` al tipo `UserProfile` en [src/types/user.ts](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/types/user.ts)
- [ ] Actualizar [userProfile.ts](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/stores/userProfile.ts) store → computed `isAdmin`
- [ ] Actualizar `userService.ts` → asignar `role: 'user'` al crear perfil
- [ ] Actualizar router → añadir meta `requiresAdmin` y guarda correspondiente
- [ ] Mostrar enlace "Admin" en navbar condicionalmente
- [ ] Crear `AdminPage.vue` básica (placeholder con mensaje "Panel de Administración")

---

### Día 3 — Miércoles: Dashboard & UX del Home
**Objetivo:** Que el homepage post-login tenga valor real.

- [ ] Rediseñar [HomePage.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/pages/HomePage.vue) como dashboard:
  - Saludo personalizado con nombre del usuario
  - Cards de acceso rápido a las 3 secciones (más visuales que botones planos)
  - Historial de las últimas 5 consultas (si se persiste)
  - Contador de contratos generados
- [ ] Añadir avatar/nombre de usuario en la navbar (usando `userProfile` store)

---

### Día 4 — Jueves: Landing Page + Features de Conversión
**Objetivo:** Que el landing page convierta mejor y se vea más profesional.

- [ ] Añadir botón CTA prominente en el hero (Ej: "Empezar gratis")
- [ ] Añadir sección de "Cómo funciona" (3 pasos ilustrados)
- [ ] Animaciones de entrada escalonadas en feature cards
- [ ] Añadir sección de precios/planes (aunque sea un placeholder)
- [ ] Mejorar el footer (añadir links: Privacidad, Términos, Contacto)

---

### Día 5 — Viernes: Persistencia de Consultas + Panel Admin V1
**Objetivo:** Que las consultas se guarden y el admin pueda gestionar plantillas.

- [ ] Guardar historial de consultas por usuario en Firestore
- [ ] Mostrar historial al abrir `ConsultasPage`
- [ ] Añadir botón "Nueva conversación" para limpiar el chat
- [ ] En `AdminPage.vue`:
  - Listar usuarios registrados (con rol y fecha)
  - Botón para cambiar rol de un usuario
  - Subir nueva plantilla de contrato (integrar [SubirContrato.vue](file:///c:/Users/josep/Im%C3%A1genes/Proyectos/Coding/IAJURICA_frontend/src/pages/SubirContrato.vue))

---

## 📊 Resumen de Prioridades

| Prioridad | Área | Esfuerzo estimado |
|-----------|------|-------------------|
| 🔴 Crítico | Navegación móvil rota | 2h |
| 🔴 Crítico | Rutas incorrectas en `HomePage` | 30min |
| 🟠 Alto | Sistema de roles básico | 4h |
| 🟠 Alto | Dashboard home post-login | 3h |
| 🟡 Medio | Persistencia de consultas | 3h |
| 🟡 Medio | Landing page CTA y secciones | 3h |
| 🟢 Bajo | Dark mode consistente | 1h |
| 🟢 Bajo | Limpieza de deuda técnica | 1h |
