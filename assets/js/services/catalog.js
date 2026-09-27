import { db, respond } from './db.js';
import { seeded, uid } from '../core/utils.js';
import { currentUser } from '../core/auth.js';

// ---------- Categories (flat rows with parentId => nested tree) ----------
export function getCategoriesSync() {
  return db.all('categories');
}

export function categoryById(id) {
  return db.get('categories', id);
}

export function childrenOf(parentId) {
  return db.where('categories', (c) => c.parentId === parentId);
}

export function descendantIds(id) {
  const out = [id];
  childrenOf(id).forEach((c) => out.push(...descendantIds(c.id)));
  return out;
}

export function categoryPath(id) {
  const path = [];
  let c = categoryById(id);
  while (c) {
    path.unshift(c);
    c = c.parentId ? categoryById(c.parentId) : null;
  }
  return path;
}

export function rootOf(id) {
  return categoryPath(id)[0] || null;
}

export function categoryTree(parentId = null) {
  return childrenOf(parentId).map((c) => ({ ...c, children: categoryTree(c.id) }));
}

export async function getCategoryTree() {
  return respond(categoryTree());
}

export function productCount(categoryId) {
  const ids = new Set(descendantIds(categoryId));
  return db.where('products', (p) => ids.has(p.categoryId) && p.status === 'active').length;
}

export async function saveCategory(cat) {
  if (cat.id && db.get('categories', cat.id)) db.update('categories', cat.id, cat);
  else db.insert('categories', { ...cat, id: cat.id || uid('cat') });
  return respond(cat);
}

export async function deleteCategory(id) {
  descendantIds(id).forEach((cid) => db.remove('categories', cid));
  return respond(true);
}

// ---------- Products ----------
function publicVendorIds() {
  return new Set(db.where('vendors', (v) => v.status === 'approved').map((v) => v.id));
}

/**
 * Product query. Mirrors a Supabase select with filters/order/range.
 * @returns {Promise<{items: object[], total: number, page: number, pages: number}>}
 */
export async function getProducts({ category, vendorId, q, ids, minPrice, maxPrice, rating, inStock, onSale, sort = 'popular', page = 1, limit = 24, includeInactive = false } = {}) {
  const liveVendors = publicVendorIds();
  let list = db.all('products').filter((p) => includeInactive || (p.status === 'active' && liveVendors.has(p.vendorId)));
  if (category) {
    const cats = new Set(descendantIds(category));
    list = list.filter((p) => cats.has(p.categoryId));
  }
  if (vendorId) list = list.filter((p) => p.vendorId === vendorId);
  if (ids) list = ids.map((id) => list.find((p) => p.id === id)).filter(Boolean);
  if (q) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    list = list.filter((p) => {
      const hay = `${p.title} ${p.brand || ''} ${p.tags.join(' ')} ${p.categoryId}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }
  if (minPrice) list = list.filter((p) => p.price >= +minPrice);
  if (maxPrice) list = list.filter((p) => p.price <= +maxPrice);
  if (rating) list = list.filter((p) => p.rating >= +rating);
  if (inStock) list = list.filter((p) => p.stock > 0);
  if (onSale) list = list.filter((p) => p.discount >= 10);

  const sorters = {
    popular: (a, b) => b.sold - a.sold,
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
    discount: (a, b) => b.discount - a.discount,
  };
  if (!ids && sorters[sort]) list = [...list].sort(sorters[sort]);

  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const items = list.slice((page - 1) * limit, page * limit);
  return respond({ items, total, page, pages });
}

export function productSync(id) {
  return db.get('products', id);
}

export async function getProduct(id) {
  return respond(db.get('products', id));
}

export async function getRelated(product, limit = 8) {
  const list = db.where('products', (p) => p.id !== product.id && p.status === 'active' && p.categoryId === product.categoryId);
  const more = list.length < limit ? db.where('products', (p) => p.id !== product.id && p.vendorId === product.vendorId && p.categoryId !== product.categoryId) : [];
  return respond([...list, ...more].slice(0, limit));
}

export async function saveProduct(product) {
  if (product.id && db.get('products', product.id)) {
    db.update('products', product.id, product);
    return respond(db.get('products', product.id));
  }
  const row = {
    id: uid('p'), rating: 0, reviewCount: 0, sold: 0, tags: [], images: [], status: 'active',
    createdAt: new Date().toISOString(), ...product,
  };
  row.discount = row.originalPrice > row.price ? Math.round((1 - row.price / row.originalPrice) * 100) : 0;
  row.thumbnail ||= row.images[0] || '';
  db.insert('products', row);
  return respond(row);
}

export async function deleteProduct(id) {
  db.remove('products', id);
  return respond(true);
}

export async function updateStock(id, stock) {
  db.update('products', id, { stock: Math.max(0, +stock) });
  return respond(true);
}

// ---------- Reviews (seeded per product + user-submitted) ----------
const REVIEW_TEXT = [
  'Exactly as described, very happy with the purchase.', 'Good quality for the price. Delivery was fast.',
  'Packaging was great and the seller responded quickly.', 'Decent product, but took a few days to arrive.',
  'Absolutely love it! Would buy again.', 'Works perfectly. Highly recommended seller.',
  'Colour is slightly different from the photo but still nice.', 'Value for money. 5 stars!',
];
const REVIEWERS = ['Rakib H.', 'Mim A.', 'Sabbir R.', 'Nabila I.', 'Fahim C.', 'Tania S.', 'Jubayer A.', 'Riya D.', 'Sumaiya K.'];

export async function getReviews(productId) {
  const product = db.get('products', productId);
  const rnd = seeded(productId);
  const n = 3 + Math.floor(rnd() * 4);
  const seededReviews = Array.from({ length: n }, (_, i) => {
    const base = Math.round(product?.rating || 4);
    const rating = Math.min(5, Math.max(2, base + (rnd() < 0.3 ? -1 : rnd() < 0.3 ? 1 : 0)));
    return {
      id: `${productId}-r${i}`, productId, userName: REVIEWERS[Math.floor(rnd() * REVIEWERS.length)], rating,
      text: REVIEW_TEXT[Math.floor(rnd() * REVIEW_TEXT.length)], verified: rnd() > 0.2,
      createdAt: new Date(Date.now() - Math.floor(rnd() * 90) * 86400000).toISOString(),
    };
  });
  const own = db.where('reviews', (r) => r.productId === productId);
  return respond([...own, ...seededReviews]);
}

export async function addReview(productId, rating, text) {
  const user = currentUser();
  const review = { id: uid('rev'), productId, userId: user.id, userName: user.name, rating, text, verified: true, createdAt: new Date().toISOString() };
  db.insert('reviews', review);
  return respond(review);
}
