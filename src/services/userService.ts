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
    console.log('🔵 createUserProfile - Iniciando:', { uid, email, displayName });
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

        console.log('🔵 createUserProfile - Escribiendo en Firestore:', profileData);
        await setDoc(userRef, profileData);
        console.log('✅ createUserProfile - Perfil creado exitosamente');

        return {
            success: true,
            message: 'Perfil creado exitosamente'
        };
    } catch (error: any) {
        console.error('❌ createUserProfile - Error:', error);
        console.error('Código:', error?.code, 'Mensaje:', error?.message);
        return {
            success: false,
            message: error?.code === 'permission-denied'
                ? 'Error de permisos. Revisa las reglas de Firestore.'
                : 'Error al crear el perfil'
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
    console.log('🔵 updateUserProfile - Iniciando:', { uid, updateData });
    try {
        const userRef = doc(db, 'users', uid);

        const dataToUpdate = {
            ...updateData,
            updatedAt: serverTimestamp()
        };

        console.log('🔵 updateUserProfile - Actualizando Firestore:', dataToUpdate);
        await updateDoc(userRef, dataToUpdate);
        console.log('✅ updateUserProfile - Perfil actualizado exitosamente');

        return {
            success: true,
            message: 'Perfil actualizado exitosamente'
        };
    } catch (error: any) {
        console.error('❌ updateUserProfile - Error:', error);
        console.error('Código:', error?.code, 'Mensaje:', error?.message);
        return {
            success: false,
            message: error?.code === 'permission-denied'
                ? 'Error de permisos. Revisa las reglas de Firestore.'
                : 'Error al actualizar el perfil'
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
    console.log('🔵 updateUserPhotoFromFile - Iniciando:', { uid, fileName: file.name, fileSize: file.size });
    try {
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            console.warn('⚠️ updateUserPhotoFromFile - Tipo de archivo inválido:', file.type);
            return {
                success: false,
                message: 'El archivo debe ser una imagen'
            };
        }

        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            console.warn('⚠️ updateUserPhotoFromFile - Archivo muy grande:', file.size);
            return {
                success: false,
                message: 'La imagen debe ser menor a 5MB'
            };
        }

        // Crear referencia en Storage
        const storagePath = `profile-photos/${uid}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        console.log('🔵 updateUserPhotoFromFile - Subiendo a Storage:', storagePath);

        // Subir archivo
        await uploadBytes(storageRef, file);
        console.log('✅ updateUserPhotoFromFile - Archivo subido a Storage');

        // Obtener URL de descarga
        const photoURL = await getDownloadURL(storageRef);
        console.log('✅ updateUserPhotoFromFile - URL obtenida:', photoURL);

        // Actualizar perfil con la nueva URL
        const result = await updateUserProfile(uid, { photoURL });

        return {
            success: result.success,
            message: result.success ? 'Foto actualizada exitosamente' : (result.message || 'Error al actualizar foto')
        };
    } catch (error: any) {
        console.error('❌ updateUserPhotoFromFile - Error:', error);
        console.error('Código:', error?.code, 'Mensaje:', error?.message);
        return {
            success: false,
            message: error?.code === 'storage/unauthorized'
                ? 'Error de permisos en Storage. Revisa las reglas de Firebase Storage.'
                : 'Error al subir la foto'
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
