// Co-piloto Tecnopedagógico · Función del agente (Vercel Edge)
// El Prompt Maestro ROCAS (src/lib/prompt.js) se arma aquí, en el servidor: los docentes no pueden modificarlo.
// Cada docente usa su propia clave de Gemini (capa gratuita), guardada en su cuenta.
import { construir } from '../src/lib/prompt.js'
import { json, usuarioDe, claveDe, abrirGemini } from './_gemini.js'
export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' })
  let usuario
  try { usuario = await usuarioDe(req) } catch (e) { return json(500, { error: 'Faltan variables de entorno' }) }
  if (!usuario) return json(401, { error: 'Sin sesión' })

  // Clave del docente; GEMINI_API_KEY en Vercel es solo un respaldo opcional
  const clave = (await claveDe(usuario)) || process.env.GEMINI_API_KEY || ''
  if (!clave) return json(428, { error: 'Falta la clave de Gemini', detalle: 'Conecte su clave de Gemini para usar el co-piloto.' })

  let b
  try { b = await req.json() } catch (e) { return json(400, { error: 'Solicitud no válida' }) }
  const { system, texto } = construir(b)

  const g = await abrirGemini(clave, JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: texto }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 16384 } // temperatura baja, según el Documento 06
  }))
  if (!g.r) return json(g.estado === 429 ? 429 : [400, 401, 403].includes(g.estado) ? 403 : 502, { error: 'El modelo no respondió', detalle: g.detalle || 'Error ' + g.estado })

  // Convierte el flujo SSE de Gemini en texto plano para el navegador
  const dec = new TextDecoder(), enc = new TextEncoder()
  let buf = ''
  const emitir = (linea, ctl) => {
    if (!linea.startsWith('data:')) return
    try {
      const j = JSON.parse(linea.slice(5))
      for (const p of j.candidates?.[0]?.content?.parts || []) if (p.text && !p.thought) ctl.enqueue(enc.encode(p.text))
    } catch (e) { /* línea incompleta o de control */ }
  }
  const salida = g.r.body.pipeThrough(new TransformStream({
    transform(chunk, ctl) {
      buf += dec.decode(chunk, { stream: true })
      const lineas = buf.split(/\r?\n/)
      buf = lineas.pop()
      for (const l of lineas) emitir(l, ctl)
    },
    flush(ctl) { if (buf) emitir(buf, ctl) }
  }))
  return new Response(salida, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}
