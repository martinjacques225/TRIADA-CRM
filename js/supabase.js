import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL      = 'https://pqrjndirqtucoumijben.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_CEm784MwkIW1BqoDjEvlWQ_uDVSzm80';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
