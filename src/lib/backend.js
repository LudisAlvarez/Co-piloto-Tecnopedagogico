// Capa de servicios del Co-piloto.
// Dos destinos con la misma interfaz:
//   - Vercel (modo por defecto): cuentas y datos en Supabase, agente con Gemini en /api/agente.
//   - Claude (modo "claude"): prototipo; cuentas simuladas en el navegador y agente con Claude.
import { construir } from './prompt.js'

export const EN_HTML = import.meta.env.MODE === 'html'
// Prototipo (Claude o archivo HTML): cuentas simuladas en el navegador
export const EN_CLAUDE = import.meta.env.MODE === 'claude' || EN_HTML

// Archivo HTML abierto fuera de Claude: el agente llama a Gemini con la clave que el docente pega
export const claveGemini = {
  leer() { try { return localStorage.getItem('cp.gemini') || '' } catch (e) { return '' } },
  guardar(k) { try { k ? localStorage.setItem('cp.gemini', k.trim()) : localStorage.removeItem('cp.gemini') } catch (e) {} }
}
// Modelos que se prueban en orden: si uno está saturado o no existe para la clave, se pasa al siguiente
export const MODELOS_GEMINI = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest']
const espera = ms => new Promise(r => setTimeout(r, ms))
async function detalleGemini(r) {
  try { const j = await r.json(); return (j.error?.message || '').slice(0, 300) } catch (e) { return '' }
}
// Abre el flujo con el primer modelo que responda; reintenta una vez si Gemini está saturado
async function abrirGemini(clave, cuerpoJson, signal, ruta = 'streamGenerateContent?alt=sse') {
  let ultimo = null
  for (const modelo of MODELOS_GEMINI) {
    for (let intento = 0; intento < 2; intento++) {
      let r
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:${ruta}`, {
          method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave }, body: cuerpoJson
        })
      } catch (e) {
        if (signal?.aborted) throw e
        const err = errorCon(0, 'red'); err.detalle = 'No se pudo conectar con Gemini desde este navegador. Revise la conexión a internet; si usa una red institucional, puede estar bloqueando generativelanguage.googleapis.com.'; throw err
      }
      if (r.ok && r.body) return { r, modelo }
      const detalle = await detalleGemini(r)
      ultimo = Object.assign(errorCon(r.status, 'gemini'), { detalle: detalle || `Error HTTP ${r.status}`, modelo })
      if ([400, 401, 403].includes(r.status) && !/not found|not supported/i.test(detalle)) throw ultimo   // clave o solicitud inválida: no sirve cambiar de modelo
      if (r.status === 429) throw ultimo                                                                    // cuota agotada
      if ([500, 503, 504].includes(r.status) && intento === 0) { await espera(1500); continue }            // saturado: reintenta una vez
      break                                                                                                 // 404 u otro: siguiente modelo
    }
  }
  throw ultimo
}
async function geminiDirecto(cuerpo, { signal, onText }) {
  const clave = claveGemini.leer()
  if (!clave) throw errorCon(428, 'Falta la clave de Gemini')
  const { system, texto } = construir(cuerpo)
  const { r } = await abrirGemini(clave, JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: texto }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 16384 } }), signal)
  const lector = r.body.getReader(), dec = new TextDecoder()
  let buf = '', out = '', motivo = ''
  const leerLinea = l => {
    if (!l.startsWith('data:')) return
    try {
      const j = JSON.parse(l.slice(5)), c = j.candidates?.[0]
      for (const p of c?.content?.parts || []) if (p.text && !p.thought) { out += p.text; onText(out) }
      if (c?.finishReason && c.finishReason !== 'STOP') motivo = c.finishReason
      if (j.promptFeedback?.blockReason) motivo = j.promptFeedback.blockReason
      if (j.error?.message) motivo = j.error.message
    } catch (e) {}
  }
  for (;;) {
    const { done, value } = await lector.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lineas = buf.split(/\r?\n/); buf = lineas.pop()
    lineas.forEach(leerLinea)
  }
  if (buf) leerLinea(buf)
  if (!out.trim()) throw Object.assign(errorCon(502, 'vacia'), { detalle: motivo ? 'Gemini terminó sin texto (' + motivo + ').' : 'Gemini terminó sin devolver texto.' })
  return out
}
// Prueba rápida de la clave: responde con el modelo que funcionó o con el error exacto
export async function probarGemini(clave) {
  const { r, modelo } = await abrirGemini(clave.trim(), JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Responde solo: OK' }] }], generationConfig: { maxOutputTokens: 200 } }), undefined, 'generateContent')
  const j = await r.json().catch(() => ({}))
  return { modelo, texto: j.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '' }
}

const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d } catch (e) { return d } }
const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true } catch (e) { return false } }

function errorCon(status, msg) { const e = new Error(msg || 'error'); e.status = status; return e }

/* ------------------------------------------------------------------ */
/* Prototipo en Claude                                                 */
/* ------------------------------------------------------------------ */
const claude = {
  async iniciar() { return leer('cp.usuario', null) },
  async ingresar(correo) {
    const nombres = leer('cp.nombres', {})
    const u = { id: 'demo-' + correo.toLowerCase(), email: correo, nombre: nombres[correo.toLowerCase()] || '' }
    escribir('cp.usuario', u)
    return u
  },
  async registrar({ nombre, correo, clave }) {
    const nombres = leer('cp.nombres', {}); nombres[correo.toLowerCase()] = nombre; escribir('cp.nombres', nombres)
    return claude.ingresar(correo, clave)
  },
  async salir() { try { localStorage.removeItem('cp.usuario') } catch (e) {} },
  async conGoogle() { throw errorCon(400, 'El ingreso con Google funciona en la versión publicada en Vercel.') },
  // En Claude no hace falta clave; en el archivo HTML se guarda en este navegador
  async estadoClave() {
    if (!EN_HTML || window.claude) return { tiene: true, final: '', sinClave: true }
    const k = claveGemini.leer(); return { tiene: !!k, final: k.slice(-4) }
  },
  async guardarClave(clave) { const r = await probarGemini(clave); claveGemini.guardar(clave); return { ok: true, modelo: r.modelo, final: clave.trim().slice(-4) } },
  async quitarClave() { claveGemini.guardar('') },
  _k(t, u) { return 'cp.' + t + '.' + u.id },
  async listar(tabla, u) { return leer(claude._k(tabla, u), []) },
  async guardar(tabla, u, fila) {
    const filas = leer(claude._k(tabla, u), []).filter(x => x.id !== fila.id)
    if (!escribir(claude._k(tabla, u), [fila, ...filas].slice(0, 40))) throw errorCon(507, 'Sin espacio en el navegador')
  },
  async borrar(tabla, u, id) { escribir(claude._k(tabla, u), leer(claude._k(tabla, u), []).filter(x => x.id !== id)) },
  async agente(cuerpo, { signal, onText }) {
    const sample = window.claude ? await window.claude.use('sample') : null
    if (!sample && EN_HTML) return geminiDirecto(cuerpo, { signal, onText })
    if (!sample) throw errorCon(503, 'El agente no está disponible en esta vista')
    const { system, texto } = construir(cuerpo)
    try {
      const r = await sample(system + '\n\n' + texto, { cache: false, signal, onText: ({ text }) => onText(text) })
      return r.text
    } catch (e) {
      if (signal?.aborted) throw e
      throw errorCon(e?.code === 'rate_limited' ? 429 : 502, e?.message)
    }
  },
  async descargar(nombre, blob) {
    const dl = window.claude ? await window.claude.use('downloads') : null
    if (!dl && EN_HTML) return vercel.descargar(nombre, blob)
    if (!dl) throw errorCon(503, 'Descargas no disponibles')
    await dl.save({ filename: nombre, data: blob })
  }
}

/* ------------------------------------------------------------------ */
/* Vercel + Supabase + Gemini                                          */
/* ------------------------------------------------------------------ */
let sb = null
const tablaDatos = { planeaciones: 'datos' }
const aUsuario = u => u && ({ id: u.id, email: u.email, nombre: u.user_metadata?.nombre || u.user_metadata?.full_name || u.user_metadata?.name || '' })
const volverAqui = () => location.origin + location.pathname
async function token() { const { data } = await sb.auth.getSession(); return data.session?.access_token || '' }
async function llamar(ruta, metodo = 'GET', cuerpo) {
  let r
  try { r = await fetch(ruta, { method: metodo, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() }, body: cuerpo ? JSON.stringify(cuerpo) : undefined }) }
  catch (e) { throw Object.assign(errorCon(0, 'red'), { detalle: 'No hay conexión con el servidor.' }) }
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(errorCon(r.status, j.error || 'error'), { detalle: j.detalle, texto: j.error })
  return j
}

const vercel = {
  async iniciar() {
    const c = await (await fetch('/api/config')).json()
    if (!c.url || !c.anonKey) throw errorCon(500, 'Sin configurar')
    const { createClient } = await import('@supabase/supabase-js')
    // PKCE: al volver de Google llega ?code=… (no choca con el enrutador, que usa el #)
    sb = createClient(c.url, c.anonKey, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } })
    const { data } = await sb.auth.getSession()
    if (/[?&](code|error)=/.test(location.search)) history.replaceState(null, '', volverAqui() + location.hash)
    return aUsuario(data.session?.user)
  },
  async ingresar(correo, clave) {
    const { data, error } = await sb.auth.signInWithPassword({ email: correo, password: clave })
    if (error) throw errorCon(401, 'Correo o contraseña incorrectos.')
    return aUsuario(data.user)
  },
  async registrar({ nombre, correo, clave }) {
    const { data, error } = await sb.auth.signUp({ email: correo, password: clave, options: { data: { nombre }, emailRedirectTo: volverAqui() } })
    if (error) throw errorCon(400, /registered|already/i.test(error.message) ? 'Ya existe una cuenta con ese correo. Use «Ingresar».' : /password/i.test(error.message) ? 'La contraseña debe tener al menos 8 caracteres.' : 'No se pudo crear la cuenta. Revise el correo e inténtelo de nuevo.')
    if (!data.session) throw Object.assign(errorCon(202, 'Le enviamos un correo a ' + correo + '. Ábralo y pulse el enlace para confirmar su cuenta; después ingrese aquí.'), { aviso: true })
    return aUsuario(data.user)
  },
  async conGoogle() {
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: volverAqui() } })
    if (error) throw errorCon(400, 'No se pudo abrir el ingreso con Google. Inténtelo de nuevo.')
  },
  // Clave de Gemini del docente: se guarda en su cuenta y solo la usa el servidor
  async estadoClave() { return llamar('/api/clave') },
  async guardarClave(clave) { return llamar('/api/clave', 'POST', { clave }) },
  async quitarClave() { return llamar('/api/clave', 'DELETE') },
  async salir() { try { await sb.auth.signOut() } catch (e) {} },
  async listar(tabla) {
    if (tabla === 'planeaciones') {
      const { data, error } = await sb.from('planeaciones').select('datos').order('updated_at', { ascending: false }).limit(50)
      if (error) throw error
      return data.map(r => r.datos)
    }
    const { data, error } = await sb.from(tabla).select('*').order('created_at', { ascending: false }).limit(20)
    if (error) throw error
    return data
  },
  async guardar(tabla, u, fila) {
    const registro = tablaDatos[tabla] ? { id: fila.id, datos: fila, updated_at: new Date().toISOString() } : fila
    const { error } = await sb.from(tabla).upsert(registro)
    if (error) throw error
  },
  async borrar(tabla, u, id) { await sb.from(tabla).delete().eq('id', id) },
  async agente(cuerpo, { signal, onText }) {
    const { data } = await sb.auth.getSession()
    const r = await fetch('/api/agente', {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (data.session?.access_token || '') },
      body: JSON.stringify(cuerpo)
    })
    if (!r.ok || !r.body) { const j = await r.json().catch(() => ({})); throw Object.assign(errorCon(r.status, 'agente'), { detalle: j.detalle }) }
    const lector = r.body.getReader(), dec = new TextDecoder()
    let texto = ''
    for (;;) {
      const { done, value } = await lector.read()
      if (done) break
      texto += dec.decode(value, { stream: true })
      onText(texto)
    }
    return texto
  },
  async descargar(nombre, blob) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = nombre
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }
}

export const api = EN_CLAUDE ? claude : vercel

export function mensajeError(e, contexto = 'agente') {
  if (e?.name === 'AbortError') return 'Generación detenida. Se conserva la versión anterior.'
  if (e?.status === 428) return 'Falta su clave de Gemini. Conéctela en el menú con su nombre → «Clave de Gemini».'
  if (e?.detalle) {
    if (e.status === 429) return 'Gemini dice que se agotó la cuota de su clave por ahora. Espere un minuto o revise los límites en aistudio.google.com. Detalle: ' + e.detalle
    if ([400, 401, 403].includes(e.status)) return 'Gemini rechazó la solicitud. Revise la clave en el menú con su nombre → «Clave de Gemini» → «Probar conexión». Detalle: ' + e.detalle
    return 'Gemini no pudo responder' + (e.status ? ` (código ${e.status})` : '') + '. Detalle: ' + e.detalle.replace(/\.?$/, '.') + ' Su trabajo sigue guardado; inténtelo de nuevo en un momento.'
  }
  if (e?.status === 429) return 'Se alcanzó el límite de uso del agente por ahora. Espere un minuto y vuelva a intentarlo. Su trabajo sigue guardado.'
  if (e?.status === 401) return 'Su sesión venció. Cierre sesión e ingrese de nuevo.'
  if (e?.status === 500) return 'El agente aún no está configurado en el servidor. Avise al equipo investigador.'
  if (e?.status === 503) return EN_CLAUDE ? 'El agente no está disponible en esta vista. Abra el prototipo publicado dentro de Claude.' : 'El servicio no está disponible. Inténtelo más tarde.'
  return contexto === 'agente'
    ? 'No se pudo completar la respuesta (posible falla de conexión). Su trabajo sigue guardado; inténtelo de nuevo.'
    : 'Algo falló. Revise la conexión e inténtelo de nuevo.'
}
