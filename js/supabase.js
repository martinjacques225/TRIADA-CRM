// Versión EXACTA pineada (no el major flotante `@2`): cierra el riesgo de cadena
// de suministro (S-5 auditoría) — un publish malicioso/roto bajo v2 ya no llega
// solo. Para subir de versión: cambiar el número a mano tras revisar el changelog.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.108.1/+esm';

const SUPABASE_URL      = 'https://pqrjndirqtucoumijben.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_CEm784MwkIW1BqoDjEvlWQ_uDVSzm80';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
