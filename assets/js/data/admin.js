// Mock seed data (mirrors the planned Supabase tables).
export const disputes = [
  {
    "id": "D-500",
    "orderId": "ORD-10303",
    "customerId": "c4",
    "customerName": "Mim Akter",
    "vendorId": "v1",
    "reason": "Item not as described",
    "message": "I would like a refund or replacement for this order.",
    "amount": 141600,
    "status": "open",
    "createdAt": "2026-09-26T13:54:36.610Z"
  },
  {
    "id": "D-501",
    "orderId": "ORD-10298",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "vendorId": "v8",
    "reason": "Order not received",
    "message": "I would like a refund or replacement for this order.",
    "amount": 13100,
    "status": "open",
    "createdAt": "2026-09-16T13:54:36.610Z"
  },
  {
    "id": "D-502",
    "orderId": "ORD-10304",
    "customerId": "c10",
    "customerName": "Riya Das",
    "vendorId": "v7",
    "reason": "Wrong size delivered",
    "message": "I would like a refund or replacement for this order.",
    "amount": 13800,
    "status": "open",
    "createdAt": "2026-09-23T13:54:36.610Z"
  },
  {
    "id": "D-503",
    "orderId": "ORD-10318",
    "customerId": "c3",
    "customerName": "Rakib Hasan",
    "vendorId": "v3",
    "reason": "Wrong size delivered",
    "message": "I would like a refund or replacement for this order.",
    "amount": 1062000,
    "status": "in_review",
    "createdAt": "2026-09-23T13:54:36.610Z"
  },
  {
    "id": "D-504",
    "orderId": "ORD-10271",
    "customerId": "c9",
    "customerName": "Jubayer Alam",
    "vendorId": "v8",
    "reason": "Wrong size delivered",
    "message": "I would like a refund or replacement for this order.",
    "amount": 420,
    "status": "in_review",
    "createdAt": "2026-09-23T13:54:36.610Z"
  },
  {
    "id": "D-505",
    "orderId": "ORD-10253",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "vendorId": "v7",
    "reason": "Refund not processed",
    "message": "I would like a refund or replacement for this order.",
    "amount": 24780,
    "status": "resolved_rejected",
    "createdAt": "2026-09-22T13:54:36.610Z"
  },
  {
    "id": "D-506",
    "orderId": "ORD-10254",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "vendorId": "v8",
    "reason": "Order not received",
    "message": "I would like a refund or replacement for this order.",
    "amount": 4080,
    "status": "resolved_refund",
    "createdAt": "2026-09-18T13:54:36.610Z"
  }
];

export const payouts = [
  {
    "id": "PO-900",
    "vendorId": "v1",
    "amount": 19261,
    "method": "bkash",
    "status": "processing",
    "requestedAt": "2026-09-22T13:54:36.610Z"
  },
  {
    "id": "PO-901",
    "vendorId": "v1",
    "amount": 86116,
    "method": "bkash",
    "status": "paid",
    "requestedAt": "2026-09-10T13:54:36.610Z"
  },
  {
    "id": "PO-902",
    "vendorId": "v1",
    "amount": 100688,
    "method": "bank",
    "status": "paid",
    "requestedAt": "2026-08-28T13:54:36.610Z"
  },
  {
    "id": "PO-903",
    "vendorId": "v2",
    "amount": 10514,
    "method": "bkash",
    "status": "requested",
    "requestedAt": "2026-09-27T13:54:36.610Z"
  },
  {
    "id": "PO-904",
    "vendorId": "v2",
    "amount": 113918,
    "method": "bkash",
    "status": "paid",
    "requestedAt": "2026-09-10T13:54:36.610Z"
  },
  {
    "id": "PO-905",
    "vendorId": "v2",
    "amount": 53432,
    "method": "bank",
    "status": "paid",
    "requestedAt": "2026-08-29T13:54:36.610Z"
  },
  {
    "id": "PO-906",
    "vendorId": "v3",
    "amount": 90965,
    "method": "bkash",
    "status": "requested",
    "requestedAt": "2026-09-22T13:54:36.610Z"
  },
  {
    "id": "PO-907",
    "vendorId": "v3",
    "amount": 77640,
    "method": "bank",
    "status": "paid",
    "requestedAt": "2026-09-13T13:54:36.610Z"
  },
  {
    "id": "PO-908",
    "vendorId": "v3",
    "amount": 59058,
    "method": "bkash",
    "status": "paid",
    "requestedAt": "2026-08-30T13:54:36.610Z"
  },
  {
    "id": "PO-909",
    "vendorId": "v4",
    "amount": 109163,
    "method": "bank",
    "status": "requested",
    "requestedAt": "2026-09-23T13:54:36.610Z"
  },
  {
    "id": "PO-910",
    "vendorId": "v4",
    "amount": 26408,
    "method": "bank",
    "status": "paid",
    "requestedAt": "2026-09-10T13:54:36.610Z"
  },
  {
    "id": "PO-911",
    "vendorId": "v4",
    "amount": 36901,
    "method": "bank",
    "status": "paid",
    "requestedAt": "2026-08-27T13:54:36.610Z"
  },
  {
    "id": "PO-912",
    "vendorId": "v5",
    "amount": 68600,
    "method": "bank",
    "status": "processing",
    "requestedAt": "2026-09-22T13:54:36.610Z"
  },
  {
    "id": "PO-913",
    "vendorId": "v5",
    "amount": 100891,
    "method": "bank",
    "status": "paid",
    "requestedAt": "2026-09-13T13:54:36.610Z"
  },
  {
    "id": "PO-914",
    "vendorId": "v5",
    "amount": 48720,
    "method": "bank",
    "status": "paid",
    "requestedAt": "2026-08-28T13:54:36.610Z"
  },
  {
    "id": "PO-915",
    "vendorId": "v6",
    "amount": 34011,
    "method": "bank",
    "status": "processing",
    "requestedAt": "2026-09-25T13:54:36.610Z"
  },
  {
    "id": "PO-916",
    "vendorId": "v6",
    "amount": 54445,
    "method": "bank",
    "status": "paid",
    "requestedAt": "2026-09-09T13:54:36.610Z"
  },
  {
    "id": "PO-917",
    "vendorId": "v6",
    "amount": 83129,
    "method": "bank",
    "status": "paid",
    "requestedAt": "2026-08-26T13:54:36.610Z"
  },
  {
    "id": "PO-918",
    "vendorId": "v7",
    "amount": 68114,
    "method": "bank",
    "status": "requested",
    "requestedAt": "2026-09-25T13:54:36.610Z"
  },
  {
    "id": "PO-919",
    "vendorId": "v7",
    "amount": 116718,
    "method": "bkash",
    "status": "paid",
    "requestedAt": "2026-09-13T13:54:36.610Z"
  },
  {
    "id": "PO-920",
    "vendorId": "v7",
    "amount": 12231,
    "method": "bank",
    "status": "paid",
    "requestedAt": "2026-08-30T13:54:36.610Z"
  },
  {
    "id": "PO-921",
    "vendorId": "v8",
    "amount": 47872,
    "method": "bkash",
    "status": "requested",
    "requestedAt": "2026-09-24T13:54:36.610Z"
  },
  {
    "id": "PO-922",
    "vendorId": "v8",
    "amount": 39203,
    "method": "bkash",
    "status": "paid",
    "requestedAt": "2026-09-09T13:54:36.610Z"
  },
  {
    "id": "PO-923",
    "vendorId": "v8",
    "amount": 99307,
    "method": "bkash",
    "status": "paid",
    "requestedAt": "2026-08-28T13:54:36.610Z"
  },
  {
    "id": "PO-924",
    "vendorId": "v9",
    "amount": 13851,
    "method": "bank",
    "status": "requested",
    "requestedAt": "2026-09-26T13:54:36.610Z"
  },
  {
    "id": "PO-925",
    "vendorId": "v9",
    "amount": 72607,
    "method": "bkash",
    "status": "paid",
    "requestedAt": "2026-09-12T13:54:36.610Z"
  },
  {
    "id": "PO-926",
    "vendorId": "v9",
    "amount": 50884,
    "method": "bkash",
    "status": "paid",
    "requestedAt": "2026-08-30T13:54:36.610Z"
  }
];

