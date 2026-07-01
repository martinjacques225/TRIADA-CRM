// supabase/functions/analizar-financiero/index.ts
// Edge Function: análisis financiero AUTOMÁTICO con Gemini.
// - Prueba varios modelos (el 1º con cuota gana). gemini-2.5-flash con el
//   "thinking" DESACTIVADO (thinkingBudget:0) → rápido y deja todos los tokens
//   para la respuesta JSON (sin thinking se comía el output → JSON vacío).
// - verify_jwt=true; GEMINI_API_KEY del entorno (nunca en el front).
// - Log de diagnóstico SIN datos del usuario (solo modelo/estado/longitud).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const MODELS = (Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash,gemini-2.0-flash,gemini-2.0-flash-lite')
  .split(',').map((s) => s.trim()).filter(Boolean);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

// Config por modelo: los 2.5 traen "thinking" por defecto → se apaga con budget 0.
function genConfig(model: string) {
  const cfg: Record<string, unknown> = { temperature: 0.3, responseMimeType: 'application/json', maxOutputTokens: 8192 };
  if (model.includes('2.5')) cfg.thinkingConfig = { thinkingBudget: 0 };
  return cfg;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const asUser = createClient(SB_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uErr } = await asUser.auth.getUser();
    if (uErr || !user) return json({ error: 'no auth' }, 401);

    if (!GEMINI_KEY) return json({ error: 'IA no configurada', code: 'no_key' }, 503);

    const { prompt, archivos } = await req.json().catch(() => ({}));
    if (!prompt || typeof prompt !== 'string') return json({ error: 'falta prompt' }, 400);

    const parts: unknown[] = [{ text: prompt }];
    for (const a of (Array.isArray(archivos) ? archivos : []).slice(0, 8)) {
      if (a && a.mime && a.data) parts.push({ inline_data: { mime_type: a.mime, data: a.data } });
    }

    let ok: Record<string, unknown> | null = null;
    let usedModel = '', lastStatus = 0, lastDetail = '';
    for (const model of MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
      const r = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: genConfig(model) }),
      });
      if (r.ok) { ok = await r.json(); usedModel = model; break; }
      lastStatus = r.status;
      lastDetail = await r.text().catch(() => '');
      console.error(`[analizar-financiero] ${model} -> ${r.status}: ${lastDetail.slice(0, 200)}`);
      if (r.status !== 429 && r.status !== 404) break;
    }

    if (!ok) {
      const msg = lastStatus === 429
        ? 'Sin cuota de IA disponible ahora. Reintenta en ~1 minuto; si persiste, revisa los limites de la API key en Google.'
        : `Gemini respondio ${lastStatus}.`;
      return json({ error: msg, status: lastStatus, detail: lastDetail.slice(0, 600) }, 502);
    }

    const cand = (ok.candidates as Array<Record<string, unknown>>)?.[0];
    const finish = (cand?.finishReason as string) || '';
    const content = cand?.content as { parts?: Array<{ text?: string }> } | undefined;
    const texto = (content?.parts || []).map((p) => p.text || '').join('').trim();
    // Diagnóstico sin exponer datos: modelo, motivo de fin y tamaño de la respuesta.
    console.log(`[analizar-financiero] OK ${usedModel} finish=${finish} len=${texto.length}`);
    if (!texto) return json({ error: `Gemini no devolvió texto (${finish || 'sin_texto'})`, finish }, 502);
    return json({ texto, model: usedModel, finish });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
