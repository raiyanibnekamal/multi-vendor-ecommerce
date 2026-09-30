// Firebase App & Auth SDK Integration (Modular CDN)
import { CONFIG } from './config.js';

let firebaseApp = null;
let firebaseAuth = null;
let cachedConfig = null;

export async function getFirebaseConfig() {
  if (cachedConfig) return cachedConfig;
  try {
    const res = await fetch('/api/firebase-config');
    if (res.ok) {
      const data = await res.json();
      if (data && data.apiKey) {
        cachedConfig = data;
        return cachedConfig;
      }
    }
  } catch {
    // Ignore fetch failure, fall back to CONFIG.FIREBASE
  }

  cachedConfig = CONFIG.FIREBASE || {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  };
  return cachedConfig;
}

export async function isFirebaseConfigured() {
  const cfg = await getFirebaseConfig();
  return Boolean(cfg?.apiKey && !cfg.apiKey.includes('replace-with'));
}

export async function getFirebase() {
  if (firebaseApp && firebaseAuth) {
    return { app: firebaseApp, auth: firebaseAuth };
  }

  const config = await getFirebaseConfig();
  if (!config?.apiKey) {
    throw new Error('Firebase is not configured. Please add FIREBASE_API_KEY in your .env or config.js.');
  }

  try {
    const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getAuth, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');

    firebaseApp = getApps().length ? getApp() : initializeApp(config);
    firebaseAuth = getAuth(firebaseApp);

    return { app: firebaseApp, auth: firebaseAuth, GoogleAuthProvider };
  } catch (err) {
    console.error('[Firebase] SDK initialization failed:', err);
    throw new Error('Failed to load Firebase SDK: ' + (err.message || err));
  }
}

/**
 * Triggers Google Sign-In with Firebase Popup
 */
export async function signInWithGooglePopup() {
  const isConfigured = await isFirebaseConfigured();
  if (!isConfigured) {
    // If Firebase keys are not added yet, provide simulated Google Demo account
    const proceed = confirm(
      'Firebase API Key is not set in .env yet.\n\n' +
      'Would you like to simulate Google Sign-in with a verified demo Google account (test.shopper@gmail.com)?\n\n' +
      '(To use real Google accounts, paste your Firebase config in .env).'
    );
    if (!proceed) throw new Error('Google Sign-in cancelled.');
    return {
      uid: 'google-demo-' + Math.random().toString(36).slice(2, 9),
      displayName: 'Google Shopper',
      email: 'test.shopper@gmail.com',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      phoneNumber: '+8801700000000',
    };
  }

  const { auth } = await getFirebase();
  const { GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  return result.user;
}
