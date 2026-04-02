import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from 'firebase/auth';
import { auth } from '../boot/firebase';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(true);

  const isAuthenticated = computed(() => !!user.value);
  const userEmail = computed(() => user.value?.email);
  const userName = computed(() => user.value?.displayName || 'Usuario');

  // Configurar persistencia local
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Error setting persistence:', error);
  });

  // Inicializar el observer de auth
  const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
    user.value = firebaseUser;
    loading.value = false;

    // Sincronizar con userProfileStore
    if (firebaseUser) {
      // Usuario autenticado - cargar o crear perfil
      const { useUserProfileStore } = await import('./userProfile');
      const profileStore = useUserProfileStore();

      // Intentar cargar perfil existente
      await profileStore.loadProfile(firebaseUser.uid);

      // Si no existe perfil, crear uno nuevo
      if (!profileStore.profile) {
        await profileStore.initializeProfile(
          firebaseUser.uid,
          firebaseUser.email || '',
          firebaseUser.displayName || undefined,
          firebaseUser.photoURL || undefined
        );
      }
    } else {
      // Usuario desautenticado - limpiar perfil
      const { useUserProfileStore } = await import('./userProfile');
      const profileStore = useUserProfileStore();
      profileStore.clearProfile();
    }
  });

  // Cleanup on store destruction
  const clearAuth = () => {
    unsubscribe();
    user.value = null;
    loading.value = true;
  };

  return {
    user,
    loading,
    isAuthenticated,
    userEmail,
    userName,
    clearAuth
  };
});