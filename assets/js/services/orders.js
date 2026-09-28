import { db, respond } from './db.js';
import { channel } from './realtime.js';
import { currentUser } from '../core/auth.js';
import { CONFIG } from '../core/config.js';
import { getSupabase } from '../core/supabase.js?v=20260928-11';

export const PAYMENT_METHODS = [
  { id: 'card', name: 'Credit / Debit Card', note: 'Secure demo payment — no real charge', icon: 'credit-card' },
  { id: 'bkash', name: 'bKash', note: 'Secure demo wallet payment', icon: 'smartphone' },
  { id: 'nagad', name: 'Nagad', note: 'Secure demo wallet payment', icon: 'smartphone' },
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
  if (!PAYMENT_METHODS.some((method) => method.id === paymentMethod)) throw new Error('Choose a valid payment method.');
  const items = lines.map(({ productId, qty }) => {
    const p = db.get('products', productId);
    if (!p || p.stock < qty) throw new Error(`${p?.title || 'A product'} doesn't have enough stock.`);
    return { productId, vendorId: p.vendorId, title: p.title, thumbnail: p.thumbnail, price: p.price, qty };
  });
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const shipping = subtotal >= CONFIG.FREE_SHIPPING_MIN ? 0 : CONFIG.SHIPPING_FEE;
  const discount = coupon && COUPONS[coupon] ? COUPONS[coupon].apply(subtotal) : 0;
  const order = {
    id: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    paymentProvider: paymentMethod === 'cod' ? 'cod' : 'mock',
    paymentReference: paymentMethod === 'cod' ? null : `MOCK-${Date.now().toString(36).toUpperCase()}`,
    source,
    address,
    createdAt: new Date().toISOString(),
  };
  const persistedOrder = await db.placeOrderAtomic(order);
  channel('orders').send('order:new', persistedOrder, { remote: false });
  return respond(persistedOrder, 200);
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
  const user = currentUser();
  const isLiveAccount = !CONFIG.USE_MOCK && typeof user?.id === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(user.id);
  let order;

  if (isLiveAccount && ['vendor', 'customer', 'admin'].includes(user.role)) {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Order service is unavailable. Please try again.');
    const rpc = user.role === 'vendor'
      ? ['update_vendor_order_status', { p_order_id: id, p_status: status }]
      : user.role === 'admin'
          ? ['admin_update_order_status', { p_order_id: id, p_status: status }]
          : status === 'cancelled'
            ? ['cancel_my_order', { p_order_id: id }]
            : null;
    if (!rpc) throw new Error('Customers can only cancel pending orders.');
    const { data, error } = await supabase.rpc(rpc[0], rpc[1]);
    if (error) throw new Error(error.message || 'Could not update this order.');
    const itemStatuses = new Map((data.items || []).map((item) => [item.product_id, item.status]));
    order = db.updateLocal('orders', id, (previous) => {
      const prevItems = Array.isArray(previous?.items) ? previous.items : [];
      return {
        ...previous,
        status: data.order.status,
        paymentStatus: data.order.payment_status,
        ...(itemStatuses.size ? { items: prevItems.map((item) => ({ ...item, status: itemStatuses.get(item.productId) || item.status })) } : {}),
        ...(user.role === 'customer' || status === 'cancelled' ? { items: prevItems.map((item) => ({ ...item, status: 'cancelled' })) } : {}),
      };
    });
    (data.products || []).forEach((product) => {
      db.updateLocal('products', product.id, { stock: product.stock, sold: product.sold });
    });
    if (user.role === 'vendor' && data.vendor_balance != null && Number.isFinite(Number(data.vendor_balance))) {
      db.updateLocal('vendors', user.vendorId, { balance: Number(data.vendor_balance) });
    }
    (data.vendor_balances || []).forEach((vendor) => {
      db.updateLocal('vendors', vendor.id, { balance: Number(vendor.balance) });
    });
  } else {
    const previous = db.get('orders', id);
    if (!previous) throw new Error('Order not found.');
    const patch = {
      status,
      paymentStatus: status === 'cancelled' ? (previous.paymentStatus === 'paid' ? 'refunded' : 'unpaid') : status === 'delivered' ? 'paid' : previous.paymentStatus,
    };
    order = isLiveAccount
      ? await db.updateAndSync('orders', id, patch)
      : db.updateLocal('orders', id, patch);
  }
  if (!order) throw new Error('Order not found.');
  channel('orders').send('order:update', order, { remote: false });
  return respond(order);
}
