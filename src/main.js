import './main.css'
import { createApp } from 'vue'
import { createRouter, createWebHashHistory, createMemoryHistory } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'
import App from './App.vue'
import { EN_CLAUDE } from './lib/backend.js'
import { st } from './store.js'

const vista = n => () => import(`./views/${n}.vue`)
const router = createRouter({
  // Dentro de Claude la navegación vive en memoria; en Vercel usa el hash de la URL
  history: EN_CLAUDE ? createMemoryHistory() : createWebHashHistory(),
  routes: [
    { path: '/', name: 'inicio', component: vista('Inicio'), meta: { publica: true } },
    {
      path: '/', component: () => import('./components/Tablero.vue'),
      children: [
        { path: 'mesa', name: 'mesa', component: vista('Mesa') },
        { path: 'copiloto', name: 'copiloto', component: vista('Copiloto') },
        { path: 'planeaciones', name: 'planeaciones', component: vista('Planeaciones') },
        { path: 'repositorio', name: 'repositorio', component: vista('Repositorio') },
        { path: 'estrategias', name: 'estrategias', component: vista('Estrategias') },
        { path: 'analisis', name: 'analisis', component: vista('Analisis') },
        { path: 'exportar', name: 'exportar', component: vista('Exportar') },
        { path: 'ayuda', name: 'ayuda', component: vista('Ayuda') },
        { path: 'clave', name: 'clave', component: vista('Clave') }
      ]
    },
    { path: '/:p(.*)*', redirect: '/' }
  ]
})
router.beforeEach(to => {
  if (!to.meta.publica && !st.usuario) return { name: 'inicio' }
  if (to.name === 'inicio' && st.usuario) return { name: st.clave.tiene ? 'mesa' : 'clave' }
  // Sin clave de Gemini no se puede planear: primero se conecta (Ayuda sigue disponible)
  if (st.usuario && !st.clave.tiene && !['clave', 'ayuda', 'inicio'].includes(to.name)) return { name: 'clave' }
})

createApp(App).use(router).use(ui).mount('#app')
