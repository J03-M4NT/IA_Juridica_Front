<template>
  <q-page class="consultas-page" :class="{ 'consultas-page--vacia': !hayConversacion }">

    <!-- Section header — se encoge y se atenúa al bajar en el chat, para
         devolverle espacio a la conversación sin perder el título del
         todo (ver onMessagesScroll). -->
    <div class="page-header" v-show="!hayConversacion" :class="{ 'page-header--compact': chatDesplazado }">
      <div class="saludo-bloque">
        <!-- Cada letra en su span: entran escalonadas y, al pasar el mouse,
             suben en ola (ver .page-title-letra). Solo decorativo. -->
        <h1 class="page-title" aria-label="LexIT">
          <span
            v-for="(letra, li) in 'LexIT'"
            :key="li"
            class="page-title-letra"
            :style="{ '--i': li }"
            aria-hidden="true"
          >{{ letra }}</span>
        </h1>
        <p class="page-saludo">{{ saludo }}</p>
      </div>
    </div>

    <div class="consultas-layout" :class="{ 'consultas-layout--vacio': !hayConversacion }">

    <!-- Chat wrapper -->
    <div class="chat-wrapper">

      <!-- Messages area -->
      <div class="messages-area" ref="messagesBox" @scroll="onMessagesScroll">
        <template v-for="(mensaje, index) in mensajes" :key="index">
        <div v-if="!esBienvenida(mensaje, index)" class="message-wrapper">

          <!-- AI message: bloque de texto simple, sin avatar ni burbuja -->
          <div v-if="mensaje.esIA" class="msg-block msg-block--ai">
            <div class="msg-meta msg-meta--ai">LexIT · {{ formatTimestamp(mensaje.timestamp) }}</div>

            <!-- Mientras llega el primer trozo del stream: una sola línea que
                 va diciendo "Pensando…", "Analizando tu consulta…", etc.
                 (rotan solo con CSS). El nombre ya está arriba, en msg-meta. -->
            <div
              v-if="!mensaje.contenido && store.loading && index === mensajes.length - 1"
              class="pensando"
              role="status"
              aria-live="polite"
            >
              <span class="pensando-marca" aria-hidden="true"><span></span></span>
              <span class="pensando-fases" aria-hidden="true">
                <span>Pensando…</span>
                <span>Analizando tu consulta…</span>
                <span>Revisando la base jurídica…</span>
                <span>Redactando la respuesta…</span>
              </span>
              <span class="pensando-lector">Pensando…</span>
            </div>
            <template v-else>
              <div
                class="msg-content formatted-message"
                v-html="formatMessage(mensaje.contenido, mensaje.fuentes?.length ?? 0)"
                @click="onClickEnRespuesta($event, index)"
              ></div>
              <div v-if="mensaje.referencias?.length" class="msg-refs">
                <strong>Referencias:</strong>
                <div v-for="(ref, idx) in mensaje.referencias" :key="idx" class="q-mt-xs">{{ ref }}</div>
              </div>

              <!-- Fuentes citadas de Pinecone (siempre visibles) -->
              <div v-if="mensaje.fuentes?.length" class="fuentes-block">
                <div class="fuentes-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <path d="M14 2v6h6"/>
                  </svg>
                  <span>Basado en {{ mensaje.fuentes.length }} fuente(s) de la base de datos jurídica</span>
                </div>

                <!-- Cada cita es un cuadro pequeño y cerrado; el texto solo se
                     muestra al hacer clic (en el cuadro o en su [n] dentro de
                     la respuesta), una cita abierta a la vez. -->
                <div class="fuentes-chips">
                  <button
                    v-for="(fuente, fi) in mensaje.fuentes"
                    :key="fi"
                    type="button"
                    class="fuente-chip"
                    :class="{ 'fuente-chip--abierta': citaAbierta[index] === fi }"
                    :aria-expanded="citaAbierta[index] === fi"
                    @click="alternarCita(index, fi)"
                  >
                    <span class="fuente-chip-num">{{ fi + 1 }}</span>
                    <span class="fuente-chip-nombre">
                      {{ fuente.nombreDocumento || 'Documento' }}<template v-if="fuente.numeroArticulo"> · Art. {{ fuente.numeroArticulo }}°{{ fuente.sufijoArticulo ? `-${fuente.sufijoArticulo}` : '' }}</template>
                    </span>
                  </button>
                </div>

                <Transition name="cita">
                  <div
                    v-if="citaAbierta[index] !== undefined && mensaje.fuentes[citaAbierta[index]!]"
                    :key="citaAbierta[index]"
                    class="fuente-detalle"
                  >
                    <div class="fuente-detalle-cabecera">
                      <span class="fuente-doc-name">
                        [{{ citaAbierta[index]! + 1 }}] {{ mensaje.fuentes[citaAbierta[index]!]!.nombreDocumento || 'Documento' }}<template v-if="mensaje.fuentes[citaAbierta[index]!]!.numeroArticulo"> · Artículo {{ mensaje.fuentes[citaAbierta[index]!]!.numeroArticulo }}°{{ mensaje.fuentes[citaAbierta[index]!]!.sufijoArticulo ? `-${mensaje.fuentes[citaAbierta[index]!]!.sufijoArticulo}` : '' }}</template>
                      </span>
                      <button type="button" class="fuente-detalle-cerrar" aria-label="Cerrar cita" @click="cerrarCita(index)">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                    <p class="fuente-texto">&ldquo;{{ mensaje.fuentes[citaAbierta[index]!]!.texto }}&rdquo;</p>
                  </div>
                </Transition>
              </div>

              <div class="msg-actions">
                <button type="button" class="msg-action-btn" title="Copiar" @click="copiarMensaje(mensaje.contenido, index)">
                  <svg v-if="copiedIndex !== index" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </button>
              </div>
            </template>
          </div>

          <!-- User message: burbuja alineada a la derecha -->
          <div v-else class="msg-block msg-block--user">
            <div class="msg-bubble-user">{{ mensaje.contenido }}</div>
          </div>

        </div>
        </template>
      </div>

      <!-- Input area -->
      <div class="input-area">
        <div class="composer-pill">
          <q-input
            v-model="pregunta"
            :placeholder="store.especialidad ? `Escribe tu consulta de ${etiquetaEspecialidad(store.especialidad)}...` : 'Escribe tu consulta legal aquí...'"
            type="textarea"
            autogrow
            borderless
            :disable="store.loading"
            :max-height="160"
            class="composer-textarea-pill"
            hide-bottom-space
            @keydown.enter.exact.prevent="enviarConsulta"
          />

          <div class="composer-barra">
            <!-- Especializaciones: limitan las respuestas (y la base jurídica
                 consultada) a una rama del derecho. "General" = toda la base.
                 Viven dentro del campo: un botón que despliega todas las
                 opciones. -->
            <button
              type="button"
              class="especialidad-selector"
              :class="{ 'especialidad-selector--activa': !!store.especialidad }"
              aria-haspopup="listbox"
              :aria-expanded="menuEspecialidades"
              aria-label="Especialización"
              :disabled="store.loading"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 3v18"/><path d="M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0z"/><path d="M19 7l-3 7a3 3 0 0 0 6 0z"/><path d="M8 21h8"/>
              </svg>
              <span class="especialidad-selector-texto">{{ store.especialidad ? etiquetaEspecialidad(store.especialidad) : 'General' }}</span>
              <svg class="especialidad-selector-flecha" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6"/>
              </svg>

              <q-menu
                v-model="menuEspecialidades"
                anchor="top left"
                self="bottom left"
                :offset="[0, 10]"
                class="especialidades-menu"
                transition-show="jump-up"
                transition-hide="fade"
              >
                <div class="especialidades-lista" role="listbox" aria-label="Especialización">
                  <div class="especialidades-lista-titulo">Especialización</div>
                  <button
                    v-close-popup
                    type="button"
                    class="especialidad-opcion"
                    :class="{ 'especialidad-opcion--activa': !store.especialidad }"
                    role="option"
                    :aria-selected="!store.especialidad"
                    @click="store.especialidad = null"
                  >
                    <span class="especialidad-opcion-nombre">General</span>
                    <span class="especialidad-opcion-desc">Toda la base jurídica</span>
                    <svg v-if="!store.especialidad" class="especialidad-opcion-check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </button>
                  <button
                    v-for="esp in ESPECIALIDADES"
                    :key="esp.valor"
                    v-close-popup
                    type="button"
                    class="especialidad-opcion"
                    :class="{ 'especialidad-opcion--activa': store.especialidad === esp.valor }"
                    role="option"
                    :aria-selected="store.especialidad === esp.valor"
                    @click="store.especialidad = esp.valor"
                  >
                    <span class="especialidad-opcion-nombre">{{ esp.etiqueta }}</span>
                    <svg v-if="store.especialidad === esp.valor" class="especialidad-opcion-check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </button>
                </div>
              </q-menu>
            </button>

            <button
              class="ask-btn-round"
              :disabled="store.loading || !pregunta.trim()"
              title="Preguntar"
              @click="enviarConsulta"
            >
              <svg v-if="!store.loading" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>
              </svg>
              <q-spinner v-else size="16px" color="white" />
            </button>
          </div>
        </div>

        <div v-if="store.error" class="error-row">
          <q-icon name="error" color="negative" size="18px" />
          <span class="error-text">{{ store.error }}</span>
        </div>
      </div>

    </div>

    </div>

  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useConsultasStore } from '../stores/consultas-store'
import { useUserProfileStore } from '../stores/userProfile'
import { ESPECIALIDADES, etiquetaEspecialidad } from '../constants/especialidades'
import { storeToRefs } from 'pinia'

// Saludo según la hora del usuario, con el nombre registrado en su perfil
// (sin nombre, solo el saludo). Se recalcula cada minuto por si cambia el
// tramo del día con la página abierta.
const profileStore = useUserProfileStore()
const ahora = ref(new Date())
let relojSaludo: ReturnType<typeof setInterval> | null = null
onMounted(() => { relojSaludo = setInterval(() => { ahora.value = new Date() }, 60_000) })
onUnmounted(() => { if (relojSaludo) clearInterval(relojSaludo) })

// El store abre cada sesión con un mensaje de bienvenida (consultas-store,
// iniciarSesion) y lo guarda con la sesión. Ya no se muestra: el saludo con
// el nombre lo reemplaza. Sigue en el store porque el historial que se le
// manda a la IA cuenta con él (slice(1)).
function esBienvenida(mensaje: { esIA: boolean; contenido: string }, index: number): boolean {
  return index === 0 && mensaje.esIA && mensaje.contenido.startsWith('**Hola, soy LexIT**')
}

const store = useConsultasStore()
const pregunta = ref('')

const { mensajes } = storeToRefs(store)
// Hay conversación cuando hay algún mensaje además de la bienvenida oculta.
const hayConversacion = computed(() => mensajes.value.some((m, i) => !esBienvenida(m, i)))

// Frases de saludo por tramo horario/día, con variantes al azar dentro de
// cada tramo (algunas reciben el nombre, otras no lo necesitan). "Estamos
// listos para comenzar" es la frase "aleatoria": entra en la mezcla de
// cualquier tramo. Las dos últimas aparecen cuando el usuario ya tiene
// consultas guardadas y abre una conversación nueva ("al retomar").
type Frase = string | ((nombre: string) => string)

const saludo = computed(() => {
  const fecha = ahora.value
  const hora = fecha.getHours()
  const dia = fecha.getDay() // 0 domingo … 1 lunes, 2 martes, 4 jueves
  const nombre = profileStore.profile?.displayName?.trim() || ''

  const candidatos: Frase[] = []

  if (dia === 1 && hora >= 7 && hora < 10) {
    candidatos.push((n) => (n ? `Buenos días, ${n}, ¿Listos para la jornada?` : 'Buenos días, ¿Listos para la jornada?'))
  } else if ((dia === 2 || dia === 4) && hora >= 7 && hora < 10) {
    candidatos.push((n) => (n ? `Buenos días ${n} ¿en qué trabajaremos hoy?` : 'Buenos días ¿en qué trabajaremos hoy?'))
  } else if (hora >= 7 && hora < 10) {
    candidatos.push((n) => (n ? `Buenos días, ${n}` : 'Buenos días'), 'Empecemos')
  } else if (hora >= 10 && hora < 13) {
    candidatos.push((n) => (n ? `Buenos días, ${n}` : 'Buenos días'))
  } else if (hora >= 13 && hora < 16) {
    candidatos.push((n) => (n ? `¡Buenas tardes, ${n}! Continuemos con la jornada` : '¡Buenas tardes! Continuemos con la jornada'))
  } else if (hora >= 16 && hora < 17) {
    candidatos.push('La jornada continúa, ¿en qué avanzamos?')
  } else if (hora >= 17 && hora < 19) {
    candidatos.push((n) => (n ? `Buen trabajo por hoy ${n}, dejemos listo lo que sigue.` : 'Buen trabajo por hoy, dejemos listo lo que sigue.'))
  } else if (hora >= 19 && hora < 20) {
    candidatos.push('¡Tengámoslo listo!')
  } else if (hora >= 20 && hora < 22) {
    candidatos.push((n) => (n ? `Buenas noches ${n} ¿Qué queda por resolver?` : 'Buenas noches ¿Qué queda por resolver?'))
  } else if (hora >= 22) {
    candidatos.push('Todavía queda tiempo para avanzar.')
  } else if (hora < 3) {
    candidatos.push('Seguimos adelante juntos')
  } else if (hora < 4) {
    candidatos.push('Preparado y listo')
  } else if (hora < 5) {
    candidatos.push((n) => (n ? `¿Madrugando ${n}?` : '¿Madrugando?'))
  } else if (hora < 6) {
    candidatos.push('El día empieza temprano')
  } else {
    candidatos.push((n) => (n ? `Buenos días ${n}, ¡comencemos!` : 'Buenos días, ¡comencemos!'))
  }

  candidatos.push('Estamos listos para comenzar')

  if (store.historialSesiones.length > 0 && !hayConversacion.value) {
    candidatos.push(
      (n) => (n ? `Bien, ${n}, continuemos` : 'Bien, continuemos'),
      'Buen trabajo hasta aquí, continuemos'
    )
  }

  const elegida = candidatos[Math.floor(Math.random() * candidatos.length)] as Frase
  return typeof elegida === 'function' ? elegida(nombre) : elegida
})
const messagesBox = ref<HTMLElement | null>(null)

// Puramente visual: encoge/atenúa el encabezado mientras se baja en el
// chat, para devolverle espacio a la conversación (ver .page-header--compact).
const chatDesplazado = ref(false)

// Puramente visual: si el menú de especializaciones está abierto, para
// girar la flechita del selector (QMenu no marca aria-expanded solo).
const menuEspecialidades = ref(false)

function onMessagesScroll(event: Event) {
  chatDesplazado.value = (event.target as HTMLElement).scrollTop > 16
}

const copiedIndex = ref<number | null>(null)

async function copiarMensaje(texto: string, index: number) {
  try {
    await navigator.clipboard.writeText(texto)
    copiedIndex.value = index
    setTimeout(() => {
      if (copiedIndex.value === index) copiedIndex.value = null
    }, 1500)
  } catch (err) {
    console.error('No se pudo copiar:', err)
  }
}

function formatTimestamp(ts: Date | string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

// Cita abierta en cada mensaje (índice del mensaje → índice de la fuente).
// Las citas empiezan cerradas; se abre una a la vez por mensaje.
const citaAbierta = ref<Record<number, number>>({})

function alternarCita(indiceMensaje: number, indiceFuente: number) {
  if (citaAbierta.value[indiceMensaje] === indiceFuente) {
    cerrarCita(indiceMensaje)
  } else {
    citaAbierta.value = { ...citaAbierta.value, [indiceMensaje]: indiceFuente }
  }
}

function cerrarCita(indiceMensaje: number) {
  const copia = { ...citaAbierta.value }
  delete copia[indiceMensaje]
  citaAbierta.value = copia
}

// Clic en un [n] dentro del texto de la respuesta (ver formatMessage).
function onClickEnRespuesta(event: MouseEvent, indiceMensaje: number) {
  const boton = (event.target as HTMLElement).closest<HTMLElement>('[data-cita]')
  if (!boton) return
  alternarCita(indiceMensaje, Number(boton.dataset.cita) - 1)
}

// Al cambiar de conversación los índices de mensaje ya no corresponden.
watch(() => store.sesionActualId, () => { citaAbierta.value = {} })

// totalFuentes: los [n] que apuntan a una fuente existente se vuelven
// botoncitos que abren esa cita; el resto del texto no cambia.
function formatMessage(content: string, totalFuentes = 0): string {
  return content
    // Separadores (---, ***) y viñetas "* " de Gemini: se resuelven antes
    // que las negritas/cursivas, si no quedan asteriscos sueltos a la vista.
    .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, '<hr>')
    .replace(/^(\s*)[*-]\s+/gm, '$1• ')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^#{4,6} (.*$)/gm, '<h4>$1</h4>')
    .replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (original: string, grupo: string) => {
      const numeros = grupo.split(',').map(s => Number(s.trim())).filter(n => n >= 1 && n <= totalFuentes)
      if (numeros.length === 0) return original
      return numeros
        .map(n => `<button type="button" class="cita-ref" data-cita="${n}" title="Ver cita ${n}">${n}</button>`)
        .join('')
    })
    .replace(/\n/g, '<br>')
}

async function enviarConsulta() {
  const mensaje = pregunta.value.trim()
  if (!mensaje) return

  try {
    await store.enviarConsulta(mensaje)
    pregunta.value = ''
    await nextTick()
    if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight
  } catch (error) {
    console.error('Error al enviar consulta:', error)
  }
}

onMounted(() => {
  store.iniciarSesion()
  void nextTick().then(() => {
    if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight
  })
})

watch(mensajes, async () => {
  await nextTick()
  if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight
}, { deep: true })
</script>

<style scoped>
/* ==============================
   Paleta clara verde-bosque/beige (misma familia que LandingPage.vue y
   Contratos), variables propias con prefijo lc-, definidas solo dentro de
   .consultas-page. No se tocan las variables globales (--surface, --bg,
   etc. en src/css/app.scss). Acento en oliva medio, distinto del verde
   grisáceo de Contratos, para que cada sección se distinga sutilmente
   dentro de la misma familia de colores.
   ============================== */
.consultas-page {
  --lc-bg: var(--lexit-blanco);
  --lc-surface: var(--lexit-blanco);
  --lc-surface-alt: var(--lexit-marfil);
  --lc-surface-sunken: var(--lexit-marfil-suave);
  --lc-border: var(--lexit-marfil);
  --lc-border-strong: rgba(var(--lexit-verde-rgb), 0.18);
  --lc-text: var(--lexit-verde);
  --lc-text-muted: var(--lexit-texto-secundario);
  --lc-text-faint: var(--lexit-texto-tenue);
  --lc-accent: var(--lexit-verde);
  --lc-accent-hover: rgba(var(--lexit-verde-rgb), 0.85);
  --lc-accent-soft: var(--lexit-marfil-suave);
  --lc-accent-soft-strong: var(--lexit-marfil);
  --lc-accent-warm: var(--lexit-piedra);
  --lc-accent-warm-soft: rgba(var(--lexit-piedra-rgb), 0.25);
  --lc-ink: var(--lexit-blanco-calido);

  /* El max-width:none real vive en ".q-page.consultas-page" más abajo —
     acá no alcanza, empata en especificidad con la regla global ".q-page"
     de MainLayout.vue (max-width:1400px) y puede perder según el orden de
     carga de cada archivo. */
  animation: floatUp 0.5s ease-out both;
  display: flex;
  flex-direction: column;
  /* 94px = el padding vertical de .q-page en MainLayout.vue (34px arriba +
     60px abajo). Sin fijar esta altura, el encabezado + el chat empujan el
     contenido más allá del viewport y es la PÁGINA la que hace scroll,
     arrastrando el composer con ella — en vez de quedarse quieto abajo
     mientras solo se desplazan los mensajes. */
  height: calc(100vh - 94px);
  min-height: 560px;
  overflow: hidden;
}

/* .q-page trae max-width:1400px + margin:0 auto de MainLayout.vue (regla
   compartida por toda la app) — sin anularla acá, en pantallas anchas se
   ve el fondo claro de .page-container detrás del área oscura (mismo bug
   ya resuelto en ContratosPage.vue). Mayor especificidad que ".q-page"
   (dos clases contra una) para que gane sin tocar esa regla compartida. */
.q-page.consultas-page {
  background: var(--lc-bg);
  max-width: none;
  margin: 0;
}

@keyframes floatUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes blink {
  0%   { opacity: 0.2; transform: translateY(0); }
  50%  { opacity: 1;   transform: translateY(-3px); }
  100% { opacity: 0.2; transform: translateY(0); }
}

.page-header {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--lc-border);
  text-align: center;
  transition: opacity 0.25s ease, transform 0.25s ease, margin-bottom 0.25s ease, padding-bottom 0.25s ease;
}

/* Al bajar en el chat, el encabezado se encoge y atenúa en vez de ocupar
   su espacio completo todo el tiempo (ver onMessagesScroll). */
.page-header--compact {
  opacity: 0.4;
  transform: scale(0.92);
  margin-bottom: 6px;
  padding-bottom: 8px;
}

.page-header--compact:hover {
  opacity: 0.9;
}

/* Estado de bienvenida (sin conversación): el saludo ocupa el centro del
   espacio disponible sobre el composer, con entrada escalonada. */
.page-header:not(.page-header--compact) {
  flex: 1 1 auto;
  justify-content: center;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding-bottom: 0;
  border-bottom: none;
}

.page-header:not(.page-header--compact)::after {
  content: '';
  width: 120px;
  height: 1px;
  margin-top: 6px;
  background: var(--lc-border-strong);
  transform-origin: center;
  animation: saludoLinea 0.9s 0.35s ease both;
}

.consultas-layout--vacio {
  flex: 0 0 auto;
}

.page-header:not(.page-header--compact) .page-saludo {
  animation: saludoEntrada 0.7s 0.45s ease both;
}

@keyframes saludoEntrada {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: none; }
}

@keyframes saludoLinea {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

.saludo-bloque {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* "LexIT" grande, serif, letra por letra: entran escalonadas y al pasar el
   mouse suben en ola, con una línea fina que se dibuja debajo. */
.page-title {
  position: relative;
  display: inline-flex;
  font-family: 'Baskervville', 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: clamp(3rem, 6vw, 4.4rem);
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin: 0;
  padding-bottom: 6px;
  color: var(--lc-text);
  cursor: default;
  transition: font-size 0.25s ease;
}

.page-title::after {
  content: '';
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: 0;
  height: 1px;
  background: var(--lc-accent-warm);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.page-title:hover::after {
  transform: scaleX(1);
}

.page-title-letra {
  display: inline-block;
  animation: letraEntrada 0.75s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--i) * 70ms);
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), color 0.3s ease;
  transition-delay: calc(var(--i) * 40ms);
}

.page-title:hover .page-title-letra {
  transform: translateY(-5px);
}

/* "IT" se aclara un poco al pasar el mouse: el único acento, sutil. */
.page-title:hover .page-title-letra:nth-child(n + 4) {
  color: rgba(var(--lexit-verde-rgb), 0.72);
}

@keyframes letraEntrada {
  from { opacity: 0; transform: translateY(0.45em); filter: blur(4px); }
  to   { opacity: 1; transform: none; filter: blur(0); }
}

.page-header--compact .page-title {
  font-size: 1.7rem;
}

.page-subtitle {
  margin: 4px 0 0;
  color: var(--lc-text-muted);
  font-size: 1rem;
}

.page-saludo {
  margin: 4px 0 0;
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-style: italic;
  font-size: clamp(1.2rem, 2.2vw, 1.45rem);
  color: var(--lc-text-muted);
}


.consultas-layout {
  flex: 1;
  min-height: 0;
  display: flex;
}

/* Sin card: sin fondo propio, borde ni sombra — el chat vive directo
   sobre el fondo de la página (misma paleta), en vez de sentirse
   "encerrado" dentro de un recuadro aparte. Un padding lateral generoso
   (en vez del borde de una tarjeta) es lo que le da aire. */
.chat-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
  min-height: 0;
  padding: 8px 4vw 0;
}

/* Chat sin tarjeta ni header propio — el título de la página ya cumple ese
   rol, como en Claude/ChatGPT donde el panel de chat no lleva su propio
   marco. */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 4px 4px 16px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  scrollbar-width: thin;
  scrollbar-color: var(--lc-border-strong) transparent;
}

/* Sin tarjeta blanca — solo una franja de acento a la izquierda, texto
   flotando directo sobre el fondo de la página. Bloque de texto simple,
   como dice el comentario del template, ahora sí sin caja alrededor. */
.msg-block--ai {
  max-width: 100%;
  padding: 4px 0;
}

.msg-block--user {
  display: flex;
  justify-content: flex-end;
}

.msg-bubble-user {
  max-width: 74%;
  background: var(--lc-accent);
  color: var(--lc-ink);
  padding: 12px 16px;
  border-radius: 16px 16px 4px 16px;
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.55;
  white-space: pre-wrap;
}

.msg-meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Baskervville', 'Fraunces', 'EB Garamond', serif;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-bottom: 9px;
}

.msg-meta--ai { color: var(--lc-accent); }

.msg-content {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--lc-text);
}

.msg-refs {
  font-size: 0.8rem;
  color: var(--lc-text-faint);
  margin-top: 8px;
}

.formatted-message :deep(h1),
.formatted-message :deep(h2),
.formatted-message :deep(h3),
.formatted-message :deep(h4) {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-weight: 600;
  margin: 8px 0 4px;
  color: var(--lc-text);
}

.formatted-message :deep(strong) { font-weight: 600; color: var(--lc-text); }
.formatted-message :deep(em)     { font-style: italic; }
.formatted-message :deep(hr)     { border: none; border-top: 1px solid var(--lc-border-strong); margin: 12px 0; }

.msg-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.msg-action-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--border-radius-small);
  background: none;
  border: none;
  color: var(--lc-text-faint);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.18s, color 0.18s;
}

.msg-action-btn:hover {
  background: var(--lc-surface);
  color: var(--lc-text);
}

/* "Pensando…": sin recuadro, una marca que late y una sola línea de texto
   con brillo que va cambiando de frase (todo CSS). */
.pensando {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 2px 0;
  animation: floatUp 0.35s ease-out both;
}

.pensando-marca {
  position: relative;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pensando-marca::before,
.pensando-marca::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid var(--lc-accent-warm);
  animation: pensandoOnda 1.8s ease-out infinite;
}

.pensando-marca::after { animation-delay: 0.9s; }

.pensando-marca > span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--lc-accent);
  animation: pensandoLatido 1.8s ease-in-out infinite;
}

@keyframes pensandoOnda {
  from { transform: scale(0.35); opacity: 0.9; }
  to   { transform: scale(1.2); opacity: 0; }
}

@keyframes pensandoLatido {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(0.75); }
}

/* Las frases ocupan el mismo lugar y se turnan (ciclo de 10s). */
.pensando-fases {
  position: relative;
  display: block;
  width: 260px;
  height: 1.5em;
  overflow: hidden;
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 0.98rem;
  font-weight: 600;
}

.pensando-fases span {
  position: absolute;
  left: 0;
  top: 0;
  white-space: nowrap;
  opacity: 0;
  background: linear-gradient(
    90deg,
    var(--lc-text-muted) 0%,
    var(--lc-text-muted) 40%,
    var(--lc-text) 50%,
    var(--lc-text-muted) 60%,
    var(--lc-text-muted) 100%
  );
  background-size: 250% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation:
    pensandoFase 10s ease-in-out infinite,
    pensandoBrillo 2.2s linear infinite;
}

.pensando-fases span:nth-child(2) { animation-delay: 2.5s, 0s; }
.pensando-fases span:nth-child(3) { animation-delay: 5s, 0s; }
.pensando-fases span:nth-child(4) { animation-delay: 7.5s, 0s; }

@keyframes pensandoBrillo {
  from { background-position: 100% 0; }
  to   { background-position: -150% 0; }
}

@keyframes pensandoFase {
  0%   { opacity: 0; transform: translateY(60%); }
  4%   { opacity: 1; transform: none; }
  22%  { opacity: 1; transform: none; }
  26%  { opacity: 0; transform: translateY(-60%); }
  100% { opacity: 0; transform: translateY(-60%); }
}

/* Texto solo para lectores de pantalla */
.pensando-lector {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .pensando-marca::before,
  .pensando-marca::after,
  .pensando-marca > span,
  .page-title-letra { animation: none; }

  .pensando-fases span { animation: none; }
  .pensando-fases span:first-child { opacity: 1; }
}

/* Fuentes citadas */
.fuentes-block {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--lc-border-strong);
}

.fuentes-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--lc-accent);
  background: var(--lc-accent-soft);
  border: 1px solid var(--lc-accent-soft-strong);
  padding: 6px 11px;
  border-radius: var(--border-radius-small);
  font-family: 'Baskervville', 'Figtree', sans-serif;
}

/* Citas: cuadros pequeños y cerrados; el texto se abre al hacer clic. */
.fuentes-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.fuente-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: 100%;
  padding: 5px 10px 5px 5px;
  background: var(--lc-surface);
  border: 1px solid var(--lc-border-strong);
  border-radius: 8px;
  color: var(--lc-text-muted);
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}

.fuente-chip:hover {
  border-color: var(--lc-accent);
  color: var(--lc-text);
}

.fuente-chip--abierta {
  border-color: var(--lc-accent);
  background: var(--lc-accent-soft);
  color: var(--lc-text);
}

.fuente-chip:focus-visible {
  outline: 2px solid var(--lc-accent);
  outline-offset: 2px;
}

.fuente-chip-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 5px;
  background: var(--lc-accent);
  color: var(--lc-ink);
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
}

.fuente-chip-nombre {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fuente-detalle {
  margin-top: 8px;
  background: var(--lc-surface);
  border: 1px solid var(--lc-border);
  border-left: 3px solid var(--lc-accent);
  border-radius: 8px;
  padding: 10px 12px;
}

.fuente-detalle-cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.fuente-detalle-cerrar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 5px;
  background: none;
  color: var(--lc-text-faint);
  cursor: pointer;
}

.fuente-detalle-cerrar:hover {
  background: var(--lc-surface-alt);
  color: var(--lc-text);
}

/* Aparece suave en vez de "de golpe". */
.cita-enter-active,
.cita-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.cita-enter-from,
.cita-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Los [n] dentro de la respuesta: botoncitos que abren su cita. */
.formatted-message :deep(.cita-ref) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  margin: 0 2px;
  padding: 0 4px;
  border: 1px solid var(--lc-accent-soft-strong);
  border-radius: 4px;
  background: var(--lc-accent-soft);
  color: var(--lc-accent);
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1;
  vertical-align: 2px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.formatted-message :deep(.cita-ref:hover) {
  background: var(--lc-accent);
  color: var(--lc-ink);
}

.fuente-doc-name {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--lc-text);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 5px;
}

.fuente-texto {
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--lc-text-muted);
  font-style: italic;
  margin: 0;
}

.input-area {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 8px 2px 0;
  flex-shrink: 0;
}

.composer-pill {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--lc-surface);
  border: 1px solid var(--lc-border-strong);
  border-radius: 20px;
  padding: 6px 8px 6px 16px;
  box-shadow: 0 4px 18px -6px rgba(var(--lexit-verde-rgb), 0.16);
  transition: border-color 0.18s, box-shadow 0.18s;
}

.composer-pill:focus-within {
  border-color: var(--lc-accent);
  box-shadow: 0 0 0 3px var(--lc-accent-soft);
}

.composer-textarea-pill { flex: 1; padding-right: 8px; }

.composer-barra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-left: -8px;
}

:deep(.composer-textarea-pill .q-field__control) {
  background: transparent !important;
  padding: 0 !important;
  min-height: unset !important;
}

:deep(.composer-textarea-pill .q-field__native) {
  color: var(--lc-text) !important;
  font-family: 'Baskervville', 'Figtree', sans-serif !important;
  font-size: 0.97rem !important;
  padding: 5px 0 !important;
  line-height: 1.45 !important;
  resize: none !important;
}

:deep(.composer-textarea-pill .q-field__native::placeholder) {
  color: var(--lc-text-faint) !important;
  opacity: 1 !important;
}

:deep(.composer-textarea-pill .q-field__bottom) { display: none !important; }

.ask-btn-round {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--lc-accent);
  color: var(--lc-ink);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background-color 0.18s, transform 0.18s;
}

.ask-btn-round:hover:not(:disabled) { background: var(--lc-accent-hover); color: #fff; transform: scale(1.05); }
.ask-btn-round:disabled { opacity: 0.4; cursor: not-allowed; }

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: var(--lc-text-muted);
  border: none;
  border-radius: var(--border-radius-small);
  padding: 6px 9px;
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s, color 0.18s;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--surface-alt);
  color: var(--ink);
}

.toolbar-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ask-btn {
  background: var(--ink);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 9px 20px;
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  transition: background-color 0.18s, transform 0.18s;
}

.ask-btn:hover:not(:disabled) { background: var(--ink-soft); transform: scale(1.03); }
.ask-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.error-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  justify-content: center;
}

.error-text {
  font-size: 0.88rem;
  color: var(--q-negative);
}

@media (max-width: 600px) {
  .chat-wrapper {
    height: 70vh;
    min-height: 420px;
  }

  .msg-bubble-user { max-width: 88%; }
}

/* Sin conversación: el saludo y el campo de consulta quedan juntos y
   centrados en la pantalla (como portada); al empezar a conversar, el
   campo vuelve abajo. */
.consultas-page--vacia {
  justify-content: center;
}

.consultas-page--vacia .page-header {
  flex: 0 0 auto;
  margin-bottom: 38px;
  gap: 16px;
}

.consultas-page--vacia .chat-wrapper {
  height: auto;
  padding-top: 0;
}

.consultas-page--vacia .messages-area {
  flex: 0 0 auto;
  padding: 0;
}

/* Todo el bloque (LexIT + saludo + campo) en el centro EXACTO de la
   pantalla. La página trae relleno desparejo de MainLayout (34px arriba,
   60px abajo) que corría el centro hacia arriba: en la portada se quita el
   relleno vertical y la página ocupa todo el alto visible. */
.q-page.consultas-page.consultas-page--vacia {
  height: 100vh;
  min-height: 100vh;
  padding-top: 0;
  padding-bottom: 0;
}

/* Clave del centrado: sin esto, ".consultas-layout { flex: 1 }" (más
   abajo en el archivo, misma especificidad que .consultas-layout--vacio)
   le ganaba y el bloque del campo se estiraba ocupando todo el alto que
   sobra, dejando saludo + campo pegados arriba. */
.consultas-page--vacia .consultas-layout {
  flex: 0 0 auto;
  margin-top: 0;
}

.consultas-page--vacia .page-header {
  margin-top: 0;
}

/* Más presencia en la portada */
.consultas-page--vacia .page-title {
  font-size: clamp(3.6rem, 7.5vw, 5.6rem);
  letter-spacing: -0.025em;
}

.consultas-page--vacia .page-saludo {
  font-size: clamp(1.3rem, 2.6vw, 1.7rem);
}

/* El campo aparece justo después del saludo */
.consultas-page--vacia .input-area {
  animation: saludoEntrada 0.7s 0.65s ease both;
}

/* Selector de especialización dentro del campo de consulta */
.especialidad-selector {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: 70%;
  padding: 6px 10px 6px 11px;
  border-radius: 999px;
  border: 1px solid var(--lc-border);
  background: var(--lc-surface);
  color: var(--lc-text-muted);
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s, border-color 0.18s, color 0.18s, transform 0.18s;
}

.especialidad-selector:hover:not(:disabled) {
  background: var(--lc-surface-sunken);
  border-color: var(--lc-border-strong);
  color: var(--lc-text);
}

.especialidad-selector:active:not(:disabled) { transform: scale(0.97); }

.especialidad-selector--activa {
  background: var(--lc-accent-soft);
  border-color: var(--lc-accent-soft-strong);
  color: var(--lc-text);
}

.especialidad-selector-texto {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.especialidad-selector-flecha {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.especialidad-selector:hover:not(:disabled) .especialidad-selector-flecha {
  transform: translateY(1px);
}

.especialidad-selector[aria-expanded="true"] .especialidad-selector-flecha {
  transform: rotate(180deg);
}

.especialidad-selector:disabled {
  cursor: default;
  opacity: 0.6;
}

.especialidad-selector:focus-visible {
  outline: 2px solid var(--lc-accent);
  outline-offset: 2px;
}

/* Contenido del menú (q-menu se monta en <body>, por eso usa las variables
   globales --lexit-* y no las --lc-* de la página). */
.especialidades-lista {
  display: flex;
  flex-direction: column;
  min-width: 240px;
  padding: 6px;
}

.especialidades-lista-titulo {
  padding: 6px 10px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--lexit-texto-tenue);
}

.especialidad-opcion {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  column-gap: 12px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: 10px;
  background: none;
  color: var(--lexit-verde);
  font-family: 'Baskervville', 'EB Garamond', serif;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s, padding-left 0.2s ease;
  animation: opcionEntrada 0.3s ease both;
}

.especialidad-opcion:nth-child(3) { animation-delay: 0.03s; }
.especialidad-opcion:nth-child(4) { animation-delay: 0.06s; }
.especialidad-opcion:nth-child(5) { animation-delay: 0.09s; }
.especialidad-opcion:nth-child(6) { animation-delay: 0.12s; }

@keyframes opcionEntrada {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: none; }
}

.especialidad-opcion:hover {
  background: var(--lexit-marfil-suave);
  padding-left: 14px;
}

.especialidad-opcion:focus-visible {
  outline: 2px solid var(--lexit-verde);
  outline-offset: -2px;
}

.especialidad-opcion--activa {
  background: var(--lexit-marfil-suave);
}

.especialidad-opcion-nombre {
  grid-column: 1;
  font-size: 0.95rem;
  font-weight: 600;
}

.especialidad-opcion-desc {
  grid-column: 1;
  font-size: 0.76rem;
  color: var(--lexit-texto-tenue);
}

.especialidad-opcion-check {
  grid-column: 2;
  grid-row: 1 / span 2;
}

@media (max-width: 480px) {
  .especialidad-selector { font-size: 0.82rem; padding: 5px 9px; }
}
</style>

<style>
/* Caja del q-menu de especializaciones (montada en <body>, fuera del scope). */
.q-menu.especialidades-menu {
  border: 1px solid var(--lexit-marfil);
  border-radius: 14px;
  background: var(--lexit-blanco);
  box-shadow: 0 18px 40px -18px rgba(var(--lexit-verde-rgb), 0.35);
}
</style>
