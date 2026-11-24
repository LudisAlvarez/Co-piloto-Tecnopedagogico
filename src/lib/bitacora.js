// Exporta la bitácora de decisiones, las recomendaciones y las fuentes a Excel (.xlsx)
import { tituloDe } from './util.js'
import { VERSION_PROMPT } from './prompt.js'

const fecha = iso => iso ? new Date(iso).toLocaleString('es-CO') : ''
const DIM = ['utilidad', 'coherencia', 'contextualizacion', 'usabilidad', 'viabilidad']

export function filasDe(planes, docente) {
  const decisiones = [], recomendaciones = [], fuentes = []
  for (const p of planes) {
    const base = { 'Planeación': tituloDe(p), 'Asignatura': p.cfg?.asignatura || '', 'Grado': p.cfg?.grado || '' }
    const ultima = id => [...(p.bitacora || [])].reverse().find(d => d.recId === id)
    for (const d of p.bitacora || []) decisiones.push({
      ...base, 'Docente': docente, 'Fecha': fecha(d.fecha), 'Recomendación': d.recId, 'Título': d.titulo, 'Fase ADDIE': d.fase || '',
      'Decisión': d.decision, 'Cambio pedido': d.modificacion || '', 'Justificación del docente': d.justificacion || '',
      'Aplicada al lienzo': d.decision === 'aceptada' ? 'Sí' : d.aplicada ? 'Sí' : 'No'
    })
    for (const r of p.recomendaciones || []) recomendaciones.push({
      ...base, 'Turno': r.turno, 'Id': r.id, 'Título': r.titulo, 'Fase ADDIE': r.fase, 'Propuesta': r.propuesta, 'Justificación TPACK': r.justificacion,
      ...Object.fromEntries(DIM.map(k => ['Pertinencia: ' + k, r.pertinencia?.[k] || ''])),
      'Variable del grupo': r.grupo, 'Plan B sin conexión': r.alternativa, 'Fuentes': (r.fuentes || []).join(', '),
      'Decisión final': ultima(r.id)?.decision || 'sin decidir'
    })
    for (const f of p.fuentes || []) fuentes.push({
      ...base, 'Id': f.id, 'Documento': f.doc, 'Página': f.p || '', 'Turno': f.turno,
      'Usada en': (p.recomendaciones || []).filter(r => r.fuentes?.includes(f.id)).map(r => r.id).join(', '),
      'Fragmento consultado': f.texto
    })
  }
  return { decisiones, recomendaciones, fuentes }
}

export async function bitacoraXlsx(planes, docente) {
  const XLSX = await import('xlsx')
  const { decisiones, recomendaciones, fuentes } = filasDe(planes, docente)
  const libro = XLSX.utils.book_new()
  const hoja = (filas, nombre, vacio) => {
    const h = XLSX.utils.json_to_sheet(filas.length ? filas : [{ Nota: vacio }])
    const cols = Object.keys(filas[0] || { Nota: '' })
    h['!cols'] = cols.map(c => ({ wch: /Propuesta|Justificación|Fragmento|Cambio/.test(c) ? 60 : Math.min(Math.max(c.length + 2, 12), 32) }))
    XLSX.utils.book_append_sheet(libro, h, nombre)
  }
  hoja(decisiones, 'Bitácora', 'Aún no hay decisiones registradas.')
  hoja(recomendaciones, 'Recomendaciones', 'Aún no hay recomendaciones.')
  hoja(fuentes, 'Fuentes consultadas', 'Aún no se han consultado fuentes del repositorio.')
  hoja([{ 'Proyecto': 'Co-piloto Tecnopedagógico · I.E. Los Garzones', 'Docente': docente, 'Planeaciones': planes.length, 'Prompt': VERSION_PROMPT, 'Exportado': new Date().toLocaleString('es-CO') }], 'Información', '')
  const datos = XLSX.write(libro, { bookType: 'xlsx', type: 'array' })
  return new Blob([datos], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
