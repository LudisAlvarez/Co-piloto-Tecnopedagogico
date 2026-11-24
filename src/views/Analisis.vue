<script setup>
import { ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { st, analizar, nuevaPlaneacion } from '../store.js'
import { mensajeError } from '../lib/backend.js'
import { leerArchivo } from '../lib/repositorio.js'
import { AREAS, GRADOS, md, uid } from '../lib/util.js'

const router = useRouter()
const toast = useToast()
const f = reactive({ asignatura: undefined, grado: undefined, plan: '' })
const archivo = ref(null), salida = ref(''), fuentes = ref([]), trabajando = ref(false)
let control = null

watch(archivo, async a => {
  if (!a) return
  try {
    const t = await leerArchivo(a)
    if (t.length < 100) throw 0
    f.plan = t.slice(0, 20000)
    toast.add({ title: 'Texto cargado', description: 'Revíselo y pulse «Analizar planeación».', icon: 'i-lucide-check' })
  } catch (e) { toast.add({ title: 'No se pudo leer el archivo', description: 'Pegue el texto directamente.', color: 'warning' }) }
})

async function correr() {
  if (!f.plan.trim() || st.ocupado) return
  st.ocupado = trabajando.value = true; salida.value = ''; fuentes.value = []; control = new AbortController()
  try {
    const r = await analizar({ asignatura: f.asignatura || '', grado: f.grado || '', plan: f.plan.trim() }, t => { salida.value = t }, control.signal)
    salida.value = r.texto; fuentes.value = r.fuentes
  } catch (e) {
    toast.add({ title: control.signal.aborted ? 'Análisis detenido' : 'No se pudo completar el análisis', description: control.signal.aborted ? '' : mensajeError(e), color: control.signal.aborted ? 'neutral' : 'error' })
  } finally { st.ocupado = trabajando.value = false }
}
function mejorar() {
  const plan = f.plan.trim()
  nuevaPlaneacion({
    asignatura: f.asignatura || '(no indicada)', grado: f.grado || '(no indicado)',
    tema: (plan.split('\n')[0] || 'Planeación revisada').replace(/^#+\s*/, '').slice(0, 80), objetivo: '',
    duracion: '(según la planeación)', metodologia: 'Ninguna en particular', conectividad: '(no indicada)', recursos: [], grupo: ''
  }, { plan, chat: [{ id: uid(), role: 'assistant', text: 'Cargué su planeación en el lienzo. Dígame qué quiere mejorar y la ajustamos juntos.' }] })
  router.push({ name: 'copiloto' })
}
</script>

<template>
  <UDashboardPanel id="analisis">
    <template #header>
      <UDashboardNavbar title="Análisis curricular"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar>
    </template>
    <template #body>
      <div class="max-w-5xl w-full mx-auto flex flex-col gap-6">
        <section>
          <h1 class="font-display text-4xl">Una segunda mirada a su planeación</h1>
          <p class="text-muted text-lg mt-2 max-w-[65ch]">Pegue o suba una planeación que ya tiene. El co-piloto señala fortalezas, vacíos y mejoras posibles. No es una calificación.</p>
        </section>
        <UCard>
          <form class="flex flex-col gap-4" @submit.prevent="correr">
            <div class="grid md:grid-cols-3 gap-4">
              <UFormField label="Asignatura"><USelect v-model="f.asignatura" :items="AREAS" placeholder="Seleccione…" class="w-full" /></UFormField>
              <UFormField label="Grado"><USelect v-model="f.grado" :items="GRADOS" placeholder="Seleccione…" class="w-full" /></UFormField>
              <UFormField label="Cargar desde archivo" hint="Opcional"><UFileUpload v-model="archivo" accept=".pdf,.docx,.txt,.md" :dropzone="false" variant="button" label="Elegir archivo" class="w-full" /></UFormField>
            </div>
            <UFormField label="Planeación" required>
              <UTextarea v-model="f.plan" :rows="10" autoresize :maxrows="22" class="w-full" placeholder="Pegue aquí el texto de su planeación" />
            </UFormField>
            <div class="flex justify-end gap-2">
              <UButton v-if="trabajando" label="Detener" color="neutral" variant="outline" icon="i-lucide-square" @click="control?.abort()" />
              <UButton type="submit" size="lg" icon="i-lucide-scan-search" label="Analizar planeación" :loading="trabajando" :disabled="!f.plan.trim() || (st.ocupado && !trabajando)" />
            </div>
          </form>
        </UCard>
        <UCard v-if="salida || trabajando">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="eyebrow text-primary">Retroalimentación del co-piloto</p>
              <UButton v-if="salida && !trabajando" icon="i-lucide-messages-square" label="Mejorarla en co-pilotaje" @click="mejorar" />
            </div>
          </template>
          <div v-if="salida" class="plan-doc" v-html="md(salida)" />
          <div v-else class="flex items-center gap-2 text-muted"><UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" /> Leyendo su planeación…</div>
          <template #footer>
            <p class="text-xs font-mono text-muted">{{ fuentes.length ? 'Consultó: ' + fuentes.join(' · ') + '. ' : '' }}Retroalimentación generada con IA. Úsela como insumo; la decisión es suya.</p>
          </template>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
