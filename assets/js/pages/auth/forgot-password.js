import { mountAuth } from './authLayout.js';
import { routes } from '../../core/routes.js';
import { icon, $, escapeHtml, sleep } from '../../core/utils.js';

const box = mountAuth('Locked out? We will get you back in.');
box.innerHTML = `
  <a class="small muted row mb-2" href="${routes.login()}">${icon('arrow-left')} Back to sign in</a>
  <h1>Reset password</h1>
  <p class="sub">Enter your account email and we'll send you a reset link.</p>
  <form class="stack" data-form>
    <div class="field"><label>Email</label><div class="input-group">${icon('mail')}<input class="input" type="email" name="email" required placeholder="you@example.com"></div></div>
    <button class="btn btn-primary btn-lg btn-block" data-submit>Send reset link</button>
  </form>`;

$('[data-form]').onsubmit = async (e) => {
  e.preventDefault();
  const email = e.target.email.value.trim();
  $('[data-submit]').disabled = true;
  await sleep(600);
  box.innerHTML = `
    <div class="center">
      <div class="empty-icon" style="width:72px;height:72px;border-radius:50%;background:var(--primary-50);color:var(--primary);display:grid;place-items:center;margin:0 auto 16px">${icon('mail-check')}</div>
      <h1>Check your inbox</h1>
      <p class="sub">If an account exists for <b>${escapeHtml(email)}</b>, a reset link is on its way. (In production this is sent by Supabase Auth.)</p>
      <a class="btn btn-primary btn-lg" href="${routes.login()}">Back to sign in</a>
    </div>`;
};
