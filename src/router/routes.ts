import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/AnalyzerPage.vue') },
      { path: 'consultas', component: () => import('pages/ConsultasPage.vue') },
      { path: 'contratos', component: () => import('pages/ContratosPage.vue') },
      { path: 'subir-contrato', component: () => import('pages/SubirContrato.vue') },
      { path: 'analizador-pdf', component: () => import('pages/AnalyzerPage.vue') },
      // Puedes agregar aquí más páginas: casos, plantillas, etc.
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
