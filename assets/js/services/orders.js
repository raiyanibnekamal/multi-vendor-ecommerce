import { db, respond } from './db.js';
import { channel } from './realtime.js';
import { currentUser } from '../core/auth.js';
import { CONFIG } from '../core/config.js';
import { sleep } from '../core/utils.js';

export const PAYMENT_METHODS = [
  { id: 'card', name: 'Credit / Debit Card', note: 'Visa, Mastercard, Amex — secured by Stripe', icon: 'credit-card' },
  { id: 'bkash', name: 'bKash', note: 'Pay with your bKash wallet', icon: 'smartphone' },
  { id: 'nagad', name: 'Nagad', note: 'Pay with your Nagad wallet', icon: 'smartphone' },
  { id: 'cod', name: 'Cash on Delivery', note: 'Pay when you receive the order', icon: 'banknote' },
];

export const ORDER_FLOW = ['pending', 'processing', 'shipped', 'delivered'];

/**
 * Creates an order. In production: an Edge Function creates a payment intent,
 * and the gateway webhook marks the order paid.
 */
export const COUPONS = {
  STREAM10: { label: '10% off (max ৳500)', apply: (subtotal) => Math.min(500, Math.round(subtotal * 0.1)) },
  LIVE50: { label: '৳50 off live orders', apply: () => 50 },
};

export async function placeOrder({ lines, address, paymentMethod, source = 'store', coupon = null }) {
  const user = currentUser();
  if (!user) throw new Error('Please sign in to place an order.');
  const items = lines.map(({ productId, qty }) => {
    const p = db.get('products', productId);
    if (!p || p.stock < qty) throw new Error(`${p?.title || 'A product'} doesn't have enough stock.`);
    return { productId, vendorId: p.vendorId, title: p.title, thumbnail: p.thumbnail, price: p.price, qty };
  });
  if (paymentMethod !== 'cod') await sleep(900);

  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const shipping = subtotal >= CONFIG.FREE_SHIPPING_MIN ? 0 : CONFIG.SHIPPING_FEE;
  const discount = coupon && COUPONS[coupon] ? COUPONS[coupon].apply(subtotal) : 0;
  const order = {
    id: `ORD-${Math.floor(20000 + Math.random() * 70000)}`,
    customerId: user.id,
    customerName: user.name,
    items,
    subtotal,
    shipping,
    discount,
    coupon: discount ? coupon : null,
    total: subtotal + shipping - discount,
    status: 'pending',
    paymentMethod,
    paymentStatus: paymentMethod === 'cod' ? 'unpaid' : 'paid',
    source,
    address,
    createdAt: new Date().toISOString(),
  };
  items.forEach((it) => db.update('products', it.productId, (p) => ({ stock: p.stock - it.qty, sold: p.sold + it.qty })));
  db.insert('orders', order);
  channel('orders').send('order:new', order);
  return respond(order, 200);
}

export async function getMyOrders() {
  const user = currentUser();
  return respond(db.where('orders', (o) => o.customerId === user?.id));
}

export async function getOrder(id) {
  return respond(db.get('orders', id));
}

/** Orders containing at least one of the vendor's items, with vendor-only totals. */
export function vendorOrdersSync(vendorId) {
  return db.all('orders')
    .filter((o) => o.items.some((it) => it.vendorId === vendorId))
    .map((o) => {
      const items = o.items.filter((it) => it.vendorId === vendorId);
      return { ...o, items, vendorTotal: items.reduce((s, it) => s + it.price * it.qty, 0) };
    });
}

export async function getVendorOrders(vendorId) {
  return respond(vendorOrdersSync(vendorId));
}

export async function getAllOrders() {
  return respond(db.all('orders'));
}

export async function updateOrderStatus(id, status) {
  const order = db.update('orders', id, (o) => ({
    status,
    paymentStatus: status === 'cancelled' ? (o.paymentStatus === 'paid' ? 'refunded' : 'unpaid') : status === 'delivered' ? 'paid' : o.paymentStatus,
  }));
  channel('orders').send('order:update', order);
  return respond(order);
}
