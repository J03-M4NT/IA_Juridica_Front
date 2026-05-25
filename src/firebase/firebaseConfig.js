import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAE4Q6n0uXqxjiSv4MBGlXlYyOTjd1tsOo",
  authDomain: "lexit-ai.firebaseapp.com",
  projectId: "lexit-ai",
  storageBucket: "lexit-ai.firebasestorage.app",
  messagingSenderId: "64541422499",
  appId: "1:64541422499:web:11b144e2774b5f4ecd6016",
  measurementId: "G-4Z0963YMN2"
};

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const storage = getStorage(app)
export const auth = getAuth(app)

export default app
