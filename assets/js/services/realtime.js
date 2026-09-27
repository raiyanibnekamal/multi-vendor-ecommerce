// Realtime Service with Supabase Channels and BroadcastChannel fallback
import { CONFIG } from '../core/config.js';
import { getSupabase } from '../core/supabase.js';

const channels = new Map();

export function channel(name) {
  if (channels.has(name)) return channels.get(name);
  const bc = typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel(`sc-${name}`) : null;
  const handlers = {};
  let supaChannel = null;

  const dispatch = (event, payload) => (handlers[event] || []).forEach((fn) => fn(payload));
  if (bc) bc.onmessage = (e) => dispatch(e.data.event, e.data.payload);

  if (!CONFIG.USE_MOCK) {
    getSupabase().then((supabase) => {
      if (!supabase) return;
      supaChannel = supabase.channel(`sc-${name}`);
      supaChannel
        .on('broadcast', { event: '*' }, (payload) => {
          if (payload && payload.event) dispatch(payload.event, payload.payload);
        })
        .subscribe();
    });
  }

  const api = {
    on(event, fn) {
      (handlers[event] ||= []).push(fn);
      return api;
    },
    send(event, payload, { self = true } = {}) {
      bc?.postMessage({ event, payload });
      if (supaChannel) {
        supaChannel.send({
          type: 'broadcast',
          event,
          payload,
        });
      }
      if (self) dispatch(event, payload);
    },
    close() {
      bc?.close();
      if (supaChannel) supaChannel.unsubscribe();
      channels.delete(name);
    },
  };

  channels.set(name, api);
  return api;
}
