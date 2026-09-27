// Supabase Storage Service
import { CONFIG } from '../core/config.js';
import { getSupabase } from '../core/supabase.js';

const LOCAL_MEDIA_DB = 'streamcart-media';
const LOCAL_MEDIA_STORE = 'files';
const resolvedMedia = new Map();
let localMediaDb;

function openLocalMediaDb() {
  if (!localMediaDb) {
    localMediaDb = new Promise((resolve, reject) => {
      const request = indexedDB.open(LOCAL_MEDIA_DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(LOCAL_MEDIA_STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return localMediaDb;
}

async function saveLocalMedia(file) {
  const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const db = await openLocalMediaDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(LOCAL_MEDIA_STORE, 'readwrite');
    transaction.objectStore(LOCAL_MEDIA_STORE).put(file, id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  return `local-media:${id}`;
}

export async function resolveMediaUrl(url) {
  if (typeof url !== 'string' || !url.startsWith('local-media:')) return url;
  if (resolvedMedia.has(url)) return resolvedMedia.get(url);
  try {
    const db = await openLocalMediaDb();
    const blob = await new Promise((resolve, reject) => {
      const request = db.transaction(LOCAL_MEDIA_STORE, 'readonly').objectStore(LOCAL_MEDIA_STORE).get(url.slice('local-media:'.length));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!blob) return '';
    const objectUrl = URL.createObjectURL(blob);
    resolvedMedia.set(url, objectUrl);
    return objectUrl;
  } catch {
    return '';
  }
}

/**
 * Uploads a File / Blob to Supabase Storage and returns its public URL.
 * Falls back to Data URL or Object URL if Supabase is offline / unconfigured.
 */
export async function uploadFile(bucket, file, customName) {
  if (!file) return null;

  const safeName = file.name?.replace(/[^a-zA-Z0-9._-]/g, '_') || 'upload';
  const fileName = customName || `${Date.now()}_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}_${safeName}`;

  if (!CONFIG.USE_MOCK) {
    try {
      const supabase = await getSupabase();
      if (supabase && supabase.storage) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type,
          });

        if (!error && data) {
          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path || fileName);
          if (urlData?.publicUrl) {
            return urlData.publicUrl;
          }
        } else if (error) {
          console.warn(`[StreamCart Storage] Upload to ${bucket} failed:`, error.message);
        }
      }
    } catch (err) {
      console.warn(`[StreamCart Storage] Exception uploading to ${bucket}:`, err);
    }
  }

  // Keep offline image uploads small enough for the localStorage-backed mock DB.
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext('2d');
          if (!context) return resolve('');
          context.fillStyle = '#fff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        image.onerror = () => resolve('');
        image.src = reader.result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    } else {
      saveLocalMedia(file).then(resolve).catch(() => resolve('local-media:unavailable'));
    }
  });
}
