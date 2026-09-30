// StreamCart — High-Performance First-Party Image Proxy & Resilient CDN Gateway
// Solves ISP blocking, ad-blocker false positives, and Cloudflare challenges for product images.

const ALLOWED_HOSTS = new Set([
  'cdn.dummyjson.com',
  'images.unsplash.com',
  'interactive-examples.mdn.mozilla.net',
  'ui-avatars.com',
  'lh3.googleusercontent.com'
]);

const CATEGORY_MAP = {
  sport: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&auto=format&fit=crop&q=80',
  football: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&auto=format&fit=crop&q=80',
  basketball: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80',
  baseball: 'https://images.unsplash.com/photo-1508344928928-7165b67de128?w=600&auto=format&fit=crop&q=80',
  tennis: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=600&auto=format&fit=crop&q=80',
  cricket: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&auto=format&fit=crop&q=80',
  golf: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=600&auto=format&fit=crop&q=80',
  laptop: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80',
  dell: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80',
  macbook: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80',
  phone: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
  samsung: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80',
  tablet: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80',
  watch: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80',
  beauty: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80',
  lipstick: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&auto=format&fit=crop&q=80',
  dress: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&auto=format&fit=crop&q=80',
  skirt: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600&auto=format&fit=crop&q=80',
  kitchen: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80',
  fashion: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80'
};

function getFallback(url) {
  const lower = String(url || '').toLowerCase();
  for (const [key, photo] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return photo;
  }
  return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
}

function generateFallbackSvg(label = 'Product') {
  const safeLabel = String(label).replace(/[&<>"']/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)" rx="28"/>
    <circle cx="300" cy="240" r="88" fill="#3b82f6" opacity="0.18"/>
    <path d="M220 280 L380 280 L340 370 L260 370 Z" fill="#60a5fa" opacity="0.3"/>
    <text x="300" y="440" text-anchor="middle" fill="#f8fafc" font-size="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700">${safeLabel}</text>
    <text x="300" y="480" text-anchor="middle" fill="#94a3b8" font-size="16" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">StreamCart Verified Product</text>
  </svg>`;
}

async function serveFallback(res, targetUrl) {
  const fallbackUrl = getFallback(targetUrl);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const fallbackRes = await fetch(fallbackUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeout);
    if (fallbackRes.ok) {
      const fbBuffer = Buffer.from(await fallbackRes.arrayBuffer());
      res.writeHead(200, {
        'Content-Type': fallbackRes.headers.get('content-type') || 'image/jpeg',
        'Content-Length': fbBuffer.length,
        'Cache-Control': 'public, max-age=604800, s-maxage=2592000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(fbBuffer);
      return;
    }
  } catch (_) {}

  // Instant SVG fallback that NEVER fails and needs NO external network
  const label = targetUrl.split('/').filter(Boolean).slice(-2, -1)[0]?.replace(/-/g, ' ') || 'Product';
  const svg = generateFallbackSvg(label.toUpperCase());
  const svgBuffer = Buffer.from(svg, 'utf-8');
  res.writeHead(200, {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Content-Length': svgBuffer.length,
    'Cache-Control': 'public, max-age=86400, s-maxage=604800',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(svgBuffer);
}

module.exports = async function handler(req, res) {
  const targetUrl = req.query?.url || new URL(req.url, 'http://localhost').searchParams.get('url');

  if (!targetUrl) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing "url" query parameter.' }));
    return;
  }

  try {
    const parsed = new URL(targetUrl);
    const isSupabase = parsed.hostname.endsWith('.supabase.co');
    if (!ALLOWED_HOSTS.has(parsed.hostname) && !isSupabase) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Host not allowed.' }));
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      await serveFallback(res, targetUrl);
      return;
    }

    const contentType = response.headers.get('content-type') || 'image/webp';
    const buffer = Buffer.from(await response.arrayBuffer());

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=604800, s-maxage=2592000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(buffer);
  } catch (err) {
    await serveFallback(res, targetUrl);
  }
};
