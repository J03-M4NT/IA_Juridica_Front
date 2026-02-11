/**
 * Interfaz del perfil de usuario almacenado en Firestore
 */
export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Datos para actualizar el perfil del usuario
 */
export interface UpdateProfileData {
    displayName?: string;
    photoURL?: string | null;
}

/**
 * Respuesta al crear o actualizar perfil
 */
export interface ProfileResponse {
    success: boolean;
    message?: string;
    profile?: UserProfile;
}
