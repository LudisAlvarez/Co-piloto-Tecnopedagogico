// Repositorio curricular: documento base (Orientaciones T&I del MEN) + documentos del docente.
// Antes de cada solicitud se eligen los fragmentos más pertinentes y se envían al agente con su página.

export const DOC_BASE = 'Orientaciones Curriculares de Tecnología e Informática (MEN)'
const SIN = 'Funciona sin conexión'

export const ESTRATEGIAS = [
  { n: 'Microlearning', g: 'Del marco del proyecto', d: 'Contenidos en cápsulas breves, cada una con un solo propósito de aprendizaje.', c: SIN, pg: 0, i: 'i-lucide-layers' },
  { n: 'Aula invertida', g: 'Con uso de TIC', d: 'El estudiante revisa el contenido antes de clase y el tiempo en el aula se dedica a resolver dudas, aplicar y trabajar en grupo.', c: 'Admite material impreso', pg: 92, k: '4.4.4.', i: 'i-lucide-repeat-2' },
  { n: 'Gamificación', g: 'Con uso de TIC', d: 'Usa elementos del juego, como retos por niveles, roles y puntos, para motivar las actividades. La clase no se vuelve un juego.', c: SIN, pg: 92, k: 'La gamificación', i: 'i-lucide-trophy' },
  { n: 'Aprendizaje basado en juegos', g: 'Con uso de TIC', d: 'Los estudiantes aplican los conceptos con juegos que ya existen, con reglas, metas y roles claros.', c: SIN, pg: 91, k: '4.4.3.', i: 'i-lucide-dices' },
  { n: 'Narrativas transmedia', g: 'Con uso de TIC', d: 'El grupo construye una historia entre todos usando distintos medios. El docente actúa como narrador que despierta la curiosidad.', c: 'Requiere dispositivos', pg: 91, k: '4.4.2.', i: 'i-lucide-book-open-text' },
  { n: 'Redes y comunidades virtuales', g: 'Con uso de TIC', d: 'Aprender en red: grupos que comparten experiencias, discuten y resuelven problemas comunes.', c: 'Requiere conexión', pg: 90, k: '4.4.1.', i: 'i-lucide-network' },
  { n: 'Construcción y fabricación', g: 'Propias del área de Tecnología e Informática', d: 'Pasar de la idea al producto: modelos, prototipos, diagramas o programas que resuelven un problema real.', c: SIN, pg: 73, k: '4.2.1.', i: 'i-lucide-hammer' },
  { n: 'Diseño y rediseño', g: 'Propias del área de Tecnología e Informática', d: 'Resolver un problema diseñando una solución, o mejorar un producto que ya existe entendiendo las decisiones que lo originaron.', c: SIN, pg: 78, k: '4.2.2.', i: 'i-lucide-pencil-ruler' },
  { n: 'Análisis de productos tecnológicos', g: 'Propias del área de Tecnología e Informática', d: 'Partir de un producto terminado, descomponerlo y preguntarse cómo y por qué fue hecho así.', c: SIN, pg: 82, k: '4.2.3.', i: 'i-lucide-scan-search' },
  { n: 'Enfoque CTS', g: 'Propias del área de Tecnología e Informática', d: 'Reflexión crítica sobre cómo la tecnología afecta a las personas, la comunidad y el ambiente, para tomar posición.', c: SIN, pg: 85, k: '4.2.4.', i: 'i-lucide-scale' },
  { n: 'Movimiento Maker', g: 'Emergentes', d: 'Aprender haciendo y compartiendo: crear artefactos, desde lo artesanal hasta la fabricación digital.', c: 'Admite versión artesanal', pg: 89, k: '4.3.1.', i: 'i-lucide-wrench' },
  { n: 'STEM+', g: 'Emergentes', d: 'Proyectos que integran ciencias, tecnología, ingeniería y matemáticas con otras áreas, sobre problemas de contextos reales.', c: SIN, pg: 89, k: '4.3.2.', i: 'i-lucide-atom' },
  { n: 'Programación y pensamiento computacional', g: 'Emergentes', d: 'Programar para dar forma a las ideas y fortalecer la lógica y la resolución de problemas.', c: 'Requiere equipos', pg: 89, k: '4.3.3.', i: 'i-lucide-code-xml' }
]
export const SIN_CONEXION = SIN
export const METODOLOGIAS = ['Que el co-piloto sugiera la más pertinente', ...ESTRATEGIAS.map(e => e.n), 'Ninguna en particular']

const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const VACIAS = new Set('que los las del con para por una uno como mas sus son entre sobre desde este esta estos estas ese esa hay ser sin sea cada todo toda todos todas tambien donde cuando muy pero porque asi cual les nos han fue era puede pueden debe deben clase clases planeacion genere propuesta inicial coordenadas'.split(' '))
const palabras = t => (norm(t).match(/[a-z0-9ñ]{3,}/g) || []).filter(w => !VACIAS.has(w))

function trozos(texto, tam) {
  const out = []; let i = 0
  while (i < texto.length) {
    let j = Math.min(i + tam, texto.length)
    if (j < texto.length) { const k = texto.lastIndexOf(' ', j); if (k > i + tam * 0.6) j = k }
    out.push(texto.slice(i, j).trim()); i = j
  }
  return out.filter(x => x.length > 80)
}
const cache = new Map()
function indexar(clave, partes) {
  if (!cache.has(clave)) cache.set(clave, partes.flatMap(x => trozos(x.t, 1100).map(t => ({ doc: x.doc, p: x.p, t, k: palabras(t) }))))
  return cache.get(clave)
}
export const olvidar = clave => cache.delete(clave)

// Búsqueda por relevancia (BM25 simplificado)
function ordenar(trozosDoc, consulta, n) {
  const q = [...new Set(palabras(consulta))]
  if (!q.length || !trozosDoc.length) return []
  const df = {}; q.forEach(w => { df[w] = trozosDoc.reduce((a, c) => a + (c.k.includes(w) ? 1 : 0), 0) })
  return trozosDoc.map(c => {
    let sc = 0
    for (const w of q) {
      if (!df[w]) continue
      let tf = 0; for (const x of c.k) if (x === w) tf++
      if (tf) sc += (tf / (tf + 1.2)) * Math.log(1 + trozosDoc.length / df[w])
    }
    return { c, sc }
  }).filter(x => x.sc > 1.2).sort((a, b) => b.sc - a.sc).slice(0, n).map(x => x.c)
}

let base = null, cargando = null
export function cargarBase() {
  if (base) return Promise.resolve(base)
  if (!cargando) cargando = import('./orientaciones-ti.json').then(m => (base = m.default)).catch(() => null).finally(() => { cargando = null })
  return cargando
}
const grupoDe = g => { const n = parseInt(g); return n <= 3 ? '1-3' : n <= 5 ? '4-5' : n <= 7 ? '6-7' : n <= 9 ? '8-9' : '10-11' }

export async function referentes(cfg, solicitud, docs) {
  const out = [], cola = [], q = [cfg.asignatura, cfg.tema, cfg.objetivo, cfg.metodologia, solicitud].join(' ')
  const esTI = /tecnolog|informat/.test(norm(cfg.asignatura))
  const est = ESTRATEGIAS.find(e => e.n === cfg.metodologia && e.pg)
  if (esTI || est) {
    const b = await cargarBase()
    if (b) {
      const pag = n => b.paginas.find(x => x.p === n)
      if (esTI && parseInt(cfg.grado)) (b.grados[grupoDe(cfg.grado)] || []).forEach(n => { const x = pag(n); if (x) out.push({ doc: DOC_BASE, p: n, t: x.t.slice(0, 3400) }) })
      if (est) { const x = pag(est.pg); if (x) { const i = Math.max(0, x.t.indexOf(est.k)); out.push({ doc: DOC_BASE, p: est.pg, t: x.t.slice(i, i + 2200) }) } }
      if (esTI) ordenar(indexar('base', b.paginas.map(x => ({ doc: DOC_BASE, p: x.p, t: x.t }))), q, 3).forEach(c => cola.push(c))
    }
  }
  const area = norm(cfg.asignatura)
  const mios = (docs || []).filter(d => d.area === 'Todas las áreas' || (area && (area.includes(norm(d.area)) || norm(d.area).includes(area))))
  ordenar(mios.flatMap(d => indexar(d.id, [{ doc: d.nombre, p: 0, t: d.texto }])), q, 3).forEach(c => out.push(c))
  out.push(...cola)
  let total = 0; const vistos = new Set()
  return out.filter(r => {
    const k = r.doc + r.p + r.t.slice(0, 40)
    if (vistos.has(k) || total > 14000) return false
    vistos.add(k); total += r.t.length; return true
  }).map(r => ({ doc: r.doc, p: r.p, fuente: r.doc + (r.p ? ', p. ' + r.p : ''), texto: r.t }))
}

export function fuentesDe(refs) {
  const m = new Map()
  refs.forEach(r => { if (!m.has(r.doc)) m.set(r.doc, new Set()); if (r.p) m.get(r.doc).add(r.p) })
  return [...m].map(([d, ps]) => d + (ps.size ? ', pp. ' + [...ps].sort((a, b) => a - b).join(', ') : ''))
}

// Lee el texto de un PDF, Word o texto plano en el navegador
export async function leerArchivo(f) {
  const n = f.name.toLowerCase()
  if (n.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist')
    const worker = (await import('pdfjs-dist/build/pdf.worker.min.js?url')).default
    pdfjs.GlobalWorkerOptions.workerSrc = worker
    const pdf = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise
    let t = ''
    for (let i = 1; i <= Math.min(pdf.numPages, 200); i++) {
      const c = await (await pdf.getPage(i)).getTextContent()
      t += c.items.map(x => x.str).join(' ') + '\n\n'
    }
    return limpiar(t)
  }
  if (n.endsWith('.docx')) {
    const mammoth = (await import('mammoth/mammoth.browser.js')).default
    return limpiar((await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })).value)
  }
  return limpiar(await f.text())
}
const limpiar = t => t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
