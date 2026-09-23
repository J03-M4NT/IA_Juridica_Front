import { auth } from '../firebase/firebaseConfig'

export const FUNCTIONS_URL = 'https://us-central1-lexit-ai.cloudfunctions.net'

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
