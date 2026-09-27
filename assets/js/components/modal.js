import { escapeHtml } from '../core/utils.js';
import { currentUser, demoLogin } from '../core/auth.js';
import { routes } from '../core/routes.js';

/**
 * Opens a modal. variant: 'center' | 'drawer-right' | 'sheet'.
 * Returns { el, body, close }.
 */
export function openModal({ title = '', content = '', footer = '', size = '', variant = 'center', onClose } = {}) {
  const overlay = document.createElement('div');
  overlay.className = `overlay ${variant === 'center' ? '' : variant}`;
  overlay.innerHTML = `
    <div class="modal ${size ? 'modal-' + size : ''}" role="dialog" aria-modal="true">
      ${title !== null ? `<div class="modal-head"><h3>${escapeHtml(title)}</h3><button class="close-btn" data-close aria-label="Close"><i data-lucide="x"></i></button></div>` : ''}
      <div class="modal-body" style="${variant === 'drawer-right' ? 'flex:1;overflow:auto' : ''}"></div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`;
  const body = overlay.querySelector('.modal-body');
  if (typeof content === 'string') body.innerHTML = content;
  else if (content) body.appendChild(content);

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    if (!document.querySelector('.overlay')) document.body.style.overflow = '';
    onClose?.();
  };
  const onKey = (e) => e.key === 'Escape' && close();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  return { el: overlay, body, close };
}

export function confirmDialog({ title = 'Are you sure?', message = '', confirmText = 'Confirm', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = openModal({
      title,
      content: `<p class="muted">${escapeHtml(message)}</p>`,
      footer: `<button class="btn btn-outline" data-close>Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${escapeHtml(confirmText)}</button>`,
      onClose: () => !done && resolve(false),
    });
    m.el.querySelector('[data-ok]').onclick = () => { done = true; m.close(); resolve(true); };
  });
}

/** Resolves with the current user, prompting an inline demo sign-in if needed. */
export function ensureLogin(reason = 'Sign in to continue') {
  const user = currentUser();
  if (user) return Promise.resolve(user);
  return new Promise((resolve) => {
    let done = false;
    const m = openModal({
      title: 'Sign in required',
      content: `
        <p class="muted mb-2">${escapeHtml(reason)}. Use a demo account to try it instantly:</p>
        <div class="stack">
          <button class="btn btn-primary btn-block" data-role="customer"><i data-lucide="user"></i> Continue as Demo Customer</button>
          <a class="btn btn-outline btn-block" href="${routes.login(location.pathname + location.search)}">Sign in with email</a>
        </div>`,
      onClose: () => !done && resolve(null),
    });
    m.el.querySelector('[data-role]').onclick = async (e) => {
      e.currentTarget.disabled = true;
      const u = await demoLogin('customer');
      done = true;
      m.close();
      resolve(u);
    };
  });
}
