import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from 'firebase/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(true);

  const isAuthenticated = computed(() => !!user.value);
  const userEmail = computed(() => user.value?.email);
  const userName = computed(() => user.value?.displayName || 'Usuario');

  const setUser = (firebaseUser: User | null) => {
    user.value = firebaseUser;
    loading.value = false;
  };

  const clearAuth = () => {
    user.value = null;
    loading.value = true;
  };

  return {
    user,
    loading,
    isAuthenticated,
    userEmail,
    userName,
    setUser,
    clearAuth
  };
});