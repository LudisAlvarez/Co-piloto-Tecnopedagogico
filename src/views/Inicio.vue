<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { st, ingresar, registrar, conGoogle } from '../store.js'
import { EN_CLAUDE, EN_HTML } from '../lib/backend.js'

const router = useRouter()
const pestana = ref('ingresar')
const f = reactive({ correo: '', clave: '', nombre: '', codigo: '' })
const error = ref(''), aviso = ref(''), cargando = ref(false), google = ref(false)
const formulario = ref(null)

async function entrarConGoogle() {
  error.value = ''; aviso.value = ''
  if (st.errorConfig) { error.value = st.errorConfig; return }
  google.value = true
  try { await conGoogle() } catch (e) { error.value = e.message; google.value = false }
}
async function enviar() {
  error.value = ''; aviso.value = ''
  if (st.errorConfig) { error.value = st.errorConfig; return }
  cargando.value = true
  try {
    if (pestana.value === 'ingresar') await ingresar(f.correo.trim(), f.clave)
    else await registrar({ nombre: f.nombre.trim(), correo: f.correo.trim(), clave: f.clave })
    router.replace({ name: st.clave.tiene ? 'mesa' : 'clave' })
  } catch (e) { if (e.aviso) { aviso.value = e.message; pestana.value = 'ingresar' } else error.value = e.message || 'No se pudo ingresar.' }
  finally { cargando.value = false }
}
const irAlIngreso = () => formulario.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'center' })

const ruta = [
  { l: 'A', t: 'Análisis', d: 'Su grupo, su aula y lo que quiere lograr.' },
  { l: 'D', t: 'Diseño', d: 'La secuencia y la estrategia de la clase.' },
  { l: 'D', t: 'Desarrollo', d: 'Recursos y materiales, con plan B sin conexión.' },
  { l: 'I', t: 'Implementación', d: 'Inicio, desarrollo y cierre con sus tiempos.' },
  { l: 'E', t: 'Evaluación', d: 'Rúbrica o lista de cotejo lista para usar.' }
]
const modelos = [
  { icon: 'i-lucide-handshake', title: 'Tutor', description: 'Cómo le acompaña: propone, pregunta y explica. Nunca impone.' },
  { icon: 'i-lucide-brain', title: 'Conocimiento', description: 'Lo que sabe: TPACK, ADDIE, metodologías activas y las Orientaciones del MEN.' },
  { icon: 'i-lucide-users', title: 'Alumno', description: 'Para quién: la ficha de su grupo, sin datos personales.' },
  { icon: 'i-lucide-school', title: 'Mundo', description: 'Dónde: la conectividad, los recursos y el tiempo reales de su aula.' }
]
const pilares = [
  { icon: 'i-lucide-list-tree', title: 'Planeación ordenada', description: 'Cada borrador sigue las fases ADDIE, sin partir de una hoja en blanco.' },
  { icon: 'i-lucide-puzzle', title: 'Tecnología con sentido', description: 'Cada herramienta se justifica frente al contenido y la pedagogía (TPACK).' },
  { icon: 'i-lucide-wifi-off', title: 'Plan B sin conexión', description: 'Toda actividad digital trae una alternativa analógica.' },
  { icon: 'i-lucide-notebook-pen', title: 'Bitácora de decisiones', description: 'Acepta, modifica o rechaza cada recomendación con su justificación, y ve de qué fuente salió.' }
]
</script>

<template>
  <div class="min-h-dvh bg-default">
    <!-- Portada -->
    <section class="hero text-white">
      <UContainer class="flex items-center justify-between py-5">
        <div class="flex items-center gap-2.5">
          <div class="size-9 rounded-lg bg-white/10 text-sol-400 grid place-items-center"><UIcon name="i-lucide-compass" class="size-5" /></div>
          <p class="font-semibold text-lg">Co-piloto <span class="eyebrow text-garzon-200 ml-1">Tecnopedagógico</span></p>
        </div>
        <UButton color="secondary" label="Ingresar" @click="irAlIngreso" />
      </UContainer>

      <UContainer class="grid lg:grid-cols-[1.25fr_minmax(320px,420px)] gap-10 pt-6 pb-16 items-start">
        <div>
          <p class="eyebrow text-garzon-200">Institución Educativa Los Garzones · Montería, Córdoba</p>
          <h1 class="font-display text-[clamp(2.2rem,5vw,3.7rem)] leading-[1.04] mt-3">Planee su clase con un <em class="text-sol-400">co-piloto</em> a su lado</h1>
          <p class="text-lg text-garzon-100 mt-4 max-w-[60ch]">Un agente de inteligencia artificial que le ayuda a armar su planeación paso a paso y a usar tecnología solo cuando aporta y es posible en su aula.</p>

          <div class="mock grid sm:grid-cols-[1.1fr_1fr] gap-3.5 mt-8 max-w-[620px]" aria-hidden="true">
            <div class="panel flex flex-col gap-2">
              <div class="burbuja yo">Hoy no hay internet en el salón.</div>
              <div class="burbuja ag">Listo. Cambié el video por un experimento con materiales del aula.</div>
              <div class="chips flex flex-wrap gap-1.5"><span>Simplificar</span><span class="on">Versión sin internet ✓</span><span>Agregar rúbrica</span></div>
            </div>
            <div class="panel flex flex-col gap-2">
              <p class="font-display text-base">El ciclo del agua · 5°</p>
              <div v-for="(f, i) in ['Inicio', 'Desarrollo', 'Cierre', 'Evaluación']" :key="f" class="fila"><span>{{ f }}</span><u :style="{ '--d': (1 + i * 0.3) + 's' }" /></div>
              <span class="ok">Lista para el aula</span>
            </div>
            <p class="sm:col-span-2 eyebrow normal-case text-garzon-300">Ejemplo de una sesión de co-pilotaje</p>
          </div>
        </div>

        <UCard ref="formulario" class="text-default shadow-2xl lg:sticky lg:top-4" :ui="{ body: 'sm:p-7' }">
          <p class="eyebrow text-primary">Acceso para docentes</p>
          <h2 class="text-xl font-semibold mt-1.5 mb-4">Ingrese a su mesa de trabajo</h2>
          <UAlert v-if="EN_CLAUDE" color="warning" variant="subtle" icon="i-lucide-flask-conical" class="mb-4"
            :description="(EN_HTML ? 'Versión de prueba en un archivo: ' : 'Prototipo en Claude: ') + 'las cuentas son simuladas y quedan en este navegador. Escriba cualquier correo y contraseña; no se verifican. El ingreso real funciona en la versión de Vercel.'" />
          <template v-if="!EN_CLAUDE">
            <UButton block size="lg" color="neutral" variant="outline" :loading="google" class="mb-4" @click="entrarConGoogle">
              <svg viewBox="0 0 48 48" class="size-5" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z"/></svg>
              Continuar con Google
            </UButton>
            <USeparator label="o con su correo" class="mb-4" />
          </template>
          <UTabs v-model="pestana" :items="[{ label: 'Ingresar', value: 'ingresar' }, { label: 'Crear cuenta', value: 'registro' }]" :content="false" class="mb-4" />
          <form class="flex flex-col gap-3.5" @submit.prevent="enviar">
            <UFormField v-if="pestana === 'registro'" label="Nombre completo" required>
              <UInput v-model="f.nombre" autocomplete="name" required class="w-full" />
            </UFormField>
            <UFormField label="Correo" required>
              <UInput v-model="f.correo" type="email" autocomplete="email" required class="w-full" icon="i-lucide-mail" />
            </UFormField>
            <UFormField label="Contraseña" :hint="pestana === 'registro' ? 'Mínimo 8 caracteres' : undefined" required>
              <UInput v-model="f.clave" type="password" :minlength="pestana === 'registro' ? 8 : undefined" :autocomplete="pestana === 'registro' ? 'new-password' : 'current-password'" required class="w-full" icon="i-lucide-lock" />
            </UFormField>
            <UAlert v-if="aviso" color="success" variant="subtle" :description="aviso" icon="i-lucide-mail-check" />
            <UAlert v-if="error" color="error" variant="subtle" :description="error" icon="i-lucide-circle-alert" />
            <UButton type="submit" size="lg" block :loading="cargando" :label="pestana === 'ingresar' ? 'Ingresar' : 'Crear cuenta e ingresar'" />
          </form>
          <p v-if="!EN_CLAUDE" class="text-xs text-muted mt-4 flex gap-1.5"><UIcon name="i-lucide-key-round" class="size-4 shrink-0" /> Al entrar por primera vez le pediremos su clave gratuita de Gemini. Le mostramos cómo obtenerla en dos minutos.</p>
        </UCard>
      </UContainer>
    </section>

    <!-- Ruta ADDIE -->
    <UContainer class="py-14">
      <p class="eyebrow text-primary">La ruta de cada planeación</p>
      <h2 class="font-display text-[clamp(1.7rem,3.2vw,2.2rem)] mt-2">Cinco estaciones, de la idea al aula</h2>
      <ol class="ruta mt-8">
        <li v-for="(r, i) in ruta" :key="r.t" :style="{ '--i': i }">
          <span class="n">{{ r.l }}</span>
          <b>{{ r.t }}</b>
          <small class="text-muted">{{ r.d }}</small>
        </li>
      </ol>
    </UContainer>

    <!-- Cuatro modelos -->
    <section class="bg-elevated/50 border-y border-default">
      <UContainer class="py-14">
        <p class="eyebrow text-primary">Cómo piensa el co-piloto</p>
        <h2 class="font-display text-[clamp(1.7rem,3.2vw,2.2rem)] mt-2">Cuatro modelos detrás de cada propuesta</h2>
        <UPageGrid class="mt-6 lg:grid-cols-4">
          <UPageCard v-for="m in modelos" :key="m.title" v-bind="m" variant="outline" :ui="{ leadingIcon: 'text-primary' }" />
        </UPageGrid>
        <p class="text-muted mt-5 max-w-[70ch]">Cada recomendación llega con su justificación, su valoración de pertinencia y las fuentes que la sustentan. Usted la acepta, la modifica o la rechaza, y su decisión queda en una bitácora.</p>
      </UContainer>
    </section>

    <!-- Cómo acompaña -->
    <UContainer class="pb-14">
      <p class="eyebrow text-primary">Cómo le acompaña</p>
      <h2 class="font-display text-[clamp(1.7rem,3.2vw,2.2rem)] mt-2">Un colega que propone, no un jefe que ordena</h2>
      <UPageGrid class="mt-6 lg:grid-cols-4">
        <UPageCard v-for="p in pilares" :key="p.title" v-bind="p" variant="subtle" :ui="{ leadingIcon: 'text-primary' }" />
      </UPageGrid>
      <UAlert class="mt-6 max-w-3xl" color="primary" variant="subtle" icon="i-lucide-hand-heart" title="Usted decide."
        description="El co-piloto propone y explica sus razones; no reemplaza su criterio profesional. Revise y valide cada propuesta antes de llevarla al aula." />
      <p class="eyebrow text-muted mt-10">Proyecto de grado · Licenciatura en Informática · Universidad de Córdoba · 2026</p>
    </UContainer>
  </div>
</template>

<style scoped>
.hero { background: #0f2463; background-image: radial-gradient(circle at 10% -10%, #2f52c4 0, transparent 45%), radial-gradient(circle at 100% 100%, #1b3da6 0, transparent 42%); }
.panel { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.18); border-radius: 12px; padding: 14px; }
.burbuja { padding: 8px 11px; border-radius: 10px; font-size: 13px; line-height: 1.4; max-width: 95%; }
.burbuja.yo { align-self: flex-end; background: #fff; color: #0c0e13; }
.burbuja.ag { align-self: flex-start; background: #22399a; border-left: 3px solid #ffb81f; }
.chips span { font-size: 11.5px; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,.28); }
.chips .on { background: #ffb81f; color: #1b1400; border-color: #ffb81f; font-weight: 700; }
.fila { display: grid; grid-template-columns: 86px 1fr; align-items: center; gap: 8px; font: 500 10.5px var(--font-mono); text-transform: uppercase; letter-spacing: .05em; color: #b9c6f2; }
.fila u { height: 8px; border-radius: 4px; background: rgba(255,255,255,.15); position: relative; overflow: hidden; text-decoration: none; }
.fila u::after { content: ""; position: absolute; inset: 0; background: #ffb81f; border-radius: 4px; }
.ok { align-self: flex-start; margin-top: 2px; font-size: 12px; font-weight: 700; color: #06301a; background: #7be0a4; border-radius: 999px; padding: 4px 11px; }
.ruta { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; position: relative; }
.ruta::before { content: ""; position: absolute; left: 22px; right: calc((100% - 64px) / 5); top: 21px; border-top: 2px dashed var(--ui-border-accented); }
.ruta li { position: relative; display: flex; flex-direction: column; gap: 4px; }
.ruta .n { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; font: 500 19px var(--font-serif); background: #0f2463; color: #fff; box-shadow: 0 0 0 6px var(--ui-bg); margin-bottom: 6px; }
.ruta li:last-child .n { background: #ffb81f; color: #1b1400; }
@media (max-width: 760px) {
  .ruta { grid-template-columns: 1fr; gap: 14px; }
  .ruta::before { left: 21px; right: auto; top: 22px; bottom: 22px; border-top: 0; border-left: 2px dashed var(--ui-border-accented); }
  .ruta li { display: grid; grid-template-columns: 44px 1fr; column-gap: 14px; align-items: center; }
  .ruta .n { grid-row: span 2; margin: 0; }
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes sube { from { opacity: 0; transform: translateY(10px) } }
  @keyframes llena { from { transform: translateX(-100%) } }
  @keyframes pop { from { opacity: 0; transform: scale(.6) } }
  .burbuja.yo { animation: sube .5s .2s backwards } .burbuja.ag { animation: sube .5s .9s backwards } .chips { animation: sube .5s 1.5s backwards }
  .fila u::after { animation: llena .8s var(--d) backwards }
  .ok { animation: pop .4s 2.7s backwards }
  .ruta .n { animation: pop .45s calc(var(--i) * .15s) backwards }
}
</style>
