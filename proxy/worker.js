/**
 * ORBITAL — live ADS-B flight proxy (Cloudflare Worker).
 *
 * Free ADS-B feeds (adsb.lol, adsb.fi) send no CORS header, so a static site
 * cannot read them from the browser. This Worker fetches them server-side,
 * merges several busy regions into one global-ish picture, and returns JSON
 * with `Access-Control-Allow-Origin: *` so the ORBITAL GitHub Pages app can
 * display real air traffic.
 *
 * Deploy (free Cloudflare account):
 *   cd proxy && npx wrangler deploy
 * Then point the app at the resulting https://<name>.<account>.workers.dev URL
 * (src/lib/data.ts FLIGHT_PROXY_URL, or localStorage['orbital.flightProxy']).
 *
 * Upstream courtesy: adsb.lol / adsb.fi are free community feeds rate-limited to
 * ~1 request/second. Regions are polled with a 1s stagger and the merged result
 * is cached ~20s, so upstream load stays a few requests per cache window.
 * Data © the respective ADS-B aggregators; for non-commercial / personal use.
 */

const REGIONS = [
  [40.6, -73.8, 150],  // New York
  [33.9, -118.4, 150], // Los Angeles
  [51.5, -0.1, 150],   // London
  [35.6, 139.7, 150],  // Tokyo
  [25.25, 55.36, 150], // Dubai
];

const CACHE_TTL_MS = 20000;
const PER_FETCH_TIMEOUT_MS = 4000;
const AGGREGATE_DEADLINE_MS = 11000;
const MAX_AIRCRAFT = 700;
const STAGGER_MS = 1000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json; charset=utf-8',
};

let cache = { ts: 0, body: null };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function adsbUrl(source, lat, lon, r) {
  return source === 'adsbfi'
    ? `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/${r}`
    : `https://api.adsb.lol/v2/point/${lat}/${lon}/${r}`;
}

async function fetchRegion(lat, lon, r) {
  for (const source of ['adsblol', 'adsbfi']) {
    try {
      const res = await fetch(adsbUrl(source, lat, lon, r), {
        signal: AbortSignal.timeout(PER_FETCH_TIMEOUT_MS),
        headers: { 'User-Agent': 'ORBITAL-flight-proxy/1.0' },
      });
      if (!res.ok) continue;
      const json = await res.json();
      const ac = json.ac || json.aircraft || [];
      if (Array.isArray(ac) && ac.length) return ac;
    } catch { /* try the next source */ }
  }
  return [];
}

async function aggregate() {
  const deadline = Date.now() + AGGREGATE_DEADLINE_MS;
  const merged = new Map();
  for (let i = 0; i < REGIONS.length; i++) {
    if (Date.now() > deadline) break;
    const [lat, lon, r] = REGIONS[i];
    const ac = await fetchRegion(lat, lon, r);
    for (const a of ac) {
      if (a && a.hex && typeof a.lat === 'number' && typeof a.lon === 'number') {
        merged.set(String(a.hex).toLowerCase(), a);
      }
    }
    if (i < REGIONS.length - 1 && Date.now() < deadline) await sleep(STAGGER_MS);
  }
  const ac = [...merged.values()].slice(0, MAX_AIRCRAFT);
  return JSON.stringify({ ac, total: ac.length, now: Date.now(), source: 'adsb.lol / adsb.fi' });
}

async function handle(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'GET only' }), { status: 405, headers: CORS_HEADERS });
  }
  const now = Date.now();
  if (!cache.body || now - cache.ts > CACHE_TTL_MS) {
    try {
      cache = { ts: now, body: await aggregate() };
    } catch {
      if (!cache.body) {
        return new Response(JSON.stringify({ ac: [], total: 0, error: 'upstream unavailable' }), {
          status: 502, headers: CORS_HEADERS,
        });
      }
      // A failed refresh keeps serving the last good cache.
    }
  }
  return new Response(cache.body, { headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=15' } });
}

export default { fetch: handle };
