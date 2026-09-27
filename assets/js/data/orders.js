// Mock seed data (mirrors the planned Supabase tables).
export const orders = [
  {
    "id": "ORD-10279",
    "customerId": "c7",
    "customerName": "Fahim Chowdhury",
    "items": [
      {
        "productId": "p63",
        "vendorId": "v7",
        "title": "Kitchen Sieve",
        "thumbnail": "https://cdn.dummyjson.com/product-images/kitchen-accessories/kitchen-sieve/thumbnail.webp",
        "price": 940,
        "qty": 1
      }
    ],
    "subtotal": 940,
    "shipping": 60,
    "total": 1000,
    "status": "cancelled",
    "paymentMethod": "cod",
    "paymentStatus": "refunded",
    "source": "reel",
    "address": {
      "id": "a7",
      "label": "Home",
      "name": "Fahim Chowdhury",
      "phone": "+8801726523717",
      "line": "House 61, Road 3",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-27T10:54:36.610Z"
  },
  {
    "id": "ORD-10253",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p59",
        "vendorId": "v7",
        "title": "Glass",
        "thumbnail": "https://cdn.dummyjson.com/product-images/kitchen-accessories/glass/thumbnail.webp",
        "price": 590,
        "qty": 2
      },
      {
        "productId": "p121",
        "vendorId": "v1",
        "title": "iPhone 5s",
        "thumbnail": "https://cdn.dummyjson.com/product-images/smartphones/iphone-5s/thumbnail.webp",
        "price": 23600,
        "qty": 1
      }
    ],
    "subtotal": 24780,
    "shipping": 0,
    "total": 24780,
    "status": "delivered",
    "paymentMethod": "cod",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-27T06:54:36.610Z"
  },
  {
    "id": "ORD-10254",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p24",
        "vendorId": "v8",
        "title": "Fish Steak",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/fish-steak/thumbnail.webp",
        "price": 1770,
        "qty": 2
      },
      {
        "productId": "p35",
        "vendorId": "v8",
        "title": "Potatoes",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/potatoes/thumbnail.webp",
        "price": 270,
        "qty": 2
      }
    ],
    "subtotal": 4080,
    "shipping": 0,
    "total": 4080,
    "status": "delivered",
    "paymentMethod": "nagad",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-27T05:54:36.610Z"
  },
  {
    "id": "ORD-10276",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p83",
        "vendorId": "v3",
        "title": "Blue & Black Check Shirt",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mens-shirts/blue-&-black-check-shirt/thumbnail.webp",
        "price": 3540,
        "qty": 1
      }
    ],
    "subtotal": 3540,
    "shipping": 0,
    "total": 3540,
    "status": "delivered",
    "paymentMethod": "cod",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-27T02:54:36.610Z"
  },
  {
    "id": "ORD-10251",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p32",
        "vendorId": "v8",
        "title": "Milk",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/milk/thumbnail.webp",
        "price": 410,
        "qty": 2
      },
      {
        "productId": "p162",
        "vendorId": "v4",
        "title": "Blue Frock",
        "thumbnail": "https://cdn.dummyjson.com/product-images/tops/blue-frock/thumbnail.webp",
        "price": 3540,
        "qty": 2
      }
    ],
    "subtotal": 7900,
    "shipping": 0,
    "total": 7900,
    "status": "processing",
    "paymentMethod": "bkash",
    "paymentStatus": "paid",
    "source": "reel",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-26T09:54:36.610Z"
  },
  {
    "id": "ORD-10295",
    "customerId": "c6",
    "customerName": "Nabila Islam",
    "items": [
      {
        "productId": "p164",
        "vendorId": "v4",
        "title": "Gray Dress",
        "thumbnail": "https://cdn.dummyjson.com/product-images/tops/gray-dress/thumbnail.webp",
        "price": 4130,
        "qty": 1
      }
    ],
    "subtotal": 4130,
    "shipping": 0,
    "total": 4130,
    "status": "cancelled",
    "paymentMethod": "nagad",
    "paymentStatus": "refunded",
    "source": "store",
    "address": {
      "id": "a6",
      "label": "Home",
      "name": "Nabila Islam",
      "phone": "+8801520850592",
      "line": "House 10, Road 11",
      "area": "Dhanmondi, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-26T03:54:36.610Z"
  },
  {
    "id": "ORD-10252",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p21",
        "vendorId": "v8",
        "title": "Cucumber",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/cucumber/thumbnail.webp",
        "price": 180,
        "qty": 2
      },
      {
        "productId": "p6",
        "vendorId": "v5",
        "title": "Calvin Klein CK One",
        "thumbnail": "https://cdn.dummyjson.com/product-images/fragrances/calvin-klein-ck-one/thumbnail.webp",
        "price": 5900,
        "qty": 1
      }
    ],
    "subtotal": 6260,
    "shipping": 0,
    "total": 6260,
    "status": "processing",
    "paymentMethod": "cod",
    "paymentStatus": "unpaid",
    "source": "live",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-26T02:54:36.610Z"
  },
  {
    "id": "ORD-10294",
    "customerId": "c2",
    "customerName": "Ayesha Siddiqua",
    "items": [
      {
        "productId": "p43",
        "vendorId": "v6",
        "title": "Decoration Swing",
        "thumbnail": "https://cdn.dummyjson.com/product-images/home-decoration/decoration-swing/thumbnail.webp",
        "price": 7080,
        "qty": 2
      },
      {
        "productId": "p158",
        "vendorId": "v3",
        "title": "Sunglasses",
        "thumbnail": "https://cdn.dummyjson.com/product-images/sunglasses/sunglasses/thumbnail.webp",
        "price": 2710,
        "qty": 1
      },
      {
        "productId": "p137",
        "vendorId": "v9",
        "title": "American Football",
        "thumbnail": "https://cdn.dummyjson.com/product-images/sports-accessories/american-football/thumbnail.webp",
        "price": 2360,
        "qty": 1
      }
    ],
    "subtotal": 19230,
    "shipping": 0,
    "total": 19230,
    "status": "pending",
    "paymentMethod": "nagad",
    "paymentStatus": "paid",
    "source": "reel",
    "address": {
      "id": "a2",
      "label": "Home",
      "name": "Ayesha Siddiqua",
      "phone": "+8801766648455",
      "line": "House 33, Road 10",
      "area": "Gulshan 2, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-25T19:54:36.610Z"
  },
  {
    "id": "ORD-10250",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p153",
        "vendorId": "v9",
        "title": "Volleyball",
        "thumbnail": "https://cdn.dummyjson.com/product-images/sports-accessories/volleyball/thumbnail.webp",
        "price": 1410,
        "qty": 2
      },
      {
        "productId": "p186",
        "vendorId": "v4",
        "title": "Calvin Klein Heel Shoes",
        "thumbnail": "https://cdn.dummyjson.com/product-images/womens-shoes/calvin-klein-heel-shoes/thumbnail.webp",
        "price": 9440,
        "qty": 2
      },
      {
        "productId": "p147",
        "vendorId": "v9",
        "title": "Football",
        "thumbnail": "https://cdn.dummyjson.com/product-images/sports-accessories/football/thumbnail.webp",
        "price": 2120,
        "qty": 1
      }
    ],
    "subtotal": 23820,
    "shipping": 0,
    "total": 23820,
    "status": "shipped",
    "paymentMethod": "card",
    "paymentStatus": "paid",
    "source": "reel",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-25T12:54:36.610Z"
  },
  {
    "id": "ORD-10306",
    "customerId": "c11",
    "customerName": "Mehedi Hasan",
    "items": [
      {
        "productId": "p6",
        "vendorId": "v5",
        "title": "Calvin Klein CK One",
        "thumbnail": "https://cdn.dummyjson.com/product-images/fragrances/calvin-klein-ck-one/thumbnail.webp",
        "price": 5900,
        "qty": 1
      },
      {
        "productId": "p96",
        "vendorId": "v3",
        "title": "Rolex Cellini Moonphase",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mens-watches/rolex-cellini-moonphase/thumbnail.webp",
        "price": 1534000,
        "qty": 2
      }
    ],
    "subtotal": 3073900,
    "shipping": 0,
    "total": 3073900,
    "status": "processing",
    "paymentMethod": "cod",
    "paymentStatus": "unpaid",
    "source": "store",
    "address": {
      "id": "a11",
      "label": "Home",
      "name": "Mehedi Hasan",
      "phone": "+8801680654536",
      "line": "House 21, Road 29",
      "area": "Boalia, Rajshahi",
      "isDefault": true
    },
    "createdAt": "2026-09-24T22:54:36.610Z"
  },
  {
    "id": "ORD-10312",
    "customerId": "c4",
    "customerName": "Mim Akter",
    "items": [
      {
        "productId": "p134",
        "vendorId": "v1",
        "title": "Vivo S1",
        "thumbnail": "https://cdn.dummyjson.com/product-images/smartphones/vivo-s1/thumbnail.webp",
        "price": 29500,
        "qty": 1
      },
      {
        "productId": "p49",
        "vendorId": "v7",
        "title": "Black Aluminium Cup",
        "thumbnail": "https://cdn.dummyjson.com/product-images/kitchen-accessories/black-aluminium-cup/thumbnail.webp",
        "price": 710,
        "qty": 1
      },
      {
        "productId": "p43",
        "vendorId": "v6",
        "title": "Decoration Swing",
        "thumbnail": "https://cdn.dummyjson.com/product-images/home-decoration/decoration-swing/thumbnail.webp",
        "price": 7080,
        "qty": 1
      }
    ],
    "subtotal": 37290,
    "shipping": 0,
    "total": 37290,
    "status": "delivered",
    "paymentMethod": "card",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a4",
      "label": "Home",
      "name": "Mim Akter",
      "phone": "+8801797027725",
      "line": "House 69, Road 17",
      "area": "Zindabazar, Sylhet",
      "isDefault": true
    },
    "createdAt": "2026-09-24T07:54:36.610Z"
  },
  {
    "id": "ORD-10304",
    "customerId": "c10",
    "customerName": "Riya Das",
    "items": [
      {
        "productId": "p75",
        "vendorId": "v7",
        "title": "Tray",
        "thumbnail": "https://cdn.dummyjson.com/product-images/kitchen-accessories/tray/thumbnail.webp",
        "price": 2000,
        "qty": 1
      },
      {
        "productId": "p2",
        "vendorId": "v5",
        "title": "Eyeshadow Palette with Mirror",
        "thumbnail": "https://cdn.dummyjson.com/product-images/beauty/eyeshadow-palette-with-mirror/thumbnail.webp",
        "price": 2360,
        "qty": 1
      },
      {
        "productId": "p10",
        "vendorId": "v5",
        "title": "Gucci Bloom Eau de",
        "thumbnail": "https://cdn.dummyjson.com/product-images/fragrances/gucci-bloom-eau-de/thumbnail.webp",
        "price": 9440,
        "qty": 1
      }
    ],
    "subtotal": 13800,
    "shipping": 0,
    "total": 13800,
    "status": "shipped",
    "paymentMethod": "cod",
    "paymentStatus": "unpaid",
    "source": "store",
    "address": {
      "id": "a10",
      "label": "Home",
      "name": "Riya Das",
      "phone": "+8801881355005",
      "line": "House 61, Road 9",
      "area": "Agrabad, Chattogram",
      "isDefault": true
    },
    "createdAt": "2026-09-22T21:54:36.610Z"
  },
  {
    "id": "ORD-10286",
    "customerId": "c6",
    "customerName": "Nabila Islam",
    "items": [
      {
        "productId": "p134",
        "vendorId": "v1",
        "title": "Vivo S1",
        "thumbnail": "https://cdn.dummyjson.com/product-images/smartphones/vivo-s1/thumbnail.webp",
        "price": 29500,
        "qty": 1
      }
    ],
    "subtotal": 29500,
    "shipping": 0,
    "total": 29500,
    "status": "pending",
    "paymentMethod": "card",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a6",
      "label": "Home",
      "name": "Nabila Islam",
      "phone": "+8801520850592",
      "line": "House 10, Road 11",
      "area": "Dhanmondi, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-22T01:54:36.610Z"
  },
  {
    "id": "ORD-10285",
    "customerId": "c11",
    "customerName": "Mehedi Hasan",
    "items": [
      {
        "productId": "p122",
        "vendorId": "v1",
        "title": "iPhone 6",
        "thumbnail": "https://cdn.dummyjson.com/product-images/smartphones/iphone-6/thumbnail.webp",
        "price": 35400,
        "qty": 1
      },
      {
        "productId": "p62",
        "vendorId": "v7",
        "title": "Ice Cube Tray",
        "thumbnail": "https://cdn.dummyjson.com/product-images/kitchen-accessories/ice-cube-tray/thumbnail.webp",
        "price": 710,
        "qty": 2
      }
    ],
    "subtotal": 36820,
    "shipping": 0,
    "total": 36820,
    "status": "cancelled",
    "paymentMethod": "nagad",
    "paymentStatus": "refunded",
    "source": "store",
    "address": {
      "id": "a11",
      "label": "Home",
      "name": "Mehedi Hasan",
      "phone": "+8801680654536",
      "line": "House 21, Road 29",
      "area": "Boalia, Rajshahi",
      "isDefault": true
    },
    "createdAt": "2026-09-21T13:54:36.610Z"
  },
  {
    "id": "ORD-10256",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p35",
        "vendorId": "v8",
        "title": "Potatoes",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/potatoes/thumbnail.webp",
        "price": 270,
        "qty": 2
      },
      {
        "productId": "p17",
        "vendorId": "v8",
        "title": "Beef Steak",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/beef-steak/thumbnail.webp",
        "price": 1530,
        "qty": 1
      },
      {
        "productId": "p91",
        "vendorId": "v3",
        "title": "Sports Sneakers Off White & Red",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mens-shoes/sports-sneakers-off-white-&-red/thumbnail.webp",
        "price": 14160,
        "qty": 2
      }
    ],
    "subtotal": 30390,
    "shipping": 0,
    "total": 30390,
    "status": "processing",
    "paymentMethod": "bkash",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-20T21:54:36.610Z"
  },
  {
    "id": "ORD-10268",
    "customerId": "c6",
    "customerName": "Nabila Islam",
    "items": [
      {
        "productId": "p188",
        "vendorId": "v4",
        "title": "Pampi Shoes",
        "thumbnail": "https://cdn.dummyjson.com/product-images/womens-shoes/pampi-shoes/thumbnail.webp",
        "price": 3540,
        "qty": 1
      }
    ],
    "subtotal": 3540,
    "shipping": 0,
    "total": 3540,
    "status": "delivered",
    "paymentMethod": "cod",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a6",
      "label": "Home",
      "name": "Nabila Islam",
      "phone": "+8801520850592",
      "line": "House 10, Road 11",
      "area": "Dhanmondi, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-20T17:54:36.610Z"
  },
  {
    "id": "ORD-10271",
    "customerId": "c9",
    "customerName": "Jubayer Alam",
    "items": [
      {
        "productId": "p21",
        "vendorId": "v8",
        "title": "Cucumber",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/cucumber/thumbnail.webp",
        "price": 180,
        "qty": 2
      }
    ],
    "subtotal": 360,
    "shipping": 60,
    "total": 420,
    "status": "delivered",
    "paymentMethod": "bkash",
    "paymentStatus": "paid",
    "source": "live",
    "address": {
      "id": "a9",
      "label": "Home",
      "name": "Jubayer Alam",
      "phone": "+8801525640214",
      "line": "House 70, Road 1",
      "area": "Zindabazar, Sylhet",
      "isDefault": true
    },
    "createdAt": "2026-09-19T22:54:36.610Z"
  },
  {
    "id": "ORD-10299",
    "customerId": "c5",
    "customerName": "Sabbir Rahman",
    "items": [
      {
        "productId": "p112",
        "vendorId": "v2",
        "title": "TV Studio Camera Pedestal",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mobile-accessories/tv-studio-camera-pedestal/thumbnail.webp",
        "price": 59000,
        "qty": 1
      },
      {
        "productId": "p173",
        "vendorId": "v4",
        "title": "Heshe Women's Leather Bag",
        "thumbnail": "https://cdn.dummyjson.com/product-images/womens-bags/heshe-women's-leather-bag/thumbnail.webp",
        "price": 15340,
        "qty": 1
      }
    ],
    "subtotal": 74340,
    "shipping": 0,
    "total": 74340,
    "status": "delivered",
    "paymentMethod": "cod",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a5",
      "label": "Home",
      "name": "Sabbir Rahman",
      "phone": "+8801880493774",
      "line": "House 5, Road 9",
      "area": "Uttara, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-18T06:54:36.610Z"
  },
  {
    "id": "ORD-10311",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p122",
        "vendorId": "v1",
        "title": "iPhone 6",
        "thumbnail": "https://cdn.dummyjson.com/product-images/smartphones/iphone-6/thumbnail.webp",
        "price": 35400,
        "qty": 1
      }
    ],
    "subtotal": 35400,
    "shipping": 0,
    "total": 35400,
    "status": "cancelled",
    "paymentMethod": "nagad",
    "paymentStatus": "refunded",
    "source": "store",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-18T03:54:36.610Z"
  },
  {
    "id": "ORD-10259",
    "customerId": "c11",
    "customerName": "Mehedi Hasan",
    "items": [
      {
        "productId": "p10",
        "vendorId": "v5",
        "title": "Gucci Bloom Eau de",
        "thumbnail": "https://cdn.dummyjson.com/product-images/fragrances/gucci-bloom-eau-de/thumbnail.webp",
        "price": 9440,
        "qty": 2
      },
      {
        "productId": "p134",
        "vendorId": "v1",
        "title": "Vivo S1",
        "thumbnail": "https://cdn.dummyjson.com/product-images/smartphones/vivo-s1/thumbnail.webp",
        "price": 29500,
        "qty": 2
      },
      {
        "productId": "p13",
        "vendorId": "v6",
        "title": "Bedside Table African Cherry",
        "thumbnail": "https://cdn.dummyjson.com/product-images/furniture/bedside-table-african-cherry/thumbnail.webp",
        "price": 35400,
        "qty": 1
      }
    ],
    "subtotal": 113280,
    "shipping": 0,
    "total": 113280,
    "status": "pending",
    "paymentMethod": "bkash",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a11",
      "label": "Home",
      "name": "Mehedi Hasan",
      "phone": "+8801680654536",
      "line": "House 21, Road 29",
      "area": "Boalia, Rajshahi",
      "isDefault": true
    },
    "createdAt": "2026-09-16T16:54:36.610Z"
  },
  {
    "id": "ORD-10301",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p155",
        "vendorId": "v3",
        "title": "Classic Sun Glasses",
        "thumbnail": "https://cdn.dummyjson.com/product-images/sunglasses/classic-sun-glasses/thumbnail.webp",
        "price": 2950,
        "qty": 1
      },
      {
        "productId": "p98",
        "vendorId": "v3",
        "title": "Rolex Submariner Watch",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mens-watches/rolex-submariner-watch/thumbnail.webp",
        "price": 1652000,
        "qty": 2
      }
    ],
    "subtotal": 3306950,
    "shipping": 0,
    "total": 3306950,
    "status": "delivered",
    "paymentMethod": "cod",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-15T06:54:36.610Z"
  },
  {
    "id": "ORD-10262",
    "customerId": "c8",
    "customerName": "Tania Sultana",
    "items": [
      {
        "productId": "p161",
        "vendorId": "v1",
        "title": "Samsung Galaxy Tab White",
        "thumbnail": "https://cdn.dummyjson.com/product-images/tablets/samsung-galaxy-tab-white/thumbnail.webp",
        "price": 41300,
        "qty": 1
      },
      {
        "productId": "p107",
        "vendorId": "v2",
        "title": "Beats Flex Wireless Earphones",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/thumbnail.webp",
        "price": 5900,
        "qty": 2
      }
    ],
    "subtotal": 53100,
    "shipping": 0,
    "total": 53100,
    "status": "delivered",
    "paymentMethod": "card",
    "paymentStatus": "paid",
    "source": "reel",
    "address": {
      "id": "a8",
      "label": "Home",
      "name": "Tania Sultana",
      "phone": "+8801752269815",
      "line": "House 91, Road 8",
      "area": "Uttara, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-15T05:54:36.610Z"
  },
  {
    "id": "ORD-10273",
    "customerId": "c3",
    "customerName": "Rakib Hasan",
    "items": [
      {
        "productId": "p28",
        "vendorId": "v8",
        "title": "Ice Cream",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/ice-cream/thumbnail.webp",
        "price": 650,
        "qty": 2
      }
    ],
    "subtotal": 1300,
    "shipping": 60,
    "total": 1360,
    "status": "delivered",
    "paymentMethod": "card",
    "paymentStatus": "paid",
    "source": "live",
    "address": {
      "id": "a3",
      "label": "Home",
      "name": "Rakib Hasan",
      "phone": "+8801661648586",
      "line": "House 49, Road 25",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-13T09:54:36.610Z"
  },
  {
    "id": "ORD-10278",
    "customerId": "c2",
    "customerName": "Ayesha Siddiqua",
    "items": [
      {
        "productId": "p145",
        "vendorId": "v9",
        "title": "Cricket Wicket",
        "thumbnail": "https://cdn.dummyjson.com/product-images/sports-accessories/cricket-wicket/thumbnail.webp",
        "price": 3540,
        "qty": 1
      },
      {
        "productId": "p106",
        "vendorId": "v2",
        "title": "Apple Watch Series 4 Gold",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-watch-series-4-gold/thumbnail.webp",
        "price": 41300,
        "qty": 1
      },
      {
        "productId": "p11",
        "vendorId": "v6",
        "title": "Annibale Colombo Bed",
        "thumbnail": "https://cdn.dummyjson.com/product-images/furniture/annibale-colombo-bed/thumbnail.webp",
        "price": 224200,
        "qty": 1
      }
    ],
    "subtotal": 269040,
    "shipping": 0,
    "total": 269040,
    "status": "pending",
    "paymentMethod": "bkash",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a2",
      "label": "Home",
      "name": "Ayesha Siddiqua",
      "phone": "+8801766648455",
      "line": "House 33, Road 10",
      "area": "Gulshan 2, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-12T20:54:36.610Z"
  },
  {
    "id": "ORD-10319",
    "customerId": "c2",
    "customerName": "Ayesha Siddiqua",
    "items": [
      {
        "productId": "p134",
        "vendorId": "v1",
        "title": "Vivo S1",
        "thumbnail": "https://cdn.dummyjson.com/product-images/smartphones/vivo-s1/thumbnail.webp",
        "price": 29500,
        "qty": 2
      }
    ],
    "subtotal": 59000,
    "shipping": 0,
    "total": 59000,
    "status": "cancelled",
    "paymentMethod": "card",
    "paymentStatus": "refunded",
    "source": "reel",
    "address": {
      "id": "a2",
      "label": "Home",
      "name": "Ayesha Siddiqua",
      "phone": "+8801766648455",
      "line": "House 33, Road 10",
      "area": "Gulshan 2, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-11T22:54:36.610Z"
  },
  {
    "id": "ORD-10291",
    "customerId": "c4",
    "customerName": "Mim Akter",
    "items": [
      {
        "productId": "p191",
        "vendorId": "v4",
        "title": "Rolex Cellini Moonphase",
        "thumbnail": "https://cdn.dummyjson.com/product-images/womens-watches/rolex-cellini-moonphase/thumbnail.webp",
        "price": 1888000,
        "qty": 1
      }
    ],
    "subtotal": 1888000,
    "shipping": 0,
    "total": 1888000,
    "status": "cancelled",
    "paymentMethod": "card",
    "paymentStatus": "refunded",
    "source": "live",
    "address": {
      "id": "a4",
      "label": "Home",
      "name": "Mim Akter",
      "phone": "+8801797027725",
      "line": "House 69, Road 17",
      "area": "Zindabazar, Sylhet",
      "isDefault": true
    },
    "createdAt": "2026-09-10T12:54:36.610Z"
  },
  {
    "id": "ORD-10287",
    "customerId": "c5",
    "customerName": "Sabbir Rahman",
    "items": [
      {
        "productId": "p9",
        "vendorId": "v5",
        "title": "Dolce Shine Eau de",
        "thumbnail": "https://cdn.dummyjson.com/product-images/fragrances/dolce-shine-eau-de/thumbnail.webp",
        "price": 8260,
        "qty": 1
      },
      {
        "productId": "p128",
        "vendorId": "v1",
        "title": "Realme C35",
        "thumbnail": "https://cdn.dummyjson.com/product-images/smartphones/realme-c35/thumbnail.webp",
        "price": 17700,
        "qty": 2
      },
      {
        "productId": "p140",
        "vendorId": "v9",
        "title": "Basketball",
        "thumbnail": "https://cdn.dummyjson.com/product-images/sports-accessories/basketball/thumbnail.webp",
        "price": 1770,
        "qty": 2
      }
    ],
    "subtotal": 47200,
    "shipping": 0,
    "total": 47200,
    "status": "pending",
    "paymentMethod": "nagad",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a5",
      "label": "Home",
      "name": "Sabbir Rahman",
      "phone": "+8801880493774",
      "line": "House 5, Road 9",
      "area": "Uttara, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-08T22:54:36.610Z"
  },
  {
    "id": "ORD-10315",
    "customerId": "c8",
    "customerName": "Tania Sultana",
    "items": [
      {
        "productId": "p88",
        "vendorId": "v3",
        "title": "Nike Air Jordan 1 Red And Black",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mens-shoes/nike-air-jordan-1-red-and-black/thumbnail.webp",
        "price": 17700,
        "qty": 2
      },
      {
        "productId": "p74",
        "vendorId": "v7",
        "title": "Spoon",
        "thumbnail": "https://cdn.dummyjson.com/product-images/kitchen-accessories/spoon/thumbnail.webp",
        "price": 590,
        "qty": 2
      }
    ],
    "subtotal": 36580,
    "shipping": 0,
    "total": 36580,
    "status": "cancelled",
    "paymentMethod": "card",
    "paymentStatus": "refunded",
    "source": "live",
    "address": {
      "id": "a8",
      "label": "Home",
      "name": "Tania Sultana",
      "phone": "+8801752269815",
      "line": "House 91, Road 8",
      "area": "Uttara, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-07T15:54:36.610Z"
  },
  {
    "id": "ORD-10308",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p37",
        "vendorId": "v8",
        "title": "Red Onions",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/red-onions/thumbnail.webp",
        "price": 230,
        "qty": 1
      },
      {
        "productId": "p106",
        "vendorId": "v2",
        "title": "Apple Watch Series 4 Gold",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-watch-series-4-gold/thumbnail.webp",
        "price": 41300,
        "qty": 1
      },
      {
        "productId": "p154",
        "vendorId": "v3",
        "title": "Black Sun Glasses",
        "thumbnail": "https://cdn.dummyjson.com/product-images/sunglasses/black-sun-glasses/thumbnail.webp",
        "price": 3540,
        "qty": 2
      }
    ],
    "subtotal": 48610,
    "shipping": 0,
    "total": 48610,
    "status": "delivered",
    "paymentMethod": "cod",
    "paymentStatus": "paid",
    "source": "reel",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-09-01T00:54:36.610Z"
  },
  {
    "id": "ORD-10288",
    "customerId": "c12",
    "customerName": "Sumaiya Khan",
    "items": [
      {
        "productId": "p186",
        "vendorId": "v4",
        "title": "Calvin Klein Heel Shoes",
        "thumbnail": "https://cdn.dummyjson.com/product-images/womens-shoes/calvin-klein-heel-shoes/thumbnail.webp",
        "price": 9440,
        "qty": 2
      }
    ],
    "subtotal": 18880,
    "shipping": 0,
    "total": 18880,
    "status": "processing",
    "paymentMethod": "cod",
    "paymentStatus": "unpaid",
    "source": "reel",
    "address": {
      "id": "a12",
      "label": "Home",
      "name": "Sumaiya Khan",
      "phone": "+8801359929462",
      "line": "House 64, Road 1",
      "area": "Agrabad, Chattogram",
      "isDefault": true
    },
    "createdAt": "2026-08-31T00:54:36.610Z"
  },
  {
    "id": "ORD-10269",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p33",
        "vendorId": "v8",
        "title": "Mulberry",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/mulberry/thumbnail.webp",
        "price": 590,
        "qty": 1
      },
      {
        "productId": "p106",
        "vendorId": "v2",
        "title": "Apple Watch Series 4 Gold",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-watch-series-4-gold/thumbnail.webp",
        "price": 41300,
        "qty": 1
      },
      {
        "productId": "p5",
        "vendorId": "v5",
        "title": "Red Nail Polish",
        "thumbnail": "https://cdn.dummyjson.com/product-images/beauty/red-nail-polish/thumbnail.webp",
        "price": 1060,
        "qty": 2
      }
    ],
    "subtotal": 44010,
    "shipping": 0,
    "total": 44010,
    "status": "delivered",
    "paymentMethod": "card",
    "paymentStatus": "paid",
    "source": "live",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-30T23:54:36.610Z"
  },
  {
    "id": "ORD-10314",
    "customerId": "c9",
    "customerName": "Jubayer Alam",
    "items": [
      {
        "productId": "p83",
        "vendorId": "v3",
        "title": "Blue & Black Check Shirt",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mens-shirts/blue-&-black-check-shirt/thumbnail.webp",
        "price": 3540,
        "qty": 1
      },
      {
        "productId": "p99",
        "vendorId": "v2",
        "title": "Amazon Echo Plus",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mobile-accessories/amazon-echo-plus/thumbnail.webp",
        "price": 11800,
        "qty": 2
      },
      {
        "productId": "p53",
        "vendorId": "v7",
        "title": "Chopping Board",
        "thumbnail": "https://cdn.dummyjson.com/product-images/kitchen-accessories/chopping-board/thumbnail.webp",
        "price": 1530,
        "qty": 1
      }
    ],
    "subtotal": 28670,
    "shipping": 0,
    "total": 28670,
    "status": "pending",
    "paymentMethod": "cod",
    "paymentStatus": "unpaid",
    "source": "reel",
    "address": {
      "id": "a9",
      "label": "Home",
      "name": "Jubayer Alam",
      "phone": "+8801525640214",
      "line": "House 70, Road 1",
      "area": "Zindabazar, Sylhet",
      "isDefault": true
    },
    "createdAt": "2026-08-30T09:54:36.610Z"
  },
  {
    "id": "ORD-10313",
    "customerId": "c9",
    "customerName": "Jubayer Alam",
    "items": [
      {
        "productId": "p60",
        "vendorId": "v7",
        "title": "Grater Black",
        "thumbnail": "https://cdn.dummyjson.com/product-images/kitchen-accessories/grater-black/thumbnail.webp",
        "price": 1300,
        "qty": 1
      }
    ],
    "subtotal": 1300,
    "shipping": 60,
    "total": 1360,
    "status": "pending",
    "paymentMethod": "nagad",
    "paymentStatus": "paid",
    "source": "reel",
    "address": {
      "id": "a9",
      "label": "Home",
      "name": "Jubayer Alam",
      "phone": "+8801525640214",
      "line": "House 70, Road 1",
      "area": "Zindabazar, Sylhet",
      "isDefault": true
    },
    "createdAt": "2026-08-30T06:54:36.610Z"
  },
  {
    "id": "ORD-10270",
    "customerId": "c9",
    "customerName": "Jubayer Alam",
    "items": [
      {
        "productId": "p152",
        "vendorId": "v9",
        "title": "Tennis Racket",
        "thumbnail": "https://cdn.dummyjson.com/product-images/sports-accessories/tennis-racket/thumbnail.webp",
        "price": 5900,
        "qty": 1
      },
      {
        "productId": "p106",
        "vendorId": "v2",
        "title": "Apple Watch Series 4 Gold",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-watch-series-4-gold/thumbnail.webp",
        "price": 41300,
        "qty": 2
      }
    ],
    "subtotal": 88500,
    "shipping": 0,
    "total": 88500,
    "status": "delivered",
    "paymentMethod": "nagad",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a9",
      "label": "Home",
      "name": "Jubayer Alam",
      "phone": "+8801525640214",
      "line": "House 70, Road 1",
      "area": "Zindabazar, Sylhet",
      "isDefault": true
    },
    "createdAt": "2026-08-27T21:54:36.610Z"
  },
  {
    "id": "ORD-10267",
    "customerId": "c6",
    "customerName": "Nabila Islam",
    "items": [
      {
        "productId": "p172",
        "vendorId": "v4",
        "title": "Blue Women's Handbag",
        "thumbnail": "https://cdn.dummyjson.com/product-images/womens-bags/blue-women's-handbag/thumbnail.webp",
        "price": 5900,
        "qty": 1
      },
      {
        "productId": "p6",
        "vendorId": "v5",
        "title": "Calvin Klein CK One",
        "thumbnail": "https://cdn.dummyjson.com/product-images/fragrances/calvin-klein-ck-one/thumbnail.webp",
        "price": 5900,
        "qty": 2
      }
    ],
    "subtotal": 17700,
    "shipping": 0,
    "total": 17700,
    "status": "cancelled",
    "paymentMethod": "card",
    "paymentStatus": "refunded",
    "source": "live",
    "address": {
      "id": "a6",
      "label": "Home",
      "name": "Nabila Islam",
      "phone": "+8801520850592",
      "line": "House 10, Road 11",
      "area": "Dhanmondi, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-26T17:54:36.610Z"
  },
  {
    "id": "ORD-10277",
    "customerId": "c2",
    "customerName": "Ayesha Siddiqua",
    "items": [
      {
        "productId": "p17",
        "vendorId": "v8",
        "title": "Beef Steak",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/beef-steak/thumbnail.webp",
        "price": 1530,
        "qty": 1
      },
      {
        "productId": "p102",
        "vendorId": "v2",
        "title": "Apple Airpower Wireless Charger",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpower-wireless-charger/thumbnail.webp",
        "price": 9440,
        "qty": 1
      }
    ],
    "subtotal": 10970,
    "shipping": 0,
    "total": 10970,
    "status": "shipped",
    "paymentMethod": "card",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a2",
      "label": "Home",
      "name": "Ayesha Siddiqua",
      "phone": "+8801766648455",
      "line": "House 33, Road 10",
      "area": "Gulshan 2, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-25T19:54:36.610Z"
  },
  {
    "id": "ORD-10274",
    "customerId": "c4",
    "customerName": "Mim Akter",
    "items": [
      {
        "productId": "p90",
        "vendorId": "v3",
        "title": "Puma Future Rider Trainers",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mens-shoes/puma-future-rider-trainers/thumbnail.webp",
        "price": 10620,
        "qty": 1
      }
    ],
    "subtotal": 10620,
    "shipping": 0,
    "total": 10620,
    "status": "pending",
    "paymentMethod": "cod",
    "paymentStatus": "unpaid",
    "source": "reel",
    "address": {
      "id": "a4",
      "label": "Home",
      "name": "Mim Akter",
      "phone": "+8801797027725",
      "line": "House 69, Road 17",
      "area": "Zindabazar, Sylhet",
      "isDefault": true
    },
    "createdAt": "2026-08-25T13:54:36.610Z"
  },
  {
    "id": "ORD-10317",
    "customerId": "c9",
    "customerName": "Jubayer Alam",
    "items": [
      {
        "productId": "p166",
        "vendorId": "v4",
        "title": "Tartan Dress",
        "thumbnail": "https://cdn.dummyjson.com/product-images/tops/tartan-dress/thumbnail.webp",
        "price": 4720,
        "qty": 1
      }
    ],
    "subtotal": 4720,
    "shipping": 0,
    "total": 4720,
    "status": "cancelled",
    "paymentMethod": "cod",
    "paymentStatus": "refunded",
    "source": "live",
    "address": {
      "id": "a9",
      "label": "Home",
      "name": "Jubayer Alam",
      "phone": "+8801525640214",
      "line": "House 70, Road 1",
      "area": "Zindabazar, Sylhet",
      "isDefault": true
    },
    "createdAt": "2026-08-24T15:54:36.610Z"
  },
  {
    "id": "ORD-10309",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p166",
        "vendorId": "v4",
        "title": "Tartan Dress",
        "thumbnail": "https://cdn.dummyjson.com/product-images/tops/tartan-dress/thumbnail.webp",
        "price": 4720,
        "qty": 2
      },
      {
        "productId": "p83",
        "vendorId": "v3",
        "title": "Blue & Black Check Shirt",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mens-shirts/blue-&-black-check-shirt/thumbnail.webp",
        "price": 3540,
        "qty": 1
      }
    ],
    "subtotal": 12980,
    "shipping": 0,
    "total": 12980,
    "status": "delivered",
    "paymentMethod": "cod",
    "paymentStatus": "paid",
    "source": "live",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-24T09:54:36.610Z"
  },
  {
    "id": "ORD-10281",
    "customerId": "c11",
    "customerName": "Mehedi Hasan",
    "items": [
      {
        "productId": "p131",
        "vendorId": "v1",
        "title": "Samsung Galaxy S7",
        "thumbnail": "https://cdn.dummyjson.com/product-images/smartphones/samsung-galaxy-s7/thumbnail.webp",
        "price": 35400,
        "qty": 2
      }
    ],
    "subtotal": 70800,
    "shipping": 0,
    "total": 70800,
    "status": "delivered",
    "paymentMethod": "nagad",
    "paymentStatus": "paid",
    "source": "live",
    "address": {
      "id": "a11",
      "label": "Home",
      "name": "Mehedi Hasan",
      "phone": "+8801680654536",
      "line": "House 21, Road 29",
      "area": "Boalia, Rajshahi",
      "isDefault": true
    },
    "createdAt": "2026-08-22T20:54:36.610Z"
  },
  {
    "id": "ORD-10292",
    "customerId": "c10",
    "customerName": "Riya Das",
    "items": [
      {
        "productId": "p79",
        "vendorId": "v1",
        "title": "Asus Zenbook Pro Dual Screen Laptop",
        "thumbnail": "https://cdn.dummyjson.com/product-images/laptops/asus-zenbook-pro-dual-screen-laptop/thumbnail.webp",
        "price": 212400,
        "qty": 1
      },
      {
        "productId": "p95",
        "vendorId": "v3",
        "title": "Rolex Cellini Date Black Dial",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mens-watches/rolex-cellini-date-black-dial/thumbnail.webp",
        "price": 1062000,
        "qty": 2
      }
    ],
    "subtotal": 2336400,
    "shipping": 0,
    "total": 2336400,
    "status": "delivered",
    "paymentMethod": "cod",
    "paymentStatus": "paid",
    "source": "reel",
    "address": {
      "id": "a10",
      "label": "Home",
      "name": "Riya Das",
      "phone": "+8801881355005",
      "line": "House 61, Road 9",
      "area": "Agrabad, Chattogram",
      "isDefault": true
    },
    "createdAt": "2026-08-21T22:54:36.610Z"
  },
  {
    "id": "ORD-10310",
    "customerId": "c6",
    "customerName": "Nabila Islam",
    "items": [
      {
        "productId": "p15",
        "vendorId": "v6",
        "title": "Wooden Bathroom Sink With Mirror",
        "thumbnail": "https://cdn.dummyjson.com/product-images/furniture/wooden-bathroom-sink-with-mirror/thumbnail.webp",
        "price": 94400,
        "qty": 1
      },
      {
        "productId": "p133",
        "vendorId": "v1",
        "title": "Samsung Galaxy S10",
        "thumbnail": "https://cdn.dummyjson.com/product-images/smartphones/samsung-galaxy-s10/thumbnail.webp",
        "price": 82600,
        "qty": 2
      },
      {
        "productId": "p66",
        "vendorId": "v7",
        "title": "Microwave Oven",
        "thumbnail": "https://cdn.dummyjson.com/product-images/kitchen-accessories/microwave-oven/thumbnail.webp",
        "price": 10620,
        "qty": 1
      }
    ],
    "subtotal": 270220,
    "shipping": 0,
    "total": 270220,
    "status": "shipped",
    "paymentMethod": "card",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a6",
      "label": "Home",
      "name": "Nabila Islam",
      "phone": "+8801520850592",
      "line": "House 10, Road 11",
      "area": "Dhanmondi, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-21T04:54:36.610Z"
  },
  {
    "id": "ORD-10298",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p28",
        "vendorId": "v8",
        "title": "Ice Cream",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/ice-cream/thumbnail.webp",
        "price": 650,
        "qty": 2
      },
      {
        "productId": "p166",
        "vendorId": "v4",
        "title": "Tartan Dress",
        "thumbnail": "https://cdn.dummyjson.com/product-images/tops/tartan-dress/thumbnail.webp",
        "price": 4720,
        "qty": 1
      },
      {
        "productId": "p52",
        "vendorId": "v7",
        "title": "Carbon Steel Wok",
        "thumbnail": "https://cdn.dummyjson.com/product-images/kitchen-accessories/carbon-steel-wok/thumbnail.webp",
        "price": 3540,
        "qty": 2
      }
    ],
    "subtotal": 13100,
    "shipping": 0,
    "total": 13100,
    "status": "shipped",
    "paymentMethod": "nagad",
    "paymentStatus": "paid",
    "source": "reel",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-15T20:54:36.610Z"
  },
  {
    "id": "ORD-10307",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p180",
        "vendorId": "v4",
        "title": "Dress Pea",
        "thumbnail": "https://cdn.dummyjson.com/product-images/womens-dresses/dress-pea/thumbnail.webp",
        "price": 5900,
        "qty": 2
      }
    ],
    "subtotal": 11800,
    "shipping": 0,
    "total": 11800,
    "status": "cancelled",
    "paymentMethod": "card",
    "paymentStatus": "refunded",
    "source": "live",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-14T18:54:36.610Z"
  },
  {
    "id": "ORD-10297",
    "customerId": "c8",
    "customerName": "Tania Sultana",
    "items": [
      {
        "productId": "p112",
        "vendorId": "v2",
        "title": "TV Studio Camera Pedestal",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mobile-accessories/tv-studio-camera-pedestal/thumbnail.webp",
        "price": 59000,
        "qty": 2
      },
      {
        "productId": "p84",
        "vendorId": "v3",
        "title": "Gigabyte Aorus Men Tshirt",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mens-shirts/gigabyte-aorus-men-tshirt/thumbnail.webp",
        "price": 2950,
        "qty": 1
      },
      {
        "productId": "p48",
        "vendorId": "v7",
        "title": "Bamboo Spatula",
        "thumbnail": "https://cdn.dummyjson.com/product-images/kitchen-accessories/bamboo-spatula/thumbnail.webp",
        "price": 940,
        "qty": 2
      }
    ],
    "subtotal": 122830,
    "shipping": 0,
    "total": 122830,
    "status": "pending",
    "paymentMethod": "cod",
    "paymentStatus": "unpaid",
    "source": "store",
    "address": {
      "id": "a8",
      "label": "Home",
      "name": "Tania Sultana",
      "phone": "+8801752269815",
      "line": "House 91, Road 8",
      "area": "Uttara, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-14T15:54:36.610Z"
  },
  {
    "id": "ORD-10264",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p81",
        "vendorId": "v1",
        "title": "Lenovo Yoga 920",
        "thumbnail": "https://cdn.dummyjson.com/product-images/laptops/lenovo-yoga-920/thumbnail.webp",
        "price": 129800,
        "qty": 1
      },
      {
        "productId": "p155",
        "vendorId": "v3",
        "title": "Classic Sun Glasses",
        "thumbnail": "https://cdn.dummyjson.com/product-images/sunglasses/classic-sun-glasses/thumbnail.webp",
        "price": 2950,
        "qty": 2
      },
      {
        "productId": "p165",
        "vendorId": "v4",
        "title": "Short Frock",
        "thumbnail": "https://cdn.dummyjson.com/product-images/tops/short-frock/thumbnail.webp",
        "price": 2950,
        "qty": 1
      }
    ],
    "subtotal": 138650,
    "shipping": 0,
    "total": 138650,
    "status": "processing",
    "paymentMethod": "card",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-13T20:54:36.610Z"
  },
  {
    "id": "ORD-10275",
    "customerId": "c10",
    "customerName": "Riya Das",
    "items": [
      {
        "productId": "p25",
        "vendorId": "v8",
        "title": "Green Bell Pepper",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/green-bell-pepper/thumbnail.webp",
        "price": 150,
        "qty": 1
      },
      {
        "productId": "p56",
        "vendorId": "v7",
        "title": "Electric Stove",
        "thumbnail": "https://cdn.dummyjson.com/product-images/kitchen-accessories/electric-stove/thumbnail.webp",
        "price": 5900,
        "qty": 1
      },
      {
        "productId": "p39",
        "vendorId": "v8",
        "title": "Soft Drinks",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/soft-drinks/thumbnail.webp",
        "price": 230,
        "qty": 2
      }
    ],
    "subtotal": 6510,
    "shipping": 0,
    "total": 6510,
    "status": "delivered",
    "paymentMethod": "card",
    "paymentStatus": "paid",
    "source": "reel",
    "address": {
      "id": "a10",
      "label": "Home",
      "name": "Riya Das",
      "phone": "+8801881355005",
      "line": "House 61, Road 9",
      "area": "Agrabad, Chattogram",
      "isDefault": true
    },
    "createdAt": "2026-08-13T01:54:36.610Z"
  },
  {
    "id": "ORD-10318",
    "customerId": "c3",
    "customerName": "Rakib Hasan",
    "items": [
      {
        "productId": "p95",
        "vendorId": "v3",
        "title": "Rolex Cellini Date Black Dial",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mens-watches/rolex-cellini-date-black-dial/thumbnail.webp",
        "price": 1062000,
        "qty": 1
      }
    ],
    "subtotal": 1062000,
    "shipping": 0,
    "total": 1062000,
    "status": "delivered",
    "paymentMethod": "bkash",
    "paymentStatus": "paid",
    "source": "reel",
    "address": {
      "id": "a3",
      "label": "Home",
      "name": "Rakib Hasan",
      "phone": "+8801661648586",
      "line": "House 49, Road 25",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-12T13:54:36.610Z"
  },
  {
    "id": "ORD-10316",
    "customerId": "c6",
    "customerName": "Nabila Islam",
    "items": [
      {
        "productId": "p159",
        "vendorId": "v1",
        "title": "iPad Mini 2021 Starlight",
        "thumbnail": "https://cdn.dummyjson.com/product-images/tablets/ipad-mini-2021-starlight/thumbnail.webp",
        "price": 59000,
        "qty": 2
      }
    ],
    "subtotal": 118000,
    "shipping": 0,
    "total": 118000,
    "status": "delivered",
    "paymentMethod": "card",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a6",
      "label": "Home",
      "name": "Nabila Islam",
      "phone": "+8801520850592",
      "line": "House 10, Road 11",
      "area": "Dhanmondi, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-11T22:54:36.610Z"
  },
  {
    "id": "ORD-10283",
    "customerId": "c7",
    "customerName": "Fahim Chowdhury",
    "items": [
      {
        "productId": "p12",
        "vendorId": "v6",
        "title": "Annibale Colombo Sofa",
        "thumbnail": "https://cdn.dummyjson.com/product-images/furniture/annibale-colombo-sofa/thumbnail.webp",
        "price": 295000,
        "qty": 2
      },
      {
        "productId": "p128",
        "vendorId": "v1",
        "title": "Realme C35",
        "thumbnail": "https://cdn.dummyjson.com/product-images/smartphones/realme-c35/thumbnail.webp",
        "price": 17700,
        "qty": 2
      },
      {
        "productId": "p40",
        "vendorId": "v8",
        "title": "Strawberry",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/strawberry/thumbnail.webp",
        "price": 470,
        "qty": 1
      }
    ],
    "subtotal": 625870,
    "shipping": 0,
    "total": 625870,
    "status": "delivered",
    "paymentMethod": "bkash",
    "paymentStatus": "paid",
    "source": "reel",
    "address": {
      "id": "a7",
      "label": "Home",
      "name": "Fahim Chowdhury",
      "phone": "+8801726523717",
      "line": "House 61, Road 3",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-11T19:54:36.610Z"
  },
  {
    "id": "ORD-10290",
    "customerId": "c4",
    "customerName": "Mim Akter",
    "items": [
      {
        "productId": "p7",
        "vendorId": "v5",
        "title": "Chanel Coco Noir Eau De",
        "thumbnail": "https://cdn.dummyjson.com/product-images/fragrances/chanel-coco-noir-eau-de/thumbnail.webp",
        "price": 15340,
        "qty": 1
      },
      {
        "productId": "p51",
        "vendorId": "v7",
        "title": "Boxed Blender",
        "thumbnail": "https://cdn.dummyjson.com/product-images/kitchen-accessories/boxed-blender/thumbnail.webp",
        "price": 4720,
        "qty": 2
      }
    ],
    "subtotal": 24780,
    "shipping": 0,
    "total": 24780,
    "status": "shipped",
    "paymentMethod": "card",
    "paymentStatus": "paid",
    "source": "reel",
    "address": {
      "id": "a4",
      "label": "Home",
      "name": "Mim Akter",
      "phone": "+8801797027725",
      "line": "House 69, Road 17",
      "area": "Zindabazar, Sylhet",
      "isDefault": true
    },
    "createdAt": "2026-08-10T16:54:36.610Z"
  },
  {
    "id": "ORD-10296",
    "customerId": "c3",
    "customerName": "Rakib Hasan",
    "items": [
      {
        "productId": "p47",
        "vendorId": "v6",
        "title": "Table Lamp",
        "thumbnail": "https://cdn.dummyjson.com/product-images/home-decoration/table-lamp/thumbnail.webp",
        "price": 5900,
        "qty": 1
      }
    ],
    "subtotal": 5900,
    "shipping": 0,
    "total": 5900,
    "status": "delivered",
    "paymentMethod": "cod",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a3",
      "label": "Home",
      "name": "Rakib Hasan",
      "phone": "+8801661648586",
      "line": "House 49, Road 25",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-09T23:54:36.610Z"
  },
  {
    "id": "ORD-10293",
    "customerId": "c8",
    "customerName": "Tania Sultana",
    "items": [
      {
        "productId": "p186",
        "vendorId": "v4",
        "title": "Calvin Klein Heel Shoes",
        "thumbnail": "https://cdn.dummyjson.com/product-images/womens-shoes/calvin-klein-heel-shoes/thumbnail.webp",
        "price": 9440,
        "qty": 1
      },
      {
        "productId": "p151",
        "vendorId": "v9",
        "title": "Tennis Ball",
        "thumbnail": "https://cdn.dummyjson.com/product-images/sports-accessories/tennis-ball/thumbnail.webp",
        "price": 820,
        "qty": 2
      }
    ],
    "subtotal": 11080,
    "shipping": 0,
    "total": 11080,
    "status": "shipped",
    "paymentMethod": "bkash",
    "paymentStatus": "paid",
    "source": "reel",
    "address": {
      "id": "a8",
      "label": "Home",
      "name": "Tania Sultana",
      "phone": "+8801752269815",
      "line": "House 91, Road 8",
      "area": "Uttara, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-09T17:54:36.610Z"
  },
  {
    "id": "ORD-10305",
    "customerId": "c8",
    "customerName": "Tania Sultana",
    "items": [
      {
        "productId": "p164",
        "vendorId": "v4",
        "title": "Gray Dress",
        "thumbnail": "https://cdn.dummyjson.com/product-images/tops/gray-dress/thumbnail.webp",
        "price": 4130,
        "qty": 1
      },
      {
        "productId": "p28",
        "vendorId": "v8",
        "title": "Ice Cream",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/ice-cream/thumbnail.webp",
        "price": 650,
        "qty": 1
      },
      {
        "productId": "p43",
        "vendorId": "v6",
        "title": "Decoration Swing",
        "thumbnail": "https://cdn.dummyjson.com/product-images/home-decoration/decoration-swing/thumbnail.webp",
        "price": 7080,
        "qty": 2
      }
    ],
    "subtotal": 18940,
    "shipping": 0,
    "total": 18940,
    "status": "processing",
    "paymentMethod": "card",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a8",
      "label": "Home",
      "name": "Tania Sultana",
      "phone": "+8801752269815",
      "line": "House 91, Road 8",
      "area": "Uttara, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-08T18:54:36.610Z"
  },
  {
    "id": "ORD-10284",
    "customerId": "c12",
    "customerName": "Sumaiya Khan",
    "items": [
      {
        "productId": "p19",
        "vendorId": "v8",
        "title": "Chicken Meat",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/chicken-meat/thumbnail.webp",
        "price": 1180,
        "qty": 2
      }
    ],
    "subtotal": 2360,
    "shipping": 0,
    "total": 2360,
    "status": "delivered",
    "paymentMethod": "card",
    "paymentStatus": "paid",
    "source": "reel",
    "address": {
      "id": "a12",
      "label": "Home",
      "name": "Sumaiya Khan",
      "phone": "+8801359929462",
      "line": "House 64, Road 1",
      "area": "Agrabad, Chattogram",
      "isDefault": true
    },
    "createdAt": "2026-08-07T23:54:36.610Z"
  },
  {
    "id": "ORD-10282",
    "customerId": "c3",
    "customerName": "Rakib Hasan",
    "items": [
      {
        "productId": "p181",
        "vendorId": "v4",
        "title": "Marni Red & Black Suit",
        "thumbnail": "https://cdn.dummyjson.com/product-images/womens-dresses/marni-red-&-black-suit/thumbnail.webp",
        "price": 21240,
        "qty": 2
      }
    ],
    "subtotal": 42480,
    "shipping": 0,
    "total": 42480,
    "status": "delivered",
    "paymentMethod": "card",
    "paymentStatus": "paid",
    "source": "live",
    "address": {
      "id": "a3",
      "label": "Home",
      "name": "Rakib Hasan",
      "phone": "+8801661648586",
      "line": "House 49, Road 25",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-07T17:54:36.610Z"
  },
  {
    "id": "ORD-10261",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p72",
        "vendorId": "v7",
        "title": "Slotted Turner",
        "thumbnail": "https://cdn.dummyjson.com/product-images/kitchen-accessories/slotted-turner/thumbnail.webp",
        "price": 1060,
        "qty": 2
      },
      {
        "productId": "p128",
        "vendorId": "v1",
        "title": "Realme C35",
        "thumbnail": "https://cdn.dummyjson.com/product-images/smartphones/realme-c35/thumbnail.webp",
        "price": 17700,
        "qty": 2
      },
      {
        "productId": "p186",
        "vendorId": "v4",
        "title": "Calvin Klein Heel Shoes",
        "thumbnail": "https://cdn.dummyjson.com/product-images/womens-shoes/calvin-klein-heel-shoes/thumbnail.webp",
        "price": 9440,
        "qty": 1
      }
    ],
    "subtotal": 46960,
    "shipping": 0,
    "total": 46960,
    "status": "pending",
    "paymentMethod": "cod",
    "paymentStatus": "unpaid",
    "source": "live",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-07T06:54:36.610Z"
  },
  {
    "id": "ORD-10302",
    "customerId": "c8",
    "customerName": "Tania Sultana",
    "items": [
      {
        "productId": "p154",
        "vendorId": "v3",
        "title": "Black Sun Glasses",
        "thumbnail": "https://cdn.dummyjson.com/product-images/sunglasses/black-sun-glasses/thumbnail.webp",
        "price": 3540,
        "qty": 1
      }
    ],
    "subtotal": 3540,
    "shipping": 0,
    "total": 3540,
    "status": "delivered",
    "paymentMethod": "cod",
    "paymentStatus": "paid",
    "source": "live",
    "address": {
      "id": "a8",
      "label": "Home",
      "name": "Tania Sultana",
      "phone": "+8801752269815",
      "line": "House 91, Road 8",
      "area": "Uttara, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-07T01:54:36.610Z"
  },
  {
    "id": "ORD-10260",
    "customerId": "c8",
    "customerName": "Tania Sultana",
    "items": [
      {
        "productId": "p76",
        "vendorId": "v7",
        "title": "Wooden Rolling Pin",
        "thumbnail": "https://cdn.dummyjson.com/product-images/kitchen-accessories/wooden-rolling-pin/thumbnail.webp",
        "price": 1410,
        "qty": 2
      },
      {
        "productId": "p18",
        "vendorId": "v8",
        "title": "Cat Food",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/cat-food/thumbnail.webp",
        "price": 1060,
        "qty": 1
      },
      {
        "productId": "p118",
        "vendorId": "v5",
        "title": "Attitude Super Leaves Hand Soap",
        "thumbnail": "https://cdn.dummyjson.com/product-images/skin-care/attitude-super-leaves-hand-soap/thumbnail.webp",
        "price": 1060,
        "qty": 1
      }
    ],
    "subtotal": 4940,
    "shipping": 0,
    "total": 4940,
    "status": "shipped",
    "paymentMethod": "cod",
    "paymentStatus": "unpaid",
    "source": "reel",
    "address": {
      "id": "a8",
      "label": "Home",
      "name": "Tania Sultana",
      "phone": "+8801752269815",
      "line": "House 91, Road 8",
      "area": "Uttara, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-06T23:54:36.610Z"
  },
  {
    "id": "ORD-10265",
    "customerId": "c5",
    "customerName": "Sabbir Rahman",
    "items": [
      {
        "productId": "p100",
        "vendorId": "v2",
        "title": "Apple Airpods",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods/thumbnail.webp",
        "price": 15340,
        "qty": 2
      },
      {
        "productId": "p148",
        "vendorId": "v9",
        "title": "Golf Ball",
        "thumbnail": "https://cdn.dummyjson.com/product-images/sports-accessories/golf-ball/thumbnail.webp",
        "price": 1180,
        "qty": 1
      }
    ],
    "subtotal": 31860,
    "shipping": 0,
    "total": 31860,
    "status": "cancelled",
    "paymentMethod": "nagad",
    "paymentStatus": "refunded",
    "source": "store",
    "address": {
      "id": "a5",
      "label": "Home",
      "name": "Sabbir Rahman",
      "phone": "+8801880493774",
      "line": "House 5, Road 9",
      "area": "Uttara, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-04T11:54:36.610Z"
  },
  {
    "id": "ORD-10300",
    "customerId": "c5",
    "customerName": "Sabbir Rahman",
    "items": [
      {
        "productId": "p107",
        "vendorId": "v2",
        "title": "Beats Flex Wireless Earphones",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/thumbnail.webp",
        "price": 5900,
        "qty": 2
      },
      {
        "productId": "p19",
        "vendorId": "v8",
        "title": "Chicken Meat",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/chicken-meat/thumbnail.webp",
        "price": 1180,
        "qty": 1
      }
    ],
    "subtotal": 12980,
    "shipping": 0,
    "total": 12980,
    "status": "cancelled",
    "paymentMethod": "cod",
    "paymentStatus": "refunded",
    "source": "reel",
    "address": {
      "id": "a5",
      "label": "Home",
      "name": "Sabbir Rahman",
      "phone": "+8801880493774",
      "line": "House 5, Road 9",
      "area": "Uttara, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-03T20:54:36.610Z"
  },
  {
    "id": "ORD-10255",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p137",
        "vendorId": "v9",
        "title": "American Football",
        "thumbnail": "https://cdn.dummyjson.com/product-images/sports-accessories/american-football/thumbnail.webp",
        "price": 2360,
        "qty": 1
      },
      {
        "productId": "p134",
        "vendorId": "v1",
        "title": "Vivo S1",
        "thumbnail": "https://cdn.dummyjson.com/product-images/smartphones/vivo-s1/thumbnail.webp",
        "price": 29500,
        "qty": 1
      },
      {
        "productId": "p40",
        "vendorId": "v8",
        "title": "Strawberry",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/strawberry/thumbnail.webp",
        "price": 470,
        "qty": 2
      }
    ],
    "subtotal": 32800,
    "shipping": 0,
    "total": 32800,
    "status": "pending",
    "paymentMethod": "cod",
    "paymentStatus": "unpaid",
    "source": "live",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-02T07:54:36.610Z"
  },
  {
    "id": "ORD-10266",
    "customerId": "c6",
    "customerName": "Nabila Islam",
    "items": [
      {
        "productId": "p180",
        "vendorId": "v4",
        "title": "Dress Pea",
        "thumbnail": "https://cdn.dummyjson.com/product-images/womens-dresses/dress-pea/thumbnail.webp",
        "price": 5900,
        "qty": 1
      },
      {
        "productId": "p149",
        "vendorId": "v9",
        "title": "Iron Golf",
        "thumbnail": "https://cdn.dummyjson.com/product-images/sports-accessories/iron-golf/thumbnail.webp",
        "price": 5900,
        "qty": 1
      }
    ],
    "subtotal": 11800,
    "shipping": 0,
    "total": 11800,
    "status": "shipped",
    "paymentMethod": "nagad",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a6",
      "label": "Home",
      "name": "Nabila Islam",
      "phone": "+8801520850592",
      "line": "House 10, Road 11",
      "area": "Dhanmondi, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-02T04:54:36.610Z"
  },
  {
    "id": "ORD-10258",
    "customerId": "c5",
    "customerName": "Sabbir Rahman",
    "items": [
      {
        "productId": "p94",
        "vendorId": "v3",
        "title": "Longines Master Collection",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mens-watches/longines-master-collection/thumbnail.webp",
        "price": 177000,
        "qty": 2
      }
    ],
    "subtotal": 354000,
    "shipping": 0,
    "total": 354000,
    "status": "delivered",
    "paymentMethod": "cod",
    "paymentStatus": "paid",
    "source": "live",
    "address": {
      "id": "a5",
      "label": "Home",
      "name": "Sabbir Rahman",
      "phone": "+8801880493774",
      "line": "House 5, Road 9",
      "area": "Uttara, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-02T02:54:36.610Z"
  },
  {
    "id": "ORD-10303",
    "customerId": "c4",
    "customerName": "Mim Akter",
    "items": [
      {
        "productId": "p160",
        "vendorId": "v1",
        "title": "Samsung Galaxy Tab S8 Plus Grey",
        "thumbnail": "https://cdn.dummyjson.com/product-images/tablets/samsung-galaxy-tab-s8-plus-grey/thumbnail.webp",
        "price": 70800,
        "qty": 2
      }
    ],
    "subtotal": 141600,
    "shipping": 0,
    "total": 141600,
    "status": "delivered",
    "paymentMethod": "cod",
    "paymentStatus": "paid",
    "source": "live",
    "address": {
      "id": "a4",
      "label": "Home",
      "name": "Mim Akter",
      "phone": "+8801797027725",
      "line": "House 69, Road 17",
      "area": "Zindabazar, Sylhet",
      "isDefault": true
    },
    "createdAt": "2026-08-01T22:54:36.610Z"
  },
  {
    "id": "ORD-10257",
    "customerId": "c1",
    "customerName": "Raiyan Kamal",
    "items": [
      {
        "productId": "p72",
        "vendorId": "v7",
        "title": "Slotted Turner",
        "thumbnail": "https://cdn.dummyjson.com/product-images/kitchen-accessories/slotted-turner/thumbnail.webp",
        "price": 1060,
        "qty": 2
      },
      {
        "productId": "p18",
        "vendorId": "v8",
        "title": "Cat Food",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/cat-food/thumbnail.webp",
        "price": 1060,
        "qty": 2
      }
    ],
    "subtotal": 4240,
    "shipping": 0,
    "total": 4240,
    "status": "pending",
    "paymentMethod": "cod",
    "paymentStatus": "unpaid",
    "source": "live",
    "address": {
      "id": "a1",
      "label": "Home",
      "name": "Raiyan Kamal",
      "phone": "+8801937098808",
      "line": "House 25, Road 13",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-08-01T06:54:36.610Z"
  },
  {
    "id": "ORD-10280",
    "customerId": "c4",
    "customerName": "Mim Akter",
    "items": [
      {
        "productId": "p19",
        "vendorId": "v8",
        "title": "Chicken Meat",
        "thumbnail": "https://cdn.dummyjson.com/product-images/groceries/chicken-meat/thumbnail.webp",
        "price": 1180,
        "qty": 2
      },
      {
        "productId": "p178",
        "vendorId": "v4",
        "title": "Corset Leather With Skirt",
        "thumbnail": "https://cdn.dummyjson.com/product-images/womens-dresses/corset-leather-with-skirt/thumbnail.webp",
        "price": 10620,
        "qty": 2
      },
      {
        "productId": "p143",
        "vendorId": "v9",
        "title": "Cricket Bat",
        "thumbnail": "https://cdn.dummyjson.com/product-images/sports-accessories/cricket-bat/thumbnail.webp",
        "price": 3540,
        "qty": 2
      }
    ],
    "subtotal": 30680,
    "shipping": 0,
    "total": 30680,
    "status": "cancelled",
    "paymentMethod": "card",
    "paymentStatus": "refunded",
    "source": "store",
    "address": {
      "id": "a4",
      "label": "Home",
      "name": "Mim Akter",
      "phone": "+8801797027725",
      "line": "House 69, Road 17",
      "area": "Zindabazar, Sylhet",
      "isDefault": true
    },
    "createdAt": "2026-07-31T18:54:36.610Z"
  },
  {
    "id": "ORD-10289",
    "customerId": "c3",
    "customerName": "Rakib Hasan",
    "items": [
      {
        "productId": "p86",
        "vendorId": "v3",
        "title": "Man Short Sleeve Shirt",
        "thumbnail": "https://cdn.dummyjson.com/product-images/mens-shirts/man-short-sleeve-shirt/thumbnail.webp",
        "price": 2360,
        "qty": 2
      },
      {
        "productId": "p2",
        "vendorId": "v5",
        "title": "Eyeshadow Palette with Mirror",
        "thumbnail": "https://cdn.dummyjson.com/product-images/beauty/eyeshadow-palette-with-mirror/thumbnail.webp",
        "price": 2360,
        "qty": 1
      }
    ],
    "subtotal": 7080,
    "shipping": 0,
    "total": 7080,
    "status": "delivered",
    "paymentMethod": "cod",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a3",
      "label": "Home",
      "name": "Rakib Hasan",
      "phone": "+8801661648586",
      "line": "House 49, Road 25",
      "area": "Mirpur 10, Dhaka",
      "isDefault": true
    },
    "createdAt": "2026-07-30T06:54:36.610Z"
  },
  {
    "id": "ORD-10263",
    "customerId": "c12",
    "customerName": "Sumaiya Khan",
    "items": [
      {
        "productId": "p192",
        "vendorId": "v4",
        "title": "Rolex Datejust Women",
        "thumbnail": "https://cdn.dummyjson.com/product-images/womens-watches/rolex-datejust-women/thumbnail.webp",
        "price": 1298000,
        "qty": 2
      }
    ],
    "subtotal": 2596000,
    "shipping": 0,
    "total": 2596000,
    "status": "cancelled",
    "paymentMethod": "cod",
    "paymentStatus": "refunded",
    "source": "store",
    "address": {
      "id": "a12",
      "label": "Home",
      "name": "Sumaiya Khan",
      "phone": "+8801359929462",
      "line": "House 64, Road 1",
      "area": "Agrabad, Chattogram",
      "isDefault": true
    },
    "createdAt": "2026-07-28T22:54:36.610Z"
  },
  {
    "id": "ORD-10272",
    "customerId": "c10",
    "customerName": "Riya Das",
    "items": [
      {
        "productId": "p79",
        "vendorId": "v1",
        "title": "Asus Zenbook Pro Dual Screen Laptop",
        "thumbnail": "https://cdn.dummyjson.com/product-images/laptops/asus-zenbook-pro-dual-screen-laptop/thumbnail.webp",
        "price": 212400,
        "qty": 1
      },
      {
        "productId": "p164",
        "vendorId": "v4",
        "title": "Gray Dress",
        "thumbnail": "https://cdn.dummyjson.com/product-images/tops/gray-dress/thumbnail.webp",
        "price": 4130,
        "qty": 1
      },
      {
        "productId": "p188",
        "vendorId": "v4",
        "title": "Pampi Shoes",
        "thumbnail": "https://cdn.dummyjson.com/product-images/womens-shoes/pampi-shoes/thumbnail.webp",
        "price": 3540,
        "qty": 1
      }
    ],
    "subtotal": 220070,
    "shipping": 0,
    "total": 220070,
    "status": "processing",
    "paymentMethod": "card",
    "paymentStatus": "paid",
    "source": "store",
    "address": {
      "id": "a10",
      "label": "Home",
      "name": "Riya Das",
      "phone": "+8801881355005",
      "line": "House 61, Road 9",
      "area": "Agrabad, Chattogram",
      "isDefault": true
    },
    "createdAt": "2026-07-28T22:54:36.610Z"
  }
];

