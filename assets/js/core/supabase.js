// Supabase Client Initialization (ES Module via CDN)
import { CONFIG } from './config.js';

let supabaseClient = null;

export async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    console.warn('[StreamCart] Supabase URL or Anon Key is missing in CONFIG. Falling back to mock.');
    return null;
  }

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
    return null;
  }
}

export const supabase = {
  get instance() {
    return supabaseClient;
  },
  init: getSupabase,
};
