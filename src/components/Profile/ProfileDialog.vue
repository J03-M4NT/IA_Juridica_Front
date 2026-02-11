<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card class="profile-dialog">
      <!-- Header -->
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-weight-bold text-primary">Mi Perfil</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="closeDialog" />
      </q-card-section>

      <!-- Content -->
      <q-card-section class="q-pt-md">
        <div class="column items-center q-mb-md">
          <!-- Avatar con foto actual o inicial -->
          <q-avatar size="120px" class="profile-avatar q-mb-md">
            <img v-if="photoPreview || profileStore.photoURL" :src="photoPreview || profileStore.photoURL || ''" alt="Foto de perfil" />
            <q-icon v-else name="person" size="60px" color="white" />
          </q-avatar>

          <!-- Botón para cambiar foto -->
          <q-btn
            outline
            color="primary"
            label="Cambiar foto"
            icon="photo_camera"
            @click="() => fileInput?.pickFiles()"
            class="q-mb-sm"
          />

          <!-- Input oculto para archivo -->
          <q-file
            ref="fileInput"
            v-model="photoFile"
            accept="image/*"
            @update:model-value="handleFileSelected"
            style="display: none"
          />

          <!-- Información sobre tamaño de archivo -->
          <div class="text-caption text-grey-6">
            Máximo 5MB - JPG, PNG, GIF
          </div>
        </div>

        <!-- Formulario de datos -->
        <q-form @submit="handleSave" class="q-gutter-md">
          <!-- Correo electrónico (solo lectura) -->
          <q-input
            outlined
            readonly
            v-model="profileStore.userEmail"
            label="Correo electrónico"
            bg-color="grey-2"
            class="profile-input"
          >
            <template v-slot:prepend>
              <q-icon name="email" />
            </template>
          </q-input>

          <!-- Nombre de usuario -->
          <q-input
            outlined
            v-model="displayName"
            label="Nombre de usuario"
            bg-color="white"
            class="profile-input"
            :rules="[
              val => !!val || 'El nombre es requerido',
              val => val.length >= 2 || 'El nombre debe tener al menos 2 caracteres',
              val => val.length <= 50 || 'El nombre no puede tener más de 50 caracteres'
            ]"
          >
            <template v-slot:prepend>
              <q-icon name="person" />
            </template>
          </q-input>

          <!-- Botones de acción -->
          <div class="row justify-end q-mt-md q-gutter-sm">
            <q-btn
              flat
              label="Cancelar"
              color="grey-7"
              @click="closeDialog"
              :disable="profileStore.loading"
            />
            <q-btn
              type="submit"
              label="Guardar"
              color="primary"
              :loading="profileStore.loading"
              unelevated
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
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
.profile-dialog {
  width: 500px;
  max-width: 90vw;
  background: white;
}

.profile-avatar {
  background: linear-gradient(135deg, var(--q-primary) 0%, #764ba2 100%);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
}

.profile-avatar:hover {
  transform: scale(1.05);
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-input :deep(.q-field__control) {
  background: white;
}

.profile-input :deep(.q-field__native),
.profile-input :deep(.q-field__prefix),
.profile-input :deep(.q-field__suffix),
.profile-input :deep(.q-field__input) {
  color: #333 !important;
}

.profile-input :deep(.q-field__label) {
  color: #666 !important;
}

.text-primary {
  color: var(--q-primary) !important;
}

/* Responsive */
@media (max-width: 600px) {
  .profile-dialog {
    width: 100%;
    max-width: 100vw;
  }

  .profile-avatar {
    size: 100px;
  }
}
</style>
