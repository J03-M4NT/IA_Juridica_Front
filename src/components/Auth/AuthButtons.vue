<template>
  <div class="auth-buttons">
    <!-- Si no está autenticado, mostrar botones de login/registro -->
    <template v-if="!isAuthenticated">
      <q-btn
        flat
        no-caps
        label="Iniciar Sesión"
        @click="showLoginDialog = true"
        class="q-mr-sm auth-btn login-btn"
      />
      <q-btn
        unelevated
        no-caps
        label="Registrarse"
        @click="showRegisterDialog = true"
        class="auth-btn register-btn"
      />
    </template>

    <!-- Si está autenticado, mostrar perfil -->
    <template v-else>
      <div class="row items-center">
        <q-btn-dropdown flat no-caps color="primary" class="user-profile-btn">
          <template v-slot:label>
            <div class="row items-center no-wrap">
              <!-- Avatar con foto real del usuario -->
              <q-avatar size="32px" color="primary" text-color="white">
                <img
                  v-if="profileStore.photoURL"
                  :src="profileStore.photoURL"
                  alt="Foto de perfil"
                  style="width: 100%; height: 100%; object-fit: cover;"
                />
                <q-icon v-else name="person" />
              </q-avatar>
              <!-- Nombre real del usuario -->
              <div class="q-ml-sm text-primary">{{ profileStore.displayName }}</div>
            </div>
          </template>

          <q-list>
            <q-item clickable v-close-popup @click="showProfileDialog = true">
              <q-item-section avatar>
                <q-icon name="account_circle" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Mi Perfil</q-item-label>
              </q-item-section>
            </q-item>
            <q-separator />
            <q-item clickable v-close-popup @click="handleLogout">
              <q-item-section avatar>
                <q-icon name="logout" color="negative" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Cerrar Sesión</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </template>

    <!-- Diálogo de Perfil -->
    <profile-dialog v-model="showProfileDialog" />

    <!-- Diálogo de Login -->
    <q-dialog v-model="showLoginDialog">
      <div class="new-dialog-card">
        <div class="dialog-header">
          <button class="dialog-close" type="button" @click="showLoginDialog = false">✕</button>
          <span class="dialog-wordmark">LEXIT</span>
          <h3 class="dialog-title">Iniciar Sesión</h3>
        </div>

        <div class="dialog-body">
          <button type="button" class="google-btn" :disabled="cargandoGoogle" @click="handleGoogleSignIn">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            {{ cargandoGoogle ? 'Conectando…' : 'Continuar con Google' }}
          </button>

          <div class="dialog-divider"><span>o continúa con tu email</span></div>

          <form @submit.prevent="handleLogin">
            <label class="input-label">Email</label>
            <input
              v-model="loginForm.email"
              type="email"
              placeholder="tucorreo@ejemplo.com"
              class="custom-input"
              required
            />

            <label class="input-label">Contraseña</label>
            <div class="password-wrap">
              <input
                v-model="loginForm.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                class="custom-input"
                required
              />
              <button type="button" class="pw-toggle" @click="showPassword = !showPassword">
                <svg v-if="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>

            <button type="submit" class="submit-btn">Iniciar Sesión</button>

            <p class="switch-text">
              ¿No tienes una cuenta?
              <a class="switch-link" @click="showLoginDialog = false; showRegisterDialog = true">Regístrate</a>
            </p>
          </form>
        </div>
      </div>
    </q-dialog>

    <!-- Diálogo de Registro -->
    <q-dialog v-model="showRegisterDialog">
      <div class="new-dialog-card">
        <div class="dialog-header">
          <button class="dialog-close" type="button" @click="showRegisterDialog = false">✕</button>
          <span class="dialog-wordmark">LEXIT</span>
          <h3 class="dialog-title">Registrarse</h3>
        </div>

        <div class="dialog-body">
          <button type="button" class="google-btn" :disabled="cargandoGoogle" @click="handleGoogleSignIn">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            {{ cargandoGoogle ? 'Conectando…' : 'Continuar con Google' }}
          </button>

          <div class="dialog-divider"><span>o regístrate con tu email</span></div>

          <form @submit.prevent="handleRegister">
            <label class="input-label">Email</label>
            <input
              v-model="registerForm.email"
              type="email"
              placeholder="tucorreo@ejemplo.com"
              class="custom-input"
              required
            />

            <label class="input-label">Contraseña</label>
            <div class="password-wrap">
              <input
                v-model="registerForm.password"
                :type="showPasswordReg ? 'text' : 'password'"
                placeholder="••••••••"
                class="custom-input"
                required
              />
              <button type="button" class="pw-toggle" @click="showPasswordReg = !showPasswordReg">
                <svg v-if="!showPasswordReg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
            <p class="input-hint">La contraseña debe tener al menos 6 caracteres.</p>

            <button type="submit" class="submit-btn">Registrarse</button>

            <p class="switch-text">
              ¿Ya tienes una cuenta?
              <a class="switch-link" @click="showRegisterDialog = false; showLoginDialog = true">Inicia sesión</a>
            </p>
          </form>
        </div>
      </div>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import { useUserProfileStore } from '../../stores/userProfile';
import { auth } from '../../boot/firebase';
import { useRouter } from 'vue-router';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { useQuasar } from 'quasar';
import ProfileDialog from '../Profile/ProfileDialog.vue';

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();
const profileStore = useUserProfileStore();

const { isAuthenticated } = storeToRefs(authStore)

// Control de diálogos
const showLoginDialog = ref(false);
const showRegisterDialog = ref(false);
const showPassword = ref(false);
const showPasswordReg = ref(false);

// Formularios
const loginForm = ref({
  email: '',
  password: ''
});

const registerForm = ref({
  email: '',
  password: ''
});

const showProfileDialog = ref(false);
const cargandoGoogle = ref(false);

// Permite que un componente padre (ej. un CTA en LandingPage.vue) abra estos
// diálogos sin duplicar el estado de login/registro fuera de este componente.
defineExpose({
  abrirLogin: () => { showLoginDialog.value = true },
  abrirRegistro: () => { showRegisterDialog.value = true }
});

// Manejadores de autenticación
const handleLogin = async () => {
  try {
    const { email, password } = loginForm.value;
    await signInWithEmailAndPassword(auth, email, password);
    showLoginDialog.value = false;
    loginForm.value = { email: '', password: '' };
    $q.notify({
      type: 'positive',
      message: '¡Inicio de sesión exitoso!',
      position: 'top',
      color: 'positive'
    });
    // Redirigir al analizador después del login exitoso
    await router.replace('/app/consultas');
  } catch (error) {
    let errorMessage = 'Error al iniciar sesión';

    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/network-request-failed':
          errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Contraseña incorrecta';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No existe una cuenta con este email';
          break;
        default:
          errorMessage = `Error: ${error.message}`;
      }
    }

    $q.notify({
      type: 'negative',
      message: errorMessage,
      position: 'top',
      color: 'negative'
    });
  }
};

// Sirve tanto para "Iniciar Sesión" como para "Registrarse" — Firebase crea
// la cuenta automáticamente si el email de Google no existía aún, así que
// es el mismo flujo (popup nativo de Google → elegir cuenta → entra).
const handleGoogleSignIn = async () => {
  cargandoGoogle.value = true;
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
    showLoginDialog.value = false;
    showRegisterDialog.value = false;
    $q.notify({
      type: 'positive',
      message: '¡Sesión iniciada con Google!',
      position: 'top',
      color: 'positive'
    });
    await router.replace('/app/consultas');
  } catch (error) {
    // El usuario cerró la ventana de Google antes de elegir cuenta — no es
    // un error real, no hace falta mostrar nada.
    if (error instanceof FirebaseError && error.code === 'auth/popup-closed-by-user') {
      return;
    }

    const errorMessage = error instanceof FirebaseError
      ? `Error: ${error.message}`
      : 'No se pudo iniciar sesión con Google';

    $q.notify({
      type: 'negative',
      message: errorMessage,
      position: 'top',
      color: 'negative'
    });
  } finally {
    cargandoGoogle.value = false;
  }
};

const handleRegister = async () => {
  try {
    const { email, password } = registerForm.value;
    await createUserWithEmailAndPassword(auth, email, password);
    showRegisterDialog.value = false;
    registerForm.value = { email: '', password: '' };
    $q.notify({
      type: 'positive',
      message: '¡Registro exitoso!',
      position: 'top',
      color: 'positive'
    });
    // Redirigir al analizador después del registro exitoso
    await router.replace('/app/consultas');
  } catch (error) {
    let errorMessage = 'Error al registrarse';

    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este email ya está registrado';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Operación no permitida';
          break;
        case 'auth/weak-password':
          errorMessage = 'La contraseña es demasiado débil';
          break;
        default:
          errorMessage = `Error: ${error.message}`;
      }
    }

    $q.notify({
      type: 'negative',
      message: errorMessage,
      position: 'top',
      color: 'negative'
    });
  }
};

const handleLogout = async () => {
  try {
    await signOut(auth);
    // Limpiar formularios
    loginForm.value = { email: '', password: '' };
    registerForm.value = { email: '', password: '' };
    $q.notify({
      type: 'info',
      message: 'Has cerrado sesión',
      position: 'top',
      color: 'info'
    });
    // Usar replace en lugar de go(0) para una actualización más suave
    await router.replace('/');
  } catch (error) {
    const message = error instanceof FirebaseError ? ': ' + error.message : '';
    $q.notify({
      type: 'negative',
      message: 'Error al cerrar sesión' + message,
      position: 'top',
      color: 'negative'
    });
  }
};
</script>

<style scoped>
.auth-buttons {
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1000;
}

.auth-btn {
  font-family: 'Figtree', sans-serif;
  font-weight: 500;
  font-size: 0.95rem;
  padding: 8px 20px;
  border-radius: var(--border-radius-small);
  transition: all 0.2s ease;
}

.login-btn {
  color: var(--ink-soft) !important;
  background: transparent !important;
}

.login-btn:hover {
  background: rgba(27, 27, 30, 0.05) !important;
}

.register-btn {
  background: var(--ink) !important;
  color: #fff !important;
  font-weight: 600;
  box-shadow: var(--shadow-light);
}

.register-btn:hover {
  background: var(--ink-soft) !important;
  box-shadow: var(--shadow-medium) !important;
}

.user-profile-btn {
  min-width: 150px;
  font-weight: 500;
}

/* Backdrop del dialogo */
:deep(.q-dialog__backdrop) {
  background: rgba(22, 22, 26, 0.45);
  backdrop-filter: blur(4px);
}

/* Tarjeta del dialogo */
@keyframes floatUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.new-dialog-card {
  width: 420px;
  max-width: 95vw;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 30px 70px rgba(22, 22, 26, 0.28);
  overflow: hidden;
  animation: floatUp 0.25s ease-out both;
  font-family: 'Figtree', -apple-system, BlinkMacSystemFont, sans-serif;
}

.dialog-header {
  position: relative;
  padding: 34px 30px 18px;
  text-align: center;
}

.dialog-wordmark {
  display: block;
  font-family: 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--accent);
  margin-bottom: 10px;
}

.dialog-title {
  font-family: 'EB Garamond', serif;
  font-size: 1.6rem;
  font-weight: 600;
  color: #16161a;
  margin: 0;
}

.dialog-close {
  position: absolute;
  top: 18px;
  right: 20px;
  width: 34px;
  height: 34px;
  border-radius: var(--border-radius-small);
  border: none;
  background: rgba(27, 27, 30, 0.05);
  color: #55555c;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.dialog-close:hover {
  background: rgba(27, 27, 30, 0.10);
}

.dialog-body {
  padding: 22px 30px 30px;
}

.google-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1b1b1e;
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.16);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s;
}

.google-btn:hover:not(:disabled) {
  background: #f7f7f5;
  box-shadow: var(--shadow-light);
}

.google-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dialog-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0;
  font-size: 0.8rem;
  color: #9a9aa2;
}

.dialog-divider::before,
.dialog-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(27, 27, 30, 0.1);
}

.input-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: #55555c;
  margin-bottom: 7px;
}

.custom-input {
  width: 100%;
  padding: 12px 14px;
  font-family: 'Figtree', sans-serif;
  font-size: 1rem;
  color: #1b1b1e;
  background: #FAFAF7;
  border: 1px solid rgba(27, 27, 30, 0.14);
  border-radius: var(--border-radius);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.custom-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.password-wrap {
  position: relative;
  margin-bottom: 6px;
}

.password-wrap .custom-input {
  padding-right: 44px;
  margin-bottom: 0;
}

.pw-toggle {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #8a8a92;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-hint {
  font-size: 0.8rem;
  color: #9a9aa2;
  margin: 6px 0 0;
}

.submit-btn {
  width: 100%;
  margin-top: 16px;
  padding: 13px;
  font-family: 'Figtree', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background: var(--ink);
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s;
  box-shadow: var(--shadow-light);
}

.submit-btn:hover {
  background: var(--ink-soft);
  box-shadow: var(--shadow-medium);
}

.switch-text {
  text-align: center;
  font-size: 0.9rem;
  color: #7a7a82;
  margin: 18px 0 0;
}

.switch-link {
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
  text-decoration: none;
}

.switch-link:hover {
  color: var(--accent-hover);
}

:deep(.q-btn) {
  text-transform: none;
}

:deep(.q-avatar) {
  background: var(--q-primary);
}

.text-primary {
  color: var(--q-primary) !important;
}
</style>
