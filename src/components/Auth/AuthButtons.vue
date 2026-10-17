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
        <q-btn-dropdown flat no-caps dark color="primary" content-class="user-profile-menu" class="user-profile-btn">
          <template v-slot:label>
            <div class="row items-center no-wrap">
              <!-- Avatar con foto real del usuario -->
              <q-avatar size="32px" class="avatar-usuario">
                <img
                  v-if="profileStore.photoURL"
                  :src="profileStore.photoURL"
                  alt="Foto de perfil"
                  style="width: 100%; height: 100%; object-fit: cover;"
                />
                <span v-else class="avatar-inicial">{{ inicialUsuario }}</span>
              </q-avatar>
              <!-- Nombre real del usuario -->
              <div class="q-ml-sm text-profile-name">{{ profileStore.displayName }}</div>
            </div>
          </template>

          <q-list>
            <q-item clickable v-close-popup @click="showProfileDialog = true">
              <q-item-section avatar>
                <q-icon name="account_circle" color="accent" />
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

          <div v-if="navegadorIntegrado" class="aviso-navegador" role="note">
            <p>
              Estás en el navegador de otra app. Para entrar con Google, abre LexIT en
              {{ esAndroid ? 'Chrome' : 'Safari' }}. Con tu email puedes entrar aquí mismo.
            </p>
            <div class="aviso-navegador-acciones">
              <a v-if="esAndroid" :href="urlAbrirEnChrome" class="aviso-navegador-btn">Abrir en Chrome</a>
              <button type="button" class="aviso-navegador-btn" @click="copiarEnlace">
                {{ enlaceCopiado ? 'Enlace copiado' : 'Copiar enlace' }}
              </button>
            </div>
          </div>

          <div class="dialog-divider"><span>o continúa con tu email</span></div>

          <form @submit.prevent="handleLogin">
            <label class="input-label">Email</label>
            <input
              v-model="loginForm.email"
              type="email"
              inputmode="email"
              autocomplete="email"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              enterkeyhint="next"
              placeholder="tucorreo@ejemplo.com"
              class="custom-input"
              required
            />

            <label class="input-label">Contraseña</label>
            <div class="password-wrap">
              <input
                v-model="loginForm.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                enterkeyhint="go"
                placeholder="••••••••"
                class="custom-input"
                required
              />
              <button type="button" class="pw-toggle" :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showPassword = !showPassword">
                <svg v-if="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>

            <button type="submit" class="submit-btn" :disabled="enviando">{{ enviando ? 'Ingresando…' : 'Iniciar Sesión' }}</button>

            <p class="switch-text">
              ¿No tienes una cuenta?
              <a class="switch-link" @click="showLoginDialog = false; showRegisterDialog = true">Regístrate</a>
            </p>

            <!-- Consideraciones (compactas, sin ventana aparte) -->
            <ul class="consideraciones">
              <li v-for="(item, idx) in CONSIDERACIONES" :key="idx">
                <q-icon :name="item.icono" size="15px" class="consideraciones-icono" />
                <span>{{ item.texto }}</span>
              </li>
            </ul>
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
          <!-- Área de trabajo (opcional): vale para Google y para email -->
          <label class="input-label" for="registro-area">Área en la que trabajas <span class="input-opcional">(opcional)</span></label>
          <select id="registro-area" v-model="areaRegistro" class="custom-input custom-select">
            <option value="">Sin especificar</option>
            <option v-for="a in AREAS_TRABAJO" :key="a.valor" :value="a.valor">{{ a.etiqueta }}</option>
          </select>
          <p class="input-hint input-hint--area">Enfoca el resumen de Normas en tu área. Puedes cambiarla en tu perfil.</p>

          <button type="button" class="google-btn" :disabled="cargandoGoogle" @click="areaPendienteDeRegistro(); handleGoogleSignIn()">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            {{ cargandoGoogle ? 'Conectando…' : 'Continuar con Google' }}
          </button>

          <div v-if="navegadorIntegrado" class="aviso-navegador" role="note">
            <p>
              Estás en el navegador de otra app. Para entrar con Google, abre LexIT en
              {{ esAndroid ? 'Chrome' : 'Safari' }}. Con tu email puedes entrar aquí mismo.
            </p>
            <div class="aviso-navegador-acciones">
              <a v-if="esAndroid" :href="urlAbrirEnChrome" class="aviso-navegador-btn">Abrir en Chrome</a>
              <button type="button" class="aviso-navegador-btn" @click="copiarEnlace">
                {{ enlaceCopiado ? 'Enlace copiado' : 'Copiar enlace' }}
              </button>
            </div>
          </div>

          <div class="dialog-divider"><span>o regístrate con tu email</span></div>

          <form @submit.prevent="handleRegister">
            <label class="input-label">Email</label>
            <input
              v-model="registerForm.email"
              type="email"
              inputmode="email"
              autocomplete="email"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              enterkeyhint="next"
              placeholder="tucorreo@ejemplo.com"
              class="custom-input"
              required
            />

            <label class="input-label">Contraseña</label>
            <div class="password-wrap">
              <input
                v-model="registerForm.password"
                :type="showPasswordReg ? 'text' : 'password'"
                autocomplete="new-password"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                enterkeyhint="go"
                placeholder="••••••••"
                class="custom-input"
                required
              />
              <button type="button" class="pw-toggle" :aria-label="showPasswordReg ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showPasswordReg = !showPasswordReg">
                <svg v-if="!showPasswordReg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
            <p class="input-hint">La contraseña debe tener al menos 6 caracteres.</p>

            <button type="submit" class="submit-btn" :disabled="enviando">{{ enviando ? 'Creando tu cuenta…' : 'Registrarse' }}</button>

            <p class="switch-text">
              ¿Ya tienes una cuenta?
              <a class="switch-link" @click="showRegisterDialog = false; showLoginDialog = true">Inicia sesión</a>
            </p>

            <!-- Consideraciones (compactas, sin ventana aparte) -->
            <ul class="consideraciones">
              <li v-for="(item, idx) in CONSIDERACIONES" :key="idx">
                <q-icon :name="item.icono" size="15px" class="consideraciones-icono" />
                <span>{{ item.texto }}</span>
              </li>
            </ul>
          </form>
        </div>
      </div>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
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
import { useBienvenidaStore } from '../../stores/bienvenida';
import { AREAS_TRABAJO } from '../../constants/areasTrabajo';

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();
const profileStore = useUserProfileStore();
const bienvenida = useBienvenidaStore();

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

// Área de trabajo elegida al registrarse (opcional). Se deja "pendiente" en
// el store justo antes de crear la cuenta: el perfil lo crea después
// boot/auth-sync.ts y la toma de ahí. Si la cuenta ya existía, no se usa.
const areaRegistro = ref('');
function areaPendienteDeRegistro() {
  profileStore.areaPendiente = areaRegistro.value || null;
}

const showProfileDialog = ref(false);

// Inicial del nombre para el avatar (cuando no hay foto de perfil).
const inicialUsuario = computed(() => (profileStore.displayName.trim()[0] ?? 'U').toUpperCase());

// Se muestran en las ventanas de inicio de sesión y registro.
const CONSIDERACIONES = [
  { icono: 'lock', texto: 'No guardamos tus contratos.' },
  { icono: 'description', texto: 'No guardamos una copia de los contratos generados.' },
  { icono: 'schedule', texto: 'Las consultas se eliminan automáticamente en 7 días.' },
  { icono: 'auto_awesome', texto: '¡Disfruta de LexIT!' }
];

const cargandoGoogle = ref(false);
// Envío de email/contraseña en curso: desactiva el botón para no repetir la
// petición al tocar varias veces (frecuente en celular con conexión lenta).
const enviando = ref(false);

// =========================
// CELULAR: NAVEGADOR INTERNO DE OTRAS APPS
// Al abrir el enlace desde WhatsApp, Instagram, Facebook, TikTok, etc., la
// página se abre en el navegador interno de esa app y Google bloquea ahí el
// inicio de sesión ("403 disallowed_useragent"). Se detecta para avisar y
// ofrecer abrir en Chrome (Android) o copiar el enlace (iPhone). Con email
// y contraseña se puede entrar igual.
// =========================
const agente = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const navegadorIntegrado = /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|TikTok|musical_ly|BytedanceWebview|LinkedInApp|Snapchat|Twitter|; wv\)/i.test(agente);
const esAndroid = /Android/i.test(agente);
const urlAbrirEnChrome = typeof window !== 'undefined'
  ? `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;end`
  : '';
const enlaceCopiado = ref(false);

async function copiarEnlace() {
  try {
    await navigator.clipboard.writeText(window.location.href);
  } catch {
    // Algunos navegadores internos no permiten el portapapeles: respaldo.
    const campo = document.createElement('textarea');
    campo.value = window.location.href;
    document.body.appendChild(campo);
    campo.select();
    document.execCommand('copy');
    campo.remove();
  }
  enlaceCopiado.value = true;
  setTimeout(() => { enlaceCopiado.value = false }, 2500);
}

// Mensajes claros para los errores de Firebase más comunes (antes se
// mostraba el texto técnico en inglés, ej. "auth/invalid-credential").
function mensajeErrorAuth(error: unknown, porDefecto: string): string {
  if (!(error instanceof FirebaseError)) return porDefecto;
  switch (error.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'El email o la contraseña no son correctos. Revisa que estén bien escritos.';
    case 'auth/invalid-email':
      return 'El email no es válido. Revisa que esté bien escrito.';
    case 'auth/missing-password':
      return 'Escribe tu contraseña.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
    case 'auth/user-disabled':
      return 'Esta cuenta está desactivada. Escríbenos a lexitiajuridica@gmail.com.';
    case 'auth/network-request-failed':
      return 'Error de conexión. Por favor, verifica tu conexión a internet.';
    case 'auth/email-already-in-use':
      return 'Este email ya está registrado. Inicia sesión.';
    case 'auth/weak-password':
      return 'La contraseña es demasiado débil: usa al menos 6 caracteres.';
    case 'auth/operation-not-allowed':
      return 'Operación no permitida';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.';
    case 'auth/operation-not-supported-in-this-environment':
    case 'auth/web-storage-unsupported':
      return 'Este navegador no permite entrar con Google. Ábrelo en Chrome o Safari, o entra con tu email.';
    default:
      return porDefecto;
  }
}

// Permite que un componente padre (ej. un CTA en LandingPage.vue) abra estos
// diálogos sin duplicar el estado de login/registro fuera de este componente.
defineExpose({
  abrirLogin: () => { showLoginDialog.value = true },
  abrirRegistro: () => { showRegisterDialog.value = true }
});

// Manejadores de autenticación
const handleLogin = async () => {
  if (enviando.value) return;
  enviando.value = true;
  try {
    const { email, password } = loginForm.value;
    await signInWithEmailAndPassword(auth, email.trim(), password);
    showLoginDialog.value = false;
    loginForm.value = { email: '', password: '' };
    // Redirigir al analizador después del login exitoso
    // Mosaico de bienvenida (ver components/BienvenidaLexit.vue).
    bienvenida.mostrar();
    await router.replace('/app/consultas');
  } catch (error) {
    const errorMessage = mensajeErrorAuth(error, 'No se pudo iniciar sesión. Inténtalo de nuevo.');

    $q.notify({
      message: errorMessage,
      icon: 'error_outline',
      position: 'bottom',
      classes: 'lexit-toast lexit-toast--error',
      timeout: 4500
    });
  } finally {
    enviando.value = false;
  }
};

// Sirve tanto para "Iniciar Sesión" como para "Registrarse" — Firebase crea
// la cuenta automáticamente si el email de Google no existía aún, así que
// es el mismo flujo (popup nativo de Google → elegir cuenta → entra).
const handleGoogleSignIn = async () => {
  if (navegadorIntegrado) {
    $q.notify({
      message: `Para entrar con Google, abre LexIT en ${esAndroid ? 'Chrome' : 'Safari'}. Con tu email puedes entrar aquí mismo.`,
      icon: 'open_in_browser',
      position: 'bottom',
      classes: 'lexit-toast',
      timeout: 5000
    });
    return;
  }
  cargandoGoogle.value = true;
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
    showLoginDialog.value = false;
    showRegisterDialog.value = false;
    // Mosaico de bienvenida (ver components/BienvenidaLexit.vue).
    bienvenida.mostrar();
    await router.replace('/app/consultas');
  } catch (error) {
    // El usuario cerró la ventana de Google antes de elegir cuenta — no es
    // un error real, no hace falta mostrar nada.
    if (error instanceof FirebaseError && error.code === 'auth/popup-closed-by-user') {
      return;
    }

    // También es una cancelación: se abrió otra ventana de Google encima.
    if (error instanceof FirebaseError && error.code === 'auth/cancelled-popup-request') {
      return;
    }

    const errorMessage = mensajeErrorAuth(error, 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.');

    $q.notify({
      message: errorMessage,
      icon: 'error_outline',
      position: 'bottom',
      classes: 'lexit-toast lexit-toast--error',
      timeout: 4500
    });
  } finally {
    cargandoGoogle.value = false;
  }
};

const handleRegister = async () => {
  if (enviando.value) return;
  enviando.value = true;
  try {
    const { email, password } = registerForm.value;
    areaPendienteDeRegistro();
    await createUserWithEmailAndPassword(auth, email.trim(), password);
    areaRegistro.value = '';
    showRegisterDialog.value = false;
    registerForm.value = { email: '', password: '' };
    // Redirigir al analizador después del registro exitoso
    // Mosaico de bienvenida (ver components/BienvenidaLexit.vue).
    bienvenida.mostrar();
    await router.replace('/app/consultas');
  } catch (error) {
    const errorMessage = mensajeErrorAuth(error, 'No se pudo crear la cuenta. Inténtalo de nuevo.');

    $q.notify({
      message: errorMessage,
      icon: 'error_outline',
      position: 'bottom',
      classes: 'lexit-toast lexit-toast--error',
      timeout: 4500
    });
  } finally {
    enviando.value = false;
  }
};

const handleLogout = async () => {
  try {
    await signOut(auth);
    // Limpiar formularios
    loginForm.value = { email: '', password: '' };
    registerForm.value = { email: '', password: '' };
    // Aviso discreto abajo, con los colores de la marca (ver .lexit-toast
    // en css/app.scss). Los ingresos no avisan: los confirma la animación.
    $q.notify({
      message: 'Cerraste sesión',
      icon: 'logout',
      position: 'bottom',
      classes: 'lexit-toast',
      timeout: 2200
    });
    // Usar replace en lugar de go(0) para una actualización más suave
    await router.replace('/');
  } catch (error) {
    const message = error instanceof FirebaseError ? ': ' + error.message : '';
    $q.notify({
      message: 'Error al cerrar sesión' + message,
      icon: 'error_outline',
      position: 'bottom',
      classes: 'lexit-toast lexit-toast--error',
      timeout: 4500
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
  font-family: 'Baskervville', 'Figtree', sans-serif;
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

/* Menú "Mi Perfil / Cerrar Sesión" — antes sin estilo propio (usaba el
   look por defecto de Quasar, claro, que no combinaba con el panel
   lateral oscuro). El prop dark en q-btn-dropdown ya resuelve los colores
   base; esto solo afina bordes/espaciado/sombra para que se vea como el
   resto de la marca. content-class="user-profile-menu" en el template es
   lo que deja engancharlo acá con :deep(), aunque el menú se renderiza
   fuera del árbol de este componente (portal de Quasar). */
:deep(.user-profile-menu) {
  background: var(--lexit-blanco) !important;
  color: var(--lexit-verde) !important;
  border: 1px solid var(--lexit-marfil);
  border-radius: 12px;
  box-shadow: 0 16px 40px -14px rgba(var(--lexit-verde-rgb), 0.25);
  min-width: 190px;
  overflow: hidden;
}

:deep(.user-profile-menu .q-list) {
  padding: 6px;
}

:deep(.user-profile-menu .q-item) {
  border-radius: 8px;
  min-height: 42px;
  color: var(--lexit-verde);
}

:deep(.user-profile-menu .q-item:hover),
:deep(.user-profile-menu .q-item .q-focus-helper) {
  background: var(--lexit-marfil-suave);
  opacity: 1;
}

:deep(.user-profile-menu .q-separator) {
  background: var(--lexit-marfil);
  margin: 4px 2px;
}

.text-profile-name {
  color: var(--lexit-verde);
}

/* Avatar: círculo Verde bosque con la inicial en blanco (o la foto). */
.avatar-usuario {
  background: var(--lexit-verde);
  color: var(--lexit-blanco);
}

.avatar-inicial {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1;
  text-transform: uppercase;
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
  /* Nunca más alta que la pantalla: si no entra (ventana no maximizada o
     celular), se desplaza adentro y se llega a las consideraciones y a los
     Términos y condiciones. Antes se cortaba (overflow: hidden). */
  max-height: calc(100vh - 32px);
  max-height: calc(100dvh - 32px);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  animation: floatUp 0.25s ease-out both;
  font-family: 'Baskervville', 'Figtree', -apple-system, BlinkMacSystemFont, sans-serif;
}

.dialog-header {
  position: relative;
  padding: 34px 30px 18px;
  text-align: center;
}

.dialog-wordmark {
  display: block;
  font-family: 'Baskervville', 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--accent);
  margin-bottom: 10px;
}

.dialog-title {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--lexit-verde);
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
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--lexit-verde);
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
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-size: 1rem;
  color: var(--lexit-verde);
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
  font-family: 'Baskervville', 'Figtree', sans-serif;
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

.consideraciones {
  list-style: none;
  margin: 16px 0 0;
  padding: 10px 12px;
  background: #F8F7F2;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 10px;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--lexit-texto-secundario);
  text-align: left;
}

.consideraciones li {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 2px 0;
}

.consideraciones-icono {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--lexit-texto-secundario);
}

.terminos-text {
  text-align: center;
  font-size: 0.78rem;
  line-height: 1.5;
  color: #7a7a82;
  margin: 14px 0 0;
  padding-top: 12px;
  border-top: 1px solid rgba(23, 33, 27, 0.08);
}

.terminos-link {
  font-weight: 600;
  color: var(--lexit-verde);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.terminos-link:hover {
  color: #17211B;
}

:deep(.q-btn) {
  text-transform: none;
}

:deep(.q-avatar) {
  background: var(--q-primary);
}

/* ==========================================================================
   INICIO DE SESIÓN / REGISTRO — COMPACTO Y SOBRIO
   Una columna estrecha, espacios ajustados y la paleta de la Landing:
   azul #1B2632 para la acción principal, marfil para bordes, beige oliva
   para íconos y crema para estados. Solo estilos (contenido y orden igual).
   ========================================================================== */
.new-dialog-card {
  width: 380px;
  border-radius: 6px;
  border: 1px solid rgba(23, 33, 27, 0.10);
  box-shadow: 0 18px 48px -18px rgba(27, 38, 50, 0.35);
  animation-duration: 0.18s;
}

.dialog-header {
  padding: 22px 52px 0 24px;
  text-align: left;
}

.dialog-wordmark {
  margin-bottom: 6px;
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  color: #1B2632;
}

.dialog-title {
  font-size: 1.35rem;
  line-height: 1.2;
  color: #17211B;
}

.dialog-close {
  top: 16px;
  right: 14px;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: transparent;
  color: rgba(23, 33, 27, 0.55);
  font-size: 0.9rem;
}

.dialog-close:hover {
  background: #F8F7F2;
  color: #17211B;
}

.dialog-body {
  padding: 16px 24px 18px;
}

.google-btn {
  padding: 9px 12px;
  font-size: 0.9rem;
  border: 1px solid #D9D4C6;
  border-radius: 6px;
  transition: background 0.15s, border-color 0.15s;
}

.google-btn:hover:not(:disabled) {
  background: #F8F7F2;
  border-color: #BDB59B;
  box-shadow: none;
}

.dialog-divider {
  margin: 12px 0;
  font-size: 0.74rem;
  color: rgba(23, 33, 27, 0.5);
}

.dialog-divider::before,
.dialog-divider::after {
  background: #D9D4C6;
}

.input-label {
  margin-bottom: 5px;
  font-size: 0.78rem;
  color: rgba(23, 33, 27, 0.72);
}

.custom-input {
  padding: 9px 12px;
  margin-bottom: 12px;
  font-size: 0.95rem;
  background: #FFFFFF;
  border: 1px solid #D9D4C6;
  border-radius: 6px;
}

.custom-input::placeholder {
  color: rgba(23, 33, 27, 0.38);
}

.custom-input:focus {
  border-color: #1B2632;
  box-shadow: 0 0 0 3px rgba(27, 38, 50, 0.08);
}

.password-wrap {
  margin-bottom: 0;
}

.pw-toggle {
  color: rgba(23, 33, 27, 0.45);
}

.input-hint {
  margin-top: 5px;
  font-size: 0.74rem;
  color: rgba(23, 33, 27, 0.55);
}

.submit-btn {
  margin-top: 14px;
  padding: 10px;
  font-size: 0.95rem;
  border-radius: 6px;
  background: #1B2632;
  box-shadow: none;
  transition: background 0.15s;
}

.submit-btn:hover {
  background: #2C3B4D;
  box-shadow: none;
}

.switch-text {
  margin-top: 12px;
  font-size: 0.84rem;
  color: rgba(23, 33, 27, 0.6);
}

.switch-link {
  color: #1B2632;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: #BDB59B;
}

.switch-link:hover {
  color: #2C3B4D;
  text-decoration-color: #1B2632;
}

/* Consideraciones como notas discretas, sin caja */
.consideraciones {
  margin-top: 14px;
  padding: 12px 0 0;
  background: none;
  border: none;
  border-top: 1px solid #D9D4C6;
  border-radius: 0;
  font-size: 0.74rem;
  line-height: 1.4;
  color: rgba(23, 33, 27, 0.62);
}

.consideraciones li {
  gap: 6px;
  padding: 1px 0;
}

.consideraciones-icono {
  color: #9C9275;
}

.terminos-text {
  margin-top: 8px;
  padding-top: 0;
  border-top: none;
  font-size: 0.72rem;
  text-align: left;
  color: rgba(23, 33, 27, 0.55);
}

.terminos-link {
  color: #1B2632;
  text-decoration-color: #BDB59B;
}

/* ---- Aviso de navegador interno (WhatsApp, Instagram...) ---- */
.aviso-navegador {
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid #D9D4C6;
  border-left: 3px solid #1B2632;
  border-radius: 6px;
  background: #F8F7F2;
  font-size: 0.78rem;
  line-height: 1.45;
  color: rgba(23, 33, 27, 0.78);
}

.aviso-navegador p {
  margin: 0;
}

.aviso-navegador-acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.aviso-navegador-btn {
  padding: 7px 12px;
  border: 1px solid #1B2632;
  border-radius: 6px;
  background: #FFFFFF;
  color: #1B2632;
  font: inherit;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: progress;
}

/* ---- Celular ---- */
@media (max-width: 600px) {
  /* 16px como mínimo: con menos, iPhone acerca la pantalla al tocar el
     campo y la página queda ampliada y descuadrada. */
  .custom-input {
    font-size: 16px;
    padding: 11px 12px;
  }

  /* Botones cómodos para el dedo (44px) */
  .google-btn,
  .submit-btn {
    min-height: 44px;
  }

  .pw-toggle {
    width: 44px;
    height: 44px;
    right: 0;
  }

  .password-wrap .custom-input {
    padding-right: 48px;
  }

  .dialog-close {
    width: 40px;
    height: 40px;
    top: 10px;
    right: 8px;
  }

  /* La ventana usa casi todo el ancho del celular */
  .new-dialog-card {
    width: calc(100vw - 24px);
    max-width: 420px;
  }
}

/* Pantallas bajas (ventana no maximizada, celular): ventana más compacta
   para que en la mayoría de casos todo entre sin desplazarse. */
@media (max-height: 760px), (max-width: 600px) {
  .dialog-header { padding: 18px 48px 0 20px; }
  .dialog-body { padding: 12px 20px 16px; }
  .dialog-divider { margin: 12px 0; }
  .custom-input { padding: 8px 12px; margin-bottom: 10px; }
  @media (max-width: 600px) { .custom-input { font-size: 16px; padding: 11px 12px; } }
  .submit-btn { margin-top: 12px; padding: 9px; }
  .switch-text { margin-top: 12px; }
  .consideraciones { margin-top: 12px; padding: 10px 0 0; }
  .terminos-text { margin-top: 8px; padding-top: 0; }
}
</style>

<!-- Menú del perfil: Quasar lo dibuja fuera de este componente (en el
     body), así que las reglas :deep() del bloque scoped no lo alcanzan.
     Va sin scoped; la clase user-profile-menu es exclusiva de este menú. -->
<style>
.q-menu.user-profile-menu,
.q-menu.user-profile-menu.q-dark {
  background: var(--lexit-blanco) !important;
  color: var(--lexit-verde) !important;
  border: 1px solid var(--lexit-marfil);
  border-radius: 12px;
  box-shadow: 0 16px 40px -14px rgba(var(--lexit-verde-rgb), 0.25);
  min-width: 190px;
}

.user-profile-menu .q-item {
  color: var(--lexit-verde) !important;
}

.user-profile-menu .q-item:hover {
  background: var(--lexit-marfil-suave);
}

.user-profile-menu .q-separator {
  background: var(--lexit-marfil) !important;
}

/* Selector del área de trabajo en el registro */
.custom-select {
  appearance: none;
  -webkit-appearance: none;
  padding-right: 36px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%231B2632' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  cursor: pointer;
}

.input-opcional {
  font-weight: 400;
  opacity: 0.6;
}

.input-hint--area {
  margin-top: -4px;
  margin-bottom: 14px;
}
</style>
