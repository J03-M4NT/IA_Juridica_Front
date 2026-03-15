<template>
  <div class="landing-page">
    <!-- Header con botones de autenticación -->
    <div class="landing-header">
      <div class="header-content">
        <div class="header-logo">
          <img src="../assets/logo.svg" alt="LEXIT AI" class="header-logo-img" />
          <span class="header-logo-text">LEXIT AI</span>
        </div>
        <div class="header-auth">
          <auth-buttons />
        </div>
      </div>
    </div>

    <!-- Hero Section -->
    <div class="hero-section">
      <div class="hero-content">
        <!-- Logo and Title -->
        <div class="brand-section">
          <img src="../assets/logo.svg" alt="LEXIT AI" class="brand-logo" />
          <h1 class="brand-title">LEXIT AI</h1>
          <p class="brand-subtitle">Inteligencia Artificial para el Análisis Jurídico</p>
        </div>

        <!-- Description -->
        <div class="description-section">
          <h2 class="description-title">Revoluciona tu práctica legal</h2>
          <p class="description-text">
            Analiza contratos, realiza consultas legales y gestiona documentos con la ayuda de
            nuestra inteligencia artificial especializada en derecho.
          </p>

          <!-- Feature Cards -->
          <div class="features-grid">
            <q-card class="feature-card feature-1">
              <q-card-section>
                <div class="feature-icon">
                  <q-icon name="analytics" size="32px" color="primary" />
                </div>
                <h3 class="feature-title">Análisis de PDF</h3>
                <p class="feature-description">
                  Extrae información clave de contratos y documentos legales automáticamente.
                </p>
              </q-card-section>
            </q-card>

            <q-card class="feature-card feature-2">
              <q-card-section>
                <div class="feature-icon">
                  <q-icon name="chat" size="32px" color="primary" />
                </div>
                <h3 class="feature-title">Consultas Legales</h3>
                <p class="feature-description">
                  Obtén respuestas precisas a tus preguntas jurídicas con IA especializada.
                </p>
              </q-card-section>
            </q-card>

            <q-card class="feature-card feature-3">
              <q-card-section>
                <div class="feature-icon">
                  <q-icon name="gavel" size="32px" color="primary" />
                </div>
                <h3 class="feature-title">Gestión de Contratos</h3>
                <p class="feature-description">
                  Organiza, analiza y administra todos tus contratos de manera eficiente.
                </p>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer-section">
      <p class="footer-text">© 2025 LEXIT AI. Todos los derechos reservados.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'
import AuthButtons from '../components/Auth/AuthButtons.vue'

const router = useRouter()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

onMounted(() => {
  if (isAuthenticated.value) {
    void router.replace('/app/analizador')
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

.landing-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  font-family: 'EB Garamond', serif;
}

/* Header */
.landing-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 16px 32px;
  z-index: 1000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-logo-img {
  height: 40px;
  width: auto;
}

.header-logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.header-auth {
  display: flex;
  align-items: center;
}

.hero-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100px 20px 40px 20px; /* Añadido padding-top para el header fijo */
}

.hero-content {
  max-width: 1200px;
  width: 100%;
  text-align: center;
  color: white;
}

.brand-section {
  margin-bottom: 40px;
}

.brand-logo {
  height: 64px;
  width: auto;
  margin-bottom: 16px;
}

.brand-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.brand-subtitle {
  font-size: 1.25rem;
  opacity: 0.9;
  margin: 0;
  font-weight: 300;
}

.description-section {
  margin-bottom: 60px;
}

.description-title {
  font-size: 2.5rem;
  font-weight: 600;
  margin: 0 0 16px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.description-text {
  font-size: 1.125rem;
  opacity: 0.9;
  margin: 0 0 40px 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

/* === Tarjetas de características === */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-top: 40px;
}

.feature-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 16px;
  transition: all 0.3s ease;
  color: #1a237e;
  padding: 16px;
}

.feature-card:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.feature-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #0d47a1;
}

.feature-description {
  font-size: 0.95rem;
  color: #333;
  opacity: 1;
  line-height: 1.6;
}

.feature-icon {
  margin-bottom: 16px;
  color: #1976d2;
}

.feature-card:hover .feature-title {
  color: #1565c0;
}

.feature-card:hover .feature-description {
  color: #1e88e5;
}

/* Colores únicos por tarjeta */
.feature-1 {
  border-top: 4px solid #1976d2;
}

.feature-2 {
  border-top: 4px solid #2e7d32;
}

.feature-3 {
  border-top: 4px solid #6a1b9a;
}

.footer-section {
  padding: 20px;
  text-align: center;
  background: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.footer-text {
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-size: 0.875rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .brand-title {
    font-size: 3rem;
  }

  .description-title {
    font-size: 2rem;
  }

  .features-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
}

@media (max-width: 768px) {
  .landing-header {
    padding: 12px 16px;
  }

  .header-logo-img {
    height: 32px;
  }

  .header-logo-text {
    font-size: 1.2rem;
  }

  .hero-section {
    padding: 80px 16px 20px 16px;
  }

  .brand-title {
    font-size: 2.5rem;
  }

  .brand-subtitle {
    font-size: 1.125rem;
  }

  .description-title {
    font-size: 1.75rem;
  }

  .description-text {
    font-size: 1rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .feature-card {
    margin: 0 16px;
  }
}

@media (max-width: 480px) {
  .header-logo-img {
    height: 28px;
  }

  .header-logo-text {
    font-size: 1rem;
  }

  .brand-logo {
    height: 48px;
  }

  .brand-title {
    font-size: 2rem;
  }

  .description-title {
    font-size: 1.5rem;
  }

  .auth-section {
    margin-top: 32px;
  }
}
</style>
