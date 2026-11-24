<script setup>
// Recomendaciones del co-piloto y decisión del docente (bitácora): aceptar, modificar o rechazar con justificación
import { computed, reactive } from 'vue'
import { st, decidir, decisionDe, pendientesDeAplicar, aplicarDecisiones } from '../store.js'
import { DIMENSIONES, colorValor } from '../lib/util.js'

const emit = defineEmits(['fuente'])
const p = computed(() => st.actual)
const turnos = computed(() => {
  const r = p.value?.recomendaciones || []
  return [...new Set(r.map(x => x.turno))].sort((a, b) => b - a).map(t => ({ t, items: r.filter(x => x.turno === t) }))
})
const sinDecidir = computed(() => (p.value?.recomendaciones || []).filter(r => !decisionDe(p.value, r.id)).length)
const porAplicar = computed(() => pendientesDeAplicar(p.value).length)

// formulario abierto por recomendación
const form = reactive({})
const abrirForm = (r, decision) => { form[r.id] = { decision, justificacion: '', modificacion: '', error: '' } }
function guardar(r) {
  const f = form[r.id]
  if (f.decision === 'modificada' && !f.modificacion.trim()) { f.error = 'Escriba qué cambia de la recomendación.'; return }
  if (f.decision !== 'aceptada' && !f.justificacion.trim()) { f.error = 'La justificación es obligatoria cuando modifica o rechaza.'; return }
  decidir(r.id, f.decision, f.justificacion, f.modificacion)
  delete form[r.id]
}
const ETQ = { aceptada: { label: 'Aceptada', color: 'success', icon: 'i-lucide-check' }, modificada: { label: 'Modificada', color: 'warning', icon: 'i-lucide-pencil' }, rechazada: { label: 'Rechazada', color: 'error', icon: 'i-lucide-x' } }
const fuente = id => p.value.fuentes.find(f => f.id === id)
const fechaHora = iso => new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="px-5 py-5 flex flex-col gap-5">
    <UEmpty v-if="!p?.recomendaciones.length" icon="i-lucide-list-checks" variant="naked" title="Aún no hay recomendaciones"
      description="Cuando el co-piloto genere o ajuste la planeación, aquí verá cada decisión pedagógica por separado para aceptarla, modificarla o rechazarla." />
    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-elevated/60 px-4 py-3">
        <div class="text-sm">
          <p class="font-semibold">{{ sinDecidir ? `${sinDecidir} ${sinDecidir === 1 ? 'recomendación' : 'recomendaciones'} por decidir` : 'Todas las recomendaciones tienen decisión' }}</p>
          <p class="text-muted">Cada decisión queda en la bitácora con su justificación.</p>
        </div>
        <UButton v-if="porAplicar" icon="i-lucide-wand-sparkles" :label="`Aplicar ${porAplicar} ${porAplicar === 1 ? 'decisión' : 'decisiones'} al lienzo`" :loading="st.ocupado" :disabled="st.ocupado" @click="aplicarDecisiones" />
      </div>

      <section v-for="g in turnos" :key="g.t" class="flex flex-col gap-3">
        <p class="eyebrow text-muted">{{ g.t === p.turnos ? 'Propuesta actual' : 'Propuesta anterior' }} · turno {{ g.t }}</p>
        <UCard v-for="r in g.items" :id="'rec-' + r.id" :key="r.id" :ui="{ body: 'flex flex-col gap-3 sm:p-5' }"
          :class="{ 'ring-2 ring-sol-300': !decisionDe(p, r.id) && g.t === p.turnos }">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="flex items-start gap-2.5 min-w-0">
              <span class="marca marca-r mt-1">{{ r.id }}</span>
              <div class="min-w-0">
                <h3 class="font-semibold leading-snug">{{ r.titulo }}</h3>
                <p v-if="r.fase" class="eyebrow text-muted mt-0.5">Fase {{ r.fase }}</p>
              </div>
            </div>
            <UBadge v-if="decisionDe(p, r.id)" v-bind="ETQ[decisionDe(p, r.id).decision]" variant="subtle" />
          </div>
          <p>{{ r.propuesta }}</p>
          <div class="grid sm:grid-cols-2 gap-3 text-sm">
            <div class="rounded-lg bg-elevated/60 p-3"><p class="eyebrow text-primary mb-1">Por qué · TPACK</p><p>{{ r.justificacion || '—' }}</p></div>
            <div class="rounded-lg bg-elevated/60 p-3 flex flex-col gap-2">
              <div><p class="eyebrow text-primary mb-1">Ficha del grupo</p><p>{{ r.grupo || 'Sin información del grupo' }}</p></div>
              <div><p class="eyebrow text-primary mb-1">Plan B sin conexión</p><p>{{ r.alternativa || '—' }}</p></div>
            </div>
          </div>
          <div>
            <p class="eyebrow text-muted mb-1.5">Pertinencia según el co-piloto</p>
            <div class="flex flex-wrap gap-1.5">
              <UBadge v-for="[k, l] in DIMENSIONES" :key="k" :color="colorValor(r.pertinencia?.[k])" variant="soft" size="sm">{{ l }}: {{ r.pertinencia?.[k] || 'sin valorar' }}</UBadge>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 text-sm">
            <span class="eyebrow text-muted mr-1">Fuentes</span>
            <span v-if="!r.fuentes.length" class="text-muted">Sin fragmentos del repositorio: proviene del marco del co-piloto.</span>
            <UPopover v-for="fid in r.fuentes" :key="fid" mode="hover" :content="{ side: 'top' }">
              <button type="button" class="marca marca-f" @click="emit('fuente', fid)">{{ fid }}</button>
              <template #content>
                <div class="p-3 max-w-sm text-sm">
                  <p class="font-semibold">{{ fuente(fid)?.doc }}{{ fuente(fid)?.p ? ', p. ' + fuente(fid).p : '' }}</p>
                  <p class="text-muted mt-1 line-clamp-6">{{ fuente(fid)?.texto }}</p>
                </div>
              </template>
            </UPopover>
          </div>

          <!-- Decisión del docente -->
          <USeparator />
          <div v-if="form[r.id]" class="flex flex-col gap-3">
            <p class="font-medium">{{ form[r.id].decision === 'aceptada' ? 'Aceptar' : form[r.id].decision === 'modificada' ? 'Modificar' : 'Rechazar' }} {{ r.id }}</p>
            <UFormField v-if="form[r.id].decision === 'modificada'" label="¿Qué cambia?" required>
              <UTextarea v-model="form[r.id].modificacion" :rows="2" autoresize class="w-full" placeholder="Ej. hacerlo en parejas y no en grupos de cinco" />
            </UFormField>
            <UFormField label="Justificación de su decisión" :required="form[r.id].decision !== 'aceptada'" :hint="form[r.id].decision === 'aceptada' ? 'Opcional' : undefined">
              <UTextarea v-model="form[r.id].justificacion" :rows="2" autoresize class="w-full" placeholder="¿Por qué toma esta decisión para su grupo y su aula?" />
            </UFormField>
            <UAlert v-if="form[r.id].error" color="error" variant="subtle" :description="form[r.id].error" />
            <div class="flex justify-end gap-2">
              <UButton label="Cancelar" color="neutral" variant="ghost" @click="delete form[r.id]" />
              <UButton label="Guardar en la bitácora" icon="i-lucide-notebook-pen" @click="guardar(r)" />
            </div>
          </div>
          <div v-else-if="decisionDe(p, r.id)" class="flex flex-wrap items-start justify-between gap-3 text-sm">
            <div class="min-w-0">
              <p v-if="decisionDe(p, r.id).modificacion"><span class="font-medium">Cambio:</span> {{ decisionDe(p, r.id).modificacion }}</p>
              <p v-if="decisionDe(p, r.id).justificacion"><span class="font-medium">Justificación:</span> {{ decisionDe(p, r.id).justificacion }}</p>
              <p class="text-muted text-xs mt-1">
                {{ fechaHora(decisionDe(p, r.id).fecha) }} ·
                {{ decisionDe(p, r.id).decision === 'aceptada' ? 'en la planeación' : decisionDe(p, r.id).aplicada ? 'aplicada al lienzo' : 'pendiente de aplicar al lienzo' }}
              </p>
            </div>
            <UButton label="Cambiar decisión" size="xs" color="neutral" variant="outline" :disabled="st.ocupado" @click="abrirForm(r, decisionDe(p, r.id).decision)" />
          </div>
          <div v-else class="flex flex-wrap gap-2">
            <UButton label="Aceptar" icon="i-lucide-check" color="success" variant="soft" @click="abrirForm(r, 'aceptada')" />
            <UButton label="Modificar" icon="i-lucide-pencil" color="warning" variant="soft" @click="abrirForm(r, 'modificada')" />
            <UButton label="Rechazar" icon="i-lucide-x" color="error" variant="soft" @click="abrirForm(r, 'rechazada')" />
          </div>
        </UCard>
      </section>
    </template>
  </div>
</template>
