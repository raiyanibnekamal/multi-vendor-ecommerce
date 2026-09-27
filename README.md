# StreamCart — Multi-vendor Marketplace with Reels & Live Shopping

Frontend (HTML / CSS / vanilla JS) for a multi-vendor e-commerce platform where customers shop directly from short videos and live streams. Backend is planned on Supabase — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Run locally

The app uses ES modules, so it must be served over HTTP (opening the file directly won't work).

- **VS Code / Cursor:** install the *Live Server* extension → right-click `index.html` → *Open with Live Server*.
- **Node:** `npx http-server . -p 5500 -c-1` → open http://127.0.0.1:5500
- **Python:** `python -m http.server 5500`

An internet connection is needed for fonts, icons (Lucide), charts (Chart.js), product images and sample videos.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Customer | customer@demo.com | demo123 |
| Vendor (TechNest BD) | vendor@demo.com | demo123 |
| Admin | admin@demo.com | demo123 |

The login page also has one-click demo buttons. All data is stored in your browser's localStorage — use **Admin → Settings → Reset demo data** to start fresh.

## Things to try

1. **Reels → Buy now:** open *Reels*, tap a tagged product, and check out without leaving the video.
2. **Live shopping across tabs:** log in as the vendor, open *Go live studio*, then click *Open viewer page*. Pin a product or chat in the studio and watch it appear in the viewer tab; buy from the viewer tab and the order pops up in the studio.
3. **Realtime orders:** keep the vendor dashboard open in one tab and place an order in another.
4. **AI:** smart search (`phone under 30000`, `laptpo`), the assistant chat bubble, *For you* recommendations, and auto-tag suggestions on *Vendor → New reel*.
5. **Admin:** approve pending vendors, moderate reels, resolve disputes, approve payouts, edit the category tree.

## Pages

- **Storefront:** home, categories, product listing with filters, product detail, search, vendor store, cart, checkout, order success
- **Video commerce:** reels feed, live streams list, live watch page
- **Account:** profile, orders + tracking, wishlist, saved reels, following, addresses
- **Vendor (13):** overview, products, product form, inventory, orders, order detail, reels, reel upload, live streams, go-live studio, analytics, messages, settings
- **Admin (12):** overview, vendors, vendor detail, customers, products, categories, moderation, orders, disputes, payouts, analytics, settings
