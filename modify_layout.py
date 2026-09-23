import re

with open('src/layouts/MainLayout.vue', 'r', encoding='utf-8') as f:
    content = f.read()

template_addition = """
        </nav>

        <!-- Separator -->
        <div class="sidebar-separator" v-if="authStore.user"></div>

        <!-- Chat History -->
        <div class="sidebar-history" v-if="authStore.user">
          <div class="history-header">
            <span class="history-title">Consultas Recientes</span>
            <q-btn flat dense round icon="add" size="sm" color="white" class="new-chat-btn" @click="nuevaConsulta" />
          </div>
          
          <div class="history-list">
            <div 
              v-for="sesion in consultasStore.historialSesiones" 
              :key="sesion.id"
              class="history-item"
              :class="{ 'history-item--active': consultasStore.sesionActualId === sesion.id }"
              @click="cargarConsulta(sesion.id)"
            >
              <q-icon name="chat_bubble_outline" size="xs" class="q-mr-sm" />
              <span class="history-item-text">{{ sesion.titulo }}</span>
            </div>
          </div>
        </div>

        <div class="sidebar-footer">
"""
content = content.replace("        </nav>\n\n        <div class=\"sidebar-footer\">", template_addition)

script_additions = """
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import AuthButtons from '../components/Auth/AuthButtons.vue'
import { useUserProfileStore } from '../stores/userProfile'
import { useConsultasStore } from '../stores/consultas-store'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const consultasStore = useConsultasStore()
const authStore = useAuthStore()

watch(() => authStore.user, (user) => {
  if (user) {
    consultasStore.cargarHistorial()
  } else {
    consultasStore.historialSesiones = []
    consultasStore.sesionActualId = null
  }
}, { immediate: true })

function nuevaConsulta() {
  consultasStore.nuevaSesion()
  if (router.currentRoute.value.path !== '/app/consultas') {
    router.push('/app/consultas')
  }
  cerrarDrawerEnMobile()
}

function cargarConsulta(id: string) {
  consultasStore.cargarSesion(id)
  if (router.currentRoute.value.path !== '/app/consultas') {
    router.push('/app/consultas')
  }
  cerrarDrawerEnMobile()
}
"""

# Replace old imports
content = re.sub(
    r"import \{ ref, onMounted, onUnmounted \} from 'vue'[\s\S]*?import \{ useUserProfileStore \} from '\.\./stores/userProfile'",
    script_additions.strip(),
    content
)

css_additions = """
.sidebar-footer {
  position: relative;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid rgba(250, 250, 247, 0.1);
}

.sidebar-separator {
  height: 1px;
  background: rgba(250, 250, 247, 0.1);
  margin: 16px 0;
}

.sidebar-history {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-bottom: 12px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px 10px;
}

.history-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(250, 250, 247, 0.5);
  font-weight: 600;
}

.new-chat-btn {
  opacity: 0.7;
  transition: opacity 0.2s;
}
.new-chat-btn:hover {
  opacity: 1;
  background: rgba(250, 250, 247, 0.1);
}

.history-list {
  flex-grow: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  scrollbar-width: thin;
  scrollbar-color: rgba(250, 250, 247, 0.2) transparent;
}
.history-list::-webkit-scrollbar {
  width: 4px;
}
.history-list::-webkit-scrollbar-thumb {
  background: rgba(250, 250, 247, 0.2);
  border-radius: 4px;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 0.85rem;
  color: rgba(250, 250, 247, 0.7);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.history-item:hover {
  background: rgba(250, 250, 247, 0.05);
  color: rgba(250, 250, 247, 0.95);
}
.history-item--active {
  background: rgba(181, 80, 46, 0.15);
  color: #e8b381;
}
.history-item-text {
  overflow: hidden;
  text-overflow: ellipsis;
}
"""

content = content.replace(".sidebar-footer {\n  position: relative;\n  margin-top: auto;\n  padding-top: 16px;\n  border-top: 1px solid rgba(250, 250, 247, 0.1);\n}", css_additions.strip())


with open('src/layouts/MainLayout.vue', 'w', encoding='utf-8') as f:
    f.write(content)
print('MainLayout.vue modified')
