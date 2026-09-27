// Mock seed data (mirrors the planned Supabase tables).
export const categories = [
  {
    "id": "electronics",
    "name": "Electronics",
    "parentId": null,
    "icon": "smartphone"
  },
  {
    "id": "smartphones",
    "name": "Smartphones",
    "parentId": "electronics"
  },
  {
    "id": "laptops",
    "name": "Laptops",
    "parentId": "electronics"
  },
  {
    "id": "tablets",
    "name": "Tablets",
    "parentId": "electronics"
  },
  {
    "id": "mobile-accessories",
    "name": "Mobile Accessories",
    "parentId": "electronics"
  },
  {
    "id": "fashion",
    "name": "Fashion",
    "parentId": null,
    "icon": "shirt"
  },
  {
    "id": "men",
    "name": "Men",
    "parentId": "fashion"
  },
  {
    "id": "mens-shirts",
    "name": "Shirts",
    "parentId": "men"
  },
  {
    "id": "mens-shoes",
    "name": "Shoes",
    "parentId": "men"
  },
  {
    "id": "mens-watches",
    "name": "Watches",
    "parentId": "men"
  },
  {
    "id": "women",
    "name": "Women",
    "parentId": "fashion"
  },
  {
    "id": "womens-dresses",
    "name": "Dresses",
    "parentId": "women"
  },
  {
    "id": "womens-tops",
    "name": "Tops",
    "parentId": "women"
  },
  {
    "id": "womens-shoes",
    "name": "Shoes",
    "parentId": "women"
  },
  {
    "id": "womens-bags",
    "name": "Bags",
    "parentId": "women"
  },
  {
    "id": "womens-jewellery",
    "name": "Jewellery",
    "parentId": "women"
  },
  {
    "id": "womens-watches",
    "name": "Watches",
    "parentId": "women"
  },
  {
    "id": "fashion-accessories",
    "name": "Accessories",
    "parentId": "fashion"
  },
  {
    "id": "sunglasses",
    "name": "Sunglasses",
    "parentId": "fashion-accessories"
  },
  {
    "id": "home-living",
    "name": "Home & Living",
    "parentId": null,
    "icon": "sofa"
  },
  {
    "id": "furniture",
    "name": "Furniture",
    "parentId": "home-living"
  },
  {
    "id": "home-decoration",
    "name": "Home Decor",
    "parentId": "home-living"
  },
  {
    "id": "kitchen",
    "name": "Kitchen & Dining",
    "parentId": "home-living"
  },
  {
    "id": "beauty",
    "name": "Beauty",
    "parentId": null,
    "icon": "sparkles"
  },
  {
    "id": "makeup",
    "name": "Makeup",
    "parentId": "beauty"
  },
  {
    "id": "fragrances",
    "name": "Fragrances",
    "parentId": "beauty"
  },
  {
    "id": "skin-care",
    "name": "Skin Care",
    "parentId": "beauty"
  },
  {
    "id": "groceries",
    "name": "Groceries",
    "parentId": null,
    "icon": "apple"
  },
  {
    "id": "fresh-produce",
    "name": "Fruits & Vegetables",
    "parentId": "groceries"
  },
  {
    "id": "meat-fish",
    "name": "Meat & Fish",
    "parentId": "groceries"
  },
  {
    "id": "beverages-dairy",
    "name": "Beverages & Dairy",
    "parentId": "groceries"
  },
  {
    "id": "pantry",
    "name": "Pantry & Essentials",
    "parentId": "groceries"
  },
  {
    "id": "sports",
    "name": "Sports & Outdoors",
    "parentId": null,
    "icon": "dumbbell"
  },
  {
    "id": "sports-fitness",
    "name": "Sports Equipment",
    "parentId": "sports"
  }
];

