import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { UserProfile } from '../types/user';
import {
    getUserProfile,
    createUserProfile,
    updateUserProfile,
    updateUserPhotoFromFile
} from '../services/userService';
export const useUserProfileStore = defineStore('userProfile', () => {
    // Estado
    const profile = ref<UserProfile | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // Computed
    const displayName = computed(() => profile.value?.displayName || 'Usuario');
    const photoURL = computed(() => profile.value?.photoURL || null);
    const userEmail = computed(() => profile.value?.email || '');
    const isAdmin = computed(() => profile.value?.role === 'admin');

    /**
     * Carga el perfil del usuario desde Firestore
     */
    async function loadProfile(uid: string): Promise<void> {
        loading.value = true;
        error.value = null;

        try {
            const userProfile = await getUserProfile(uid);
            profile.value = userProfile;
        } catch (err) {
            console.error('Error loading profile:', err);
            error.value = 'Error al cargar el perfil';
        } finally {
            loading.value = false;
        }
    }

    /**
     * Crea un perfil inicial para un nuevo usuario
     */
    async function initializeProfile(
        uid: string,
        email: string,
        displayName?: string,
        photoURL?: string | null
    ): Promise<boolean> {
        loading.value = true;
        error.value = null;

        try {
            const result = await createUserProfile(uid, email, displayName, photoURL);

            if (result.success) {
                // Cargar el perfil recién creado
                await loadProfile(uid);
                return true;
            } else {
                error.value = result.message || 'Error al crear perfil';
                return false;
            }
        } catch (err) {
            console.error('Error initializing profile:', err);
            error.value = 'Error al inicializar el perfil';
            return false;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Actualiza el nombre de usuario
     */
    async function updateDisplayName(uid: string, newDisplayName: string): Promise<boolean> {
        loading.value = true;
        error.value = null;

        try {
            const result = await updateUserProfile(uid, { displayName: newDisplayName });

            if (result.success && profile.value) {
                // Actualizar estado local inmediatamente
                profile.value.displayName = newDisplayName;
                return true;
            } else {
                error.value = result.message || 'Error al actualizar nombre';
                return false;
            }
        } catch (err) {
            console.error('Error updating display name:', err);
            error.value = 'Error al actualizar el nombre';
            return false;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Actualiza la foto de perfil desde un archivo
     */
    async function updatePhoto(uid: string, file: File): Promise<boolean> {
        loading.value = true;
        error.value = null;

        try {
            const result = await updateUserPhotoFromFile(uid, file);

            if (result.success) {
                // Recargar perfil para obtener la nueva URL
                await loadProfile(uid);
                return true;
            } else {
                error.value = result.message || 'Error al actualizar foto';
                return false;
            }
        } catch (err) {
            console.error('Error updating photo:', err);
            error.value = 'Error al actualizar la foto';
            return false;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Limpia el estado del perfil (usado al cerrar sesión)
     */
    function clearProfile(): void {
        profile.value = null;
        loading.value = false;
        error.value = null;
    }

    return {
        // Estado
        profile,
        loading,
        error,

        // Computed
        displayName,
        photoURL,
        userEmail,
        isAdmin,

        // Acciones
        loadProfile,
        initializeProfile,
        updateDisplayName,
        updatePhoto,
        clearProfile
    };
});
