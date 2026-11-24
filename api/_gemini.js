// Utilidades del servidor (los archivos que empiezan con _ no son rutas en Vercel)

export const json = (status, cuerpo) => new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

export function entorno() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Faltan SUPABASE_URL y SUPABASE_ANON_KEY')
  return { url: SUPABASE_URL, anon: SUPABASE_ANON_KEY }
}

// Verifica la sesión del docente con Supabase y devuelve su usuario
export async function usuarioDe(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { url, anon } = entorno()
  const r = await fetch(url + '/auth/v1/user', { headers: { apikey: anon, Authorization: 'Bearer ' + token } })
  if (!r.ok) return null
  return { ...(await r.json()), token }
}

// Consulta la tabla claves con el token del docente: las reglas RLS solo le dejan leer la suya
export async function claveDe(usuario) {
  const { url, anon } = entorno()
  const r = await fetch(url + '/rest/v1/claves?select=clave&limit=1', { headers: { apikey: anon, Authorization: 'Bearer ' + usuario.token } })
  if (!r.ok) return ''
  const filas = await r.json().catch(() => [])
  return filas[0]?.clave || ''
}

export async function guardarClave(usuario, clave, modelo) {
  const { url, anon } = entorno()
  const r = await fetch(url + '/rest/v1/claves?on_conflict=user_id', {
    method: 'POST',
    headers: { apikey: anon, Authorization: 'Bearer ' + usuario.token, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: usuario.id, clave, modelo, updated_at: new Date().toISOString() })
  })
  return r.ok
}

export async function borrarClave(usuario) {
  const { url, anon } = entorno()
  await fetch(url + '/rest/v1/claves?user_id=eq.' + usuario.id, { method: 'DELETE', headers: { apikey: anon, Authorization: 'Bearer ' + usuario.token } })
}

// Abre una respuesta de Gemini probando modelos de respaldo si uno está saturado o no existe para la clave
export async function abrirGemini(clave, cuerpo, ruta = 'streamGenerateContent?alt=sse') {
  const modelos = [...new Set([process.env.GEMINI_MODEL || 'gemini-flash-latest', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest'])]
  let estado = 502, detalle = ''
  for (const modelo of modelos) {
    for (let intento = 0; intento < 2; intento++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:${ruta}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave }, body: cuerpo
      })
      if (r.ok && r.body) return { r, modelo }
      estado = r.status
      try { detalle = ((await r.json()).error?.message || '').slice(0, 300) } catch (e) { detalle = '' }
      console.error('Gemini', modelo, estado, detalle)
      if (estado === 429 || ([400, 401, 403].includes(estado) && !/not found|not supported/i.test(detalle))) return { estado, detalle }
      if ([500, 503, 504].includes(estado) && intento === 0) { await new Promise(ok => setTimeout(ok, 1500)); continue }
      break
    }
  }
  return { estado, detalle }
}
