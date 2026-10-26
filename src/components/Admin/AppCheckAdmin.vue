<template>
  <div class="section-block q-mb-lg appcheck-admin">
    <div class="actions-bar q-mb-sm">
      <span class="section-label">Seguridad · App Check</span>
      <q-btn flat dense no-caps color="accent" icon="refresh" label="Actualizar" :loading="cargando" @click="leer" />
    </div>
    <p class="appcheck-ayuda">
      Comprueba que las llamadas a las funciones salgan de LexIT y no de un script que gaste la cuota de Gemini y Pinecone.
      En <strong>monitor</strong> solo se cuenta; en <strong>exigir</strong> se rechaza lo que no traiga un token válido.
      Pasa a exigir cuando casi todas las llamadas de los últimos días lleguen válidas. El cambio se aplica en un minuto, sin deploy.
    </p>

    <p v-if="error" class="appcheck-error">{{ error }}</p>

    <template v-if="estado">
      <div class="appcheck-estado q-mb-sm">
        <span>Modo: <strong>{{ estado.modo === 'exigir' ? 'Exigir' : 'Monitor' }}</strong></span>
        <span>Tu sesión: <strong :class="estado.tokenPropio === 'validos' ? 'appcheck-ok' : 'appcheck-mal'">{{ ETIQUETA_TOKEN[estado.tokenPropio] }}</strong></span>
      </div>

      <div v-if="estado.dias.length" class="appcheck-tabla-wrap q-mb-sm">
        <table class="appcheck-tabla">
          <thead><tr><th>Día</th><th>Válidas</th><th>Sin token</th><th>Inválidas</th><th>% válidas</th></tr></thead>
          <tbody>
            <tr v-for="d in estado.dias" :key="d.fecha">
              <td>{{ d.fecha }}</td>
              <td>{{ d.validos }}</td>
              <td>{{ d.sinToken }}</td>
              <td>{{ d.invalidos }}</td>
              <td>{{ porcentaje(d) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="appcheck-ayuda">Todavía no hay llamadas contadas.</p>

      <div class="row q-gutter-sm justify-end">
        <q-btn
          v-if="estado.modo === 'monitor'"
          unelevated no-caps color="accent" icon="shield" label="Exigir App Check"
          :loading="cambiando" :disable="estado.tokenPropio !== 'validos'" @click="cambiar('exigir')"
        />
        <q-btn
          v-else
          outline no-caps color="accent" icon="visibility" label="Volver a solo monitorear"
          :loading="cambiando" @click="cambiar('monitor')"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// =========================
// APP CHECK (Admin): conteos por día y modo monitor/exigir
// (Cloud Function appCheckAdmin, ver functions/src/appCheck.ts)
// =========================
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { cambiarModoAppCheck, leerEstadoAppCheck, type EstadoAppCheck, type ModoAppCheck } from '../../services/appCheckService'

const $q = useQuasar()
const estado = ref<EstadoAppCheck | null>(null)
const cargando = ref(false)
const cambiando = ref(false)
const error = ref('')

const ETIQUETA_TOKEN: Record<EstadoAppCheck['tokenPropio'], string> = {
  validos: 'token válido',
  sinToken: 'sin token (falta configurar la clave de reCAPTCHA)',
  invalidos: 'token inválido'
}

function porcentaje(d: EstadoAppCheck['dias'][number]): string {
  const total = d.validos + d.sinToken + d.invalidos
  return total ? `${Math.round((d.validos / total) * 100)} %` : '—'
}

async function leer() {
  cargando.value = true
  error.value = ''
  try {
    estado.value = await leerEstadoAppCheck()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo leer el estado'
  } finally {
    cargando.value = false
  }
}

function cambiar(modo: ModoAppCheck) {
  const aplicar = async () => {
    cambiando.value = true
    error.value = ''
    try {
      estado.value = await cambiarModoAppCheck(modo)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'No se pudo cambiar el modo'
    } finally {
      cambiando.value = false
    }
  }
  if (modo === 'monitor') {
    void aplicar()
    return
  }
  $q.dialog({
    title: 'Exigir App Check',
    message: 'Desde ahora se rechazará toda llamada sin un token válido de App Check (por ejemplo, scripts o versiones viejas de la página abiertas). Si algo falla, vuelve aquí a "solo monitorear".',
    cancel: { label: 'Cancelar', flat: true, noCaps: true },
    ok: { label: 'Exigir', color: 'accent', noCaps: true, unelevated: true },
    persistent: true
  }).onOk(() => { void aplicar() })
}

onMounted(() => { void leer() })
</script>

<style scoped>
.appcheck-admin { color: var(--ink, #1a1f2b); }
.appcheck-ayuda { margin: 0 0 10px; font-size: 0.86rem; color: #5b6475; }
.appcheck-error { margin: 0 0 10px; font-size: 0.86rem; color: #b42318; }
.appcheck-estado { display: flex; flex-wrap: wrap; gap: 6px 24px; font-size: 0.9rem; }
.appcheck-ok { color: #2f6b3a; }
.appcheck-mal { color: #b42318; }
.appcheck-tabla-wrap { overflow-x: auto; }
.appcheck-tabla { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.appcheck-tabla th { text-align: left; padding: 6px 8px; border-bottom: 1px solid #1a1f2b; color: #5b6475; font-weight: 600; white-space: nowrap; }
.appcheck-tabla td { padding: 6px 8px; border-bottom: 1px solid #e4e7ec; font-variant-numeric: tabular-nums; }
</style>
