import app, { auth, db, storage } from '../firebase/firebaseConfig'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'

let analytics: Analytics | null = null
if (typeof window !== 'undefined' && import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app)
    }
  }).catch((err) => {
    console.warn('Firebase Analytics not supported in this environment:', err)
  })
}

export { auth, analytics, db, storage }
export default app

