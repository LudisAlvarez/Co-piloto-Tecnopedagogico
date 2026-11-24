<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ESTRATEGIAS, SIN_CONEXION } from '../lib/repositorio.js'

const router = useRouter()
const filtro = ref('todas')
const grupos = computed(() => {
  const lista = ESTRATEGIAS.filter(e => filtro.value === 'todas' || (filtro.value === 'sin' ? e.c === SIN_CONEXION : e.c !== SIN_CONEXION))
  return [...new Set(lista.map(e => e.g))].map(g => ({ g, items: lista.filter(e => e.g === g) }))
})
const planear = n => router.push({ name: 'mesa', query: { estrategia: n } })
</script>

<template>
  <UDashboardPanel id="estrategias">
    <template #header>
      <UDashboardNavbar title="Estrategias didácticas"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar>
      <UDashboardToolbar>
        <UTabs v-model="filtro" :items="[{ label: 'Todas', value: 'todas' }, { label: 'Funcionan sin conexión', value: 'sin', icon: 'i-lucide-wifi-off' }, { label: 'Necesitan equipos o conexión', value: 'con', icon: 'i-lucide-wifi' }]" :content="false" size="sm" variant="link" />
      </UDashboardToolbar>
    </template>
    <template #body>
      <div class="max-w-6xl w-full mx-auto">
        <h1 class="font-display text-4xl">Elija cómo quiere que aprendan</h1>
        <p class="text-muted text-lg mt-2 max-w-[70ch]">Estrategias del capítulo 4 de las Orientaciones Curriculares de Tecnología e Informática del MEN, más el microlearning del marco del proyecto. Elija una y el co-piloto arma la planeación con ella.</p>
        <section v-for="grp in grupos" :key="grp.g" class="mt-8">
          <h2 class="eyebrow text-primary mb-3">{{ grp.g }}</h2>
          <UPageGrid>
            <UPageCard v-for="e in grp.items" :key="e.n" :title="e.n" :description="e.d" :icon="e.i" variant="outline" spotlight spotlight-color="primary" :ui="{ leadingIcon: 'text-primary', footer: 'w-full' }">
              <template #header>
                <UBadge :color="e.c === SIN_CONEXION ? 'success' : 'warning'" variant="subtle" :icon="e.c === SIN_CONEXION ? 'i-lucide-wifi-off' : 'i-lucide-plug'" :label="e.c" />
              </template>
              <template #footer>
                <p class="text-xs font-mono text-muted mb-3">{{ e.pg ? `Orientaciones Curriculares T&I (MEN), p. ${e.pg}` : 'Marco teórico del proyecto' }}</p>
                <UButton block color="neutral" variant="subtle" trailing-icon="i-lucide-arrow-right" label="Planear con esta estrategia" @click="planear(e.n)" />
              </template>
            </UPageCard>
          </UPageGrid>
        </section>
        <p class="text-sm text-muted mt-8">La etiqueta de conectividad es una guía del co-piloto, no del documento. Usted decide si la estrategia es viable en su aula.</p>
      </div>
    </template>
  </UDashboardPanel>
</template>
