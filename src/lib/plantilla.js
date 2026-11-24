// Plantilla de plan de clase del docente (.docx).
// 1. detecta los espacios para llenar: celdas vacías, «Campo:» sin respuesta y líneas ______
// 2. el agente reparte la planeación en esos campos (JSON)
// 3. se escribe el texto en el archivo original, conservando su formato, tablas, logos y encabezados
import JSZip from 'jszip'

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const hijos = (el, nombre) => [...el.children].filter(e => e.localName === nombre)
const textoDe = el => [...el.getElementsByTagNameNS(W, 't')].map(t => t.textContent).join('')
const esVacio = s => !String(s).replace(/[\s_.\-…·]/g, '').length
const esEtiqueta = s => /[:：]\s*$/.test(s) && s.length <= 90
const limpiarEtiqueta = s => s.replace(/_{3,}/g, ' ').replace(/[:：]\s*$/, '').replace(/\s+/g, ' ').trim()
const dentroDeTabla = el => { for (let p = el.parentElement; p; p = p.parentElement) if (p.localName === 'tbl') return true; return false }

function nuevoRun(doc, texto, rPrModelo) {
  const r = doc.createElementNS(W, 'w:r')
  if (rPrModelo) { const rp = rPrModelo.cloneNode(true); r.appendChild(rp) }
  const t = doc.createElementNS(W, 'w:t')
  t.setAttribute('xml:space', 'preserve'); t.textContent = texto
  r.appendChild(t); return r
}
// rPr de la marca de párrafo (w:pPr/w:rPr) → formato de las letras nuevas
function rPrDeParrafo(p) {
  const ppr = hijos(p, 'pPr')[0], rpr = ppr && hijos(ppr, 'rPr')[0]
  if (!rpr) return null
  const c = rpr.ownerDocument.createElementNS(W, 'w:rPr')
  for (const k of [...rpr.children]) c.appendChild(k.cloneNode(true))
  return c
}
// Reemplaza el contenido de un párrafo por varias líneas (cada línea, un párrafo con el mismo estilo)
function escribirEnParrafo(p, texto) {
  const doc = p.ownerDocument, rpr = rPrDeParrafo(p)
  const lineas = String(texto).split(/\n+/).map(l => l.trim()).filter(Boolean)
  if (!lineas.length) return
  for (const k of [...p.children]) if (k.localName !== 'pPr') p.removeChild(k)
  p.appendChild(nuevoRun(doc, lineas[0], rpr))
  let ultimo = p
  for (const l of lineas.slice(1)) {
    const np = doc.createElementNS(W, 'w:p')
    const ppr = hijos(p, 'pPr')[0]; if (ppr) np.appendChild(ppr.cloneNode(true))
    np.appendChild(nuevoRun(doc, l, rpr && rpr.cloneNode(true)))
    ultimo.parentNode.insertBefore(np, ultimo.nextSibling); ultimo = np
  }
}
function escribirEnCelda(tc, texto) {
  const ps = hijos(tc, 'p')
  ps.slice(1).forEach(p => tc.removeChild(p))
  escribirEnParrafo(ps[0], texto)
}
function agregarAlParrafo(p, texto) {
  const lineas = String(texto).split(/\n+/).map(l => l.trim()).filter(Boolean)
  if (!lineas.length) return
  const runs = hijos(p, 'r'), base = runs.length ? hijos(runs[runs.length - 1], 'rPr')[0] : null
  let rpr = base ? base.cloneNode(true) : rPrDeParrafo(p)
  if (rpr) for (const b of [...rpr.children]) if (['b', 'bCs'].includes(b.localName)) rpr.removeChild(b)
  p.appendChild(nuevoRun(p.ownerDocument, ' ' + lineas[0], rpr))
  if (lineas.length > 1) {
    const np = p.ownerDocument.createElementNS(W, 'w:p')
    const ppr = hijos(p, 'pPr')[0]; if (ppr) np.appendChild(ppr.cloneNode(true))
    p.parentNode.insertBefore(np, p.nextSibling)
    escribirEnParrafo(np, lineas.slice(1).join('\n'))
  }
}
// «Docente: ______  Fecha: ______» → reemplaza la línea número k
function reemplazarLinea(p, k, texto) {
  let n = -1
  for (const t of p.getElementsByTagNameNS(W, 't')) {
    t.textContent = t.textContent.replace(/_{3,}/g, m => (++n === k ? ' ' + String(texto).replace(/\s*\n+\s*/g, '; ') + ' ' : m))
    t.setAttribute('xml:space', 'preserve')
    if (n >= k) break
  }
}

function detectar(doc) {
  const campos = []
  const agregar = (etiqueta, contexto, aplicar) => {
    etiqueta = limpiarEtiqueta(etiqueta).slice(0, 140)
    if (etiqueta && campos.length < 120) campos.push({ id: 'c' + (campos.length + 1), etiqueta, contexto: contexto || '', aplicar })
  }
  const body = doc.getElementsByTagNameNS(W, 'body')[0]
  let seccion = ''   // último título visto, como contexto

  const lineas = (p, contexto) => {
    const t = textoDe(p)
    if (!/_{3,}/.test(t)) return false
    const partes = t.split(/_{3,}/)
    partes.slice(0, -1).forEach((antes, k) => {
      const et = antes.split(/[.;]\s/).pop() || seccion || 'Campo'
      agregar(et, contexto, v => reemplazarLinea(p, k, v))
    })
    return true
  }

  const recorrer = nodos => {
    for (const el of nodos) {
      if (el.localName === 'p') {
        const t = textoDe(el).trim()
        if (!t) continue
        if (lineas(el, seccion)) continue
        if (esEtiqueta(t)) {
          let sig = el.nextElementSibling
          const sigTexto = sig && sig.localName === 'p' ? textoDe(sig).trim() : null
          if (sig && sig.localName === 'p' && esVacio(sigTexto)) { const destino = sig; agregar(t, seccion, v => escribirEnParrafo(destino, v)) }
          else if (!sig || sig.localName !== 'p' || esEtiqueta(sigTexto)) agregar(t, seccion, v => agregarAlParrafo(el, v))
        } else if (t.length < 90) seccion = t
      } else if (el.localName === 'tbl') tabla(el)
      else if (el.localName === 'sdt') { const c = hijos(el, 'sdtContent')[0]; if (c) recorrer([...c.children]) }
    }
  }

  const tabla = tbl => {
    const filas = hijos(tbl, 'tr').map(tr => {
      let col = 0
      return hijos(tr, 'tc').map(tc => {
        const pr = hijos(tc, 'tcPr')[0], gs = pr && hijos(pr, 'gridSpan')[0]
        const span = gs ? +gs.getAttributeNS(W, 'val') || +gs.getAttribute('w:val') || 1 : 1
        const c = { tc, col, span, texto: textoDe(tc).trim(), anidada: tc.getElementsByTagNameNS(W, 'tbl').length > 0 }
        col += span; return c
      })
    })
    const enCol = (fila, col) => fila?.find(c => col >= c.col && col < c.col + c.span)
    filas.forEach((fila, i) => {
      fila.forEach((c, j) => {
        if (c.anidada) { recorrer([...c.tc.children].filter(e => e.localName === 'tbl')); return }
        if (esVacio(c.texto)) {
          const izq = [...fila.slice(0, j)].reverse().find(x => !esVacio(x.texto))?.texto || ''
          let arriba = ''
          for (let k = i - 1; k >= 0; k--) { const a = enCol(filas[k], c.col); if (a && !esVacio(a.texto)) { arriba = a.texto; break } }
          const partes = [arriba, izq].filter((x, n, arr) => x && arr.indexOf(x) === n).map(limpiarEtiqueta)
          if (partes.length) agregar(partes.join(' › '), seccion, v => escribirEnCelda(c.tc, v))
          return
        }
        const ps = hijos(c.tc, 'p')
        for (const p of ps) if (lineas(p, seccion)) return
        if (esEtiqueta(c.texto)) {
          const der = fila[j + 1]
          if (!der || !esVacio(der.texto)) { const ult = ps[ps.length - 1]; agregar(c.texto, seccion, v => agregarAlParrafo(ult, v)) }
        }
      })
    })
  }

  recorrer([...body.children])
  return campos
}

async function abrir(buf) {
  const zip = await JSZip.loadAsync(buf)
  const f = zip.file('word/document.xml')
  if (!f) throw new Error('No es un documento de Word (.docx) válido.')
  const doc = new DOMParser().parseFromString(await f.async('string'), 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('No se pudo leer el documento.')
  return { zip, doc }
}

export async function analizarPlantilla(buf) {
  const { doc } = await abrir(buf)
  return detectar(doc).map(({ id, etiqueta, contexto }) => ({ id, etiqueta, contexto }))
}

export async function llenarPlantilla(buf, valores) {
  const { zip, doc } = await abrir(buf)
  let llenos = 0
  const campos = detectar(doc)
  // En orden inverso: así reemplazar una línea ____ no corre la posición de las siguientes del mismo párrafo
  for (const c of [...campos].reverse()) {
    const v = valores[c.id]
    if (typeof v === 'string' && v.trim()) { c.aplicar(v.trim()); llenos++ }
  }
  zip.file('word/document.xml', new XMLSerializer().serializeToString(doc))
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 }, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  return { blob, llenos, total: campos.length }
}

export const aBase64 = buf => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s) }
export const deBase64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer

// Extrae el objeto JSON de la respuesta del agente
export function leerJSON(t) {
  const i = t.indexOf('{'), j = t.lastIndexOf('}')
  if (i < 0 || j < i) throw new Error('sin JSON')
  return JSON.parse(t.slice(i, j + 1))
}
