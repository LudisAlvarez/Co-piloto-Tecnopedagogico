<script setup>
// Trazabilidad: fragmentos del repositorio que el co-piloto leyó y en qué recomendaciones los usó
import { computed } from 'vue'
import { st } from '../store.js'

const props = defineProps({ abierta: { type: String, default: '' } })
const emit = defineEmits(['recomendacion'])
const p = computed(() => st.actual)
const usadaEn = id => (p.value?.recomendaciones || []).filter(r => r.fuentes?.includes(id)).map(r => r.id)
const enPlan = id => (p.value?.plan || '').includes('[' + id + ']')
const lista = computed(() => [...(p.value?.fuentes || [])].sort((a, b) => (usadaEn(b.id).length + (enPlan(b.id) ? 1 : 0)) - (usadaEn(a.id).length + (enPlan(a.id) ? 1 : 0))))
</script>

<template>
  <div class="px-5 py-5 flex flex-col gap-3">
    <p class="text-sm text-muted max-w-[70ch]">Estos son los fragmentos exactos que el co-piloto leyó antes de responder. Cada uno tiene un identificador que aparece en la planeación y en las recomendaciones que lo usan. Los que no tienen uso se consultaron pero no se citaron.</p>
    <UEmpty v-if="!lista.length" icon="i-lucide-library" variant="naked" title="Sin fuentes consultadas"
      description="Para planeaciones de Tecnología e Informática, o al elegir una estrategia didáctica, el co-piloto consulta las Orientaciones del MEN. También consulta los documentos que usted suba al Repositorio curricular." />
    <UCollapsible v-for="f in lista" :id="'fuente-' + f.id" :key="f.id" :default-open="props.abierta === f.id" class="rounded-xl border border-default" :class="{ 'ring-2 ring-primary': props.abierta === f.id }">
      <button type="button" class="w-full text-left px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <span class="flex items-center gap-2.5 min-w-0">
          <span class="marca marca-f">{{ f.id }}</span>
          <span class="min-w-0"><span class="font-semibold">{{ f.doc }}</span><span class="text-muted">{{ f.p ? ' · p. ' + f.p : '' }} · turno {{ f.turno }}</span></span>
        </span>
        <span class="flex flex-wrap items-center gap-1.5">
          <UBadge v-if="enPlan(f.id)" color="primary" variant="subtle" size="sm" label="Citada en la planeación" />
          <template v-if="usadaEn(f.id).length">
            <span class="text-xs text-muted">Sustenta</span>
            <span v-for="r in usadaEn(f.id)" :key="r" class="marca marca-r" role="link" tabindex="0" @click.stop="emit('recomendacion', r)" @keydown.enter.stop="emit('recomendacion', r)">{{ r }}</span>
          </template>
          <UBadge v-else-if="!enPlan(f.id)" color="neutral" variant="outline" size="sm" label="Consultada, sin citar" />
          <UIcon name="i-lucide-chevron-down" class="size-4 text-muted" />
        </span>
      </button>
      <template #content>
        <p class="px-4 pb-4 text-sm leading-relaxed whitespace-pre-line text-muted">{{ f.texto }}</p>
      </template>
    </UCollapsible>
  </div>
</template>
