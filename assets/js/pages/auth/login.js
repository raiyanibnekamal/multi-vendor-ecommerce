import { mountAuth, passwordField, bindPasswordToggles } from './authLayout.js';
import { login, demoLogin, currentUser } from '../../core/auth.js';
import { routes, dashboardFor } from '../../core/routes.js';
import { icon, qs, $, escapeHtml } from '../../core/utils.js';

const next = qs('next');
function go(user) {
  const otherDashboard = next && ['vendor', 'admin'].some((r) => r !== user.role && next.includes(`/${r}/`));
  if (next && !otherDashboard) location.href = next;
  else location.href = user.role === 'customer' ? routes.home() : dashboardFor(user.role);
}

const existing = currentUser();
const box = mountAuth('Welcome back to the marketplace that moves.');
box.innerHTML = `
  <h1>Sign in</h1>
  <p class="sub">New here? <a class="text-primary bold" href="${routes.register()}">Create an account</a></p>
  ${existing ? `<div class="notice mb-2">${icon('info')}<div>You're signed in as <b>${escapeHtml(existing.name)}</b>. <a class="bold" href="${dashboardFor(existing.role)}">Continue →</a></div></div>` : ''}
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
