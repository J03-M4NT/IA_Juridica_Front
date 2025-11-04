<template>
  <q-page class="login-page flex flex-center">
    <!-- Background Gradient -->
    <div class="background-gradient"></div>

    <!-- Login Card -->
    <q-card class="login-card q-pa-lg shadow-10 fade-in">
      <q-card-section class="text-center q-pa-md">
        <!-- Logo -->
        <div class="logo-section q-mb-lg">
          <img src="../assets/logo.svg" alt="LEXIT AI" class="brand-logo q-mb-sm" />
          <h1 class="brand-title text-h4 text-weight-bold q-mb-sm">LEXIT AI</h1>
          <p class="brand-subtitle text-body2 text-grey-6">Sistema Jurídico Inteligente</p>
        </div>

        <!-- Login Form -->
        <q-form @submit="handleLogin" class="login-form">
          <!-- Email Input -->
          <q-input
            v-model="email"
            type="email"
            label="Correo electrónico"
            outlined
            :rules="[val => !!val || 'El correo es requerido']"
            class="q-mb-md"
            dense
          >
            <template v-slot:prepend>
              <q-icon name="email" />
            </template>
          </q-input>

          <!-- Password Input -->
          <q-input
            v-model="password"
            type="password"
            label="Contraseña"
            outlined
            :rules="[val => !!val || 'La contraseña es requerida']"
            class="q-mb-lg"
            dense
          >
            <template v-slot:prepend>
              <q-icon name="lock" />
            </template>
          </q-input>

          <!-- Login Button -->
          <q-btn
            type="submit"
            label="Iniciar Sesión"
            color="primary"
            size="lg"
            class="full-width q-mb-md btn-primary"
            :loading="loading"
            unelevated
          />

          <!-- Divider -->
          <div class="divider-section q-my-lg">
            <q-separator />
            <span class="divider-text text-grey-6 q-mx-md">o</span>
            <q-separator />
          </div>

          <!-- Google Login Button -->
          <q-btn
            @click="handleGoogleLogin"
            label="Continuar con Google"
            color="white"
            text-color="black"
            size="lg"
            class="full-width google-btn"
            :loading="googleLoading"
            unelevated
            icon="fab fa-google"
          />
        </q-form>

        <!-- Error Message -->
        <div v-if="error" class="error-message q-mt-md">
          <q-banner class="text-white bg-negative" rounded>
            <template v-slot:avatar>
              <q-icon name="error" />
            </template>
            {{ error }}
          </q-banner>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';

const email = ref('');
const password = ref('');
const loading = ref(false);
const googleLoading = ref(false);
const error = ref('');

const handleLogin = async () => {
  if (!email.value || !password.value) return;

  loading.value = true;
  error.value = '';

  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    // Redireccionamiento automático por onAuthStateChanged en el store
  } catch (err: unknown) {
    const firebaseError = err as { code: string };
    error.value = getErrorMessage(firebaseError.code);
  } finally {
    loading.value = false;
  }
};

const handleGoogleLogin = async () => {
  googleLoading.value = true;
  error.value = '';

  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // Redireccionamiento automático por onAuthStateChanged en el store
  } catch (err: unknown) {
    const firebaseError = err as { code: string };
    error.value = getErrorMessage(firebaseError.code);
  } finally {
    googleLoading.value = false;
  }
};

const getErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Usuario no encontrado. Verifica tu correo electrónico.';
    case 'auth/wrong-password':
      return 'Contraseña incorrecta. Inténtalo de nuevo.';
    case 'auth/invalid-email':
      return 'Correo electrónico inválido.';
    case 'auth/user-disabled':
      return 'Esta cuenta ha sido deshabilitada.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Inténtalo más tarde.';
    case 'auth/popup-closed-by-user':
      return 'Inicio de sesión cancelado.';
    default:
      return 'Error al iniciar sesión. Inténtalo de nuevo.';
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.background-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: -1;
}

.login-card {
  width: 100%;
  max-width: 400px;
  border-radius: var(--border-radius);
  background: var(--card-background);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-medium);
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.brand-logo {
  width: 60px;
  height: 60px;
  margin-bottom: 8px;
}

.brand-title {
  color: var(--primary-color);
  margin: 0;
  letter-spacing: 1px;
  font-weight: 600;
}

.brand-subtitle {
  color: var(--secondary-color);
  margin: 0;
}

.login-form {
  width: 100%;
}

.full-width {
  width: 100%;
}

.btn-primary {
  background: var(--primary-color) !important;
  color: white !important;
  border-radius: var(--border-radius-small) !important;
}

.btn-primary:hover {
  background: var(--hover-color) !important;
  transform: translateY(-1px);
  box-shadow: var(--shadow-medium) !important;
}

.divider-section {
  position: relative;
  display: flex;
  align-items: center;
  margin: 24px 0;
}

.divider-text {
  background: var(--card-background);
  padding: 0 16px;
  font-size: 14px;
  color: var(--secondary-color);
}

.google-btn {
  border: 1px solid var(--border-color);
  background: var(--card-background) !important;
  color: var(--text-color) !important;
  font-weight: 500;
  border-radius: var(--border-radius-small) !important;
}

.google-btn:hover {
  background: var(--background-color) !important;
  box-shadow: var(--shadow-light) !important;
}

.error-message {
  width: 100%;
}

/* Responsive */
@media (max-width: 480px) {
  .login-card {
    margin: 16px;
    max-width: none;
  }

  .q-card-section {
    padding: 24px !important;
  }

  .brand-logo {
    width: 48px;
    height: 48px;
  }

  .brand-title {
    font-size: 1.5rem;
  }
}
</style>
