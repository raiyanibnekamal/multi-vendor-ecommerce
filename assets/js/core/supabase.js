// Supabase Client Initialization (ES Module via CDN)
import { CONFIG } from './config.js';

const runtime = globalThis.__streamcartSupabase ||= { client: null, promise: null };

export async function getSupabase() {
  if (runtime.client) return runtime.client;
  if (runtime.promise) return runtime.promise;
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    console.warn('[StreamCart] Supabase URL or Anon Key is missing in CONFIG. Falling back to mock.');
    return null;
  }

  runtime.promise = (async () => {
   try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    runtime.client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
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
    return runtime.client;
   } catch (err) {
    console.error('[StreamCart] Failed to load Supabase SDK from CDN:', err);
    runtime.promise = null;
    return null;
   }
  })();
  return runtime.promise;
}

export const supabase = {
  get instance() {
    return runtime.client;
  },
  init: getSupabase,
};
