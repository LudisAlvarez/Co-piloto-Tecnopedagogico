// Clave de Gemini de cada docente.
// GET: dice si el docente ya tiene clave (sin devolverla). POST {clave}: la prueba con Gemini y, si funciona, la guarda.
// DELETE: la elimina. La clave solo la lee el servidor; las reglas RLS impiden que otro docente la vea.
import { json, usuarioDe, claveDe, guardarClave, borrarClave, abrirGemini } from './_gemini.js'
export const config = { runtime: 'edge' }

export default async function handler(req) {
  let usuario
  try { usuario = await usuarioDe(req) } catch (e) { return json(500, { error: 'El servidor no está configurado.' }) }
  if (!usuario) return json(401, { error: 'Su sesión venció. Ingrese de nuevo.' })

  if (req.method === 'GET') {
    const clave = await claveDe(usuario)
    return json(200, { tiene: !!clave, final: clave ? clave.slice(-4) : '' })
  }
  if (req.method === 'DELETE') { await borrarClave(usuario); return json(200, { ok: true }) }
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' })

  let b
  try { b = await req.json() } catch (e) { return json(400, { error: 'Solicitud no válida.' }) }
  const clave = String(b.clave || '').trim()
  if (!/^[\w-]{20,200}$/.test(clave)) return json(400, { error: 'Eso no parece una clave de Gemini. Cópiela completa desde Google AI Studio.' })

  const prueba = await abrirGemini(clave, JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Responde solo: OK' }] }], generationConfig: { maxOutputTokens: 200 } }), 'generateContent')
  if (!prueba.r) return json(prueba.estado === 429 ? 429 : 400, { error: 'Gemini no aceptó la clave.', detalle: prueba.detalle || 'Error ' + prueba.estado, estado: prueba.estado })
  if (!(await guardarClave(usuario, clave, prueba.modelo))) return json(500, { error: 'La clave funciona, pero no se pudo guardar. Revise que la tabla «claves» exista en Supabase.' })
  return json(200, { ok: true, modelo: prueba.modelo, final: clave.slice(-4) })
}
