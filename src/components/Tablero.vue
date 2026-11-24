<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { st, salir } from '../store.js'

const router = useRouter()
const items = computed(() => [[
  { label: 'Mesa de trabajo', icon: 'i-lucide-layout-dashboard', to: { name: 'mesa' } },
  { label: 'Co-pilotaje', icon: 'i-lucide-messages-square', to: { name: 'copiloto' }, badge: st.ocupado ? 'Escribiendo' : undefined },
  { label: 'Mis planeaciones', icon: 'i-lucide-folder-open', to: { name: 'planeaciones' }, badge: st.planes.length || undefined },
  { label: 'Repositorio curricular', icon: 'i-lucide-library', to: { name: 'repositorio' } },
  { label: 'Estrategias didácticas', icon: 'i-lucide-lightbulb', to: { name: 'estrategias' } },
  { label: 'Análisis curricular', icon: 'i-lucide-clipboard-check', to: { name: 'analisis' } },
  { label: 'Exportar', icon: 'i-lucide-download', to: { name: 'exportar' } }
], [
  { label: 'Ayuda', icon: 'i-lucide-circle-help', to: { name: 'ayuda' } }
]])
const nombre = computed(() => st.usuario?.nombre || st.usuario?.email || '')
async function cerrar() { await salir(); router.replace({ name: 'inicio' }) }
const menu = computed(() => [[
  ...(st.clave.sinClave ? [] : [{ label: 'Clave de Gemini', icon: 'i-lucide-key-round', onSelect: () => router.push({ name: 'clave' }) }]),
  { label: 'Cerrar sesión', icon: 'i-lucide-log-out', onSelect: cerrar }
]])
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar collapsible resizable :default-size="16" :min-size="14" :max-size="22" :ui="{ footer: 'border-t border-default' }">
      <template #header="{ collapsed }">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="size-8 rounded-lg bg-garzon-900 text-sol-400 grid place-items-center shrink-0"><UIcon name="i-lucide-compass" class="size-5" /></div>
          <div v-if="!collapsed" class="min-w-0 leading-tight">
            <p class="font-semibold">Co-piloto</p>
            <p class="eyebrow text-muted">Tecnopedagógico</p>
          </div>
        </div>
      </template>
      <template #default="{ collapsed }">
        <UNavigationMenu :collapsed="collapsed" :items="items[0]" orientation="vertical" tooltip />
        <UNavigationMenu :collapsed="collapsed" :items="items[1]" orientation="vertical" tooltip class="mt-auto" />
      </template>
      <template #footer="{ collapsed }">
        <UDropdownMenu :items="menu" :content="{ align: 'start', side: 'top' }" class="w-full">
          <UButton color="neutral" variant="ghost" block :square="collapsed" class="justify-start data-[state=open]:bg-elevated">
            <UAvatar :alt="nombre" size="sm" />
            <span v-if="!collapsed" class="min-w-0 text-left leading-tight">
              <span class="block truncate font-medium">{{ nombre }}</span>
              <span class="block truncate text-xs text-muted">I.E. Los Garzones</span>
            </span>
          </UButton>
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>
    <RouterView />
  </UDashboardGroup>
</template>
