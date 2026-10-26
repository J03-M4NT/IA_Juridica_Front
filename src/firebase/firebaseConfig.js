import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth } from 'firebase/auth'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'



const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

const app = initializeApp(firebaseConfig)

// App Check: prueba que las llamadas a las Cloud Functions salen de esta
// app (ver functions/src/appCheckVerificacion.ts). La clave de sitio de
// reCAPTCHA v3 es pública (va en la página); la secreta solo está en la
// consola de Firebase. Sin clave, App Check queda apagado y las funciones
// siguen en modo 'monitor'.
const RECAPTCHA_SITE_KEY = ''
if (import.meta.env.DEV) {
  // En desarrollo, el navegador muestra en la consola un token de
  // depuración: se registra en Firebase › App Check › Administrar tokens
  // de depuración para que localhost también pase.
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
}
export const appCheck = RECAPTCHA_SITE_KEY
  ? initializeAppCheck(app, { provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true })
  : null

export const db = getFirestore(app)
export const storage = getStorage(app)
export const auth = getAuth(app)
auth.useDeviceLanguage()

export default app
