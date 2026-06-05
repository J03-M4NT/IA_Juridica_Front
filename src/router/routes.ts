import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  // Ruta pública - Landing Page
  {
    path: '/',
    component: () => import('pages/LandingPage.vue'),
    meta: { requiresAuth: false },
  },

  // Rutas privadas - Área protegida con MainLayout
  {
    path: '/app',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'analizador',
        component: () => import('pages/AnalyzerPage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'consultas',
        component: () => import('pages/ConsultasPage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'contratos',
        component: () => import('pages/ContratosPage.vue'),
        meta: { requiresAuth: true },
      },

      // ✅ NUEVA RUTA DE NORMAS (CORRECTA)
      {
        path: 'normas',
        component: () => import('pages/BibliotecaLegal.vue'),
        meta: { requiresAuth: true },
      },

      {
        path: 'subir-contrato',
        component: () => import('pages/SubirContrato.vue'),
        meta: { requiresAuth: true },
      },

      {
        path: 'admin',
        component: () => import('pages/AdminPage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true },
      },
    ],
  },

  // Ruta no encontrada
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
