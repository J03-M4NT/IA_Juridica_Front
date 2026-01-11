import { db, storage } from '../firebase/firebaseConfig';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { UserProfile, UpdateProfileData, ProfileResponse } from '../types/user';

/**
 * Crea un perfil inicial para un nuevo usuario
 */
export async function createUserProfile(
    uid: string,
    email: string,
    displayName?: string,
    photoURL?: string | null
): Promise<ProfileResponse> {
    try {
        const userRef = doc(db, 'users', uid);

        const profileData = {
            uid,
            email,
            displayName: displayName || email.split('@')[0],
            photoURL: photoURL || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await setDoc(userRef, profileData);

        return {
            success: true,
            message: 'Perfil creado exitosamente'
        };
    } catch (error) {
        console.error('Error creating user profile:', error);
        return {
            success: false,
            message: 'Error al crear el perfil'
        };
    }
}

/**
 * Obtiene el perfil de un usuario desde Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            return {
                uid: data.uid,
                email: data.email,
                displayName: data.displayName,
                photoURL: data.photoURL,
                createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date()
            };
        }

        return null;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
}

/**
 * Actualiza el perfil del usuario
 */
export async function updateUserProfile(
    uid: string,
    updateData: UpdateProfileData
): Promise<ProfileResponse> {
    try {
        const userRef = doc(db, 'users', uid);

        await updateDoc(userRef, {
            ...updateData,
            updatedAt: serverTimestamp()
        });

        return {
            success: true,
            message: 'Perfil actualizado exitosamente'
        };
    } catch (error) {
        console.error('Error updating user profile:', error);
        return {
            success: false,
            message: 'Error al actualizar el perfil'
        };
    }
}

/**
 * Sube una foto de perfil a Firebase Storage y actualiza el perfil
 */
export async function updateUserPhotoFromFile(
    uid: string,
    file: File
): Promise<ProfileResponse> {
    try {
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            return {
                success: false,
                message: 'El archivo debe ser una imagen'
            };
        }

        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return {
                success: false,
                message: 'La imagen debe ser menor a 5MB'
            };
        }

        // Crear referencia en Storage
        const storageRef = ref(storage, `profile-photos/${uid}/${Date.now()}_${file.name}`);

        // Subir archivo
        await uploadBytes(storageRef, file);

        // Obtener URL de descarga
        const photoURL = await getDownloadURL(storageRef);

        // Actualizar perfil con la nueva URL
        const result = await updateUserProfile(uid, { photoURL });

        return {
            success: result.success,
            message: result.success ? 'Foto actualizada exitosamente' : result.message
        };
    } catch (error) {
        console.error('Error uploading photo:', error);
        return {
            success: false,
            message: 'Error al subir la foto'
        };
    }
}

/**
 * Actualiza la foto del perfil desde una URL
 */
export async function updateUserPhoto(
    uid: string,
    photoURL: string | null
): Promise<ProfileResponse> {
    return updateUserProfile(uid, { photoURL });
}
