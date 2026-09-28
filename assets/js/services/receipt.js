import { escapeHtml, formatDate, formatPrice } from '../core/utils.js';

export function orderReceiptHtml(order) {
  const items = (order.items || []).map((item) => `
    <tr>
      <td>${escapeHtml(item.title)}</td>
      <td>${item.qty}</td>
      <td>${formatPrice(item.price)}</td>
      <td>${formatPrice(item.price * item.qty)}</td>
    </tr>`).join('');
  const address = order.address || {};
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>StreamCart order ${escapeHtml(order.id)}</title>
<style>body{font:15px/1.5 Arial,sans-serif;color:#172033;max-width:760px;margin:32px auto;padding:0 20px}h1{margin-bottom:4px}.muted{color:#64748b}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:24px 0}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #dbe2ea}th{background:#f1f5f9}.total{font-size:18px;font-weight:700;text-align:right}.address{background:#f8fafc;padding:14px;border-radius:8px}@media print{body{margin:0}}</style></head>
<body><h1>StreamCart</h1><div class="muted">Order receipt</div>
<div class="meta"><div><b>Order ID</b><br>${escapeHtml(order.id)}</div><div><b>Placed</b><br>${formatDate(order.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</div><div><b>Payment</b><br>${escapeHtml(order.paymentMethod || 'cod')} · ${escapeHtml(order.paymentStatus || 'unpaid')}</div><div><b>Status</b><br>${escapeHtml(order.status || 'pending')}</div></div>
<div class="address"><b>Delivery address</b><br>${escapeHtml(address.name || '')}<br>${escapeHtml(address.line || '')}, ${escapeHtml(address.area || '')}<br>${escapeHtml(address.phone || '')}</div>
<table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${items}</tbody></table>
<div class="total">Subtotal: ${formatPrice(order.subtotal)}<br>Shipping: ${formatPrice(order.shipping)}<br>Discount: ${formatPrice(order.discount)}<br>Grand total: ${formatPrice(order.total)}</div>
<p class="muted">This document is generated from the StreamCart order record. Keep the order ID for support.</p></body></html>`;
}

export function downloadOrderReceipt(order) {
  const blob = new Blob([orderReceiptHtml(order)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `streamcart-order-${order.id}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function printOrderReceipt(order) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.opener = null;
  printWindow.document.write(orderReceiptHtml(order));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
}
