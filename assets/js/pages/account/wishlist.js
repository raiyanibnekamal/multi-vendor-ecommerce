import { mountAccount } from './accountLayout.js';
import { productGrid, emptyState } from '../../components/cards.js';
import { toast } from '../../components/toast.js';
import { routes } from '../../core/routes.js';
import { icon, on, $ } from '../../core/utils.js';
import { getWishlistIds, addToCart } from '../../services/cart.js';
import { db } from '../../services/db.js';

const el = mountAccount('wishlist', 'Wishlist');

function render() {
  const items = getWishlistIds().map((id) => db.get('products', id)).filter(Boolean);
  el.innerHTML = `
    <div class="row-between mb-2"><h2>Wishlist</h2>${items.length ? `<button class="btn btn-primary btn-sm" data-all>${icon('shopping-cart')} Add all to cart</button>` : ''}</div>
    ${items.length ? productGrid(items) : emptyState('heart', 'Your wishlist is empty', 'Tap the heart on any product to save it here.', `<a class="btn btn-primary" href="${routes.products()}">Discover products</a>`)}`;
  $('[data-all]')?.addEventListener('click', () => {
    let n = 0;
    items.forEach((p) => { try { addToCart(p.id); n++; } catch {} });
    toast(`${n} item(s) added to cart`, 'success', { action: 'View cart', href: routes.cart() });
  });
}

if (el) {
  render();
  on('store:wishlist', render);
}
