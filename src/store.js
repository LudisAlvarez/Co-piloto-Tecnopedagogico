// Estado compartido de la aplicación y acciones del agente
import { reactive, computed } from 'vue'
import { api, mensajeError } from './lib/backend.js'
import { referentes, fuentesDe, olvidar } from './lib/repositorio.js'
import { uid, separar, sinMarcas } from './lib/util.js'
import { analizarPlantilla, llenarPlantilla, deBase64, leerJSON } from './lib/plantilla.js'

export const st = reactive({
  listo: false,           // ya se consultó la sesión
  errorConfig: '',        // la app no está configurada (solo Vercel)
  usuario: null,
  planes: [],             // planeaciones del docente
  docs: [],               // documentos del repositorio del docente
  plantilla: null,        // plantilla .docx de plan de clase del docente
  clave: { tiene: false, final: '' },  // clave de Gemini del docente (solo se sabe si existe)
  actual: null,           // planeación abierta
  ocupado: false,         // el agente está respondiendo
  borrador: '',           // texto en vivo mientras el agente escribe
  estadoGuardado: ''
})

export const estadisticas = computed(() => ({
  iniciadas: st.planes.length,
  conBorrador: st.planes.filter(p => p.plan).length,
  llevadas: st.planes.filter(p => p.exportada).length
}))

export async function iniciarSesion() {
  try { st.usuario = await api.iniciar() } catch (e) { st.errorConfig = 'La aplicación aún no está configurada. Revise las variables de entorno en Vercel (archivo LEEME).' }
  if (st.usuario) await cargarDatos()
  st.listo = true
}

async function cargarDatos() {
  const [planes, docs, plantillas] = await Promise.all([
    api.listar('planeaciones', st.usuario).catch(() => []),
    api.listar('documentos', st.usuario).catch(() => []),
    api.listar('plantillas', st.usuario).catch(() => [])
  ])
  st.planes = planes; st.docs = docs; st.plantilla = plantillas[0] || null; st.actual = null
  await revisarClave()
}

export async function revisarClave() {
  try { st.clave = await api.estadoClave() } catch (e) { st.clave = { tiene: false, final: '', error: true } }
}
export async function conectarClave(clave) { const r = await api.guardarClave(clave); st.clave = { tiene: true, final: r.final, modelo: r.modelo }; return r }
export async function desconectarClave() { await api.quitarClave(); st.clave = { tiene: false, final: '' } }
export const conGoogle = () => api.conGoogle()
export async function ingresar(correo, clave) { st.usuario = await api.ingresar(correo, clave); await cargarDatos() }
export async function registrar(datos) { st.usuario = await api.registrar(datos); await cargarDatos() }
export async function salir() { await api.salir(); Object.assign(st, { usuario: null, planes: [], docs: [], plantilla: null, actual: null, clave: { tiene: false, final: '' } }) }

export function guardar(p = st.actual) {
  if (!p || !st.usuario) return
  p.updated = Date.now()
  st.planes = [p, ...st.planes.filter(x => x.id !== p.id)].slice(0, 50)
  const h = new Date(p.updated).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  return api.guardar('planeaciones', st.usuario, JSON.parse(JSON.stringify(p)))
    .then(() => { st.estadoGuardado = 'Guardado en su cuenta · ' + h })
    .catch(() => { st.estadoGuardado = 'No se pudo guardar en la nube · ' + h })
}

// Completa los campos nuevos en planeaciones creadas con versiones anteriores
export function normalizar(p) {
  if (!p) return p
  p.versiones ||= []; p.chat ||= []
  p.fuentes ||= []          // registro de fragmentos consultados: { id:'F1', doc, p, texto, turno }
  p.recomendaciones ||= []  // { id:'R1', turno, titulo, fase, propuesta, justificacion, pertinencia, grupo, alternativa, fuentes:[] }
  p.bitacora ||= []         // { id, recId, titulo, decision, justificacion, modificacion, fecha, aplicada }
  p.modelos ||= null        // resumen del agente: cómo influyó cada modelo en la última propuesta
  p.turnos ||= 0
  p.cfg.alumno ||= {}
  return p
}
export function nuevaPlaneacion(cfg, extra = {}) {
  st.actual = normalizar({ id: uid(), cfg, chat: [], plan: '', versiones: [], exportada: false, updated: Date.now(), ...extra })
  guardar()
  return st.actual
}
export function abrir(id) { st.actual = normalizar(st.planes.find(p => p.id === id) || null) }
export function eliminar(id) {
  st.planes = st.planes.filter(p => p.id !== id)
  if (st.actual?.id === id) st.actual = null
  api.borrar('planeaciones', st.usuario, id).catch(() => {})
}
export function marcarExportada() { if (st.actual && !st.actual.exportada) { st.actual.exportada = true; guardar() } }

export function cambiarPlan(nuevo) {
  const p = st.actual
  if (!p || nuevo === p.plan) return
  if (p.plan) p.versiones = [...p.versiones, p.plan].slice(-8)
  p.plan = nuevo; guardar()
}
export function versionAnterior() {
  const p = st.actual
  if (!p?.versiones.length) return false
  p.plan = p.versiones.pop(); guardar(); return true
}

let control = null
export function detener() { control?.abort() }

// Conversación de co-pilotaje: envía la solicitud y actualiza chat y lienzo
export async function enviar(texto, adjuntos = []) {
  const p = st.actual
  texto = (texto || '').trim()
  if (!texto && adjuntos.length) texto = 'Revise el archivo adjunto y dígame cómo usarlo en esta planeación.'
  if (!p || !texto || st.ocupado) return
  // En la conversación solo se guarda el nombre del archivo; el texto viaja únicamente en esta solicitud
  p.chat.push({ id: uid(), role: 'user', text: texto, archivos: adjuntos.map(a => a.nombre) })
  st.ocupado = true; st.borrador = ''; control = new AbortController()
  normalizar(p)
  let refs = []
  const turno = p.turnos + 1
  try {
    const ficha = Object.values(p.cfg.alumno || {}).join(' ')
    refs = registrarFuentes(p, await referentes(p.cfg, texto + ' ' + ficha + ' ' + adjuntos.map(a => a.texto.slice(0, 1500)).join(' '), st.docs), turno)
    const historial = p.chat.slice(-9, -1).filter(m => m.role !== 'nota').map(m => ({ rol: m.role === 'user' ? 'docente' : 'copiloto', texto: m.text.slice(0, 1200) }))
    const full = await api.agente(
      { cfg: p.cfg, plan: p.plan, historial, solicitud: texto, siguienteR: siguienteR(p),
        bitacora: p.bitacora.map(d => ({ recId: d.recId, titulo: d.titulo, decision: d.decision, justificacion: d.justificacion, modificacion: d.modificacion })),
        adjuntos: adjuntos.map(a => ({ nombre: a.nombre, texto: a.texto })),
        referentes: refs.map(r => ({ id: r.id, fuente: r.fuente, texto: r.texto })) },
      { signal: control.signal, onText: t => { st.borrador = t } }
    )
    const r = separar(full)
    const recos = []
    if (r.plan.length > 80 && r.completa) {
      cambiarPlan(r.plan)
      p.turnos = turno
      const validas = new Set(refs.map(x => x.id))
      for (const x of (r.reco?.recomendaciones || []).slice(0, 6)) {
        if (!x || !x.propuesta) continue
        const id = /^R\d+$/.test(x.id) && !p.recomendaciones.some(y => y.id === x.id) ? x.id : 'R' + siguienteR(p)
        const rec = { id, turno, titulo: String(x.titulo || 'Recomendación').slice(0, 120), fase: x.fase || '', propuesta: x.propuesta, justificacion: x.justificacion || '',
          pertinencia: x.pertinencia || {}, grupo: x.grupo || '', alternativa: x.alternativa || '', fuentes: (x.fuentes || []).map(f => String(f).replace(/[[\]]/g, '')).filter(f => validas.has(f)) }
        p.recomendaciones.push(rec); recos.push(rec.id)
      }
      if (r.reco?.modelos) p.modelos = { ...r.reco.modelos, turno }
    }
    p.chat.push({ id: uid(), role: 'assistant', text: r.msg || 'Actualicé la planeación en el lienzo.', fuentes: fuentesDe(refs), fuenteIds: refs.map(x => x.id), recos })
    if (r.plan && !r.completa) p.chat.push({ id: uid(), role: 'nota', text: 'La respuesta quedó incompleta y no se aplicó al lienzo. Pida un ajuste más corto o inténtelo de nuevo.' })
  } catch (e) {
    p.chat.push({ id: uid(), role: 'nota', text: mensajeError(control.signal.aborted ? { name: 'AbortError' } : e) })
  } finally {
    st.ocupado = false; st.borrador = ''; guardar()
  }
}

// Trazabilidad: cada fragmento consultado recibe un id estable dentro de la planeación (F1, F2…)
function registrarFuentes(p, refs, turno) {
  return refs.map(r => {
    const clave = r.doc + '|' + r.p + '|' + r.texto.slice(0, 80)
    let f = p.fuentes.find(x => x.clave === clave)
    if (!f) { f = { id: 'F' + (p.fuentes.length + 1), clave, doc: r.doc, p: r.p, texto: r.texto.slice(0, 1600), turno }; p.fuentes.push(f) }
    return { ...r, id: f.id }
  })
}
const siguienteR = p => p.recomendaciones.reduce((m, r) => Math.max(m, parseInt(r.id.slice(1)) || 0), 0) + 1

// Bitácora de decisiones del docente
export function decisionDe(p, recId) { return [...(p?.bitacora || [])].reverse().find(d => d.recId === recId) || null }
export function decidir(recId, decision, justificacion = '', modificacion = '') {
  const p = st.actual, rec = p?.recomendaciones.find(r => r.id === recId)
  if (!rec) return
  p.bitacora.push({ id: uid(), recId, titulo: rec.titulo, fase: rec.fase, turno: rec.turno, decision, justificacion: justificacion.trim(), modificacion: modificacion.trim(),
    fecha: new Date().toISOString(), aplicada: decision === 'aceptada' })
  guardar()
}
export const pendientesDeAplicar = p => (p?.recomendaciones || []).map(r => decisionDe(p, r.id)).filter(d => d && !d.aplicada)
// Lleva al lienzo las recomendaciones rechazadas o modificadas
export async function aplicarDecisiones() {
  const p = st.actual, pend = pendientesDeAplicar(p)
  if (!pend.length || st.ocupado) return
  const lineas = pend.map(d => d.decision === 'rechazada'
    ? `- ${d.recId} «${d.titulo}»: RECHAZADA. Quítela de la planeación y no la vuelva a proponer. Motivo: ${d.justificacion}`
    : `- ${d.recId} «${d.titulo}»: MODIFICADA. Cambio: ${d.modificacion}. Motivo: ${d.justificacion}`)
  await enviar('Aplique mis decisiones de la bitácora a la planeación:\n' + lineas.join('\n'))
  const ultimo = p.chat[p.chat.length - 1]
  if (ultimo?.role === 'assistant') { pend.forEach(d => { d.aplicada = true }); guardar() }
}

// Análisis curricular de una planeación existente
export async function analizar({ asignatura, grado, plan }, onText, signal) {
  const cfg = { asignatura, grado, tema: plan.slice(0, 500), objetivo: '', metodologia: '' }
  const refs = (await referentes(cfg, '', st.docs)).map((r, i) => ({ ...r, id: 'F' + (i + 1) }))
  const texto = await api.agente({ modo: 'analisis', cfg: { asignatura, grado }, plan, referentes: refs.map(r => ({ id: r.id, fuente: r.fuente, texto: r.texto })) }, { signal, onText })
  return { texto, fuentes: fuentesDe(refs), refs }
}

// Repositorio
export async function agregarDoc(doc) {
  await api.guardar('documentos', st.usuario, doc)
  st.docs = [doc, ...st.docs]
}
export function quitarDoc(id) {
  st.docs = st.docs.filter(d => d.id !== id); olvidar(id)
  api.borrar('documentos', st.usuario, id).catch(() => {})
}

// Plantilla de plan de clase
export async function guardarPlantilla({ nombre, archivo, campos }) {
  const fila = { id: 'plantilla-' + st.usuario.id, nombre, archivo, campos, created_at: new Date().toISOString() }
  await api.guardar('plantillas', st.usuario, fila)
  st.plantilla = fila
}
export function quitarPlantilla() {
  const id = st.plantilla?.id; st.plantilla = null
  if (id) api.borrar('plantillas', st.usuario, id).catch(() => {})
}
// El agente reparte la planeación en los campos de la plantilla y se escribe en el .docx original
export async function exportarEnPlantilla(signal) {
  const p = { ...st.actual, plan: sinMarcas(st.actual.plan) }, buf = deBase64(st.plantilla.archivo)
  const campos = await analizarPlantilla(buf)
  const texto = await api.agente({ modo: 'plantilla', cfg: p.cfg, docente: st.usuario?.nombre || '', plan: p.plan, campos }, { signal, onText: () => {} })
  return llenarPlantilla(deBase64(st.plantilla.archivo), leerJSON(texto))
}
