<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { st, abrir, eliminar } from '../store.js'
import { tituloDe, fecha } from '../lib/util.js'
import { api } from '../lib/backend.js'
import { bitacoraXlsx } from '../lib/bitacora.js'
import { nombreArchivo } from '../lib/exportar.js'
const toast = useToast()
const exportando = ref(false)
async function exportarTodas() {
  exportando.value = true
  try {
    await api.descargar(nombreArchivo('Bitacora de todas mis planeaciones', 'xlsx'), await bitacoraXlsx(st.planes, st.usuario?.nombre || st.usuario?.email || ''))
    toast.add({ title: 'Bitácora descargada', description: 'Una fila por decisión, recomendación y fuente, de todas sus planeaciones.', color: 'success', icon: 'i-lucide-check' })
  } catch (e) { toast.add({ title: e?.code === 'declined' ? 'Descarga cancelada' : 'No se pudo descargar', color: e?.code === 'declined' ? 'neutral' : 'error' }) }
  finally { exportando.value = false }
}
const decisiones = p => (p.bitacora || []).length

const router = useRouter()
const porBorrar = ref(null)
function retomar(id) { abrir(id); router.push({ name: 'copiloto' }) }
function confirmar() { eliminar(porBorrar.value.id); porBorrar.value = null }
</script>

<template>
  <UDashboardPanel id="planeaciones">
    <template #header>
      <UDashboardNavbar title="Mis planeaciones" :badge="st.planes.length"><template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton icon="i-lucide-file-spreadsheet" label="Bitácora en Excel" color="neutral" variant="outline" class="max-sm:hidden" :loading="exportando" :disabled="!st.planes.length" @click="exportarTodas" />
          <UButton icon="i-lucide-plus" label="Nueva" @click="router.push({ name: 'mesa' })" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="max-w-4xl w-full mx-auto">
        <p class="text-muted mb-4">Se guardan en su cuenta. Solo usted las ve al ingresar.</p>
        <UEmpty v-if="!st.planes.length" icon="i-lucide-folder-open" title="Aún no hay planeaciones" description="Empiece una en la Mesa de trabajo." :actions="[{ label: 'Ir a la Mesa de trabajo', onClick: () => router.push({ name: 'mesa' }) }]" />
        <div class="flex flex-col gap-2.5">
          <UCard v-for="p in st.planes" :key="p.id" :ui="{ body: 'flex flex-wrap items-center justify-between gap-3 sm:p-4' }">
            <div class="min-w-0">
              <p class="font-semibold">{{ tituloDe(p) }}</p>
              <p class="text-sm text-muted">{{ p.cfg.asignatura }} · {{ p.cfg.grado }} · {{ p.cfg.metodologia }} · {{ fecha(p.updated) }}{{ decisiones(p) ? ` · ${decisiones(p)} decisiones en bitácora` : '' }}</p>
            </div>
            <div class="flex items-center gap-2">
              <UBadge v-if="p.exportada" color="success" variant="subtle" icon="i-lucide-school" label="Llevada al aula" />
              <UBadge v-else-if="p.plan" color="primary" variant="subtle" label="Borrador" />
              <UBadge v-else color="neutral" variant="outline" label="Sin borrador" />
              <UButton label="Retomar" color="neutral" variant="outline" @click="retomar(p.id)" />
              <UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="Eliminar" @click="porBorrar = p" />
            </div>
          </UCard>
        </div>
      </div>
      <UModal :open="!!porBorrar" title="¿Eliminar esta planeación?" :description="porBorrar ? tituloDe(porBorrar) : ''" @update:open="v => { if (!v) porBorrar = null }">
        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <UButton label="Cancelar" color="neutral" variant="outline" @click="porBorrar = null" />
            <UButton label="Eliminar" color="error" @click="confirmar" />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
