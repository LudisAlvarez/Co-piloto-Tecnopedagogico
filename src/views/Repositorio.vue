<script setup>
import { ref } from 'vue'
import { st, agregarDoc, quitarDoc } from '../store.js'
import { leerArchivo, DOC_BASE } from '../lib/repositorio.js'
import { AREAS, uid } from '../lib/util.js'

const archivo = ref(null), area = ref('Todas las áreas'), cargando = ref(false)
const porQuitar = ref(null)
const toast = useToast()

async function agregar() {
  const f = archivo.value
  if (!f) return
  if (st.docs.length >= 10) return toast.add({ title: 'Ya tiene 10 documentos', description: 'Quite uno para agregar otro.', color: 'warning' })
  cargando.value = true
  try {
    let texto = await leerArchivo(f)
    if (texto.length < 200) return toast.add({ title: 'No se encontró texto en el archivo', description: 'Si es un PDF escaneado, súbalo en Word o como texto.', color: 'warning', icon: 'i-lucide-file-x' })
    const largo = texto.length > 300000
    if (largo) texto = texto.slice(0, 300000)
    await agregarDoc({ id: uid(), nombre: f.name.slice(0, 120), area: area.value, texto, created_at: new Date().toISOString() })
    archivo.value = null
    toast.add({ title: 'Documento agregado', description: 'El co-piloto ya puede consultarlo.' + (largo ? ' Se guardaron solo las primeras 100 páginas aproximadamente.' : ''), color: 'success', icon: 'i-lucide-check' })
  } catch (e) {
    toast.add({ title: 'No se pudo agregar el documento', description: 'Pruebe con PDF, Word (.docx) o texto. Si es muy grande, divídalo.', color: 'error' })
  } finally { cargando.value = false }
}
function confirmar() { quitarDoc(porQuitar.value.id); porQuitar.value = null }
</script>

<template>
  <UDashboardPanel id="repositorio">
    <template #header>
      <UDashboardNavbar title="Repositorio curricular"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar>
    </template>
    <template #body>
      <div class="max-w-4xl w-full mx-auto flex flex-col gap-6">
        <section>
          <h1 class="font-display text-4xl">Los referentes que consulta el co-piloto</h1>
          <p class="text-muted text-lg mt-2 max-w-[65ch]">Antes de proponer, el co-piloto busca en estos documentos y cita la página que usó. Suba su plan de área, mallas o guías para que las propuestas se apoyen en ellos.</p>
        </section>

        <UPageCard :title="'Orientaciones Curriculares para el Área de Tecnología e Informática'" description="Ministerio de Educación Nacional · Competencias y evidencias por grados, estrategias didácticas y evaluación. Se usa en las planeaciones de Tecnología e Informática y al elegir una estrategia didáctica."
          icon="i-lucide-landmark" variant="subtle" orientation="horizontal">
          <div class="flex justify-end"><UBadge color="success" variant="subtle" icon="i-lucide-badge-check" label="Documento base incluido" size="lg" /></div>
        </UPageCard>

        <UCard>
          <template #header><h2 class="font-semibold text-lg">Subir un documento</h2></template>
          <div class="grid md:grid-cols-[1fr_260px] gap-4 items-start">
            <UFileUpload v-model="archivo" accept=".pdf,.docx,.txt,.md" icon="i-lucide-file-up" label="Arrastre aquí su archivo" description="PDF, Word (.docx) o texto" class="min-h-40" layout="list" />
            <div class="flex flex-col gap-4">
              <UFormField label="Área a la que aplica"><USelect v-model="area" :items="['Todas las áreas', ...AREAS]" class="w-full" /></UFormField>
              <UButton block size="lg" icon="i-lucide-plus" label="Agregar al repositorio" :loading="cargando" :disabled="!archivo" @click="agregar" />
            </div>
          </div>
          <p class="text-sm text-muted mt-4">El texto se lee en su equipo y se guarda solo en su cuenta. No suba documentos con datos personales de estudiantes.</p>
        </UCard>

        <UCard>
          <template #header><h2 class="font-semibold text-lg">Mis documentos <span class="text-muted font-normal">({{ st.docs.length }}/10)</span></h2></template>
          <UEmpty v-if="!st.docs.length" icon="i-lucide-library" title="Aún no ha subido documentos" description="El co-piloto usa el documento base y lo que usted le cuente en la conversación." variant="naked" />
          <div class="flex flex-col gap-2">
            <div v-for="d in st.docs" :key="d.id" class="flex items-center justify-between gap-3 rounded-lg bg-elevated/60 px-4 py-3">
              <div class="flex items-center gap-3 min-w-0">
                <UIcon name="i-lucide-file-text" class="size-5 text-primary shrink-0" />
                <div class="min-w-0"><p class="font-semibold truncate">{{ d.nombre }}</p><p class="text-sm text-muted">{{ d.area }} · {{ Math.max(1, Math.round(d.texto.length / 3000)) }} páginas aprox.</p></div>
              </div>
              <UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="Quitar" @click="porQuitar = d" />
            </div>
          </div>
        </UCard>
      </div>
      <UModal :open="!!porQuitar" title="¿Quitar este documento?" :description="porQuitar?.nombre" @update:open="v => { if (!v) porQuitar = null }">
        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <UButton label="Cancelar" color="neutral" variant="outline" @click="porQuitar = null" />
            <UButton label="Quitar" color="error" @click="confirmar" />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
