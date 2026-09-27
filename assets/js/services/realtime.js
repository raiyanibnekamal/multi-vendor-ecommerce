// Realtime Service with Supabase Channels and BroadcastChannel fallback
import { CONFIG } from '../core/config.js';
import { getSupabase } from '../core/supabase.js';
import { db } from './db.js';

const channels = new Map();

function snakeToCamel(row) {
  if (!row || typeof row !== 'object') return row;
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase()), value]));
}

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
        });

      const streamId = name.startsWith('stream:') ? name.slice('stream:'.length) : null;
      const tableMap = { orders: 'orders', products: 'products', live: 'live_streams' };
      const pgTable = streamId ? 'live_streams' : tableMap[name];
      if (pgTable) {
        const filter = streamId ? { event: '*', schema: 'public', table: pgTable, filter: `id=eq.${streamId}` } : { event: '*', schema: 'public', table: pgTable };
        supaChannel.on(
          'postgres_changes',
          filter,
          async (change) => {
            const fallbackRecord = snakeToCamel(change.eventType === 'DELETE' ? change.old : change.new);
            const table = streamId || name === 'live' ? 'streams' : name;
            if (change.eventType !== 'DELETE') await db.syncNow();
            const record = change.eventType === 'DELETE' ? fallbackRecord : db.get(table, fallbackRecord.id) || fallbackRecord;
            if (streamId) {
              if (change.eventType === 'DELETE') dispatch('status', 'ended');
              else {
                if (change.eventType === 'INSERT' || change.new.status !== change.old?.status) dispatch('status', record.status);
                if (change.eventType === 'INSERT' || change.new.pinned_product_id !== change.old?.pinned_product_id) dispatch('pin', record.pinnedProductId);
              }
            }
            if (change.eventType === 'INSERT') {
              dispatch(`${name}:insert`, record);
              if (name === 'orders') dispatch('order:new', record);
            } else if (change.eventType === 'UPDATE') {
              dispatch(`${name}:update`, record);
              if (name === 'orders') dispatch('order:update', record);
            } else if (change.eventType === 'DELETE') {
              dispatch(`${name}:delete`, record);
            }
          }
        );
      }

      supaChannel.subscribe();
    });
  }

  const api = {
    on(event, fn) {
      (handlers[event] ||= []).push(fn);
      return api;
    },
    send(event, payload, { self = true, remote = true } = {}) {
      bc?.postMessage({ event, payload });
      if (supaChannel && remote) {
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
