// modules/ai-commander/infrastructure/supabase.repositories.js
// ── Capa de INFRAESTRUCTURA · adaptadores Supabase ───────────────────────────
// Implementan los puertos del dominio contra Postgres (Supabase). Mismo patrón
// que js/db.js: mappers fromRow/toRow (camelCase ↔ snake_case) + clean + _throw.
// Reutilizan el cliente y el usuario actual del CRM (no duplican el cliente).
import { supabase } from '../../../js/supabase.js';
import { getCurrentUserId } from '../../../js/db.js';
import {
  ProjectRepository, TaskRepository, PromptRepository, AIResponseRepository,
} from '../domain/ports.js';

function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
function _throw(error) { if (error) throw error; }

/** ¿El error es "falta la tabla / migración no corrida"? (degradación elegante) */
export function isSetupError(e) {
  const code = e?.code || '';
  const msg = (e?.message || '').toLowerCase();
  return code === 'PGRST205' || code === '42P01'
    || msg.includes('does not exist') || msg.includes('schema cache');
}

// ─── PROYECTOS ────────────────────────────────────────────────────────────────
function projectFromRow(r) {
  if (!r) return null;
  return {
    id: r.id, codigo: r.codigo, orgId: r.org_id,
    nombre: r.nombre, descripcion: r.descripcion, objetivo: r.objetivo,
    estado: r.estado, prioridad: r.prioridad, area: r.area,
    clienteId: r.cliente_id, responsable: r.responsable, repoUrl: r.repo_url,
    stack: r.stack || [],
    fechaInicio: r.fecha_inicio, fechaObjetivo: r.fecha_objetivo,
    progreso: r.progreso ?? 0,
    createdBy: r.created_by, updatedBy: r.updated_by,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
function projectToRow(d) {
  return clean({
    nombre: d.nombre, descripcion: d.descripcion, objetivo: d.objetivo,
    estado: d.estado, prioridad: d.prioridad, area: d.area,
    cliente_id: d.clienteId, responsable: d.responsable, repo_url: d.repoUrl,
    stack: d.stack, fecha_inicio: d.fechaInicio, fecha_objetivo: d.fechaObjetivo,
    progreso: d.progreso, org_id: d.orgId,
  });
}

export class SupabaseProjectRepository extends ProjectRepository {
  async list(filter = {}) {
    let q = supabase.from('proyectos').select('*').order('created_at', { ascending: false });
    if (filter.estado) q = q.eq('estado', filter.estado);
    const { data, error } = await q;
    _throw(error); return data.map(projectFromRow);
  }
  async getById(id) {
    const { data, error } = await supabase.from('proyectos').select('*').eq('id', id).single();
    _throw(error); return projectFromRow(data);
  }
  async create(entity) {
    const uid = getCurrentUserId();
    const payload = projectToRow(entity);
    if (uid) { payload.created_by = uid; payload.updated_by = uid; }
    const { data, error } = await supabase.from('proyectos').insert(payload).select('id').single();
    _throw(error); return data.id;
  }
  async update(id, patch) {
    const uid = getCurrentUserId();
    const payload = projectToRow(patch);
    if (uid) payload.updated_by = uid;
    const { error } = await supabase.from('proyectos').update(payload).eq('id', id);
    _throw(error);
  }
  async remove(id) {
    const { error } = await supabase.from('proyectos').delete().eq('id', id);
    _throw(error);
  }
}

// ─── TAREAS ───────────────────────────────────────────────────────────────────
function taskFromRow(r) {
  if (!r) return null;
  return {
    id: r.id, codigo: r.codigo, orgId: r.org_id, proyectoId: r.proyecto_id,
    titulo: r.titulo, descripcion: r.descripcion, estado: r.estado, prioridad: r.prioridad,
    asignado: r.asignado, etiquetas: r.etiquetas || [],
    estimacionHoras: r.estimacion_horas, orden: r.orden ?? 0, aiAsistida: !!r.ai_asistida,
    createdBy: r.created_by, updatedBy: r.updated_by,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
function taskToRow(d) {
  return clean({
    proyecto_id: d.proyectoId, titulo: d.titulo, descripcion: d.descripcion,
    estado: d.estado, prioridad: d.prioridad, asignado: d.asignado,
    etiquetas: d.etiquetas, estimacion_horas: d.estimacionHoras, orden: d.orden,
    ai_asistida: d.aiAsistida, org_id: d.orgId,
  });
}

export class SupabaseTaskRepository extends TaskRepository {
  async listByProject(projectId) {
    const { data, error } = await supabase.from('tareas').select('*')
      .eq('proyecto_id', projectId).order('orden', { ascending: true }).order('created_at', { ascending: true });
    _throw(error); return data.map(taskFromRow);
  }
  async listAll() {
    const { data, error } = await supabase.from('tareas').select('*').order('created_at', { ascending: false });
    _throw(error); return data.map(taskFromRow);
  }
  async getById(id) {
    const { data, error } = await supabase.from('tareas').select('*').eq('id', id).single();
    _throw(error); return taskFromRow(data);
  }
  async create(entity) {
    const uid = getCurrentUserId();
    const payload = taskToRow(entity);
    if (uid) { payload.created_by = uid; payload.updated_by = uid; }
    const { data, error } = await supabase.from('tareas').insert(payload).select('id').single();
    _throw(error); return data.id;
  }
  async update(id, patch) {
    const uid = getCurrentUserId();
    const payload = taskToRow(patch);
    if (uid) payload.updated_by = uid;
    const { error } = await supabase.from('tareas').update(payload).eq('id', id);
    _throw(error);
  }
  async remove(id) {
    const { error } = await supabase.from('tareas').delete().eq('id', id);
    _throw(error);
  }
}

// ─── AI PROMPTS ───────────────────────────────────────────────────────────────
function promptFromRow(r) {
  if (!r) return null;
  return {
    id: r.id, codigo: r.codigo, orgId: r.org_id,
    proyectoId: r.proyecto_id, tareaId: r.tarea_id,
    titulo: r.titulo, rol: r.rol, plantilla: r.plantilla, contenido: r.contenido,
    variables: r.variables || {}, provider: r.provider, modelo: r.modelo,
    parametros: r.parametros || {}, createdBy: r.created_by, createdAt: r.created_at,
  };
}
function promptToRow(d) {
  return clean({
    proyecto_id: d.proyectoId, tarea_id: d.tareaId, titulo: d.titulo,
    rol: d.rol, plantilla: d.plantilla, contenido: d.contenido,
    variables: d.variables, provider: d.provider, modelo: d.modelo,
    parametros: d.parametros, org_id: d.orgId,
  });
}

export class SupabasePromptRepository extends PromptRepository {
  async list(filter = {}) {
    let q = supabase.from('ai_prompts').select('*').order('created_at', { ascending: false });
    if (filter.proyectoId) q = q.eq('proyecto_id', filter.proyectoId);
    const { data, error } = await q;
    _throw(error); return data.map(promptFromRow);
  }
  async getById(id) {
    const { data, error } = await supabase.from('ai_prompts').select('*').eq('id', id).single();
    _throw(error); return promptFromRow(data);
  }
  async create(entity) {
    const uid = getCurrentUserId();
    const payload = promptToRow(entity);
    if (uid) payload.created_by = uid;
    const { data, error } = await supabase.from('ai_prompts').insert(payload).select('id').single();
    _throw(error); return data.id;
  }
  async remove(id) {
    const { error } = await supabase.from('ai_prompts').delete().eq('id', id);
    _throw(error);
  }
}

// ─── AI RESPONSES (historial) ─────────────────────────────────────────────────
function responseFromRow(r) {
  if (!r) return null;
  return {
    id: r.id, orgId: r.org_id, promptId: r.prompt_id, proyectoId: r.proyecto_id,
    provider: r.provider, modelo: r.modelo, estado: r.estado, contenido: r.contenido,
    tokensEntrada: r.tokens_entrada, tokensSalida: r.tokens_salida, costo: r.costo,
    latenciaMs: r.latencia_ms, error: r.error, metadata: r.metadata || {},
    createdBy: r.created_by, createdAt: r.created_at,
  };
}
function responseToRow(d) {
  return clean({
    prompt_id: d.promptId, proyecto_id: d.proyectoId, provider: d.provider,
    modelo: d.modelo, estado: d.estado, contenido: d.contenido,
    tokens_entrada: d.tokensEntrada, tokens_salida: d.tokensSalida, costo: d.costo,
    latencia_ms: d.latenciaMs, error: d.error, metadata: d.metadata, org_id: d.orgId,
  });
}

export class SupabaseAIResponseRepository extends AIResponseRepository {
  async listByPrompt(promptId) {
    const { data, error } = await supabase.from('ai_responses').select('*')
      .eq('prompt_id', promptId).order('created_at', { ascending: false });
    _throw(error); return data.map(responseFromRow);
  }
  async listRecent(limit = 50) {
    const { data, error } = await supabase.from('ai_responses').select('*')
      .order('created_at', { ascending: false }).limit(limit);
    _throw(error); return data.map(responseFromRow);
  }
  async create(entity) {
    const uid = getCurrentUserId();
    const payload = responseToRow(entity);
    if (uid) payload.created_by = uid;
    const { data, error } = await supabase.from('ai_responses').insert(payload).select('id').single();
    _throw(error); return data.id;
  }
}
