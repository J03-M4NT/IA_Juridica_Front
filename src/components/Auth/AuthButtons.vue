<template>
  <div class="auth-buttons">
    <!-- Si no está autenticado, mostrar botones de login/registro -->
    <template v-if="!isAuthenticated">
      <q-btn
        flat
        no-caps
        color="primary"
        label="Iniciar Sesión"
        @click="showLoginDialog = true"
        class="q-mr-sm auth-btn"
      />
      <q-btn
        outline
        no-caps
        color="primary"
        label="Registrarse"
        @click="showRegisterDialog = true"
        class="auth-btn"
      />
    </template>

    <!-- Si está autenticado, mostrar perfil -->
    <template v-else>
      <div class="row items-center">
        <q-btn-dropdown flat no-caps color="primary" class="user-profile-btn">
          <template v-slot:label>
            <div class="row items-center no-wrap">
              <q-avatar size="28px" color="primary" text-color="white">
                <q-icon name="person" />
              </q-avatar>
              <div class="q-ml-sm text-primary">{{ userName || 'Usuario' }}</div>
            </div>
          </template>

          <q-list>
            <q-item clickable v-close-popup @click="showProfileDialog = true">
              <q-item-section>
                <q-item-label>Mi Perfil</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="handleLogout">
              <q-item-section>
                <q-item-label>Cerrar Sesión</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </template>

    <!-- Diálogo de Login -->
    <q-dialog v-model="showLoginDialog">
      <q-card class="auth-dialog">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold text-primary">Iniciar Sesión</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleLogin" class="q-gutter-md">
            <q-input
              outlined
              v-model="loginForm.email"
              label="Email"
              type="email"
              class="auth-input"
              bg-color="white"
              :rules="[val => !!val || 'Email es requerido']"
            />
            <q-input
              outlined
              v-model="loginForm.password"
              label="Contraseña"
              class="auth-input"
              bg-color="white"
              :type="showPassword ? 'text' : 'password'"
              :rules="[val => !!val || 'Contraseña es requerida']"
            >
              <template v-slot:append>
                <q-icon
                  :name="showPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="showPassword = !showPassword"
                />
              </template>
            </q-input>
            <div class="row justify-end q-mt-md">
              <q-btn label="Iniciar Sesión" type="submit" color="primary" class="full-width"/>
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Diálogo de Registro -->
    <q-dialog v-model="showRegisterDialog">
      <q-card class="auth-dialog">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold text-primary">Registrarse</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleRegister" class="q-gutter-md">
            <q-input
              outlined
              v-model="registerForm.email"
              label="Email"
              type="email"
              class="auth-input"
              bg-color="white"
              :rules="[val => !!val || 'Email es requerido']"
            />
            <q-input
              outlined
              v-model="registerForm.password"
              label="Contraseña"
              class="auth-input"
              bg-color="white"
              :type="showPasswordReg ? 'text' : 'password'"
              :rules="[
                val => !!val || 'Contraseña es requerida',
                val => val.length >= 6 || 'La contraseña debe tener al menos 6 caracteres'
              ]"
            >
              <template v-slot:append>
                <q-icon
                  :name="showPasswordReg ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="showPasswordReg = !showPasswordReg"
                />
              </template>
            </q-input>
            <div class="row justify-end q-mt-md">
              <q-btn label="Registrarse" type="submit" color="primary" class="full-width"/>
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import { auth } from '../../boot/firebase';
import { useRouter } from 'vue-router';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();

// Usar el estado de autenticación del store con storeToRefs para mantener la reactividad
const { isAuthenticated, userName } = storeToRefs(authStore);

// Configurar observador de estado de autenticación
onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('Usuario autenticado:', user.email);
    } else {
      console.log('Usuario no autenticado');
    }
  });
});

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
    await router.replace('/app/analizador');
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
    await router.replace('/app/analizador');
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
  font-weight: 500;
}

.user-profile-btn {
  min-width: 150px;
  font-weight: 500;
}

.auth-dialog {
  width: 400px;
  max-width: 90vw;
  background: white;
  color: #333;
}

:deep(.q-card) {
  background: white;
}

:deep(.q-field) {
  background: white !important;
}

:deep(.q-field__native),
:deep(.q-field__prefix),
:deep(.q-field__suffix),
:deep(.q-field__input) {
  color: #333 !important;
}

:deep(.q-field__label) {
  color: #666 !important;
}

:deep(.auth-input) {
  background: white;
}

:deep(.q-btn) {
  text-transform: none;
}

:deep(.q-avatar) {
  background: var(--q-primary);
}

:deep(.q-dialog__inner) {
  background: rgba(0, 0, 0, 0.5);
}

.text-primary {
  color: var(--q-primary) !important;
}
</style>
