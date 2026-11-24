import { marked } from 'marked'
import DOMPurify from 'dompurify'

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now() + Math.random().toString(36).slice(2))

// Markdown → HTML seguro; las tablas quedan dentro de un contenedor con desplazamiento horizontal
export function md(texto) {
  const html = DOMPurify.sanitize(marked.parse(texto || '', { breaks: true }))
  return html.replace(/<table>/g, '<div class="tw"><table>').replace(/<\/table>/g, '</table></div>')
}

// Separa la respuesta del agente: mensaje del chat, recomendaciones (JSON) y planeación del lienzo
export function separar(t) {
  t = (t || '').replace(/\[\[[A-Z]*\]?$/, '')
  const pos = k => t.indexOf('[[' + k + ']]')
  const m = pos('MENSAJE'), r = pos('RECOMENDACIONES'), p = pos('PLANEACION')
  if (m < 0 && p < 0 && r < 0) return { msg: t.trim(), plan: '', reco: null, completa: false }
  const limpio = s => s.replace('[[FIN]]', '').replace(/^\s*```(?:markdown|json)?\s*\n/, '').replace(/\n```\s*$/, '').trim()
  const fin = desde => Math.min(...[m, r, p, t.length].filter(x => x > desde))
  const ini = m >= 0 ? m + 11 : 0
  const msg = limpio(t.slice(ini, fin(ini - 1)))
  let reco = null
  if (r >= 0 && p > r) {
    const bruto = limpio(t.slice(r + 19, p))
    try { const i = bruto.indexOf('{'), j = bruto.lastIndexOf('}'); reco = JSON.parse(bruto.slice(i, j + 1)) } catch (e) { reco = null }
  }
  const plan = p >= 0 ? limpio(t.slice(p + 14)) : ''
  return { msg, plan, reco, completa: t.includes('[[FIN]]') }
}

// Quita las marcas de trazabilidad [R3] [F2] para exportar un documento limpio
export const sinMarcas = t => String(t || '').replace(/\s?\[(?:R|F)\d+\](?:\s?\[(?:R|F)\d+\])*/g, '')

// Muestra las marcas [R3] y [F2] como etiquetas en la planeación renderizada
export const conMarcas = html => html.replace(/\[(R|F)(\d+)\]/g, (_, k, n) => `<span class="marca marca-${k.toLowerCase()}" data-ref="${k}${n}">${k}${n}</span>`)

export const DIMENSIONES = [['utilidad', 'Utilidad'], ['coherencia', 'Coherencia pedagógica'], ['contextualizacion', 'Contextualización'], ['usabilidad', 'Usabilidad'], ['viabilidad', 'Viabilidad']]
export const colorValor = v => v === 'Fuerte' ? 'success' : v === 'Aceptable' ? 'warning' : v === 'Por mejorar' ? 'error' : 'neutral'
export const FAMILIARIDAD = ['Baja: casi no usan herramientas digitales', 'Media: usan celular o computador con apoyo', 'Alta: usan herramientas digitales con autonomía']

export const tituloDe = p => ((p?.plan || '').match(/^#\s+(.+)$/m)?.[1]) || p?.cfg?.tema || 'Planeación sin título'

export const fecha = ms => new Date(ms).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
export const hora = ms => new Date(ms).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

export const AREAS = ['Ciencias Naturales', 'Matemáticas', 'Lenguaje', 'Ciencias Sociales', 'Tecnología e Informática', 'Inglés', 'Educación Artística', 'Ética y Valores', 'Educación Física']
export const GRADOS = Array.from({ length: 11 }, (_, i) => `${i + 1}°`)
export const DURACIONES = ['Una clase de 45 minutos', 'Una clase de 60 minutos', 'Secuencia de 2 clases', 'Secuencia de 3 clases']
export const RECURSOS = ['Video beam o televisor', 'Computador del docente', 'Sala de informática', 'Celulares de los estudiantes', 'Tabletas']
export const CONECTIVIDAD = [
  { value: 'Sin internet en el aula', label: 'Sin internet', description: 'Todo debe funcionar sin conexión' },
  { value: 'Internet intermitente', label: 'Intermitente', description: 'Hay señal, pero falla' },
  { value: 'Internet estable', label: 'Estable', description: 'Conexión confiable en el aula' }
]
