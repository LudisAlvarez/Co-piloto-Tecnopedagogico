<script setup>
// Paso obligatorio: cada docente conecta su propia clave gratuita de Gemini (Google AI Studio)
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { st, conectarClave, desconectarClave } from '../store.js'
import { mensajeError, EN_HTML } from '../lib/backend.js'

const router = useRouter()
const toast = useToast()
const clave = ref(''), probando = ref(false), error = ref(''), confirmarQuitar = ref(false)
const primera = computed(() => !st.clave.tiene)
const pasos = [
  { title: 'Abra Google AI Studio', description: 'Entre a aistudio.google.com/apikey con su cuenta de Google (puede ser la personal o la institucional).', icon: 'i-lucide-external-link' },
  { title: 'Cree la clave', description: 'Pulse «Create API key» (Crear clave de API). Si le pide un proyecto, elija el que aparece o cree uno nuevo. No tiene costo.', icon: 'i-lucide-key-round' },
  { title: 'Cópiela y péguela aquí', description: 'Es un texto largo que empieza por «AIza». El co-piloto la prueba antes de guardarla.', icon: 'i-lucide-clipboard-paste' }
]
async function guardar() {
  if (!clave.value.trim() || probando.value) return
  probando.value = true; error.value = ''
  try {
    const r = await conectarClave(clave.value)
    clave.value = ''
    toast.add({ title: 'Clave conectada', description: `El co-piloto responderá con ${r.modelo}.`, color: 'success', icon: 'i-lucide-circle-check' })
    if (primera.value || router.currentRoute.value.name === 'clave') router.push({ name: 'mesa' })
  } catch (e) { error.value = e.texto && !e.detalle ? e.texto : mensajeError(e) }
  finally { probando.value = false }
}
async function quitar() { await desconectarClave(); confirmarQuitar.value = false; toast.add({ title: 'Clave eliminada', color: 'neutral' }) }
</script>

<template>
  <UDashboardPanel id="clave">
    <template #header>
      <UDashboardNavbar title="Clave de Gemini"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar>
    </template>
    <template #body>
      <div class="max-w-3xl w-full mx-auto flex flex-col gap-6">
        <section>
          <p class="eyebrow text-primary">{{ primera ? 'Último paso para empezar' : 'Su conexión con la IA' }}</p>
          <h1 class="font-display text-4xl mt-2">{{ primera ? 'Conecte su clave gratuita de Gemini' : 'Clave de Gemini' }}</h1>
          <p class="text-muted text-lg mt-2 max-w-[65ch]">El co-piloto usa Gemini, la inteligencia artificial de Google. Cada docente conecta su propia clave de la capa gratuita, así el servicio no tiene costo para nadie. Solo se hace una vez.</p>
        </section>

        <UCard v-if="st.clave.tiene" :ui="{ body: 'flex flex-wrap items-center justify-between gap-3 sm:p-5' }">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-xl grid place-items-center bg-success/15 text-success"><UIcon name="i-lucide-circle-check" class="size-5" /></div>
            <div><p class="font-semibold">Clave conectada</p><p class="text-sm text-muted">Termina en ••••{{ st.clave.final }}{{ st.clave.modelo ? ' · modelo ' + st.clave.modelo : '' }}</p></div>
          </div>
          <UButton label="Quitar clave" color="error" variant="ghost" icon="i-lucide-trash-2" @click="confirmarQuitar = true" />
        </UCard>

        <UCard>
          <template #header><h2 class="font-semibold text-lg">{{ st.clave.tiene ? 'Cambiar por otra clave' : 'Cómo obtenerla (2 minutos)' }}</h2></template>
          <UTimeline :items="pasos" :default-value="2" />
          <UButton class="mt-5" to="https://aistudio.google.com/apikey" target="_blank" rel="noopener" icon="i-lucide-external-link" label="Abrir Google AI Studio" color="neutral" variant="outline" />
          <p class="text-sm text-muted mt-2">Si el botón no abre, escriba en el navegador: <span class="font-mono">aistudio.google.com/apikey</span></p>
          <form class="flex flex-col gap-3 mt-6 pt-5 border-t border-default" @submit.prevent="guardar">
            <UFormField label="Pegue aquí su clave">
              <UInput v-model="clave" type="password" placeholder="AIza…" autocomplete="off" class="w-full" size="lg" icon="i-lucide-key-round" />
            </UFormField>
            <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-x" :description="error" />
            <div class="flex flex-wrap justify-end gap-2">
              <UButton v-if="!primera" label="Volver" color="neutral" variant="ghost" @click="router.back()" />
              <UButton type="submit" size="lg" icon="i-lucide-plug-zap" :label="probando ? 'Probando con Gemini…' : 'Probar y conectar'" :loading="probando" :disabled="!clave.trim()" />
            </div>
          </form>
        </UCard>

        <UAlert color="warning" variant="subtle" icon="i-lucide-shield-alert" title="Antes de usarla"
          :description="(EN_HTML ? 'En este archivo, la clave se guarda solo en este navegador. ' : 'La clave queda guardada en su cuenta y solo la usa el servidor del co-piloto; nadie más puede verla. ') + 'En la capa gratuita, Google puede usar lo que se envía para mejorar sus productos: no escriba nombres ni datos personales de estudiantes. Si se agota la cuota del día, espere o inténtelo más tarde.'" />

        <UModal v-model:open="confirmarQuitar" title="¿Quitar su clave de Gemini?" description="El co-piloto no podrá responder hasta que conecte otra.">
          <template #footer>
            <div class="flex justify-end gap-2 w-full">
              <UButton label="Cancelar" color="neutral" variant="outline" @click="confirmarQuitar = false" />
              <UButton label="Quitar" color="error" @click="quitar" />
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>
