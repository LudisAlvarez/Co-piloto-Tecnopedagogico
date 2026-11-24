<script setup>
// Los cuatro modelos del agente (Documentos 01, 02, 03 y 05) y cómo influyeron en esta planeación
import { computed } from 'vue'
import { st, decisionDe } from '../store.js'
import { FICHA } from '../lib/prompt.js'

const p = computed(() => st.actual)
const ficha = computed(() => FICHA.map(([k, l]) => ({ l, v: p.value?.cfg?.alumno?.[k] })).filter(x => x.v))
const docs = computed(() => [...new Set((p.value?.fuentes || []).map(f => f.doc))])
const decididas = computed(() => (p.value?.recomendaciones || []).filter(r => decisionDe(p.value, r.id)).length)
const resumen = k => p.value?.modelos?.[k]

const modelos = computed(() => [
  {
    k: 'tutor', n: 'Modelo del Tutor', doc: 'Documento 01', icon: 'i-lucide-handshake', color: 'bg-garzon-100 text-garzon-800',
    rol: 'Cómo acompaña: co-piloto que media con preguntas, alternativas graduadas y retroalimentación formativa. No impone ni evalúa.',
    datos: [
      `${p.value?.recomendaciones.length || 0} recomendaciones presentadas para su decisión`,
      `${decididas.value} con decisión suya en la bitácora`,
      'Cierra cada respuesta con una pregunta de validación docente'
    ]
  },
  {
    k: 'conocimiento', n: 'Modelo del Conocimiento', doc: 'Documento 02', icon: 'i-lucide-brain', color: 'bg-sol-100 text-sol-800',
    rol: 'Qué sabe: TPACK, ADDIE, metodologías activas y las cinco dimensiones de pertinencia, más el repositorio curricular.',
    datos: [
      `Estrategia: ${p.value?.cfg?.metodologia || '—'}`,
      `${p.value?.fuentes.length || 0} fragmentos consultados${docs.value.length ? ': ' + docs.value.join('; ') : ''}`,
      'Cada recomendación valorada en utilidad, coherencia, contextualización, usabilidad y viabilidad'
    ]
  },
  {
    k: 'alumno', n: 'Modelo del Alumno', doc: 'Documento 03', icon: 'i-lucide-users', color: 'bg-success/15 text-success',
    rol: 'A quién se dirige: la ficha del grupo que usted describió. Información grupal, sin datos personales ni diagnósticos.',
    datos: ficha.value.length ? ficha.value.map(x => `${x.l}: ${x.v}`) : [],
    vacio: 'La ficha del grupo está vacía. Las propuestas son generales; complétela al iniciar una nueva planeación para que el co-piloto ajuste la dificultad y las adaptaciones.'
  },
  {
    k: 'mundo', n: 'Modelo del Mundo', doc: 'Documento 05', icon: 'i-lucide-school', color: 'bg-elevated text-highlighted',
    rol: 'Dónde ocurre: condiciones reales de Los Garzones y de su aula. Toda propuesta debe ser ejecutable y tener plan B sin conexión.',
    datos: [
      `Conectividad: ${p.value?.cfg?.conectividad || '—'}`,
      `Recursos: ${p.value?.cfg?.recursos?.length ? p.value.cfg.recursos.join(', ') : 'ninguno marcado (solo recursos analógicos)'}`,
      `Duración: ${p.value?.cfg?.duracion || '—'}`
    ]
  }
])
</script>

<template>
  <div class="px-5 py-5 flex flex-col gap-4">
    <p class="text-sm text-muted max-w-[70ch]">El co-piloto combina cuatro modelos para cada propuesta. Aquí ve qué información aportó cada uno y, en la cita, cómo dice el co-piloto que lo usó en la propuesta actual{{ p?.modelos?.turno ? ` (turno ${p.modelos.turno})` : '' }}.</p>
    <div class="grid xl:grid-cols-2 gap-4">
      <UCard v-for="m in modelos" :key="m.k" :ui="{ body: 'flex flex-col gap-3 sm:p-5' }">
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-xl grid place-items-center shrink-0" :class="m.color"><UIcon :name="m.icon" class="size-5" /></div>
          <div><h3 class="font-semibold">{{ m.n }}</h3><p class="eyebrow text-muted">{{ m.doc }}</p></div>
        </div>
        <p class="text-sm text-muted">{{ m.rol }}</p>
        <ul v-if="m.datos.length" class="text-sm flex flex-col gap-1">
          <li v-for="d in m.datos" :key="d" class="flex gap-2"><UIcon name="i-lucide-dot" class="size-5 -mx-1 shrink-0 text-primary" /><span>{{ d }}</span></li>
        </ul>
        <UAlert v-else color="warning" variant="subtle" icon="i-lucide-circle-alert" :description="m.vacio" />
        <blockquote v-if="resumen(m.k)" class="text-sm border-l-2 border-primary pl-3 italic">
          {{ resumen(m.k) }}
          <span class="block not-italic eyebrow text-muted mt-1">Según el co-piloto</span>
        </blockquote>
      </UCard>
    </div>
  </div>
</template>
