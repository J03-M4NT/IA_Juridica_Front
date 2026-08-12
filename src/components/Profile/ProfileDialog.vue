<template>
  <q-dialog v-model="isOpen" persistent>
    <div class="pd-card">

      <!-- Header -->
      <div class="pd-header">
        <span class="pd-title">Mi Perfil</span>
        <button class="pd-close" @click="closeDialog">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Avatar -->
      <div class="pd-avatar-section">
        <div class="pd-avatar-wrap">
          <img
            v-if="photoPreview || profileStore.photoURL"
            :src="photoPreview || profileStore.photoURL || ''"
            alt="Foto de perfil"
            class="pd-avatar-img"
          />
          <div v-else class="pd-avatar-fallback">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#9a9aa2" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
        </div>

        <!-- Input oculto para archivo -->
        <q-file
          ref="fileInput"
          v-model="photoFile"
          accept="image/*"
          @update:model-value="handleFileSelected"
          style="display: none"
        />

        <button class="pd-photo-btn" type="button" @click="() => fileInput?.pickFiles()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          Cambiar foto
        </button>
        <span class="pd-photo-hint">JPG, PNG o GIF · máximo 5 MB</span>
      </div>

      <div style="height:1px;background:rgba(27,27,30,0.07);margin:0 0 20px"></div>

      <!-- Formulario -->
      <form @submit.prevent="handleSave" class="pd-form">

        <label class="pd-label">Correo electrónico</label>
        <input
          :value="profileStore.userEmail"
          type="email"
          readonly
          class="pd-input pd-input--readonly"
          tabindex="-1"
        />

        <label class="pd-label">Nombre de usuario</label>
        <input
          v-model="displayName"
          type="text"
          required
          minlength="2"
          maxlength="50"
          placeholder="Tu nombre"
          class="pd-input"
        />

        <div class="pd-actions">
          <button
            type="button"
            class="pd-cancel-btn"
            @click="closeDialog"
            :disabled="profileStore.loading"
          >Cancelar</button>
          <button
            type="submit"
            class="pd-save-btn"
            :disabled="profileStore.loading"
          >
            <q-spinner v-if="profileStore.loading" size="15px" color="white" />
            <span v-else>Guardar cambios</span>
          </button>
        </div>

      </form>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useUserProfileStore } from '../../stores/userProfile';
import { useAuthStore } from '../../stores/auth';
import { useQuasar } from 'quasar';

// Props
const props = defineProps<{
  modelValue: boolean;
}>();

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

// Composables
const profileStore = useUserProfileStore();
const authStore = useAuthStore();
const $q = useQuasar();

// Estado local
const isOpen = ref(props.modelValue);
const displayName = ref(profileStore.displayName);
const photoFile = ref<File | null>(null);
const photoPreview = ref<string | null>(null);
const fileInput = ref<{ pickFiles: () => void } | null>(null);

// Observar cambios en modelValue
watch(() => props.modelValue, (newValue) => {
  isOpen.value = newValue;
  if (newValue) {
    // Resetear valores al abrir
    displayName.value = profileStore.displayName;
    photoFile.value = null;
    photoPreview.value = null;
  }
});

// Observar cambios en isOpen
watch(isOpen, (newValue) => {
  emit('update:modelValue', newValue);
});

/**
 * Maneja la selección de archivo de imagen
 */
function handleFileSelected(file: File | null) {
  if (!file) {
    photoPreview.value = null;
    return;
  }

  // Validar tipo de archivo
  if (!file.type.startsWith('image/')) {
    $q.notify({
      type: 'negative',
      message: 'El archivo debe ser una imagen',
      position: 'top'
    });
    photoFile.value = null;
    return;
  }

  // Validar tamaño (5MB)
  if (file.size > 5 * 1024 * 1024) {
    $q.notify({
      type: 'negative',
      message: 'La imagen debe ser menor a 5MB',
      position: 'top'
    });
    photoFile.value = null;
    return;
  }

  // Crear preview
  const reader = new FileReader();
  reader.onload = (e) => {
    photoPreview.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

/**
 * Guarda los cambios del perfil
 */
async function handleSave() {
  if (!authStore.user) {
    $q.notify({
      type: 'negative',
      message: 'No hay usuario autenticado',
      position: 'top'
    });
    return;
  }

  const uid = authStore.user.uid;
  let success = true;

  try {
    // Actualizar nombre si cambió
    if (displayName.value !== profileStore.displayName) {
      const nameResult = await profileStore.updateDisplayName(uid, displayName.value);
      if (!nameResult) {
        success = false;
      }
    }

    // Actualizar foto si hay una nueva
    if (photoFile.value) {
      const photoResult = await profileStore.updatePhoto(uid, photoFile.value);
      if (!photoResult) {
        success = false;
      }
    }

    if (success) {
      $q.notify({
        type: 'positive',
        message: 'Perfil actualizado exitosamente',
        position: 'top',
        icon: 'check_circle'
      });
      closeDialog();
    } else {
      $q.notify({
        type: 'negative',
        message: profileStore.error || 'Error al actualizar el perfil',
        position: 'top'
      });
    }
  } catch (error) {
    console.error('Error saving profile:', error);
    $q.notify({
      type: 'negative',
      message: 'Error al guardar los cambios',
      position: 'top'
    });
  }
}

/**
 * Cierra el diálogo
 */
function closeDialog() {
  isOpen.value = false;
}
</script>

<style scoped>
/* ==============================
   Tarjeta del dialogo
   ============================== */
.pd-card {
  width: 420px;
  max-width: 94vw;
  background: #fff;
  border-radius: 22px;
  box-shadow: 0 8px 40px rgba(27, 27, 30, 0.14);
  padding: 28px 28px 26px;
  font-family: 'Figtree', sans-serif;
}

/* ==============================
   Header
   ============================== */
.pd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.pd-title {
  font-family: 'EB Garamond', serif;
  font-size: 1.45rem;
  font-weight: 600;
  color: #16161a;
}

.pd-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(27, 27, 30, 0.10);
  background: #FAFAF7;
  color: #6a6a72;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.pd-close:hover {
  background: rgba(27, 27, 30, 0.07);
  color: #1b1b1e;
}

/* ==============================
   Avatar
   ============================== */
.pd-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.pd-avatar-wrap {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  border: 3px solid rgba(27, 27, 30, 0.08);
  overflow: hidden;
  background: #FAFAF7;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pd-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pd-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.pd-photo-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #3a3a40;
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.14);
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Figtree', sans-serif;
  transition: background 0.15s;
}

.pd-photo-btn:hover { background: #FAFAF7; }

.pd-photo-hint {
  font-size: 0.78rem;
  color: #9a9aa2;
}

/* ==============================
   Formulario
   ============================== */
.pd-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pd-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: #55555c;
  margin-bottom: 6px;
}

.pd-input {
  width: 100%;
  padding: 11px 14px;
  font-size: 0.95rem;
  font-family: 'Figtree', sans-serif;
  color: #1b1b1e;
  background: #FAFAF7;
  border: 1px solid rgba(27, 27, 30, 0.13);
  border-radius: 11px;
  outline: none;
  box-sizing: border-box;
  margin-bottom: 16px;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.pd-input:focus {
  border-color: #7c47e0;
  box-shadow: 0 0 0 3px rgba(124, 71, 224, 0.12);
}

.pd-input--readonly {
  color: #9a9aa2;
  cursor: default;
}

.pd-input--readonly:focus {
  border-color: rgba(27, 27, 30, 0.13);
  box-shadow: none;
}

/* ==============================
   Botones de accion
   ============================== */
.pd-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}

.pd-cancel-btn {
  padding: 10px 18px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #6a6a72;
  background: transparent;
  border: 1px solid rgba(27, 27, 30, 0.12);
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Figtree', sans-serif;
  transition: background 0.15s;
}

.pd-cancel-btn:hover:not(:disabled) { background: #FAFAF7; }
.pd-cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.pd-save-btn {
  padding: 10px 22px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
  background: #1b1b1e;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Figtree', sans-serif;
  min-width: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, transform 0.15s;
}

.pd-save-btn:hover:not(:disabled) {
  background: #2e2e33;
  transform: translateY(-1px);
}

.pd-save-btn:disabled { opacity: 0.55; cursor: not-allowed; }

/* ==============================
   Responsive
   ============================== */
@media (max-width: 480px) {
  .pd-card { padding: 22px 18px 20px; }
  .pd-title { font-size: 1.25rem; }
}
</style>
