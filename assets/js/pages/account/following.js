import { mountAccount } from './accountLayout.js';
import { vendorCard, emptyState, loading } from '../../components/cards.js';
import { toast } from '../../components/toast.js';
import { routes } from '../../core/routes.js';
import { getFollowing, toggleFollow } from '../../services/vendors.js';
import { $$ } from '../../core/utils.js';
import { db } from '../../services/db.js';

const el = mountAccount('following', 'Following');

async function render() {
  const vendors = await getFollowing();
  el.innerHTML = `
    <div class="row-between mb-2"><h2>Stores you follow</h2><span class="muted small">${vendors.length} stores</span></div>
    ${vendors.length ? `<div class="grid-products">${vendors.map((v) => {
      const live = db.where('streams', (s) => s.vendorId === v.id && s.status === 'live').length;
      return `<div class="stack" style="gap:8px">${vendorCard(v)}<div class="row">${live ? `<a class="btn btn-live btn-sm grow" href="${routes.live()}">LIVE now</a>` : ''}<button class="btn btn-outline btn-sm grow" data-unfollow="${v.id}">Unfollow</button></div></div>`;
    }).join('')}</div>` : emptyState('users', "You're not following any stores", 'Follow stores to see their new reels and get notified when they go live.', `<a class="btn btn-primary" href="${routes.home()}">Explore stores</a>`)}`;
  $$('[data-unfollow]').forEach((b) => (b.onclick = async () => {
    try { await toggleFollow(b.dataset.unfollow); toast('Unfollowed', 'info'); render(); }
    catch (error) { toast(error.message, 'error'); }
  }));
}

if (el) {
  el.innerHTML = loading();
  render();
}
