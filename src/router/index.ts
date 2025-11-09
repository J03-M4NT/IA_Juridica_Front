import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';
import { useAuthStore } from '../stores/auth';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory);

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  // Protección de rutas con autenticación
  Router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();

    // Esperar a que se resuelva el estado de autenticación
    if (authStore.loading) {
      await new Promise(resolve => {
        const unsubscribe = authStore.$subscribe(() => {
          if (!authStore.loading) {
            unsubscribe();
            resolve(void 0);
          }
        });
      });
    }

    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const isAuthenticated = authStore.isAuthenticated;

    if (requiresAuth && !isAuthenticated) {
      // Si la ruta requiere autenticación y no está autenticado, redirigir al landing
      next('/');
    } else if (isAuthenticated && to.path === '/') {
      // Si está autenticado y trata de acceder al landing, redirigir al analizador
      next('/app/analizador');
    } else {
      // Permitir la navegación
      next();
    }
  });

  return Router;
});
