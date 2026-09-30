import { getSupabase } from '../core/supabase.js?v=20260928-11';
import { currentUser } from '../core/auth.js';

const SDK_URL = 'https://cdn.jsdelivr.net/npm/agora-rtc-sdk-ng@4.24.8/AgoraRTC_N-production.js';
let sdkPromise;

function loadSdk() {
  if (window.AgoraRTC) return Promise.resolve(window.AgoraRTC);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => window.AgoraRTC ? resolve(window.AgoraRTC) : reject(new Error('Agora SDK did not initialize.'));
    script.onerror = () => reject(new Error('Could not load the Agora video SDK.'));
    document.head.append(script);
  }).catch((error) => {
    sdkPromise = null;
    throw error;
  });
  return sdkPromise;
}

async function getToken(streamId, role, clientId) {
  const supabase = await getSupabase();
  const { data } = supabase ? await supabase.auth.getSession() : { data: null };
  const accessToken = data?.session?.access_token;
  const user = currentUser();
  const demoVendorId = role === 'publisher' && !accessToken && user?.email === 'vendor@demo.com' && user.vendorId === 'v1'
    ? user.vendorId
    : undefined;
  const response = await fetch('/api/agora-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ streamId, role, clientId, ...(demoVendorId ? { demoVendorId } : {}) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not authorize the live video connection.');
  return result;
}

export async function connectAgora(streamId, role, container, { muted = true } = {}) {
  const AgoraRTC = await loadSdk();
  const clientId = crypto.randomUUID();
  const credentials = await getToken(streamId, role, clientId);
  const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
  const isPublisher = role === 'publisher';
  let microphoneTrack = null;
  let cameraTrack = null;
  let closed = false;
    let isMuted = muted;

  const refreshToken = async () => {
    try {
      const refreshed = await getToken(streamId, role, clientId);
      if (!closed) await client.renewToken(refreshed.token);
    } catch (error) {
      console.warn('[Agora] Token refresh failed:', error.message);
    }
  };

  client.on('token-privilege-will-expire', refreshToken);
  client.on('token-privilege-did-expire', refreshToken);
  client.on('user-published', async (user, mediaType) => {
    try {
      await client.subscribe(user, mediaType);
      if (mediaType === 'video') user.videoTrack?.play(container);
        if (mediaType === 'audio') user.audioTrack?.setVolume(isMuted ? 0 : 100);
    } catch (error) {
      console.warn('[Agora] Could not subscribe to the host stream:', error.message);
    }
  });
  client.on('user-unpublished', (user, mediaType) => {
    if (mediaType === 'video') user.videoTrack?.stop();
  });

  try {
    await client.setClientRole(isPublisher ? 'host' : 'audience');
    await client.join(credentials.appId, credentials.channel, credentials.token, credentials.uid);
    if (isPublisher) {
      [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        { AEC: true, ANS: true, AGC: true },
        { encoderConfig: '720p_1' },
      );
      cameraTrack.play(container);
      await client.publish([microphoneTrack, cameraTrack]);
    }
  } catch (error) {
    microphoneTrack?.close();
    cameraTrack?.close();
    await client.leave().catch(() => {});
    throw error;
  }

  return {
    async setMicrophoneEnabled(enabled) {
      await microphoneTrack?.setEnabled(enabled);
    },
    async setCameraEnabled(enabled) {
      await cameraTrack?.setEnabled(enabled);
    },
    async setMuted(nextMuted) {
        isMuted = nextMuted;
      for (const user of client.remoteUsers) user.audioTrack?.setVolume(nextMuted ? 0 : 100);
    },
    async close() {
      closed = true;
      client.off('token-privilege-will-expire', refreshToken);
      client.off('token-privilege-did-expire', refreshToken);
      if (isPublisher) await client.unpublish([microphoneTrack, cameraTrack].filter(Boolean)).catch(() => {});
      microphoneTrack?.close();
      cameraTrack?.close();
      await client.leave().catch(() => {});
    },
  };
}
