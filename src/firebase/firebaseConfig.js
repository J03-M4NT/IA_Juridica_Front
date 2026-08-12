import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoKeyForLocalDevOnly12345678',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ia-juridica-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ia-juridica-demo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ia-juridica-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:demo',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined
}

if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  console.warn('⚠️ Variables de entorno de Firebase no encontradas en .env. Revisa el archivo .env.example.')
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const storage = getStorage(app)
export const auth = getAuth(app)
auth.useDeviceLanguage()

export default app