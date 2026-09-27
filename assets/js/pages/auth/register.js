import { mountAuth, passwordField, bindPasswordToggles } from './authLayout.js';
import { register } from '../../core/auth.js';
import { routes } from '../../core/routes.js';
import { icon, qs, $, escapeHtml } from '../../core/utils.js';
import { categoryTree } from '../../services/catalog.js';

let role = qs('role') === 'vendor' ? 'vendor' : 'customer';
const box = mountAuth(role === 'vendor' ? 'Open your store and sell with video.' : 'Join thousands of happy shoppers.');

function render() {
  box.innerHTML = `
    <h1>Create account</h1>
    <p class="sub">Already have one? <a class="text-primary bold" href="${routes.login()}">Sign in</a></p>
    <div class="role-switch">
      <label><input type="radio" name="role" value="customer" ${role === 'customer' ? 'checked' : ''}><b>${icon('user')} Customer</b><span>Shop, watch reels & live</span></label>
      <label><input type="radio" name="role" value="vendor" ${role === 'vendor' ? 'checked' : ''}><b>${icon('store')} Vendor</b><span>Sell products & go live</span></label>
    </div>
    <form class="stack" data-form>
      <div class="field"><label>Full name</label><div class="input-group">${icon('user')}<input class="input" name="name" required placeholder="Your name"></div></div>
      <div class="field"><label>Email</label><div class="input-group">${icon('mail')}<input class="input" type="email" name="email" required placeholder="you@example.com"></div></div>
      <div class="field"><label>Phone</label><div class="input-group">${icon('phone')}<input class="input" name="phone" required placeholder="+8801XXXXXXXXX" pattern="^\\+?[0-9]{10,14}$"></div></div>
      ${role === 'vendor' ? `
        <div class="field"><label>Store name</label><div class="input-group">${icon('store')}<input class="input" name="storeName" required placeholder="e.g. Dhaka Gadgets"></div></div>
        <div class="field"><label>Main category</label><select class="select" name="storeCategory">${categoryTree().map((c) => `<option>${escapeHtml(c.name)}</option>`).join('')}</select></div>` : ''}
      <div class="field"><label>Password</label>${passwordField('password', 'At least 6 characters')}</div>
      <label class="check"><input type="checkbox" required> I agree to the Terms & Privacy Policy</label>
      ${role === 'vendor' ? `<div class="notice">${icon('info')}<div>New stores are reviewed by an admin before going public (usually within 24 hours).</div></div>` : ''}
      <p class="error-text hidden" data-error></p>
      <button class="btn btn-primary btn-lg btn-block" data-submit>${role === 'vendor' ? 'Create vendor account' : 'Create account'}</button>
    </form>`;
  bindPasswordToggles(box);
  box.querySelectorAll('[name=role]').forEach((r) => (r.onchange = () => { role = r.value; history.replaceState(null, '', routes.register(role === 'vendor' ? 'vendor' : undefined)); render(); }));
  $('[data-form]').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const err = $('[data-error]');
    const btn = $('[data-submit]');
    btn.disabled = true;
    try {
      const user = await register({
        name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), password: f.password.value,
        role, storeName: f.storeName?.value.trim(), storeCategory: f.storeCategory?.value,
      });
      location.href = user.role === 'vendor' ? routes.vendorDash() : routes.home();
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove('hidden');
      btn.disabled = false;
    }
  };
}

render();
