import { mountAuth, passwordField, bindPasswordToggles } from './authLayout.js';
import { login, demoLogin, loginWithGoogle, currentUser } from '../../core/auth.js';
import { routes, dashboardFor } from '../../core/routes.js';
import { icon, qs, $, escapeHtml } from '../../core/utils.js';

const GOOGLE_ICON = `<svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.09C3.32 21.48 7.35 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.27C.46 8.2.005 10.05.005 12s.455 3.8 1.265 5.41l4.01-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.32 2.52 1.27 6.59l4.01 3.09c.95-2.83 3.6-4.93 6.72-4.93z"/></svg>`;

const next = qs('next');
function go(user) {
  const decodedNext = next ? decodeURIComponent(next) : '';
  const safeNext = decodedNext && !decodedNext.startsWith('/pages/auth/') ? decodedNext : '';
  const otherDashboard = safeNext && ['vendor', 'admin'].some((r) => r !== user.role && safeNext.includes(`/${r}/`));
  if (safeNext && !otherDashboard) {
    location.href = safeNext;
    return;
  }
  location.href = user.role === 'customer' ? routes.home() : dashboardFor(user.role);
}

const existing = currentUser();
const box = mountAuth('Welcome back to the marketplace that moves.');
box.innerHTML = `
  <h1>Sign in</h1>
  <p class="sub">New here? <a class="text-primary bold" href="${routes.register()}">Create an account</a></p>
  ${existing ? `<div class="notice mb-2">${icon('info')}<div>You're signed in as <b>${escapeHtml(existing.name)}</b>. <a class="bold" href="${dashboardFor(existing.role)}">Continue →</a></div></div>` : ''}

  <button type="button" class="btn btn-outline btn-lg btn-block btn-google" data-google>
    ${GOOGLE_ICON} Continue with Google
  </button>

  <div class="or"><span>OR continue with email</span></div>

  <form class="stack" data-form novalidate>
    <div class="field"><label>Email</label><div class="input-group">${icon('mail')}<input class="input" type="email" name="email" placeholder="you@example.com" required autocomplete="email"></div></div>
    <div class="field"><div class="row-between"><label>Password</label><a class="small text-primary" href="${routes.forgot()}">Forgot password?</a></div>${passwordField()}</div>
    <label class="check"><input type="checkbox" checked> Keep me signed in</label>
    <p class="error-text hidden" data-error></p>
    <button class="btn btn-primary btn-lg btn-block" data-submit>Sign in</button>
  </form>
  <div class="demo-box">
    <div class="small bold">${icon('zap', 'text-primary')} One-click demo accounts</div>
    <div class="grid">
      <button data-demo="customer">${icon('user')} Customer</button>
      <button data-demo="vendor">${icon('store')} Vendor</button>
      <button data-demo="admin">${icon('shield-check')} Admin</button>
    </div>
    <p class="xs muted mt-1">Or use customer@demo.com / vendor@demo.com / admin@demo.com with password <b>demo123</b></p>
  </div>`;

bindPasswordToggles(box);
const err = $('[data-error]');

const googleBtn = box.querySelector('[data-google]');
if (googleBtn) {
  googleBtn.onclick = async () => {
    err.classList.add('hidden');
    googleBtn.disabled = true;
    const oldHtml = googleBtn.innerHTML;
    googleBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px"></span> Connecting to Google…';
    try {
      go(await loginWithGoogle('customer'));
    } catch (ex) {
      err.textContent = ex.message || 'Google sign in failed.';
      err.classList.remove('hidden');
      googleBtn.disabled = false;
      googleBtn.innerHTML = oldHtml;
    }
  };
}

$('[data-form]').onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target;
  err.classList.add('hidden');
  if (!f.email.value || !f.password.value) { err.textContent = 'Please enter your email and password.'; err.classList.remove('hidden'); return; }
  const btn = $('[data-submit]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px"></span>';
  try {
    go(await login(f.email.value, f.password.value));
  } catch (ex) {
    err.textContent = ex.message;
    err.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
};
box.querySelectorAll('[data-demo]').forEach((b) => (b.onclick = async () => {
  b.disabled = true;
  go(await demoLogin(b.dataset.demo));
}));
