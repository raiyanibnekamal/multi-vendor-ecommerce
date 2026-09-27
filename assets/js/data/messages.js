// Mock seed data (mirrors the planned Supabase tables).
export const conversations = [
  {
    "id": "m1",
    "vendorId": "v1",
    "customerId": "c1",
    "messages": [
      {
        "id": "m1-0",
        "from": "customer",
        "text": "Hi, does the phone come with an official warranty?",
        "createdAt": "2026-09-25T13:54:36.610Z"
      },
      {
        "id": "m1-1",
        "from": "vendor",
        "text": "Yes! 1 year official warranty with every phone.",
        "createdAt": "2026-09-25T16:18:36.610Z"
      },
      {
        "id": "m1-2",
        "from": "customer",
        "text": "Great, can I pay with bKash?",
        "createdAt": "2026-09-27T06:42:36.610Z"
      }
    ]
  },
  {
    "id": "m2",
    "vendorId": "v1",
    "customerId": "c3",
    "messages": [
      {
        "id": "m2-0",
        "from": "customer",
        "text": "Is the laptop available in stock?",
        "createdAt": "2026-09-22T13:54:36.610Z"
      },
      {
        "id": "m2-1",
        "from": "vendor",
        "text": "Yes, ready stock. Delivery within 48 hours in Dhaka.",
        "createdAt": "2026-09-22T18:42:36.610Z"
      }
    ]
  },
  {
    "id": "m3",
    "vendorId": "v1",
    "customerId": "c6",
    "messages": [
      {
        "id": "m3-0",
        "from": "customer",
        "text": "Saw your reel, what is the price of the blue one?",
        "createdAt": "2026-09-26T13:54:36.610Z"
      }
    ]
  },
  {
    "id": "m4",
    "vendorId": "v4",
    "customerId": "c1",
    "messages": [
      {
        "id": "m4-0",
        "from": "customer",
        "text": "Do you have this dress in size L?",
        "createdAt": "2026-09-24T13:54:36.610Z"
      },
      {
        "id": "m4-1",
        "from": "vendor",
        "text": "Yes, L and XL are available 😊",
        "createdAt": "2026-09-25T01:54:36.610Z"
      }
    ]
  },
  {
    "id": "m5",
    "vendorId": "v5",
    "customerId": "c1",
    "messages": [
      {
        "id": "m5-0",
        "from": "customer",
        "text": "Is this lipstick original?",
        "createdAt": "2026-09-21T13:54:36.610Z"
      },
      {
        "id": "m5-1",
        "from": "vendor",
        "text": "100% original, imported directly.",
        "createdAt": "2026-09-22T01:54:36.610Z"
      }
    ]
  }
];

