<template>
  <q-page class="consultas-chat-layout">
    <!-- Layout wrapper for Sidebar + Chat Area -->
    <div class="chat-container">
      
      <!-- SIDEBAR -->
      <aside class="chat-sidebar gt-sm" :class="{ 'sidebar-mobile-open': mobileSidebarOpen }">
        <div class="sidebar-header">
          <button class="new-chat-btn" @click="crearNuevoChat">
            <q-icon name="add" size="20px" class="q-mr-sm" />
            Nuevo Chat
          </button>
          
          <q-btn flat round dense icon="close" class="lt-md" @click="mobileSidebarOpen = false" />
        </div>

        <div class="history-list">
          <div v-if="store.chatsGuardados.length === 0" class="no-history">
            No tienes chats recientes.
          </div>
          <div
            v-for="chat in store.chatsGuardados"
            :key="chat.id"
            class="history-item"
            :class="{ 'history-item--active': store.chatActivoId === chat.id }"
            @click="cargarChat(chat.id)"
          >
            <div class="history-item-content">
              <q-icon name="chat_bubble_outline" size="18px" class="q-mr-sm history-icon" />
              <span class="history-title">{{ chat.titulo || 'Nuevo Chat' }}</span>
            </div>
            <q-btn
              flat round dense icon="delete_outline"
              size="sm"
              class="delete-chat-btn"
              @click.stop="eliminarChat(chat.id)"
            />
          </div>
        </div>
      </aside>

      <!-- Overlay for mobile sidebar -->
      <div v-if="mobileSidebarOpen" class="sidebar-overlay lt-md" @click="mobileSidebarOpen = false"></div>

      <!-- MAIN CHAT AREA -->
      <main class="chat-main">
        <!-- Top bar (mobile only, to open sidebar) -->
        <div class="mobile-chat-header lt-md">
          <q-btn flat round dense icon="menu" @click="mobileSidebarOpen = true" />
          <span class="mobile-header-title">Consultas Jurídicas</span>
          <q-btn flat round dense icon="add" @click="crearNuevoChat" />
        </div>

        <!-- Messages Area -->
        <div class="messages-area" ref="messagesBox">
          <!-- Empty state / Initial state (only show if 1 msg and it's from AI) -->
          <div v-if="mensajes.length === 1" class="empty-state">
            <div class="hero-logo-wrap">
              <img :src="aiLogo" alt="LEXIT AI" class="hero-logo" />
              <div class="hero-glow"></div>
            </div>
            <h1 class="page-title">Consultas Jurídicas</h1>
            <p class="page-subtitle">Haz preguntas sobre leyes, contratos y normas peruanas.</p>
            
            <div class="suggestions-grid">
              <button
                v-for="(s, i) in suggestions"
                :key="i"
                class="suggestion-card"
                @click="useSuggestion(s)"
              >
                {{ s }}
              </button>
            </div>
          </div>

          <!-- Message List -->
          <div class="messages-list" v-else>
            <div v-for="(mensaje, index) in mensajes" :key="index" class="message-wrapper" :class="mensaje.esIA ? 'ai-msg-wrap' : 'user-msg-wrap'">
              
              <!-- AI message -->
              <div v-if="mensaje.esIA" class="msg-row msg-row--ai">
                <img :src="aiLogo" alt="LEXIT AI" class="msg-avatar" />
                <div class="msg-bubble msg-bubble--ai">
                  <div class="msg-content formatted-message" v-html="formatMessage(mensaje.contenido)"></div>
                  <div v-if="mensaje.referencias?.length" class="msg-refs">
                    <strong>Referencias:</strong>
                    <div v-for="(ref, idx) in mensaje.referencias" :key="idx" class="q-mt-xs">{{ ref }}</div>
                  </div>
                </div>
              </div>

              <!-- User message -->
              <div v-else class="msg-row msg-row--user">
                <div class="msg-bubble msg-bubble--user">
                  <div class="msg-content">{{ mensaje.contenido }}</div>
                </div>
              </div>

            </div>

            <!-- Typing indicator -->
            <div v-if="store.loading" class="message-wrapper ai-msg-wrap">
              <div class="msg-row msg-row--ai">
                <img :src="aiLogo" alt="LEXIT AI" class="msg-avatar" />
                <div class="msg-bubble msg-bubble--ai typing-bubble">
                  <div class="typing-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="input-area-container">
          <div class="input-area">
            <q-input
              v-model="pregunta"
              placeholder="Pregunta a LEXIT AI..."
              type="textarea"
              autogrow
              borderless
              :disable="store.loading"
              :max-height="150"
              class="chat-input"
              hide-bottom-space
              @keydown.enter.exact.prevent="enviarConsulta"
            />
            <button
              class="send-btn"
              :disabled="store.loading || !pregunta.trim()"
              @click="enviarConsulta"
            >
              <q-icon v-if="!store.loading" name="arrow_upward" size="20px" />
              <q-spinner v-else size="18px" color="white" />
            </button>
          </div>
          <div v-if="store.error" class="error-row">
            <q-icon name="error" color="negative" size="18px" />
            <span class="error-text">{{ store.error }}</span>
          </div>
          <div class="disclaimer-text">
            LEXIT AI puede cometer errores. Considera verificar la información importante con un profesional.
          </div>
        </div>
      </main>

    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { useConsultasStore } from '../stores/consultas-store';
import { storeToRefs } from 'pinia';

const store = useConsultasStore();
const pregunta = ref('');
const mobileSidebarOpen = ref(false);

const aiLogo: string = new URL('../assets/logo.svg', import.meta.url).href;

const { mensajes } = storeToRefs(store);
const messagesBox = ref<HTMLElement | null>(null);

const suggestions = [
  '¿Cuáles son mis obligaciones en este contrato?',
  '¿Qué cláusulas representan mayor riesgo?',
  '¿Cómo puedo terminar un contrato de alquiler?',
  'Explícame la Ley de Protección de Datos Personales'
];

function useSuggestion(s: string) {
  pregunta.value = s;
  void enviarConsulta();
}

function crearNuevoChat() {
  store.nuevoChat();
  mobileSidebarOpen.value = false;
  pregunta.value = '';
}

function cargarChat(id: string) {
  store.cargarChat(id);
  mobileSidebarOpen.value = false;
}

function eliminarChat(id: string) {
  store.eliminarChat(id);
}

function formatMessage(content: string): string {
  if (!content) return '';
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\n/g, '<br>');
}

async function enviarConsulta() {
  if (pregunta.value.trim()) {
    try {
      await store.enviarConsulta(pregunta.value);
      pregunta.value = '';
      await nextTick();
      if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight;
    } catch (error) {
      console.error('Error al enviar consulta:', error);
    }
  }
}

onMounted(() => {
  store.iniciarSesion();
  void nextTick().then(() => {
    if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight;
  });
});

watch(mensajes, async () => {
  await nextTick();
  if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight;
}, { deep: true });
</script>

<style scoped>
/* ==============================
   Layout Overrides
   ============================== */
/* Hacemos que el chat ocupe la pantalla completa ignorando el padding del MainLayout usando márgenes negativos */
.consultas-chat-layout {
  margin: -34px -24px -60px; /* Compensa el padding del q-page en MainLayout */
  height: calc(100vh - 60px); /* Altura total menos navbar */
  overflow: hidden;
}

.chat-container {
  display: flex;
  height: 100%;
  width: 100%;
  background: #fff;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.03);
}

/* ==============================
   Sidebar (History)
   ============================== */
.chat-sidebar {
  width: 280px;
  background: #F9F9F8;
  border-right: 1px solid rgba(27, 27, 30, 0.08);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: transform 0.3s ease;
  z-index: 10;
}

.sidebar-header {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px;
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.12);
  border-radius: 12px;
  font-family: 'Figtree', sans-serif;
  font-weight: 500;
  color: #1b1b1e;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.02);
}

.new-chat-btn:hover {
  background: #FAFAF7;
  border-color: rgba(27, 27, 30, 0.2);
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.history-item:hover {
  background: rgba(27, 27, 30, 0.04);
}

.history-item--active {
  background: rgba(27, 27, 30, 0.07);
}

.history-item-content {
  display: flex;
  align-items: center;
  overflow: hidden;
  flex: 1;
}

.history-icon {
  color: #6a6a72;
}

.history-title {
  font-size: 0.88rem;
  color: #3a3a40;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-chat-btn {
  opacity: 0;
  color: #9a9aa2;
  transition: opacity 0.2s, color 0.2s;
}

.history-item:hover .delete-chat-btn {
  opacity: 1;
}

.delete-chat-btn:hover {
  color: #d32f2f;
}

.no-history {
  padding: 20px;
  text-align: center;
  font-size: 0.85rem;
  color: #9a9aa2;
}

/* ==============================
   Main Chat Area
   ============================== */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  position: relative;
  min-width: 0;
}

.mobile-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(27, 27, 30, 0.08);
  background: #fff;
}

.mobile-header-title {
  font-family: 'EB Garamond', serif;
  font-size: 1.1rem;
  font-weight: 600;
}

/* ==============================
   Messages
   ============================== */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  scroll-behavior: smooth;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
  text-align: center;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ==============================
   Hero Logo (Empty State)
   ============================== */
.hero-logo-wrap {
  position: relative;
  width: 72px;
  height: 72px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  position: relative;
  z-index: 2;
  animation: float 4s ease-in-out infinite;
}

.hero-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 50px;
  height: 50px;
  background: rgba(63, 111, 201, 0.4);
  filter: blur(25px);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
  100% { transform: translateY(0px); }
}

@keyframes pulse-glow {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
  50% { transform: translate(-50%, -50%) scale(1.6); opacity: 0.8; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
}

.page-title {
  font-family: 'EB Garamond', serif;
  font-size: 2.2rem;
  font-weight: 600;
  margin: 0 0 8px;
  color: #16161a;
}

.page-subtitle {
  color: #6a6a72;
  font-size: 1rem;
  margin-bottom: 40px;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: 600px;
  width: 100%;
}

.suggestion-card {
  background: #FAFAF7;
  border: 1px solid rgba(27, 27, 30, 0.08);
  padding: 16px;
  border-radius: 12px;
  text-align: left;
  font-size: 0.9rem;
  color: #3a3a40;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-card:hover {
  background: #f0f0ed;
  border-color: rgba(27, 27, 30, 0.15);
  transform: translateY(-2px);
}

/* Chat Messages */
.messages-list {
  padding: 24px 0 40px;
}

.message-wrapper {
  padding: 24px 20px;
  display: flex;
  justify-content: center;
}

.ai-msg-wrap {
  background: #F9F9F8;
  border-top: 1px solid rgba(27, 27, 30, 0.03);
  border-bottom: 1px solid rgba(27, 27, 30, 0.03);
}

.user-msg-wrap {
  background: #fff;
}

.msg-row {
  max-width: 760px;
  width: 100%;
  display: flex;
  gap: 16px;
}

.msg-row--user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.1);
  padding: 4px;
  flex-shrink: 0;
}

.msg-bubble {
  flex: 1;
}

.msg-bubble--user {
  background: #f4f4f4;
  padding: 12px 18px;
  border-radius: 18px 4px 18px 18px;
  max-width: 80%;
}

.msg-content {
  font-size: 1rem;
  line-height: 1.6;
  color: #1b1b1e;
}

.formatted-message :deep(h1),
.formatted-message :deep(h2),
.formatted-message :deep(h3) {
  font-family: 'EB Garamond', serif;
  font-weight: 600;
  margin: 12px 0 8px;
  color: #16161a;
}

.formatted-message :deep(strong) { font-weight: 600; }
.formatted-message :deep(em)     { font-style: italic; }

/* Typing indicator */
.typing-dots {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 24px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  background: #6a6a72;
  border-radius: 50%;
  animation: blink 1.4s infinite both;
}

.typing-dots span:nth-child(1) { animation-delay: 0s; }
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.2); }
}

/* ==============================
   Input Area
   ============================== */
.input-area-container {
  padding: 16px 20px 24px;
  background: linear-gradient(180deg, rgba(255,255,255,0) 0%, #fff 20%);
}

.input-area {
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  background: #FAFAF7;
  border: 1px solid rgba(27, 27, 30, 0.15);
  border-radius: 20px;
  padding: 8px 12px 8px 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-area:focus-within {
  border-color: #3f6fc9;
  box-shadow: 0 4px 16px rgba(63, 111, 201, 0.1);
}

.chat-input {
  flex: 1;
}

:deep(.chat-input .q-field__control) {
  background: transparent !important;
  padding: 0 !important;
  min-height: unset !important;
}

:deep(.chat-input .q-field__native) {
  color: #1b1b1e !important;
  font-family: 'Figtree', sans-serif !important;
  font-size: 1rem !important;
  padding: 6px 0 !important;
  line-height: 1.5 !important;
  resize: none !important;
}

:deep(.chat-input .q-field__bottom) { display: none !important; }

.send-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #3f6fc9;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s, background 0.2s;
  margin-left: 10px;
}

.send-btn:hover:not(:disabled) {
  background: #3258a3;
}

.send-btn:disabled {
  background: #e0e0e0;
  color: #a0a0a0;
  cursor: not-allowed;
}

.disclaimer-text {
  text-align: center;
  font-size: 0.75rem;
  color: #9a9aa2;
  margin-top: 12px;
}

/* ==============================
   Mobile / Responsive
   ============================== */
@media (max-width: 1024px) {
  .consultas-chat-layout {
    margin: -20px -16px -40px;
    height: calc(100vh - 60px);
  }
}

@media (max-width: 768px) {
  .chat-sidebar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    transform: translateX(-100%);
  }

  .sidebar-mobile-open {
    transform: translateX(0);
  }

  .sidebar-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 5;
  }

  .suggestions-grid {
    grid-template-columns: 1fr;
  }
  
  .consultas-chat-layout {
    margin: -16px -12px -32px;
  }
}
</style>
