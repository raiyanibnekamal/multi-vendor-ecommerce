// AI features use the same-origin serverless proxy when configured and retain local fallbacks.
import { db, respond } from './db.js';
import { store } from '../core/store.js';
import { userKey } from './userdata.js';
import { currentUser } from '../core/auth.js';
import { descendantIds, categoryById, rootOf } from './catalog.js';
import { formatPrice, sleep } from '../core/utils.js';
import { CONFIG } from '../core/config.js';

// ---------- Activity tracking (feeds recommendations) ----------
const WEIGHTS = { view: 1, reel_watch: 2, like: 3, wishlist: 3, cart: 4, purchase: 6, search: 1 };
let aiUnavailable = false;

function localStaticAiDisabled() {
  if (typeof location === 'undefined') return false;
  if (location.protocol === 'file:') return true;

  const host = (location.hostname || '').toLowerCase();
  const port = String(location.port || '');
  const localhostLike = ['localhost', '127.0.0.1', '0.0.0.0'].includes(host) || host.endsWith('.localhost');
  const staticPreviewPorts = new Set(['4173', '5173', '5500', '8001', '8080']);
  const apiReadyHosts = /vercel\.app$/i.test(host) || /render\.com$/i.test(host) || /netlify\.app$/i.test(host) || /azurewebsites\.net$/i.test(host);

  if (apiReadyHosts) return false;
  if (localhostLike && staticPreviewPorts.has(port)) return true;
  if (localhostLike && !port) return true;
  return false;
}

async function callAI(action, input) {
  if (aiUnavailable || typeof location === 'undefined' || localStaticAiDisabled()) return null;
  const controller = new AbortController();
  const timeoutMs = 12_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, input }),
      signal: controller.signal,
    });
    if (!response.ok) {
      if ([405, 404, 501].includes(response.status)) aiUnavailable = true;
      return null;
    }
    const result = await response.json();
    if (result.available === false) {
      aiUnavailable = true;
      return null;
    }
    return result;
  } catch {
    aiUnavailable = true;
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function productAIContext(product) {
  return {
    id: product.id,
    title: product.title,
    brand: product.brand || '',
    category: categoryById(product.categoryId)?.name || '',
    tags: Array.isArray(product.tags) ? product.tags.slice(0, 10) : [],
    price: product.price,
    rating: product.rating,
  };
}

function reorderByIds(items, ids) {
  if (!Array.isArray(ids) || !ids.length) return items;
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  const included = new Set(ordered.map((item) => item.id));
  return [...ordered, ...items.filter((item) => !included.has(item.id))];
}

function getActivity() {
  return store.get(userKey('activity'), { categories: {}, vendors: {}, viewed: [] });
}

export function track(type, { productId, categoryId, vendorId } = {}) {
  const a = getActivity();
  const w = WEIGHTS[type] || 1;
  const p = productId ? db.get('products', productId) : null;
  const cat = categoryId || p?.categoryId;
  const ven = vendorId || p?.vendorId;
  if (cat) a.categories[cat] = (a.categories[cat] || 0) + w;
  if (ven) a.vendors[ven] = (a.vendors[ven] || 0) + w;
  if (productId && type === 'view') a.viewed = [productId, ...a.viewed.filter((id) => id !== productId)].slice(0, 30);
  store.set(userKey('activity'), a);
}

export function recentlyViewedIds() {
  return getActivity().viewed;
}

function topCategory(a) {
  const entries = Object.entries(a.categories).sort((x, y) => y[1] - x[1]);
  return entries[0] ? categoryById(entries[0][0]) : null;
}

function scoreProduct(p, a) {
  const root = rootOf(p.categoryId)?.id;
  const rootScore = Object.entries(a.categories).reduce((s, [cid, v]) => (rootOf(cid)?.id === root ? s + v : s), 0);
  return (a.categories[p.categoryId] || 0) * 3 + rootScore + (a.vendors[p.vendorId] || 0) * 1.5 + p.rating + Math.log10(p.sold + 1);
}

/** Personalised products based on browsing/engagement history. */
export async function getRecommendations({ limit = 12, exclude = [] } = {}) {
  const a = getActivity();
  const liveVendors = new Set(db.where('vendors', (v) => v.status === 'approved').map((v) => v.id));
  const skip = new Set([...exclude, ...a.viewed.slice(0, 3)]);
  const pool = db.where('products', (p) => p.status === 'active' && p.stock > 0 && liveVendors.has(p.vendorId) && !skip.has(p.id));
  const hasHistory = Object.keys(a.categories).length > 0;
  let items;
  if (hasHistory) {
    items = pool.map((p) => [p, scoreProduct(p, a)]).sort((x, y) => y[1] - x[1]).slice(0, limit).map(([p]) => p);
  } else {
    // Cold start: best sellers, round-robin across top-level categories for variety.
    const buckets = {};
    [...pool].sort((x, y) => y.sold - x.sold).forEach((p) => (buckets[rootOf(p.categoryId)?.id] ||= []).push(p));
    items = [];
    const lists = Object.values(buckets);
    for (let i = 0; items.length < limit && i < 50; i++) lists.forEach((l) => l[i] && items.length < limit && items.push(l[i]));
  }
  const top = topCategory(a);
  const ranked = items.length ? await callAI('rank-products', {
    context: top ? `Shopper is interested in ${top.name}` : 'Popular products across categories',
    products: items.slice(0, 40).map(productAIContext),
  }) : null;
  items = reorderByIds(items, ranked?.ids);
  return respond({ items, reason: hasHistory && top ? `Because you're interested in ${top.name}` : 'Trending picks to get you started', personalised: hasHistory, reasonName: top?.name });
}

/** Orders reels so ones matching the viewer's interests come first. */
export async function rankReels(reels) {
  const a = getActivity();
  const score = (r) => {
    const productIds = Array.isArray(r.productIds) ? r.productIds : [];
    const likes = Number.isFinite(Number(r.likes)) ? Number(r.likes) : 0;
    const createdAt = Date.parse(r.createdAt || '');
    const recency = Number.isFinite(createdAt) ? (Date.now() - createdAt) / -86400000 * 0.1 : 0;
    const prodScore = productIds.reduce((sum, id) => { const p = db.get('products', id); return sum + (p ? scoreProduct(p, a) : 0); }, 0);
    return prodScore + Math.log10(likes + 1) * 2 + recency;
  };
  const ranked = [...reels].sort((x, y) => score(y) - score(x));
  const aiOrder = ranked.length ? await callAI('rank-reels', {
    interests: Object.entries(a.categories).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([id]) => categoryById(id)?.name || id),
    reels: ranked.slice(0, 40).map((reel) => ({
      id: reel.id,
      caption: reel.caption,
      likes: reel.likes,
      productTitles: (Array.isArray(reel.productIds) ? reel.productIds : []).map((id) => db.get('products', id)?.title).filter(Boolean).slice(0, 5),
    })),
  }) : null;
  const rankedPrefix = reorderByIds(ranked.slice(0, 40), aiOrder?.ids);
  return [...rankedPrefix, ...ranked.slice(40)];
}

// ---------- Smart / semantic search ----------
const SYNONYMS = {
  smartphones: ['phone', 'phones', 'mobile', 'smartphone', 'iphone', 'android', 'samsung', 'oppo', 'vivo', 'realme'],
  laptops: ['laptop', 'laptops', 'notebook', 'macbook', 'computer'],
  tablets: ['tablet', 'ipad', 'tab'],
  'mobile-accessories': ['earbuds', 'earphone', 'headphone', 'headphones', 'charger', 'cable', 'case', 'powerbank', 'airpods', 'speaker', 'accessories'],
  'mens-shirts': ['shirt', 'shirts', 'tshirt'],
  'womens-tops': ['top', 'tops', 'blouse'],
  'womens-dresses': ['dress', 'dresses', 'gown', 'frock'],
  'womens-bags': ['bag', 'bags', 'handbag', 'purse'],
  'womens-jewellery': ['jewellery', 'jewelry', 'necklace', 'earring', 'earrings', 'ring', 'bracelet'],
  sunglasses: ['sunglasses', 'shades', 'glasses'],
  fragrances: ['perfume', 'perfumes', 'fragrance', 'scent', 'cologne', 'attar'],
  makeup: ['makeup', 'lipstick', 'mascara', 'foundation', 'eyeshadow', 'cosmetics'],
  'skin-care': ['skincare', 'cream', 'serum', 'lotion', 'moisturizer'],
  furniture: ['furniture', 'sofa', 'chair', 'bed', 'table', 'desk'],
  'home-decoration': ['decor', 'decoration', 'lamp', 'vase', 'plant', 'showpiece'],
  kitchen: ['kitchen', 'pan', 'knife', 'cookware', 'utensil', 'spatula', 'blender', 'cooking'],
  'fresh-produce': ['fruit', 'fruits', 'vegetable', 'vegetables', 'apple', 'banana'],
  'meat-fish': ['meat', 'fish', 'chicken', 'beef'],
  'beverages-dairy': ['juice', 'milk', 'drink', 'drinks', 'water', 'beverage'],
  pantry: ['rice', 'oil', 'food', 'grocery', 'groceries', 'honey'],
  'sports-fitness': ['gym', 'fitness', 'workout', 'sports', 'ball', 'cricket', 'football', 'racket', 'exercise'],
};
const MULTI_SHOE = ['shoe', 'shoes', 'sneaker', 'sneakers', 'boots', 'sandals', 'heels'];
const MULTI_WATCH = ['watch', 'watches', 'smartwatch'];
const STOP = new Set(['a', 'an', 'the', 'for', 'with', 'and', 'or', 'of', 'in', 'to', 'me', 'my', 'i', 'show', 'find', 'want', 'need', 'looking', 'buy', 'some', 'good', 'best', 'cheap', 'budget', 'affordable', 'under', 'below', 'over', 'above', 'less', 'more', 'than', 'between', 'new', 'latest', 'top', 'rated', 'sale', 'discount', 'deal', 'deals', 'offer', 'gift', 'her', 'him', 'men', 'mens', 'women', 'womens', 'tk', 'taka', 'bdt', 'price', 'please', 'dekhao', 'chai', 'lagbe']);

function parseAmount(s) {
  const m = String(s).toLowerCase().replace(/[,৳]/g, '').match(/(\d+(?:\.\d+)?)(k)?/);
  return m ? Math.round(parseFloat(m[1]) * (m[2] ? 1000 : 1)) : null;
}

function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
    }
  return dp[a.length][b.length];
}

let vocabCache = null;
function vocabulary() {
  if (vocabCache) return vocabCache;
  const words = new Set([...Object.values(SYNONYMS).flat(), ...MULTI_SHOE, ...MULTI_WATCH]);
  db.all('products').forEach((p) => `${p.title} ${p.brand || ''} ${p.tags.join(' ')}`.toLowerCase().split(/[^a-z0-9]+/).forEach((w) => w.length > 2 && words.add(w)));
  return (vocabCache = [...words]);
}

function correct(term) {
  if (term.length < 4 || vocabulary().includes(term)) return term;
  const max = term.length > 6 ? 2 : 1;
  let best = null, bestD = max + 1;
  for (const w of vocabulary()) {
    if (Math.abs(w.length - term.length) > max) continue;
    const d = editDistance(term, w);
    if (d < bestD) { best = w; bestD = d; }
  }
  return best || term;
}

/** Parses a natural-language query into structured filters. */
export function interpret(query) {
  const q = query.toLowerCase().trim();
  const f = { categories: new Set(), keywords: [], chips: [], corrections: [] };

  let m;
  if ((m = q.match(/between\s*৳?\s*([\d.,]+k?)\s*(?:and|-|to)\s*৳?\s*([\d.,]+k?)/))) { f.minPrice = parseAmount(m[1]); f.maxPrice = parseAmount(m[2]); }
  else {
    if ((m = q.match(/(?:under|below|less than|within|max|<)\s*৳?\s*([\d.,]+k?)/))) f.maxPrice = parseAmount(m[1]);
    if ((m = q.match(/(?:over|above|more than|min|>)\s*৳?\s*([\d.,]+k?)/))) f.minPrice = parseAmount(m[1]);
  }
  if (/\b(cheap|budget|affordable|lowest price|kom dam)\b/.test(q)) f.sort = 'price-asc';
  if (/\b(best|top rated|highest rated|premium)\b/.test(q)) f.sort = f.sort || 'rating';
  if (/\b(new|latest|newest)\b/.test(q)) f.sort = 'newest';
  if (/\b(sale|discount|deal|deals|offer)\b/.test(q)) f.onSale = true;

  if (/gift.*\bher\b|for (her|wife|girlfriend|mom|mother)/.test(q)) ['womens-jewellery', 'fragrances', 'womens-bags', 'makeup'].forEach((c) => f.categories.add(c));
  if (/gift.*\bhim\b|for (him|husband|boyfriend|dad|father)/.test(q)) ['mens-watches', 'fragrances', 'mens-shirts'].forEach((c) => f.categories.add(c));
  const forMen = /\b(men|mens|men's|male)\b/.test(q);
  const forWomen = /\b(women|womens|women's|ladies|female)\b/.test(q);

  const tokens = q.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t && !/^\d+k?$/.test(t));
  for (const raw of tokens) {
    if (STOP.has(raw)) continue;
    const t = correct(raw);
    if (t !== raw) f.corrections.push([raw, t]);
    let matched = false;
    for (const [cat, words] of Object.entries(SYNONYMS)) if (words.includes(t)) { f.categories.add(cat); matched = true; }
    if (MULTI_SHOE.includes(t)) { (forWomen ? ['womens-shoes'] : forMen ? ['mens-shoes'] : ['mens-shoes', 'womens-shoes']).forEach((c) => f.categories.add(c)); matched = true; }
    if (MULTI_WATCH.includes(t)) { (forWomen ? ['womens-watches'] : forMen ? ['mens-watches'] : ['mens-watches', 'womens-watches']).forEach((c) => f.categories.add(c)); matched = true; }
    if (!matched) f.keywords.push(t);
  }
  if (!f.categories.size && forMen) f.categories.add('men');
  if (!f.categories.size && forWomen) f.categories.add('women');

  if (f.categories.size) f.chips.push(`Category: ${[...f.categories].map((c) => categoryById(c)?.name || c).join(', ')}`);
  if (f.minPrice && f.maxPrice) f.chips.push(`${formatPrice(f.minPrice)} – ${formatPrice(f.maxPrice)}`);
  else if (f.maxPrice) f.chips.push(`Under ${formatPrice(f.maxPrice)}`);
  else if (f.minPrice) f.chips.push(`Over ${formatPrice(f.minPrice)}`);
  if (f.onSale) f.chips.push('On sale');
  if (f.sort) f.chips.push({ 'price-asc': 'Lowest price first', rating: 'Top rated first', newest: 'Newest first' }[f.sort]);
  if (f.keywords.length) f.chips.push(`Keywords: ${f.keywords.join(' ')}`);
  return f;
}

function productScore(p, f, catIds) {
  let s = 0;
  const title = p.title.toLowerCase(), tags = p.tags.join(' ').toLowerCase(), brand = (p.brand || '').toLowerCase();
  for (const k of f.keywords) {
    if (title.includes(k)) s += 3;
    if (tags.includes(k)) s += 2;
    if (brand.includes(k)) s += 2;
    if (p.description.toLowerCase().includes(k)) s += 0.5;
  }
  if (catIds && catIds.has(p.categoryId)) s += 4;
  return s;
}

export async function smartSearch(query, { limit = 60 } = {}) {
  const f = interpret(query);
  const catIds = f.categories.size ? new Set([...f.categories].flatMap((c) => descendantIds(c))) : null;
  const liveVendors = new Set(db.where('vendors', (v) => v.status === 'approved').map((v) => v.id));
  let products = db.where('products', (p) => p.status === 'active' && liveVendors.has(p.vendorId));
  if (catIds) products = products.filter((p) => catIds.has(p.categoryId) || (f.keywords.length && productScore(p, { keywords: f.keywords }, null) >= 3));
  if (f.minPrice) products = products.filter((p) => p.price >= f.minPrice);
  if (f.maxPrice) products = products.filter((p) => p.price <= f.maxPrice);
  if (f.onSale) products = products.filter((p) => p.discount >= 10);
  let scored = products.map((p) => [p, productScore(p, f, catIds)]);
  if (f.keywords.length) scored = scored.filter(([, s]) => s > (catIds ? 4 : 0));
  const sorters = { 'price-asc': (a, b) => a[0].price - b[0].price, rating: (a, b) => b[0].rating - a[0].rating, newest: (a, b) => String(b[0].createdAt || '').localeCompare(String(a[0].createdAt || '')) };
  scored.sort(sorters[f.sort] || ((a, b) => b[1] - a[1] || b[0].sold - a[0].sold));
  const aiOrder = scored.length ? await callAI('rank-products', {
    query,
    products: scored.slice(0, 40).map(([product]) => productAIContext(product)),
  }) : null;
  const rankedPrefix = reorderByIds(scored.slice(0, 40).map(([product]) => product), aiOrder?.ids);
  const rankedById = new Map(scored.map(([product, score]) => [product.id, [product, score]]));
  const rankedScored = [...rankedPrefix.map((product) => rankedById.get(product.id)), ...scored.slice(40)];
  const items = rankedScored.slice(0, limit).map(([p]) => p);
  const hitIds = new Set(items.map((p) => p.id));
  const words = [...f.keywords, ...[...f.categories].flatMap((c) => SYNONYMS[c] || [])];
  const textHit = (t) => words.some((w) => t.toLowerCase().includes(w));

  const reels = db.where('reels', (r) => r.status === 'approved' && liveVendors.has(r.vendorId) && ((Array.isArray(r.productIds) && r.productIds.some((id) => hitIds.has(id))) || textHit(r.caption)));
  const streams = db.where('streams', (s) => s.status !== 'ended' && ((Array.isArray(s.productIds) && s.productIds.some((id) => hitIds.has(id))) || textHit(s.title)));
  store.set(userKey('lastSearch'), query);
  if (catIds) [...f.categories].slice(0, 2).forEach((c) => track('search', { categoryId: c }));
  return respond({ products: items, reels, streams, chips: f.chips, corrections: f.corrections }, 300);
}

/** Lightweight autocomplete for the header search box. */
export function suggest(query) {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return { products: [], categories: [] };
  const products = db.where('products', (p) => p.status === 'active' && `${p.title} ${p.brand || ''}`.toLowerCase().includes(q)).slice(0, 5);
  const categories = db.where('categories', (c) => c.name.toLowerCase().includes(q)).slice(0, 3);
  return { products, categories };
}

// ---------- Auto-tagging for reels & streams ----------
/** Suggests which of the vendor's products appear in a reel, from caption + file name. */
export async function suggestTags({ vendorId, caption = '', fileName = '' }) {
  const text = `${caption} ${fileName}`.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = text.split(/\s+/).filter((t) => t.length > 2 && !STOP.has(t));
  const f = interpret(text);
  const pool = db.where('products', (p) => p.vendorId === vendorId && p.status === 'active');
  let scored = pool.map((p) => {
    const hay = `${p.title} ${p.tags.join(' ')} ${p.brand || ''} ${categoryById(p.categoryId)?.name || ''}`.toLowerCase();
    let s = tokens.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
    if (f.categories.has(p.categoryId)) s += 2;
    return [p, s];
  }).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);
  const fromContent = scored.length > 0;
  if (!fromContent) scored = [...pool].sort((a, b) => b.sold - a.sold).map((p) => [p, 0.5]);
  const max = Math.max(...scored.map(([, s]) => s), 1);
  await sleep(1100);
  const fallback = scored.slice(0, 5).map(([p, s]) => ({ product: p, confidence: Math.round((fromContent ? 60 + (s / max) * 38 : 35 + Math.random() * 15)) }));
  const aiOrder = pool.length ? await callAI('suggest-tags', {
    caption,
    fileName,
    products: pool.slice(0, 40).map(productAIContext),
  }) : null;
  const byId = new Map(fallback.concat(scored.map(([product]) => ({ product, confidence: 45 }))).map((item) => [item.product.id, item]));
  const suggestions = Array.isArray(aiOrder?.ids) && aiOrder.ids.length
    ? aiOrder.ids.map((id, index) => byId.get(id) || (pool.find((product) => product.id === id) && { product: pool.find((product) => product.id === id), confidence: Math.max(55, 90 - index * 7) })).filter(Boolean).slice(0, 5)
    : fallback;
  const labels = [...new Set(suggestions.map((x) => categoryById(x.product.categoryId)?.name))].filter(Boolean);
  return { suggestions, labels, fromContent };
}

export async function generateProductDescription({ title, brand = '', category = '', location = '' }) {
  const result = await callAI('product-description', { product: { title, brand, category, location } });
  return typeof result?.description === 'string' && result.description.trim() ? result.description.trim() : null;
}

export async function generateProductTags({ title, brand = '', category = '' }) {
  const result = await callAI('product-tags', { product: { title, brand, category } });
  return Array.isArray(result?.tags) ? result.tags.filter((tag) => typeof tag === 'string').slice(0, 8) : null;
}

export async function reviewReelWithAI(reel) {
  const products = (Array.isArray(reel.productIds) ? reel.productIds : [])
    .map((id) => db.get('products', id))
    .filter(Boolean)
    .map((product) => ({ title: product.title, brand: product.brand || '' }));
  const review = await callAI('moderate-reel', { caption: reel.caption || '', products, reported: reel.status === 'flagged' });
  if (!review || !Number.isFinite(review.score) || !Array.isArray(review.flags)) return null;
  return review;
}

// ---------- Support chat assistant ----------
const has = (msg, ...words) => words.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(msg));

export async function supportChat(message) {
  const msg = message.toLowerCase();
  const user = currentUser();
  await sleep(700 + Math.random() * 500);

  if (/^(hi|hello|hey|salam|assalamu? ?alaikum|hola)\b/.test(msg.trim()) && msg.length < 30) {
    return { text: `Hi${user ? ' ' + user.name.split(' ')[0] : ''}! 👋 I'm the ${CONFIG.APP_NAME} assistant. I can track orders, explain delivery & returns, or help you find products. What do you need?` };
  }

  const orderId = message.match(/ORD-\d+/i)?.[0]?.toUpperCase();
  if (orderId || has(msg, 'order', 'track', 'where is my', 'kothay')) {
    if (!user) return { text: 'Please sign in so I can look up your orders.', links: [{ label: 'Sign in', href: 'login' }] };
    const mine = db.where('orders', (o) => o.customerId === user.id);
    const target = orderId ? mine.find((o) => o.id === orderId) : mine[0];
    if (!target) return { text: orderId ? `I couldn't find ${orderId} on your account.` : "You don't have any orders yet. Want some recommendations?" };
    const eta = { pending: 'The seller will confirm it shortly.', processing: 'The seller is packing it. Expected to ship within 24 hours.', shipped: 'It is on the way! Expected delivery in 1–3 days.', delivered: 'It has been delivered. Enjoy! 🎉', cancelled: 'This order was cancelled. Any payment is refunded within 5–7 working days.' }[target.status];
    return { text: `Order ${target.id} (${target.items.length} item${target.items.length > 1 ? 's' : ''}, ${formatPrice(target.total)}) is currently **${target.status}**.\n${eta}`, links: [{ label: 'View order', href: `order:${target.id}` }] };
  }
  if (has(msg, 'return', 'refund', 'exchange', 'ferot')) {
    return { text: 'Return policy:\n• 7-day easy returns for most items\n• Item must be unused with original packaging\n• Refunds go back to the original payment method within 5–7 working days\n• Groceries and beauty items can only be returned if damaged\n\nTo start a return, open the order and tap "Request return".' };
  }
  if (has(msg, 'delivery', 'shipping', 'ship', 'koto din', 'how long')) {
    return { text: `Delivery info:\n• Inside Dhaka: 1–2 days\n• Outside Dhaka: 2–4 days\n• Fee: ${formatPrice(CONFIG.SHIPPING_FEE)}, FREE on orders over ${formatPrice(CONFIG.FREE_SHIPPING_MIN)}\n• FreshBasket groceries: same-day in Dhaka` };
  }
  if (has(msg, 'payment', 'pay', 'bkash', 'nagad', 'card', 'cod', 'cash')) {
    return { text: 'We accept:\n• Credit/Debit cards (secured by Stripe)\n• bKash & Nagad\n• Cash on Delivery\n\nCard payments are processed securely — we never store your card number.' };
  }
  if (has(msg, 'sell', 'vendor', 'seller', 'open a store', 'shop khulte')) {
    return { text: 'Want to sell on StreamCart? Register as a vendor, add your products, then post reels and go live to reach buyers. Admin approval usually takes 24 hours.', links: [{ label: 'Become a vendor', href: 'register-vendor' }] };
  }
  if (has(msg, 'human', 'agent', 'person', 'support team', 'complain')) {
    return { text: `I've created a support ticket (#T-${Math.floor(1000 + Math.random() * 9000)}). A human agent will reply by email within 2 hours. Anything else I can help with meanwhile?` };
  }
  if (has(msg, 'live', 'stream')) {
    const live = db.where('streams', (s) => s.status === 'live');
    return { text: `There ${live.length === 1 ? 'is' : 'are'} ${live.length} live stream${live.length === 1 ? '' : 's'} right now. You can buy pinned products with one tap while watching!`, links: [{ label: 'Watch live', href: 'live' }] };
  }

  const res = await smartSearch(message, { limit: 3 });
  if (res.products.length) {
    return { text: `Here are some picks for you${res.chips.length ? ` (${res.chips.join(' · ')})` : ''}:`, products: res.products.slice(0, 3) };
  }
  const aiReply = await callAI('support-chat', { message });
  if (typeof aiReply?.text === 'string' && aiReply.text.trim()) return { text: aiReply.text.trim() };
  return { text: "Sorry, I didn't quite get that. I can help with:\n• Tracking an order\n• Delivery & returns\n• Payment methods\n• Finding products (e.g. \"phone under 20k\")" };
}
