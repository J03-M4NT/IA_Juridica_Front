import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';
import { useAuthStore } from '../stores/auth';
import { useUserProfileStore } from '../stores/userProfile';

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

    // Esperar a que se resuelva el estado de autenticación (máximo 5 segundos)
    if (authStore.loading) {
      await Promise.race([
        new Promise<void>(resolve => {
          const unsubscribe = authStore.$subscribe(() => {
            if (!authStore.loading) {
              unsubscribe()
              resolve()
            }
          })
        }),
        new Promise<void>(resolve => setTimeout(resolve, 5000))
      ])
    }

    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin);
    const isAuthenticated = authStore.isAuthenticated;

    if (requiresAuth && !isAuthenticated) {
      next('/');
    } else if (isAuthenticated && to.path === '/') {
      next('/app/consultas');
    } else if (requiresAdmin) {
      const profileStore = useUserProfileStore();

      // auth-sync marca la sesión como lista ANTES de terminar de leer el
      // perfil de Firestore — al recargar en /app/admin, isAdmin todavía
      // sería false y te sacaría a Consultas. Se espera a que termine
      // (máximo 5 segundos, igual que con la sesión).
      if (!profileStore.profile || profileStore.loading) {
        await Promise.race([
          new Promise<void>(resolve => {
            const unsubscribe = profileStore.$subscribe(() => {
              if (profileStore.profile && !profileStore.loading) {
                unsubscribe()
                resolve()
              }
            })
          }),
          new Promise<void>(resolve => setTimeout(resolve, 5000))
        ])
      }

      if (!profileStore.isAdmin) {
        next('/app/consultas');
      } else {
        next();
      }
    } else {
      next();
    }
  });

  return Router;
});
