export const CONFIG = {
  APP_NAME: 'StreamCart',
  TAGLINE: 'Watch. Shop. Live.',

  // Flip to false once the Supabase client is wired into services/db.js.
  USE_MOCK: true,
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',

  // Live video transport (Agora / LiveKit) is configured by the backend team.
  LIVE_PROVIDER: 'agora',

  CURRENCY: '৳',
  SHIPPING_FEE: 60,
  FREE_SHIPPING_MIN: 2000,
  MOCK_LATENCY_MS: 180,
  STORAGE_PREFIX: 'sc_',

  DEMO_ACCOUNTS: {
    admin: { email: 'admin@demo.com', password: 'demo123' },
    vendor: { email: 'vendor@demo.com', password: 'demo123' },
    customer: { email: 'customer@demo.com', password: 'demo123' },
  },
};
