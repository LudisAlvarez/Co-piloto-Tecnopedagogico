<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { st, enviar, detener, cambiarPlan, versionAnterior, normalizar, decisionDe, pendientesDeAplicar } from '../store.js'
import { md, separar, conMarcas } from '../lib/util.js'
import PanelRecomendaciones from '../components/PanelRecomendaciones.vue'
import PanelBitacora from '../components/PanelBitacora.vue'
import PanelFuentes from '../components/PanelFuentes.vue'
import PanelModelos from '../components/PanelModelos.vue'
import { leerArchivo } from '../lib/repositorio.js'

const router = useRouter()
const p = computed(() => normalizar(st.actual))
const pestana = ref('plan'), fuenteAbierta = ref('')
const entrada = ref('')
const editando = ref(false), textoEditado = ref('')
const vistaMovil = ref('chat')
const adjuntos = ref([]), leyendo = ref(false), selector = ref(null)
const toast = useToast()

const rapidos = [
  { label: 'Simplificar', icon: 'i-lucide-wand-sparkles', q: 'Simplifica la planeación: menos pasos y lenguaje más directo, sin cambiar el objetivo.' },
  { label: 'Versión sin internet', icon: 'i-lucide-wifi-off', q: 'Haz una versión sin internet: reemplaza cada actividad digital por una alternativa analógica equivalente.' },
  { label: 'Agregar rúbrica', icon: 'i-lucide-list-checks', q: 'Agrega una rúbrica de evaluación con tres niveles de desempeño.' },
  { label: 'Ajustar a 45 min', icon: 'i-lucide-timer', q: 'Ajusta toda la secuencia a 45 minutos.' },
  { label: 'Otra estrategia', icon: 'i-lucide-shuffle', q: 'Sugiere otra metodología o estrategia didáctica pertinente para este objetivo y explica por qué.' }
]

const vivo = computed(() => separar(st.borrador))
const mensajes = computed(() => {
  if (!p.value) return []
  const m = p.value.chat.map(x => ({ id: x.id, role: x.role === 'user' ? 'user' : 'assistant', parts: [{ type: 'text', text: x.text }], metadata: { nota: x.role === 'nota', fuentes: x.fuentes, archivos: x.archivos, recos: x.recos } }))
  if (st.ocupado && vivo.value.msg) m.push({ id: 'vivo', role: 'assistant', parts: [{ type: 'text', text: vivo.value.msg }], metadata: {} })
  return m
})
const estado = computed(() => st.ocupado ? (vivo.value.msg ? 'streaming' : 'submitted') : 'ready')
const planVisible = computed(() => (st.ocupado && vivo.value.plan) ? vivo.value.plan : p.value?.plan || '')

const pasos = computed(() => {
  const a = p.value
  return [
    { title: 'Coordenadas', icon: 'i-lucide-map-pin', hecho: !!a },
    { title: 'Borrador', icon: 'i-lucide-file-text', hecho: !!a?.plan },
    { title: 'Decisiones', icon: 'i-lucide-notebook-pen', hecho: !!a?.recomendaciones?.length && a.recomendaciones.every(r => decisionDe(a, r.id)) },
    { title: 'Lista para el aula', icon: 'i-lucide-school', hecho: !!a?.exportada }
  ]
})
const pasoActual = computed(() => { const i = pasos.value.findIndex(x => !x.hecho); return i < 0 ? pasos.value.length - 1 : i })
const fases = ['Análisis', 'Diseño', 'Desarrollo', 'Implementación', 'Evaluación']
const sinDecidir = computed(() => (p.value?.recomendaciones || []).filter(r => !decisionDe(p.value, r.id)).length + pendientesDeAplicar(p.value).length)
const pestanas = computed(() => [
  { label: 'Planeación', value: 'plan', icon: 'i-lucide-file-text' },
  { label: 'Recomendaciones', value: 'reco', icon: 'i-lucide-list-checks', badge: sinDecidir.value ? { label: String(sinDecidir.value), color: 'secondary', variant: 'solid' } : undefined },
  { label: 'Bitácora', value: 'bitacora', icon: 'i-lucide-notebook-pen', badge: p.value?.bitacora.length ? { label: String(p.value.bitacora.length), color: 'neutral', variant: 'subtle' } : undefined },
  { label: 'Fuentes', value: 'fuentes', icon: 'i-lucide-library', badge: p.value?.fuentes.length ? { label: String(p.value.fuentes.length), color: 'neutral', variant: 'subtle' } : undefined },
  { label: 'Modelos', value: 'modelos', icon: 'i-lucide-boxes' }
])
const lienzo = ref(null)
async function irA(tab, id) {
  pestana.value = tab; vistaMovil.value = 'lienzo'
  if (tab === 'fuentes') fuenteAbierta.value = id
  await nextTick()
  const el = document.getElementById((tab === 'reco' ? 'rec-' : 'fuente-') + id)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
function clicEnPlan(e) {
  const ref = e.target.closest?.('[data-ref]')?.dataset.ref
  if (ref) irA(ref[0] === 'R' ? 'reco' : 'fuentes', ref)
}

function mandar(t) {
  if (st.ocupado || leyendo.value || (!t?.trim() && !adjuntos.value.length)) return
  enviar(t, adjuntos.value); entrada.value = ''; adjuntos.value = []
}
async function adjuntar(e) {
  const lista = [...(e.target.files || [])]; e.target.value = ''
  for (const f of lista) {
    if (adjuntos.value.length >= 3) { toast.add({ title: 'Máximo 3 archivos por mensaje', color: 'warning' }); break }
    if (f.size > 15 * 1024 * 1024) { toast.add({ title: f.name + ' es muy grande', description: 'El límite es 15 MB.', color: 'warning' }); continue }
    leyendo.value = true
    try {
      const texto = await leerArchivo(f)
      if (texto.length < 30) throw 0
      adjuntos.value.push({ nombre: f.name, texto: texto.slice(0, 20000), recortado: texto.length > 20000 })
    } catch (_) {
      toast.add({ title: 'No se pudo leer ' + f.name, description: 'Use PDF con texto seleccionable, Word (.docx) o texto. Los PDF escaneados no se pueden leer.', color: 'warning', icon: 'i-lucide-file-x' })
    } finally { leyendo.value = false }
  }
  if (adjuntos.value.some(a => a.recortado)) toast.add({ title: 'Archivo largo', description: 'El co-piloto leerá las primeras 7 páginas aproximadamente. Para documentos completos, súbalos al Repositorio curricular.', color: 'neutral', icon: 'i-lucide-info' })
}
function alternarEdicion() {
  if (!editando.value) { textoEditado.value = p.value.plan; editando.value = true; return }
  cambiarPlan(textoEditado.value); editando.value = false
  toast.add({ title: 'Cambios guardados', icon: 'i-lucide-check', color: 'success' })
}
function deshacer() {
  if (versionAnterior()) toast.add({ title: 'Se restauró la versión anterior', icon: 'i-lucide-undo-2' })
  else toast.add({ title: 'No hay una versión anterior', color: 'neutral' })
}
watch(() => st.ocupado, (o, antes) => { if (antes && !o && p.value?.plan && window.matchMedia('(max-width: 1023px)').matches) vistaMovil.value = 'lienzo' })
watch(() => st.ocupado, o => { if (o) pestana.value = 'plan' })
</script>

<template>
  <UDashboardPanel id="copiloto" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <UDashboardNavbar title="Co-pilotaje">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <span v-if="st.estadoGuardado" class="hidden sm:inline text-xs text-muted font-mono">{{ st.estadoGuardado }}</span>
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar v-if="p">
        <UStepper :model-value="pasoActual" :items="pasos" size="xs" disabled class="w-full max-w-2xl py-1" :ui="{ trigger: 'group-data-[state=completed]:bg-success group-data-[state=completed]:text-white' }" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <UEmpty v-if="!p" class="m-auto" icon="i-lucide-messages-square" title="Aún no hay una planeación abierta"
        description="Defina las coordenadas en la Mesa de trabajo o retome una de sus planeaciones."
        :actions="[{ label: 'Ir a la Mesa de trabajo', icon: 'i-lucide-arrow-left', onClick: () => router.push({ name: 'mesa' }) }, { label: 'Mis planeaciones', color: 'neutral', variant: 'outline', onClick: () => router.push({ name: 'planeaciones' }) }]" />

      <template v-else>
        <UTabs v-model="vistaMovil" :items="[{ label: 'Conversación', value: 'chat', icon: 'i-lucide-message-circle' }, { label: 'Lienzo', value: 'lienzo', icon: 'i-lucide-file-text' }]" :content="false" class="lg:hidden px-4 pt-3" />
        <div class="grid lg:grid-cols-[minmax(320px,400px)_1fr] min-h-0 flex-1">
          <!-- Conversación -->
          <section class="flex flex-col min-h-0 border-r border-default" :class="vistaMovil === 'chat' ? 'flex' : 'max-lg:hidden'">
            <div class="flex-1 overflow-y-auto px-4 py-4">
              <UChatMessages :messages="mensajes" :status="estado" :should-auto-scroll="true" :assistant="{ variant: 'outline', icon: 'i-lucide-compass' }" :user="{ variant: 'soft' }" compact>
                <template #content="{ message }">
                  <UAlert v-if="message.metadata?.nota" color="warning" variant="subtle" :description="message.parts[0].text" icon="i-lucide-triangle-alert" />
                  <template v-else>
                    <div v-if="message.role === 'assistant'" class="chat-md text-sm" v-html="md(message.parts[0].text)" />
                    <template v-else>
                      <div v-if="message.metadata?.archivos?.length" class="flex flex-wrap gap-1 mb-1.5">
                        <UBadge v-for="a in message.metadata.archivos" :key="a" :label="a" icon="i-lucide-paperclip" color="neutral" variant="outline" size="sm" class="max-w-full truncate" />
                      </div>
                      <p class="text-sm whitespace-pre-wrap">{{ message.parts[0].text }}</p>
                    </template>
                    <div v-if="message.metadata?.recos?.length" class="mt-2 pt-2 border-t border-default flex flex-wrap items-center gap-1.5">
                      <span class="text-xs text-muted">Para su decisión:</span>
                      <button v-for="r in message.metadata.recos" :key="r" type="button" class="marca marca-r" @click="irA('reco', r)">{{ r }}</button>
                    </div>
                    <p v-if="message.metadata?.fuentes?.length" class="mt-2 pt-2 border-t border-default text-[11px] font-mono text-muted leading-snug">
                      Consultó: {{ message.metadata.fuentes.join(' · ') }}
                    </p>
                  </template>
                </template>
                <template #indicator>
                  <div class="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary">
                    <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
                    Consultando referentes y preparando la propuesta…
                  </div>
                </template>
              </UChatMessages>
            </div>
            <div class="border-t border-default p-3 flex flex-col gap-2.5">
              <div class="flex flex-wrap gap-1.5">
                <UButton v-for="r in rapidos" :key="r.label" :label="r.label" :icon="r.icon" size="xs" color="neutral" variant="subtle" :disabled="st.ocupado" @click="mandar(r.q)" />
              </div>
              <input ref="selector" type="file" accept=".pdf,.docx,.txt,.md" multiple class="hidden" aria-label="Adjuntar archivo" @change="adjuntar">
              <UChatPrompt v-model="entrada" :placeholder="adjuntos.length ? '¿Qué quiere hacer con el archivo? Ej.: «Mejora esta planeación»' : 'Escriba un ajuste o una duda. Ej.: «Hoy no tengo video beam»'" variant="subtle" :rows="2" @submit="mandar(entrada)">
                <template v-if="adjuntos.length || leyendo" #header>
                  <div class="flex flex-wrap gap-1.5">
                    <UBadge v-for="(a, i) in adjuntos" :key="a.nombre + i" color="primary" variant="subtle" icon="i-lucide-file-text" class="max-w-full">
                      <span class="truncate max-w-48">{{ a.nombre }}</span>
                      <UButton icon="i-lucide-x" size="xs" color="primary" variant="link" class="p-0" :aria-label="'Quitar ' + a.nombre" @click="adjuntos.splice(i, 1)" />
                    </UBadge>
                    <span v-if="leyendo" class="flex items-center gap-1.5 text-xs text-muted"><UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" /> Leyendo archivo…</span>
                  </div>
                </template>
                <template #footer>
                  <UTooltip text="Adjuntar PDF, Word o texto">
                    <UButton icon="i-lucide-paperclip" color="neutral" variant="ghost" size="sm" aria-label="Adjuntar archivo" :disabled="st.ocupado || adjuntos.length >= 3" @click="selector?.click()" />
                  </UTooltip>
                  <UChatPromptSubmit :status="estado" :disabled="leyendo" @stop="detener" />
                </template>
              </UChatPrompt>
            </div>
          </section>

          <!-- Lienzo -->
          <section ref="lienzo" class="min-w-0 overflow-y-auto" :class="vistaMovil === 'lienzo' ? 'block' : 'max-lg:hidden'">
            <div class="sticky top-0 z-10 bg-default/95 backdrop-blur border-b border-default px-5 pt-3 flex flex-col gap-1">
              <UTabs v-model="pestana" :items="pestanas" :content="false" variant="link" size="sm" class="-mb-px overflow-x-auto" />
            </div>
            <div v-show="pestana === 'plan'">
            <div class="border-b border-default px-5 py-3 flex flex-wrap items-center justify-between gap-2">
              <p class="eyebrow text-primary">Lienzo de planeación ADDIE</p>
              <div class="flex flex-wrap gap-2">
                <UButton :icon="editando ? 'i-lucide-check' : 'i-lucide-pencil'" :label="editando ? 'Guardar cambios' : 'Editar'" color="neutral" variant="outline" :disabled="st.ocupado || !p.plan" @click="alternarEdicion" />
                <UButton icon="i-lucide-undo-2" label="Versión anterior" color="neutral" variant="outline" :disabled="st.ocupado || !p.versiones.length" @click="deshacer" />
                <UButton icon="i-lucide-download" label="Exportar" :disabled="!p.plan" @click="router.push({ name: 'exportar' })" />
              </div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 border-b border-default bg-elevated/40">
              <div v-for="[k, v] in [['Asignatura', p.cfg.asignatura], ['Grado', p.cfg.grado], ['Duración', p.cfg.duracion], ['Conectividad', p.cfg.conectividad]]" :key="k" class="px-5 py-2.5 border-r border-default last:border-r-0">
                <p class="eyebrow text-muted">{{ k }}</p><p class="font-semibold text-sm">{{ v }}</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-1.5 px-5 py-3 border-b border-default">
              <UBadge v-for="f in fases" :key="f" :label="f" :color="planVisible.includes(f) ? 'primary' : 'neutral'" :variant="planVisible.includes(f) ? 'subtle' : 'outline'" class="font-mono uppercase tracking-wide text-[10.5px]" />
            </div>
            <UTextarea v-if="editando" v-model="textoEditado" autoresize :rows="24" class="w-full p-4" :ui="{ base: 'font-mono text-sm' }" aria-label="Editar planeación" />
            <div v-else-if="planVisible" class="plan-doc px-6 py-6" @click="clicEnPlan" v-html="conMarcas(md(planVisible))" />
            <UEmpty v-else class="py-16" icon="i-lucide-file-pen-line" title="El borrador aparecerá aquí" description="Mientras el co-piloto escribe, verá la planeación tomar forma." variant="naked" />
            <p class="px-6 pb-6 text-xs font-mono text-muted">Borrador co-diseñado con IA. Las marcas <span class="marca marca-r">R1</span> llevan a la recomendación y <span class="marca marca-f">F1</span> a la fuente; no aparecen al exportar.</p>
            </div>
            <PanelRecomendaciones v-if="pestana === 'reco'" @fuente="id => irA('fuentes', id)" />
            <PanelBitacora v-else-if="pestana === 'bitacora'" @recomendacion="id => irA('reco', id)" />
            <PanelFuentes v-else-if="pestana === 'fuentes'" :abierta="fuenteAbierta" @recomendacion="id => irA('reco', id)" />
            <PanelModelos v-else-if="pestana === 'modelos'" />
          </section>
        </div>
      </template>
    </template>
  </UDashboardPanel>
</template>
