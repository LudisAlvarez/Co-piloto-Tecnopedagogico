<script setup>
import { reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { st, estadisticas, nuevaPlaneacion, enviar, abrir } from '../store.js'
import { AREAS, GRADOS, DURACIONES, RECURSOS, CONECTIVIDAD, FAMILIARIDAD, tituloDe, fecha } from '../lib/util.js'
import { METODOLOGIAS } from '../lib/repositorio.js'

const router = useRouter(), route = useRoute()
const f = reactive({
  asignatura: undefined, grado: undefined, tema: '', objetivo: '',
  duracion: 'Una clase de 60 minutos',
  metodologia: route.query.estrategia || METODOLOGIAS[0],
  conectividad: 'Internet intermitente', recursos: [], grupo: '',
  alumno: { estudiantes: '', previos: '', capacidades: '', dificultades: '', necesidades: '', digital: undefined, evidencias: '' }
})
const fichaLlena = computed(() => Object.values(f.alumno).filter(v => v && String(v).trim()).length)
const primerNombre = computed(() => (st.usuario?.nombre || '').split(' ')[0])
const tarjetas = computed(() => [
  { n: estadisticas.value.iniciadas, t: 'Planeaciones iniciadas', i: 'i-lucide-sparkles', c: 'text-primary bg-primary/10' },
  { n: estadisticas.value.conBorrador, t: 'Con borrador completo', i: 'i-lucide-file-check-2', c: 'text-sol-700 bg-sol-100' },
  { n: estadisticas.value.llevadas, t: 'Llevadas al aula', i: 'i-lucide-school', c: 'text-success bg-success/10' }
])

function iniciar() {
  if (!f.asignatura || !f.grado || !f.tema.trim()) return
  nuevaPlaneacion({ ...f, tema: f.tema.trim(), objetivo: f.objetivo.trim(), grupo: '', recursos: [...f.recursos], alumno: Object.fromEntries(Object.entries(f.alumno).map(([k, v]) => [k, String(v || '').trim()]).filter(([, v]) => v)) })
  router.push({ name: 'copiloto' })
  enviar('Genere la propuesta inicial de planeación con las coordenadas que le di.')
}
function retomar(id) { abrir(id); router.push({ name: 'copiloto' }) }
</script>

<template>
  <UDashboardPanel id="mesa">
    <template #header>
      <UDashboardNavbar title="Mesa de trabajo"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar>
    </template>
    <template #body>
      <div class="max-w-5xl w-full mx-auto flex flex-col gap-6">
        <section>
          <p class="eyebrow text-primary">{{ primerNombre ? `Hola, ${primerNombre} · ` : '' }}I.E. Los Garzones</p>
          <h1 class="font-display text-4xl mt-2">Mesa de co-diseño tecnopedagógico</h1>
          <p class="text-muted text-lg mt-2 max-w-[65ch]">Defina las coordenadas de su clase y el co-piloto le propone un borrador. Usted decide qué se acepta, qué se ajusta y qué se descarta.</p>
          <div class="grid sm:grid-cols-3 gap-3 mt-5">
            <UCard v-for="t in tarjetas" :key="t.t" variant="subtle" :ui="{ body: 'flex items-center gap-3.5 sm:p-4' }">
              <div class="size-11 rounded-xl grid place-items-center shrink-0" :class="t.c"><UIcon :name="t.i" class="size-5" /></div>
              <div><p class="font-display text-3xl leading-none tabular-nums">{{ t.n }}</p><p class="text-sm text-muted mt-1">{{ t.t }}</p></div>
            </UCard>
          </div>
        </section>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2"><UIcon name="i-lucide-map-pin" class="size-5 text-primary" /><h2 class="font-semibold text-lg">Coordenadas de la planeación</h2></div>
          </template>
          <form class="flex flex-col gap-5" @submit.prevent="iniciar">
            <div class="grid md:grid-cols-3 gap-4">
              <UFormField label="1. Asignatura" required><USelect v-model="f.asignatura" :items="AREAS" placeholder="Seleccione…" class="w-full" /></UFormField>
              <UFormField label="2. Grado" required><USelect v-model="f.grado" :items="GRADOS" placeholder="Seleccione…" class="w-full" /></UFormField>
              <UFormField label="3. Tema central" required><UInput v-model="f.tema" placeholder="Ej. El ciclo del agua" required class="w-full" /></UFormField>
            </div>
            <UFormField label="Objetivo de aprendizaje" hint="Opcional" help="Si lo deja vacío, el co-piloto propone uno y lo marca para que usted lo valide.">
              <UInput v-model="f.objetivo" class="w-full" />
            </UFormField>
            <div class="grid md:grid-cols-2 gap-4">
              <UFormField label="Duración"><USelect v-model="f.duracion" :items="DURACIONES" class="w-full" /></UFormField>
              <UFormField label="Metodología o estrategia"><USelectMenu v-model="f.metodologia" :items="METODOLOGIAS" class="w-full" :search-input="{ placeholder: 'Buscar estrategia…' }" /></UFormField>
            </div>
            <UFormField label="Conectividad en el aula">
              <URadioGroup v-model="f.conectividad" :items="CONECTIVIDAD" variant="card" orientation="horizontal" indicator="end" :ui="{ fieldset: 'grid sm:grid-cols-3 gap-2', item: 'w-full' }" />
            </UFormField>
            <UFormField label="Recursos disponibles para esta clase" help="El co-piloto solo propone lo que usted marque.">
              <UCheckboxGroup v-model="f.recursos" :items="RECURSOS" variant="card" orientation="horizontal" :ui="{ fieldset: 'flex flex-wrap gap-2' }" />
            </UFormField>
            <div class="rounded-xl border border-default bg-elevated/40 p-4 sm:p-5 flex flex-col gap-4">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p class="eyebrow text-primary">Modelo del Alumno</p>
                  <h3 class="font-semibold text-base mt-0.5">Ficha del grupo</h3>
                  <p class="text-sm text-muted max-w-[62ch]">Con esto el co-piloto ajusta la dificultad, anticipa barreras y propone adaptaciones. Describa al grupo en general: no escriba nombres ni datos personales de estudiantes.</p>
                </div>
                <UBadge :color="fichaLlena >= 3 ? 'success' : fichaLlena ? 'warning' : 'neutral'" variant="subtle" :label="`${fichaLlena} de 7 campos`" />
              </div>
              <div class="grid md:grid-cols-2 gap-4">
                <UFormField label="Número aproximado de estudiantes"><UInput v-model="f.alumno.estudiantes" inputmode="numeric" placeholder="Ej. 35" class="w-full" /></UFormField>
                <UFormField label="Familiaridad con herramientas digitales"><USelect v-model="f.alumno.digital" :items="FAMILIARIDAD" placeholder="Seleccione…" class="w-full" /></UFormField>
                <UFormField label="Conocimientos previos"><UTextarea v-model="f.alumno.previos" :rows="2" autoresize class="w-full" placeholder="Qué saben ya sobre el tema" /></UFormField>
                <UFormField label="Capacidades y destrezas"><UTextarea v-model="f.alumno.capacidades" :rows="2" autoresize class="w-full" placeholder="Ej. trabajan bien en equipo, les gusta dibujar" /></UFormField>
                <UFormField label="Dificultades observadas"><UTextarea v-model="f.alumno.dificultades" :rows="2" autoresize class="w-full" placeholder="Ej. comprensión lectora, se distraen en clases largas" /></UFormField>
                <UFormField label="Necesidades de apoyo diferenciado"><UTextarea v-model="f.alumno.necesidades" :rows="2" autoresize class="w-full" placeholder="Ej. algunos necesitan instrucciones paso a paso" /></UFormField>
              </div>
              <UFormField label="Evidencias de aprendizaje que planea recoger"><UInput v-model="f.alumno.evidencias" class="w-full" placeholder="Ej. maqueta, bitácora, exposición" /></UFormField>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-default">
              <span class="text-sm text-muted">El borrador se abre en el lienzo de co-pilotaje.</span>
              <UButton type="submit" size="xl" trailing-icon="i-lucide-arrow-right" label="Iniciar planeación" :disabled="!f.asignatura || !f.grado || !f.tema.trim() || st.ocupado" />
            </div>
          </form>
        </UCard>

        <UCard>
          <template #header><h2 class="font-semibold text-lg">Borradores recientes</h2></template>
          <UEmpty v-if="!st.planes.length" icon="i-lucide-file-plus-2" title="Aún no hay planeaciones" description="Complete las coordenadas y pulse «Iniciar planeación»." variant="naked" />
          <div v-else class="flex flex-col gap-2">
            <div v-for="p in st.planes.slice(0, 3)" :key="p.id" class="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-elevated/60 px-4 py-3">
              <div class="min-w-0">
                <p class="font-semibold truncate">{{ tituloDe(p) }}</p>
                <p class="text-sm text-muted">{{ p.cfg.asignatura }} · {{ p.cfg.grado }} · {{ fecha(p.updated) }}</p>
              </div>
              <div class="flex items-center gap-2">
                <UBadge v-if="p.exportada" color="success" variant="subtle" label="Llevada al aula" />
                <UBadge v-else-if="p.plan" color="primary" variant="subtle" label="Borrador" />
                <UButton color="neutral" variant="outline" label="Retomar" @click="retomar(p.id)" />
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
