import { defineBoot } from '#q-app/wrappers'
import { setPersistence, browserLocalPersistence } from 'firebase/auth'
import { auth } from './firebase'
import { useAuthStore } from '../stores/auth'
import { useUserProfileStore } from '../stores/userProfile'

export default defineBoot(async () => {
  const authStore = useAuthStore()
  const profileStore = useUserProfileStore()

  await setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Error setting persistence:', error)
  })

  auth.onAuthStateChanged(async (firebaseUser) => {
    authStore.setUser(firebaseUser)

    if (firebaseUser) {
      await profileStore.loadProfile(firebaseUser.uid)

      if (!profileStore.profile) {
        await profileStore.initializeProfile(
          firebaseUser.uid,
          firebaseUser.email || '',
          firebaseUser.displayName || undefined,
          firebaseUser.photoURL || undefined
        )
      }
    } else {
      profileStore.clearProfile()
    }
  })
})
