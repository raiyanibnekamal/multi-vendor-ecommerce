export const CONFIG = {
  APP_NAME: 'StreamCart',
  TAGLINE: 'Watch. Shop. Live.',

  // Set to false to use live Supabase backend
  USE_MOCK: false,
  SUPABASE_URL: 'https://llgyqsfxiokvmxqhztin.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZ3lxc2Z4aW9rdm14cWh6dGluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MjI4NzMsImV4cCI6MjEwNjA5ODg3M30.txDXkhggwVsT732LvBs06L7aHfVqAje0H1ZO_zfx2ss',

  // Live video transport (Agora / LiveKit) is configured by the backend team.
  LIVE_PROVIDER: 'agora',

  CURRENCY: '৳',
  SHIPPING_FEE: 60,
  FREE_SHIPPING_MIN: 2000,
  MOCK_LATENCY_MS: 180,
  STORAGE_PREFIX: 'sc_',

  DEMO_ACCOUNTS: {
    admin: { id: 'u-admin', name: 'Platform Admin', email: 'admin@demo.com', password: 'demo123' },
    vendor: { id: 'u-v1', name: 'Tanvir Ahmed', email: 'vendor@demo.com', password: 'demo123' },
    customer: { id: 'c1', name: 'Customer Demo', email: 'customer@demo.com', password: 'demo123' },
  },

  FIREBASE: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },
};
