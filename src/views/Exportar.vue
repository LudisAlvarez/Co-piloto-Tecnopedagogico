<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { st, marcarExportada, guardarPlantilla, quitarPlantilla, exportarEnPlantilla } from '../store.js'
import { analizarPlantilla, aBase64 } from '../lib/plantilla.js'
import { mensajeError } from '../lib/backend.js'
import { api, EN_CLAUDE } from '../lib/backend.js'
import { aWord, aPdf, nombreArchivo } from '../lib/exportar.js'
import { bitacoraXlsx } from '../lib/bitacora.js'
import { md, tituloDe, sinMarcas } from '../lib/util.js'

const router = useRouter()
const toast = useToast()
const p = computed(() => st.actual)
const preparando = ref('')
const respaldo = ref('')

function listo(titulo) {
  marcarExportada()
  toast.add({ title: titulo, description: 'Esta planeación ya cuenta como llevada al aula.', color: 'success', icon: 'i-lucide-school' })
}
async function descargar(tipo) {
  if (!p.value?.plan) return
  preparando.value = tipo
  try {
    const blob = tipo === 'docx' ? await aWord(p.value.plan) : await aPdf(p.value.plan)
    await api.descargar(nombreArchivo(tituloDe(p.value), tipo), blob)
    listo('Archivo descargado')
  } catch (e) {
    toast.add({ title: e?.code === 'declined' ? 'Descarga cancelada' : 'No se pudo descargar', description: e?.code === 'declined' ? '' : 'Use «Copiar al portapapeles» mientras tanto.', color: e?.code === 'declined' ? 'neutral' : 'error' })
  } finally { preparando.value = '' }
}
async function copiar() {
  try { await navigator.clipboard.writeText(sinMarcas(p.value.plan)); listo('Texto copiado') }
  catch (e) { respaldo.value = sinMarcas(p.value.plan); toast.add({ title: 'Seleccione el texto de abajo y cópielo con Ctrl+C', color: 'neutral' }) }
}
const opciones = [
  { k: 'copiar', icon: 'i-lucide-clipboard-copy', etiqueta: 'Texto', titulo: 'Copiar al portapapeles', d: 'Texto estructurado para pegar en WhatsApp, correo o Classroom.' },
  { k: 'docx', icon: 'i-lucide-file-type', etiqueta: '.docx editable', titulo: 'Descargar Word', d: 'Con las tablas de la planeación, listo para modificar.' },
  { k: 'pdf', icon: 'i-lucide-printer', etiqueta: 'Listo para imprimir', titulo: 'Descargar PDF', d: 'Hoja carta horizontal.' },
  { k: 'xlsx', icon: 'i-lucide-file-spreadsheet', etiqueta: 'Trazabilidad · .xlsx', titulo: 'Bitácora de decisiones', d: 'Sus decisiones con justificación, las recomendaciones con su pertinencia y las fuentes consultadas.' }
]
async function bitacora() {
  preparando.value = 'xlsx'
  try {
    await api.descargar(nombreArchivo('Bitacora ' + tituloDe(p.value), 'xlsx'), await bitacoraXlsx([p.value], st.usuario?.nombre || st.usuario?.email || ''))
    toast.add({ title: 'Bitácora descargada', color: 'success', icon: 'i-lucide-check' })
  } catch (e) { toast.add({ title: e?.code === 'declined' ? 'Descarga cancelada' : 'No se pudo descargar', color: e?.code === 'declined' ? 'neutral' : 'error' }) }
  finally { preparando.value = '' }
}
const accion = k => k === 'copiar' ? copiar() : k === 'xlsx' ? bitacora() : descargar(k)

// Plantilla del docente
const cambioInput = ref(null)
const archivoPlantilla = ref(null), revisando = ref(false), camposVista = ref([]), confirmarQuitar = ref(false)
watch(archivoPlantilla, async f => {
  if (!f) return
  if (!/\.docx$/i.test(f.name)) { archivoPlantilla.value = null; return toast.add({ title: 'La plantilla debe ser un archivo de Word (.docx)', description: 'Si la tiene en PDF o .doc, ábrala en Word y guárdela como .docx.', color: 'warning' }) }
  if (f.size > 2 * 1024 * 1024) { archivoPlantilla.value = null; return toast.add({ title: 'La plantilla pesa más de 2 MB', description: 'Quite imágenes grandes o comprímalas e inténtelo de nuevo.', color: 'warning' }) }
  revisando.value = true
  try {
    const buf = await f.arrayBuffer()
    const campos = await analizarPlantilla(buf)
    if (!campos.length) throw new Error('vacia')
    await guardarPlantilla({ nombre: f.name, archivo: aBase64(buf), campos: campos.length })
    camposVista.value = campos
    toast.add({ title: 'Plantilla guardada', description: `Encontré ${campos.length} campos para llenar.`, color: 'success', icon: 'i-lucide-check' })
  } catch (e) {
    toast.add(e.message === 'vacia'
      ? { title: 'No encontré espacios para llenar', description: 'Deje en blanco las celdas o líneas que se deben completar, o use «Campo:» o líneas ______.', color: 'warning', icon: 'i-lucide-file-question' }
      : { title: 'No se pudo guardar la plantilla', description: e.message?.includes('Word') ? e.message : 'Revise que sea un .docx válido. Si es muy pesada, quite imágenes grandes.', color: 'error' })
  } finally { revisando.value = false; archivoPlantilla.value = null }
})
async function verCampos() {
  if (camposVista.value.length || !st.plantilla) return
  const { deBase64 } = await import('../lib/plantilla.js')
  camposVista.value = await analizarPlantilla(deBase64(st.plantilla.archivo))
}
let control = null
async function descargarEnPlantilla() {
  if (!p.value?.plan || !st.plantilla || st.ocupado) return
  preparando.value = 'plantilla'; st.ocupado = true; control = new AbortController()
  try {
    const { blob, llenos, total } = await exportarEnPlantilla(control.signal)
    await api.descargar(nombreArchivo(tituloDe(p.value) + ' (plantilla)', 'docx'), blob)
    marcarExportada()
    toast.add({ title: 'Planeación lista en su plantilla', description: `Se llenaron ${llenos} de ${total} campos. Revise los que quedaron vacíos, como fecha, sede o firma.`, color: 'success', icon: 'i-lucide-school', duration: 9000 })
  } catch (e) {
    toast.add({ title: 'No se pudo llenar la plantilla', description: e?.code === 'declined' ? 'Descarga cancelada.' : e instanceof SyntaxError || e?.message === 'sin JSON' ? 'El co-piloto no devolvió los campos en el formato esperado. Inténtelo de nuevo.' : mensajeError(e), color: 'error' })
  } finally { preparando.value = ''; st.ocupado = false }
}
</script>

<template>
  <UDashboardPanel id="exportar">
    <template #header>
      <UDashboardNavbar title="Exportar"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar>
    </template>
    <template #body>
      <div class="max-w-5xl w-full mx-auto flex flex-col gap-6">
        <section>
          <h1 class="font-display text-4xl">Lleve la planeación al aula</h1>
          <p class="text-muted text-lg mt-2 max-w-[65ch]">Copie el texto o descargue un archivo liviano para imprimir o archivar. Funciona aunque después se quede sin conexión.</p>
        </section>
        <!-- Plantilla del docente -->
        <UCard :ui="{ body: 'flex flex-col gap-4' }">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex gap-3 min-w-0">
              <div class="size-11 rounded-xl grid place-items-center shrink-0 bg-sol-100 text-sol-700"><UIcon name="i-lucide-file-spreadsheet" class="size-5" /></div>
              <div class="min-w-0">
                <h2 class="font-semibold text-lg">Mi plantilla de plan de clase</h2>
                <p v-if="!st.plantilla" class="text-muted text-sm max-w-[60ch]">Suba una vez el formato en Word que usa en la institución. Al exportar, el co-piloto lo llena con la planeación y conserva su diseño, tablas y logos.</p>
                <p v-else class="text-sm"><span class="font-medium">{{ st.plantilla.nombre }}</span> <span class="text-muted">· {{ st.plantilla.campos }} campos para llenar</span></p>
              </div>
            </div>
            <div v-if="st.plantilla" class="flex gap-2">
              <UButton label="Cambiar" icon="i-lucide-replace" color="neutral" variant="outline" size="sm" :disabled="revisando" @click="cambioInput?.click()" />
              <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="sm" aria-label="Quitar plantilla" @click="confirmarQuitar = true" />
            </div>
          </div>
          <UFileUpload v-if="!st.plantilla" v-model="archivoPlantilla" accept=".docx" icon="i-lucide-file-up" label="Arrastre aquí su plantilla" description="Word (.docx), hasta 2 MB" class="min-h-32" :disabled="revisando" />
          <input v-else ref="cambioInput" type="file" accept=".docx" class="hidden" aria-label="Cambiar plantilla" @change="e => { archivoPlantilla = e.target.files[0] || null; e.target.value = '' }">
          <p v-if="revisando" class="flex items-center gap-2 text-sm text-muted"><UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" /> Buscando los campos de la plantilla…</p>
          <UCollapsible v-if="st.plantilla" @update:open="o => o && verCampos()">
            <UButton label="Ver los campos que se llenarán" trailing-icon="i-lucide-chevron-down" color="neutral" variant="link" class="px-0" />
            <template #content>
              <div class="flex flex-wrap gap-1.5 pt-2">
                <UBadge v-for="c in camposVista" :key="c.id" :label="c.etiqueta" color="neutral" variant="soft" class="max-w-full truncate" />
              </div>
              <p class="text-xs text-muted mt-2">Se detectan celdas vacías, campos que terminan en «:» y líneas ______. Los encabezados y pies de página no se modifican.</p>
            </template>
          </UCollapsible>
        </UCard>

        <UModal v-model:open="confirmarQuitar" title="¿Quitar la plantilla?" :description="st.plantilla?.nombre">
          <template #footer>
            <div class="flex justify-end gap-2 w-full">
              <UButton label="Cancelar" color="neutral" variant="outline" @click="confirmarQuitar = false" />
              <UButton label="Quitar" color="error" @click="quitarPlantilla(); camposVista = []; confirmarQuitar = false" />
            </div>
          </template>
        </UModal>

        <UEmpty v-if="!p?.plan" icon="i-lucide-file-x" title="Aún no hay planeación para exportar" description="Genere o retome una planeación primero." :actions="[{ label: 'Mis planeaciones', onClick: () => router.push({ name: 'planeaciones' }) }]" />
        <template v-else>
          <UPageCard v-if="st.plantilla" title="Descargar en mi plantilla" :description="`El co-piloto acomoda «${tituloDe(p)}» en ${st.plantilla.nombre}. Tarda unos segundos.`"
            icon="i-lucide-wand-sparkles" variant="solid" orientation="horizontal" class="cursor-pointer" :ui="{ leadingIcon: 'text-sol-400' }" @click="descargarEnPlantilla">
            <div class="flex lg:justify-end">
              <span v-if="preparando === 'plantilla'" class="flex items-center gap-2 text-sm"><UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" /> Llenando la plantilla…</span>
              <span v-else class="eyebrow text-inverted/70">.docx con su formato</span>
            </div>
          </UPageCard>
          <UPageGrid class="lg:grid-cols-2 xl:grid-cols-4">
            <UPageCard v-for="(o, i) in opciones" :key="o.k" :title="o.titulo" :description="o.d" :icon="o.icon"
              :variant="i === 2 && !st.plantilla ? 'solid' : 'subtle'" class="cursor-pointer" :ui="{ leadingIcon: i === 2 && !st.plantilla ? 'text-sol-400' : 'text-primary' }" @click="accion(o.k)">
              <template #header><span class="eyebrow" :class="i === 2 && !st.plantilla ? 'text-inverted/70' : 'text-muted'">{{ o.etiqueta }}</span></template>
              <template #footer>
                <span v-if="preparando === o.k" class="flex items-center gap-2 text-sm"><UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" /> Preparando…</span>
              </template>
            </UPageCard>
          </UPageGrid>
          <p v-if="EN_CLAUDE" class="text-sm text-muted -mt-2">En el prototipo, Claude le pedirá confirmar cada descarga.</p>
          <UTextarea v-if="respaldo" v-model="respaldo" readonly :rows="8" class="w-full" :ui="{ base: 'font-mono text-xs' }" />
          <UCard>
            <template #header><p class="eyebrow text-muted">Vista previa · {{ tituloDe(p) }}</p></template>
            <div class="plan-doc" v-html="md(sinMarcas(p.plan))" />
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
