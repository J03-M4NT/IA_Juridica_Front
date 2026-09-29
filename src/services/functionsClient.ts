import { auth } from '../firebase/firebaseConfig'

// VITE_FUNCTIONS_URL solo se define en el .env local para probar contra el
// emulador (ej. http://127.0.0.1:5001/lexit-ai/us-central1). El deploy de
// GitHub no la define, así que producción usa siempre las Functions reales.
export const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-lexit-ai.cloudfunctions.net'

// POST a una Cloud Function con el ID token de Firebase del usuario
// actual. Todas las funciones lo exigen (ver functions/src/seguridad.ts):
// sin sesión responden 401, y las de administración 403 si no eres admin.
// Devuelve la Response tal cual para que cada servicio lea su propio
// formato de respuesta/errores.
export async function postFuncion(nombre: string, body: unknown): Promise<Response> {
  const idToken = await auth.currentUser?.getIdToken()
  if (!idToken) {
    throw new Error('Debes iniciar sesión para usar esta función')
  }

  return fetch(`${FUNCTIONS_URL}/${nombre}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(body)
  })
}
