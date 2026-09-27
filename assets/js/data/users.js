// Mock seed data (mirrors the planned Supabase tables).
export const users = [
  {
    "id": "u-admin",
    "name": "Platform Admin",
    "email": "admin@demo.com",
    "password": "demo123",
    "role": "admin",
    "phone": "+8801700000000",
    "status": "active",
    "joinedAt": "2024-07-19T13:54:36.610Z"
  },
  {
    "id": "u-v1",
    "name": "Tanvir Ahmed",
    "email": "vendor@demo.com",
    "password": "demo123",
    "role": "vendor",
    "vendorId": "v1",
    "phone": "+8801738594028",
    "status": "active",
    "joinedAt": "2025-09-19T13:54:36.610Z"
  },
  {
    "id": "u-v2",
    "name": "Nusrat Jahan",
    "email": "gadgethub@demo.com",
    "password": "demo123",
    "role": "vendor",
    "vendorId": "v2",
    "phone": "+8801795647921",
    "status": "active",
    "joinedAt": "2026-03-22T13:54:36.610Z"
  },
  {
    "id": "u-v3",
    "name": "Arif Hossain",
    "email": "urbanthreads@demo.com",
    "password": "demo123",
    "role": "vendor",
    "vendorId": "v3",
    "phone": "+8801380330562",
    "status": "active",
    "joinedAt": "2026-01-18T13:54:36.610Z"
  },
  {
    "id": "u-v4",
    "name": "Farzana Akter",
    "email": "bella@demo.com",
    "password": "demo123",
    "role": "vendor",
    "vendorId": "v4",
    "phone": "+8801475957829",
    "status": "active",
    "joinedAt": "2026-05-07T13:54:36.610Z"
  },
  {
    "id": "u-v5",
    "name": "Sadia Rahman",
    "email": "glowup@demo.com",
    "password": "demo123",
    "role": "vendor",
    "vendorId": "v5",
    "phone": "+8801384437831",
    "status": "active",
    "joinedAt": "2026-05-12T13:54:36.610Z"
  },
  {
    "id": "u-v6",
    "name": "Mahmud Hasan",
    "email": "homecraft@demo.com",
    "password": "demo123",
    "role": "vendor",
    "vendorId": "v6",
    "phone": "+8801689909028",
    "status": "active",
    "joinedAt": "2026-03-16T13:54:36.610Z"
  },
  {
    "id": "u-v7",
    "name": "Rafiq Islam",
    "email": "kitchenking@demo.com",
    "password": "demo123",
    "role": "vendor",
    "vendorId": "v7",
    "phone": "+8801777529566",
    "status": "active",
    "joinedAt": "2025-04-01T13:54:36.610Z"
  },
  {
    "id": "u-v8",
    "name": "Kamrul Hasan",
    "email": "freshbasket@demo.com",
    "password": "demo123",
    "role": "vendor",
    "vendorId": "v8",
    "phone": "+8801541066442",
    "status": "active",
    "joinedAt": "2026-05-20T13:54:36.610Z"
  },
  {
    "id": "u-v9",
    "name": "Imran Chowdhury",
    "email": "activezone@demo.com",
    "password": "demo123",
    "role": "vendor",
    "vendorId": "v9",
    "phone": "+8801473994692",
    "status": "active",
    "joinedAt": "2025-10-19T13:54:36.610Z"
  },
  {
    "id": "u-v10",
    "name": "Tasnim Ferdous",
    "email": "stylevault@demo.com",
    "password": "demo123",
    "role": "vendor",
    "vendorId": "v10",
    "phone": "+8801816630474",
    "status": "active",
    "joinedAt": "2026-09-26T13:54:36.610Z"
  },
  {
    "id": "u-v11",
    "name": "Shakil Ahmed",
    "email": "petpal@demo.com",
    "password": "demo123",
    "role": "vendor",
    "vendorId": "v11",
    "phone": "+8801772858484",
    "status": "active",
    "joinedAt": "2026-09-24T13:54:36.610Z"
  },
  {
    "id": "u-v12",
    "name": "Rubel Mia",
    "email": "quickdeals@demo.com",
    "password": "demo123",
    "role": "vendor",
    "vendorId": "v12",
    "phone": "+8801784305901",
    "status": "blocked",
    "joinedAt": "2025-08-29T13:54:36.610Z"
  },
  {
    "id": "c1",
    "name": "Raiyan Kamal",
    "email": "customer@demo.com",
    "password": "demo123",
    "role": "customer",
    "phone": "+8801937098808",
    "status": "active",
    "joinedAt": "2025-06-13T13:54:36.610Z",
    "addresses": [
      {
        "id": "a1",
        "label": "Home",
        "name": "Raiyan Kamal",
        "phone": "+8801937098808",
        "line": "House 25, Road 13",
        "area": "Mirpur 10, Dhaka",
        "isDefault": true
      }
    ]
  },
  {
    "id": "c2",
    "name": "Ayesha Siddiqua",
    "email": "ayesha@mail.com",
    "password": "demo123",
    "role": "customer",
    "phone": "+8801766648455",
    "status": "active",
    "joinedAt": "2026-05-18T13:54:36.610Z",
    "addresses": [
      {
        "id": "a2",
        "label": "Home",
        "name": "Ayesha Siddiqua",
        "phone": "+8801766648455",
        "line": "House 33, Road 10",
        "area": "Gulshan 2, Dhaka",
        "isDefault": true
      }
    ]
  },
  {
    "id": "c3",
    "name": "Rakib Hasan",
    "email": "rakib@mail.com",
    "password": "demo123",
    "role": "customer",
    "phone": "+8801661648586",
    "status": "active",
    "joinedAt": "2025-08-02T13:54:36.610Z",
    "addresses": [
      {
        "id": "a3",
        "label": "Home",
        "name": "Rakib Hasan",
        "phone": "+8801661648586",
        "line": "House 49, Road 25",
        "area": "Mirpur 10, Dhaka",
        "isDefault": true
      }
    ]
  },
  {
    "id": "c4",
    "name": "Mim Akter",
    "email": "mim@mail.com",
    "password": "demo123",
    "role": "customer",
    "phone": "+8801797027725",
    "status": "active",
    "joinedAt": "2025-09-21T13:54:36.610Z",
    "addresses": [
      {
        "id": "a4",
        "label": "Home",
        "name": "Mim Akter",
        "phone": "+8801797027725",
        "line": "House 69, Road 17",
        "area": "Zindabazar, Sylhet",
        "isDefault": true
      }
    ]
  },
  {
    "id": "c5",
    "name": "Sabbir Rahman",
    "email": "sabbir@mail.com",
    "password": "demo123",
    "role": "customer",
    "phone": "+8801880493774",
    "status": "active",
    "joinedAt": "2025-09-17T13:54:36.610Z",
    "addresses": [
      {
        "id": "a5",
        "label": "Home",
        "name": "Sabbir Rahman",
        "phone": "+8801880493774",
        "line": "House 5, Road 9",
        "area": "Uttara, Dhaka",
        "isDefault": true
      }
    ]
  },
  {
    "id": "c6",
    "name": "Nabila Islam",
    "email": "nabila@mail.com",
    "password": "demo123",
    "role": "customer",
    "phone": "+8801520850592",
    "status": "active",
    "joinedAt": "2026-01-25T13:54:36.610Z",
    "addresses": [
      {
        "id": "a6",
        "label": "Home",
        "name": "Nabila Islam",
        "phone": "+8801520850592",
        "line": "House 10, Road 11",
        "area": "Dhanmondi, Dhaka",
        "isDefault": true
      }
    ]
  },
  {
    "id": "c7",
    "name": "Fahim Chowdhury",
    "email": "fahim@mail.com",
    "password": "demo123",
    "role": "customer",
    "phone": "+8801726523717",
    "status": "active",
    "joinedAt": "2026-03-03T13:54:36.610Z",
    "addresses": [
      {
        "id": "a7",
        "label": "Home",
        "name": "Fahim Chowdhury",
        "phone": "+8801726523717",
        "line": "House 61, Road 3",
        "area": "Mirpur 10, Dhaka",
        "isDefault": true
      }
    ]
  },
  {
    "id": "c8",
    "name": "Tania Sultana",
    "email": "tania@mail.com",
    "password": "demo123",
    "role": "customer",
    "phone": "+8801752269815",
    "status": "active",
    "joinedAt": "2025-05-31T13:54:36.610Z",
    "addresses": [
      {
        "id": "a8",
        "label": "Home",
        "name": "Tania Sultana",
        "phone": "+8801752269815",
        "line": "House 91, Road 8",
        "area": "Uttara, Dhaka",
        "isDefault": true
      }
    ]
  },
  {
    "id": "c9",
    "name": "Jubayer Alam",
    "email": "jubayer@mail.com",
    "password": "demo123",
    "role": "customer",
    "phone": "+8801525640214",
    "status": "active",
    "joinedAt": "2026-02-05T13:54:36.610Z",
    "addresses": [
      {
        "id": "a9",
        "label": "Home",
        "name": "Jubayer Alam",
        "phone": "+8801525640214",
        "line": "House 70, Road 1",
        "area": "Zindabazar, Sylhet",
        "isDefault": true
      }
    ]
  },
  {
    "id": "c10",
    "name": "Riya Das",
    "email": "riya@mail.com",
    "password": "demo123",
    "role": "customer",
    "phone": "+8801881355005",
    "status": "active",
    "joinedAt": "2026-03-11T13:54:36.610Z",
    "addresses": [
      {
        "id": "a10",
        "label": "Home",
        "name": "Riya Das",
        "phone": "+8801881355005",
        "line": "House 61, Road 9",
        "area": "Agrabad, Chattogram",
        "isDefault": true
      }
    ]
  },
  {
    "id": "c11",
    "name": "Mehedi Hasan",
    "email": "mehedi@mail.com",
    "password": "demo123",
    "role": "customer",
    "phone": "+8801680654536",
    "status": "blocked",
    "joinedAt": "2025-08-28T13:54:36.610Z",
    "addresses": [
      {
        "id": "a11",
        "label": "Home",
        "name": "Mehedi Hasan",
        "phone": "+8801680654536",
        "line": "House 21, Road 29",
        "area": "Boalia, Rajshahi",
        "isDefault": true
      }
    ]
  },
  {
    "id": "c12",
    "name": "Sumaiya Khan",
    "email": "sumaiya@mail.com",
    "password": "demo123",
    "role": "customer",
    "phone": "+8801359929462",
    "status": "active",
    "joinedAt": "2025-07-24T13:54:36.610Z",
    "addresses": [
      {
        "id": "a12",
        "label": "Home",
        "name": "Sumaiya Khan",
        "phone": "+8801359929462",
        "line": "House 64, Road 1",
        "area": "Agrabad, Chattogram",
        "isDefault": true
      }
    ]
  }
];

