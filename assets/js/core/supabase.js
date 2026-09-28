// Supabase Client Initialization (ES Module via CDN)
import { CONFIG } from './config.js';

let supabaseClient = null;
let supabaseInitPromise = null;

export async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  if (supabaseInitPromise) return supabaseInitPromise;
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    console.warn('[StreamCart] Supabase URL or Anon Key is missing in CONFIG. Falling back to mock.');
    return null;
  }

  supabaseInitPromise = (async () => {
   try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabaseClient = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return supabaseClient;
   } catch (err) {
    console.error('[StreamCart] Failed to load Supabase SDK from CDN:', err);
    supabaseInitPromise = null;
    return null;
   }
  })();
  return supabaseInitPromise;
}

export const supabase = {
  get instance() {
    return supabaseClient;
  },
  init: getSupabase,
};
