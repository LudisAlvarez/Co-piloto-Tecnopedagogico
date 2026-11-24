<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { st, iniciarSesion } from './store.js'
import { es } from '@nuxt/ui/locale'

const router = useRouter()
onMounted(async () => {
  await iniciarSesion()
  if (st.usuario) router.replace({ name: st.clave.tiene ? 'mesa' : 'clave' })
})
</script>

<template>
  <UApp :locale="es" :toaster="{ position: 'top-center' }">
    <div v-if="!st.listo" class="min-h-dvh grid place-items-center text-muted">
      <div class="flex items-center gap-3"><UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" /> Preparando su mesa de trabajo…</div>
    </div>
    <RouterView v-else />
  </UApp>
</template>
