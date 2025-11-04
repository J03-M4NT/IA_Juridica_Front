<![CDATA[<template>
  <div class="home-container">
    <div class="welcome-section">
      <div class="logo-section">
        <img src="../assets/logo.svg" alt="LEXIT AI" class="main-logo" />
        <h1 class="logo-text">LEXIT AI</h1>
        <p class="subtitle">Tu Asistente Legal Inteligente</p>
      </div>
    </div>
    
    <div class="features-section">
      <q-btn
        class="feature-btn"
        icon="analytics"
        label="ANALIZAR PDF"
        @click="() => checkAuth('/analizar')"
      />
      <q-btn
        class="feature-btn"
        icon="chat"
        label="CONSULTAS"
        @click="() => checkAuth('/consultas')"
      />
      <q-btn
        class="feature-btn"
        icon="gavel"
        label="CONTRATOS"
        @click="() => checkAuth('/contratos')"
      />
    </div>

    <!-- Diálogo de autenticación requerida -->
    <q-dialog v-model="showAuthDialog">
      <q-card class="auth-dialog">
        <q-card-section class="row items-center">
          <div class="text-h6">Autenticación Requerida</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <p>Para acceder a esta característica, necesitas iniciar sesión o registrarte.</p>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Iniciar Sesión" color="primary" @click="handleLoginClick" />
          <q-btn flat label="Registrarse" color="primary" @click="handleRegisterClick" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, defineExpose } from 'vue';
import { useRouter } from 'vue-router';
import { auth } from '../boot/firebase';
import { useQuasar } from 'quasar';
import type { QNotifyCreateOptions } from 'quasar';

const router = useRouter();
const $q = useQuasar();
const showAuthDialog = ref(false);

const showNotification = (opts: QNotifyCreateOptions) => {
  $q.notify({
    position: 'top',
    ...opts
  });
};

const handleLoginClick = () => {
  showAuthDialog.value = false;
  showNotification({
    message: 'Por favor, inicia sesión para continuar',
    color: 'info'
  });
};

const handleRegisterClick = () => {
  showAuthDialog.value = false;
  showNotification({
    message: 'Por favor, regístrate para continuar',
    color: 'info'
  });
};

const checkAuth = async (route: string) => {
  if (!auth.currentUser) {
    showAuthDialog.value = true;
  } else {
    try {
      await router.push(route);
    } catch {
      showNotification({
        message: 'Error al navegar a la página',
        color: 'negative'
      });
    }
  }
};

defineExpose({
  handleLoginClick,
  handleRegisterClick,
  checkAuth
});
</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: calc(100vh - 64px);
  padding: 2rem;
  margin-top: 64px;
}

.welcome-section {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 24px;
  margin-bottom: 3rem;
}

.logo-section {
  text-align: center;
  padding: 3rem;
}

.main-logo {
  width: 180px;
  height: 180px;
  margin-bottom: 2rem;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

.logo-text {
  font-size: 3.5rem;
  font-weight: bold;
  margin: 1rem 0;
  background: linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -1px;
}

.subtitle {
  font-size: 1.5rem;
  color: #666;
  margin-top: 1rem;
  font-weight: 500;
}

.features-section {
  display: flex;
  gap: 1.5rem;
  margin-top: 2rem;
}

.feature-btn {
  padding: 12px 24px;
  font-weight: 500;
}

.auth-dialog {
  min-width: 300px;
}

@media (max-width: 600px) {
  .features-section {
    flex-direction: column;
  }
  
  .main-logo {
    width: 100px;
    height: 100px;
  }
  
  .logo-text {
    font-size: 2rem;
  }
}
</style>]]>