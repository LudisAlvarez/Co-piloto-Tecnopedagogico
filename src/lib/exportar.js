// Exporta la planeación (Markdown) a Word (.docx) y PDF, en el navegador.
import { marked } from 'marked'
import { sinMarcas } from './util.js'

const ent = s => String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
function tramos(tokens, st = {}) {
  const out = []
  for (const t of tokens || []) {
    if (t.type === 'strong') out.push(...tramos(t.tokens, { ...st, bold: true }))
    else if (t.type === 'em') out.push(...tramos(t.tokens, { ...st, italic: true }))
    else if (t.type === 'br' || (t.type === 'html' && /^<br\s*\/?>/i.test(t.raw))) out.push({ br: true })
    else if (t.type === 'html') continue
    else if (t.tokens?.length) out.push(...tramos(t.tokens, st))
    else out.push({ ...st, text: ent(t.text) })
  }
  return out
}
const enLinea = it => it.tokens.flatMap(t => t.type === 'list'
  ? t.items.flatMap(i => [{ type: 'br' }, { type: 'text', text: '– ' }, ...enLinea(i)])
  : (t.tokens || [{ type: 'text', text: t.text || '' }]))

const PIE = 'Borrador co-diseñado con el Co-piloto Tecnopedagógico (IA). Revisado y validado por el docente.'

export async function aWord(mdTexto) {
  mdTexto = sinMarcas(mdTexto)
  const D = await import('docx')
  const tr = rs => rs.map(r => r.br ? new D.TextRun({ break: 1 }) : new D.TextRun({ text: r.text, bold: r.bold, italics: r.italic }))
  const par = (tokens, o = {}) => new D.Paragraph({ children: tr(tramos(tokens)), spacing: { after: 120 }, ...o })
  const out = []
  const recorrer = (tokens, o = {}) => {
    for (const t of tokens) {
      if (t.type === 'heading') out.push(par(t.tokens, { heading: D.HeadingLevel['HEADING_' + Math.min(t.depth, 3)], spacing: { before: 240, after: 120 } }))
      else if (t.type === 'paragraph' || t.type === 'text') out.push(par(t.tokens || [t], o))
      else if (t.type === 'blockquote') recorrer(t.tokens, { indent: { left: 400 } })
      else if (t.type === 'list') t.items.forEach((it, i) => out.push(t.ordered
        ? new D.Paragraph({ children: tr([{ text: (i + 1) + '. ' }, ...tramos(enLinea(it))]), spacing: { after: 80 } })
        : par(enLinea(it), { bullet: { level: 0 }, spacing: { after: 80 } })))
      else if (t.type === 'table') {
        const celda = (c, cab) => new D.TableCell({ children: [new D.Paragraph({ children: tr(tramos(c.tokens, cab ? { bold: true } : {})) })], shading: cab ? { fill: 'E9ECF2' } : undefined, margins: { top: 60, bottom: 60, left: 80, right: 80 } })
        out.push(new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, rows: [new D.TableRow({ tableHeader: true, children: t.header.map(c => celda(c, true)) }), ...t.rows.map(r => new D.TableRow({ children: r.map(c => celda(c)) }))] }))
        out.push(new D.Paragraph({ text: '' }))
      }
    }
  }
  recorrer(marked.lexer(mdTexto))
  out.push(new D.Paragraph({ children: [new D.TextRun({ text: PIE, italics: true, size: 16 })] }))
  const doc = new D.Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 20 } } } },
    sections: [{ properties: { page: { size: { orientation: D.PageOrientation.LANDSCAPE }, margin: { top: 900, bottom: 900, left: 900, right: 900 } } }, children: out }]
  })
  return D.Packer.toBlob(doc)
}

export async function aPdf(mdTexto) {
  mdTexto = sinMarcas(mdTexto)
  const pdfMake = (await import('pdfmake/build/pdfmake')).default
  pdfMake.vfs = (await import('./vfs-roboto.js')).default
  const tx = rs => rs.map(r => r.br ? { text: '\n' } : { text: r.text, bold: r.bold, italics: r.italic })
  const out = []
  const recorrer = (tokens, o = {}) => {
    for (const t of tokens) {
      if (t.type === 'heading') out.push({ text: tx(tramos(t.tokens)), style: 'h' + Math.min(t.depth, 3) })
      else if (t.type === 'paragraph' || t.type === 'text') out.push({ text: tx(tramos(t.tokens || [t])), margin: [0, 0, 0, 6], ...o })
      else if (t.type === 'blockquote') recorrer(t.tokens, { italics: true, margin: [14, 0, 0, 6] })
      else if (t.type === 'list') out.push({ [t.ordered ? 'ol' : 'ul']: t.items.map(it => ({ text: tx(tramos(enLinea(it))) })), margin: [0, 0, 0, 6] })
      else if (t.type === 'table') out.push({
        table: { headerRows: 1, widths: t.header.map(() => '*'), body: [t.header.map(c => ({ text: tx(tramos(c.tokens)), bold: true, fillColor: '#E9ECF2' })), ...t.rows.map(r => r.map(c => ({ text: tx(tramos(c.tokens)) })))] },
        fontSize: 7.5, margin: [0, 2, 0, 10],
        layout: { hLineColor: () => '#C9CDD6', vLineColor: () => '#C9CDD6', hLineWidth: () => 0.5, vLineWidth: () => 0.5 }
      })
    }
  }
  recorrer(marked.lexer(mdTexto))
  const def = {
    pageSize: 'LETTER', pageOrientation: 'landscape', pageMargins: [36, 36, 36, 40], content: out,
    defaultStyle: { fontSize: 9.5, lineHeight: 1.2 },
    styles: { h1: { fontSize: 18, bold: true, margin: [0, 0, 0, 8] }, h2: { fontSize: 12.5, bold: true, margin: [0, 10, 0, 5] }, h3: { fontSize: 10.5, bold: true, margin: [0, 6, 0, 4] } },
    footer: (p, n) => ({ text: PIE + '   ' + p + ' / ' + n, alignment: 'center', fontSize: 7, color: '#666' })
  }
  return new Promise((ok, no) => { try { pdfMake.createPdf(def).getBlob(ok) } catch (e) { no(e) } })
}

export const nombreArchivo = (titulo, ext) => (titulo || 'planeacion').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) + '.' + ext
