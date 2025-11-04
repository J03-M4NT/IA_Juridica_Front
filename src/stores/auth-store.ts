import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { auth } from '../firebase/firebaseConfig';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'vue-router';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(true);
  const router = useRouter();

  const isAuthenticated = computed(() => !!user.value);
  const userEmail = computed(() => user.value?.email || '');
  const userName = computed(() => user.value?.displayName || user.value?.email?.split('@')[0] || '');

  // Initialize auth state listener
  const initAuth = () => {
    console.log('Initializing auth...');
    try {
      onAuthStateChanged(auth, (firebaseUser) => {
        console.log('Auth state changed:', firebaseUser ? 'logged in' : 'logged out');
        user.value = firebaseUser;
        loading.value = false;

        if (firebaseUser) {
          // User is signed in, redirect to dashboard if on login page
          if (router.currentRoute.value.path === '/login') {
            void router.push('/');
          }
        } else {
          // User is signed out, redirect to login if on protected route
          if (router.currentRoute.value.meta.requiresAuth) {
            void router.push('/login');
          }
        }
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      loading.value = false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      void router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    user,
    loading,
    isAuthenticated,
    userEmail,
    userName,
    initAuth,
    logout,
  };
});
