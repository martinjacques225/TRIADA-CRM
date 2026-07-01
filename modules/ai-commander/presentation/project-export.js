// modules/ai-commander/presentation/project-export.js
// ── Exporta un proyecto del Director de Orquesta a una CARPETA .zip ───────────
// Estructura:
//   {codigo}-{nombre}/
//     README.md        · ficha del proyecto (objetivo, estado, stack, avance)
//     tareas.md        · tareas agrupadas por columna del Kanban
//     orquesta/        · una .md por prompt guardado (con sus respuestas)
//
// Los builders de Markdown son PUROS (testeables). JSZip se carga por import
// dinámico desde el CDN solo al exportar (no pesa hasta que se usa).
import { findProjectState, findTaskColumn } from '../domain/entities.js';

const JSZIP_URL = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';

/** Nombre de archivo/carpeta seguro a partir de un texto. Puro. */
export function slug(s) {
  return String(s || 'proyecto')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // quita acentos (marcas combinantes)
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .toLowerCase().slice(0, 60) || 'proyecto';
}

/** README.md del proyecto. Puro. */
export function readmeMd(project = {}, progress = { pct: 0, done: 0, total: 0 }) {
  const st = findProjectState(project.estado);
  return [
    `# ${project.nombre || 'Proyecto'}`,
    project.codigo ? `\n**Código:** ${project.codigo}` : '',
    project.objetivo ? `\n## Objetivo\n${project.objetivo}` : '',
    `\n## Estado`,
    `- Estado: ${st.label}`,
    `- Prioridad: ${project.prioridad || '—'}`,
    project.area ? `- Área: ${project.area}` : '',
    `- Avance: ${progress.pct}% (${progress.done}/${progress.total} tareas)`,
    (project.stack && project.stack.length) ? `- Stack: ${project.stack.join(', ')}` : '',
    project.repoUrl ? `- Repositorio: ${project.repoUrl}` : '',
    project.fechaInicio ? `- Inicio: ${project.fechaInicio}` : '',
    project.fechaObjetivo ? `- Objetivo: ${project.fechaObjetivo}` : '',
    `\n---\n_Generado por el Director de Orquesta · Tríada CRM_`,
  ].filter(Boolean).join('\n');
}

/** tareas.md agrupado por columna del Kanban. Puro. */
export function tareasMd(tasks = []) {
  if (!tasks.length) return '# Tareas\n\n_Sin tareas._';
  let out = '# Tareas\n';
  for (const c of ['backlog', 'por_hacer', 'en_progreso', 'en_revision', 'hecho']) {
    const items = tasks.filter(t => t.estado === c);
    if (!items.length) continue;
    out += `\n## ${findTaskColumn(c).label}\n`;
    for (const t of items) {
      out += `- [${t.estado === 'hecho' ? 'x' : ' '}] ${t.titulo || 'Tarea'}${t.prioridad ? ` _(${t.prioridad})_` : ''}\n`;
      if (t.descripcion) out += `  - ${String(t.descripcion).replace(/\n+/g, ' ')}\n`;
    }
  }
  return out;
}

/** Una .md de un prompt guardado + sus respuestas. Puro. */
export function sessionMd(prompt = {}, responses = []) {
  let out = `# ${prompt.titulo || prompt.rol || 'Prompt'}\n`;
  if (prompt.codigo) out += `\n\`${prompt.codigo}\`\n`;
  out += `\n**Proveedor previsto:** ${prompt.provider || '—'}\n`;
  out += `\n## Prompt\n\n\`\`\`\n${prompt.contenido || ''}\n\`\`\`\n`;
  if (responses && responses.length) {
    out += `\n## Respuesta(s)\n`;
    for (const r of responses) {
      out += `\n### ${r.provider || 'IA'} · ${r.estado || ''}\n\n${r.contenido || r.error || '(sin contenido)'}\n`;
    }
  }
  return out;
}

/** Descarga el proyecto como carpeta .zip. Hace I/O (import dinámico + descarga). */
export async function exportProjectZip({ project, tasks = [], progress, promptsWithResponses = [] }) {
  const mod = await import(JSZIP_URL);
  const JSZip = mod.default || mod;
  const zip = new JSZip();
  const root = `${project.codigo ? project.codigo + '-' : ''}${slug(project.nombre)}`;
  const folder = zip.folder(root);

  folder.file('README.md', readmeMd(project, progress || { pct: project.progreso || 0, done: 0, total: tasks.length }));
  folder.file('tareas.md', tareasMd(tasks));

  if (promptsWithResponses.length) {
    const orq = folder.folder('orquesta');
    let i = 1;
    for (const { prompt, responses } of promptsWithResponses) {
      const name = `${String(i).padStart(2, '0')}-${slug(prompt.titulo || prompt.rol || 'prompt')}.md`;
      orq.file(name, sessionMd(prompt, responses));
      i++;
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${root}.zip`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
