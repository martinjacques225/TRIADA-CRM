// supabase/functions/analizar-financiero/index.ts
// Edge Function: análisis financiero AUTOMÁTICO con Gemini (el "botón mágico").
// La llama el front del Módulo Financiero:
//   supabase.functions.invoke('analizar-financiero', { body: { prompt, archivos } })
// y devuelve el texto (JSON) que el front parsea con parseFinanceReport.
//
// Seguridad:
//   - verify_jwt = true → solo usuarios autenticados la invocan.
//   - La GEMINI_API_KEY NO está en el código ni en el front: se lee del entorno
//     (secret de la función). Si falta → 503 y el front cae al modo copy-paste.
//   - Los datos financieros van a Google por la API igual que si el usuario los
//     pegara en Gemini web; documentado en SECURITY.md §7.
//
// Desplegada por MCP. El modelo por defecto es gemini-2.0-flash (barato, multimodal,
// contexto amplio); se puede cambiar con el secret GEMINI_MODEL.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    // 1) Auth: solo usuarios logueados
    const authHeader = req.headers.get('Authorization') || '';
    const asUser = createClient(SB_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uErr } = await asUser.auth.getUser();
    if (uErr || !user) return json({ error: 'no auth' }, 401);

    // 2) Sin llave configurada → 503 (el front usará el modo manual)
    if (!GEMINI_KEY) return json({ error: 'IA no configurada', code: 'no_key' }, 503);

    // 3) Entrada
    const { prompt, archivos } = await req.json().catch(() => ({}));
    if (!prompt || typeof prompt !== 'string') return json({ error: 'falta prompt' }, 400);

    const parts: unknown[] = [{ text: prompt }];
    for (const a of (Array.isArray(archivos) ? archivos : []).slice(0, 8)) {
      if (a && a.mime && a.data) parts.push({ inline_data: { mime_type: a.mime, data: a.data } });
    }

    // 4) Llamada a Gemini (JSON forzado)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    const gRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.3, responseMimeType: 'application/json', maxOutputTokens: 4096 },
      }),
    });
    if (!gRes.ok) {
      const detail = await gRes.text().catch(() => '');
      return json({ error: `Gemini respondió ${gRes.status}`, detail: detail.slice(0, 600) }, 502);
    }
    const g = await gRes.json();
    const cand = g?.candidates?.[0];
    const texto = (cand?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('').trim();
    if (!texto) {
      const reason = cand?.finishReason || g?.promptFeedback?.blockReason || 'sin_texto';
      return json({ error: `Gemini no devolvió texto (${reason})` }, 502);
    }
    return json({ texto, model: MODEL });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
