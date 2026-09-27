// Stand-in for Supabase Realtime channels. BroadcastChannel syncs events
// across tabs of the same browser (e.g. vendor studio tab -> viewer tab).
// Replace with supabase.channel(name).on('broadcast', ...) when wiring the backend.
const channels = new Map();

export function channel(name) {
  if (channels.has(name)) return channels.get(name);
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel(`sc-${name}`) : null;
  const handlers = {};

  const dispatch = (event, payload) => (handlers[event] || []).forEach((fn) => fn(payload));
  if (bc) bc.onmessage = (e) => dispatch(e.data.event, e.data.payload);

  const api = {
    on(event, fn) {
      (handlers[event] ||= []).push(fn);
      return api;
    },
    send(event, payload, { self = true } = {}) {
      bc?.postMessage({ event, payload });
      if (self) dispatch(event, payload);
    },
    close() {
      bc?.close();
      channels.delete(name);
    },
  };
  channels.set(name, api);
  return api;
}
