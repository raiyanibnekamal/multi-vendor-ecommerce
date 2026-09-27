import { url } from './utils.js';

const q = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
  return s ? `?${s}` : '';
};

export const routes = {
  home: () => url('index.html'),
  login: (next) => url('pages/auth/login.html' + q({ next })),
  register: (role) => url('pages/auth/register.html' + q({ role })),
  forgot: () => url('pages/auth/forgot-password.html'),

  categories: () => url('pages/shop/categories.html'),
  products: (params = {}) => url('pages/shop/products.html' + q(params)),
  product: (id) => url('pages/shop/product.html' + q({ id })),
  search: (qstr) => url('pages/shop/search.html' + q({ q: qstr })),
  vendor: (id) => url('pages/shop/vendor.html' + q({ id })),
  cart: () => url('pages/shop/cart.html'),
  checkout: () => url('pages/shop/checkout.html'),
  orderSuccess: (id) => url('pages/shop/order-success.html' + q({ id })),

  reels: (id) => url('pages/reels/reels.html' + q({ id })),
  live: () => url('pages/live/live.html'),
  watch: (id) => url('pages/live/watch.html' + q({ id })),

  account: () => url('pages/account/profile.html'),
  orders: () => url('pages/account/orders.html'),
  orderDetail: (id) => url('pages/account/order-detail.html' + q({ id })),
  wishlist: () => url('pages/account/wishlist.html'),
  saved: () => url('pages/account/saved.html'),
  following: () => url('pages/account/following.html'),
  addresses: () => url('pages/account/addresses.html'),

  vendorDash: (page = 'dashboard', params = {}) => url(`vendor/${page}.html` + q(params)),
  adminDash: (page = 'dashboard', params = {}) => url(`admin/${page}.html` + q(params)),
};

export function dashboardFor(role) {
  if (role === 'admin') return routes.adminDash();
  if (role === 'vendor') return routes.vendorDash();
  return routes.account();
}
