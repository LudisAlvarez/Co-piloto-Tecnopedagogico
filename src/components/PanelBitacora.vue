<script setup>
// Bitácora de decisiones del docente sobre las recomendaciones del co-piloto
import { computed, ref } from 'vue'
import { st } from '../store.js'
import { api } from '../lib/backend.js'
import { bitacoraXlsx } from '../lib/bitacora.js'
import { nombreArchivo } from '../lib/exportar.js'
import { tituloDe } from '../lib/util.js'

const emit = defineEmits(['recomendacion'])
const toast = useToast()
const p = computed(() => st.actual)
const filtro = ref('todas')
const lista = computed(() => [...(p.value?.bitacora || [])].reverse().filter(d => filtro.value === 'todas' || d.decision === filtro.value))
const cuenta = k => (p.value?.bitacora || []).filter(d => d.decision === k).length
const ETQ = { aceptada: { label: 'Aceptada', color: 'success', icon: 'i-lucide-check' }, modificada: { label: 'Modificada', color: 'warning', icon: 'i-lucide-pencil' }, rechazada: { label: 'Rechazada', color: 'error', icon: 'i-lucide-x' } }
const fechaHora = iso => new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const exportando = ref(false)
async function exportar() {
  exportando.value = true
  try {
    await api.descargar(nombreArchivo('Bitacora ' + tituloDe(p.value), 'xlsx'), await bitacoraXlsx([p.value], st.usuario?.nombre || st.usuario?.email || ''))
    toast.add({ title: 'Bitácora descargada', description: 'Incluye decisiones, recomendaciones y fuentes consultadas.', color: 'success', icon: 'i-lucide-check' })
  } catch (e) { toast.add({ title: e?.code === 'declined' ? 'Descarga cancelada' : 'No se pudo descargar la bitácora', color: e?.code === 'declined' ? 'neutral' : 'error' }) }
  finally { exportando.value = false }
}
</script>

<template>
  <div class="px-5 py-5 flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap gap-2">
        <UBadge color="success" variant="subtle" :label="`${cuenta('aceptada')} aceptadas`" />
        <UBadge color="warning" variant="subtle" :label="`${cuenta('modificada')} modificadas`" />
        <UBadge color="error" variant="subtle" :label="`${cuenta('rechazada')} rechazadas`" />
      </div>
      <UButton icon="i-lucide-file-spreadsheet" label="Descargar en Excel" color="neutral" variant="outline" :loading="exportando" :disabled="!p?.recomendaciones.length" @click="exportar" />
    </div>
    <UTabs v-model="filtro" :items="[{ label: 'Todas', value: 'todas' }, { label: 'Aceptadas', value: 'aceptada' }, { label: 'Modificadas', value: 'modificada' }, { label: 'Rechazadas', value: 'rechazada' }]" :content="false" size="xs" variant="link" />
    <UEmpty v-if="!lista.length" icon="i-lucide-notebook-pen" variant="naked" title="Sin decisiones registradas"
      description="En la pestaña Recomendaciones, acepte, modifique o rechace cada propuesta del co-piloto. Sus decisiones y justificaciones aparecerán aquí." />
    <ol v-else class="relative border-l-2 border-default ml-2 flex flex-col gap-4">
      <li v-for="d in lista" :key="d.id" class="pl-5 relative">
        <span class="absolute -left-[9px] top-1 size-4 rounded-full ring-4 ring-default" :class="{ 'bg-success': d.decision === 'aceptada', 'bg-warning': d.decision === 'modificada', 'bg-error': d.decision === 'rechazada' }" />
        <div class="flex flex-wrap items-center gap-2">
          <UBadge v-bind="ETQ[d.decision]" variant="subtle" size="sm" />
          <button type="button" class="marca marca-r" @click="emit('recomendacion', d.recId)">{{ d.recId }}</button>
          <span class="font-semibold">{{ d.titulo }}</span>
        </div>
        <p v-if="d.modificacion" class="text-sm mt-1.5"><span class="font-medium">Cambio:</span> {{ d.modificacion }}</p>
        <p class="text-sm mt-1"><span class="font-medium">Justificación:</span> {{ d.justificacion || 'Sin justificación (aceptada)' }}</p>
        <p class="text-xs text-muted mt-1">{{ fechaHora(d.fecha) }}{{ d.fase ? ' · Fase ' + d.fase : '' }}{{ d.decision !== 'aceptada' ? (d.aplicada ? ' · aplicada al lienzo' : ' · pendiente de aplicar') : '' }}</p>
      </li>
    </ol>
  </div>
</template>
