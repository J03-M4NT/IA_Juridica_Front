6<template>
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


  </div>
</template>

<script setup lang="ts">
import { defineExpose } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const checkAuth = async (route: string) => {
  // El navigation guard se encargará de redirigir si no está autenticado
  try {
    await router.push(route);
  } catch (error) {
    console.error('Error al navegar:', error);
  }
};

defineExpose({
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
</style>
