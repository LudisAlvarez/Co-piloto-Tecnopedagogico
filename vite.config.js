import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Todos los íconos usados en el código (también los que están en datos JS) se empaquetan con la app
const archivos = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? archivos(join(d, e.name)) : [join(d, e.name)])
const iconos = [...new Set(archivos('src').filter(f => /\.(vue|js)$/.test(f)).flatMap(f => readFileSync(f, 'utf8').match(/i-lucide-[a-z0-9-]+/g) || []))]
  .map(n => n.replace(/^i-lucide-/, 'lucide:'))

// `npm run build`        → versión para Vercel (Gemini + Supabase)
// `npm run build:claude` → prototipo para publicar dentro de Claude
// `npm run build:html`   → un solo archivo .html que se abre con doble clic (agente con clave de Gemini)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    vue(),
    ui({
      ui: {
        colors: { primary: 'garzon', secondary: 'sol', neutral: 'slate' }
      },
      // Íconos empaquetados con la app: no se descargan de internet al abrirla
      icon: { clientBundle: { scan: true, icons: iconos } }
    }),
    ...(mode === 'html' ? [viteSingleFile({ removeViteModuleLoader: true })] : [])
  ],
  build: { outDir: { claude: 'dist-claude', html: 'dist-html' }[mode] || 'dist', chunkSizeWarningLimit: 2500, ...(mode === 'html' ? { assetsInlineLimit: 100000000 } : {}) }
}))
