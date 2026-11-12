# ORBITAL live-flight proxy

Real-time aircraft positions come from community **ADS-B** aggregators
([adsb.lol](https://adsb.lol) primary, [adsb.fi](https://adsb.fi) fallback).
These feeds are free and key-less, but they send **no `Access-Control-Allow-Origin`
header**, so a static site (GitHub Pages) cannot read them directly from the
browser. OpenSky has the same problem (its CORS is locked to its own origin).

This folder contains a tiny **Cloudflare Worker** that fetches the feeds
server-side, merges several busy regions into one global picture, and returns
JSON with `Access-Control-Allow-Origin: *`. That is the reliable **LIVE** path.

## Deploy (free, ~2 minutes)

1. Have a free Cloudflare account, then from this folder:
   ```bash
   npx wrangler login      # one-time, opens browser auth
   npx wrangler deploy
   ```
2. Wrangler prints a URL like `https://orbital-flights.<your-account>.workers.dev`.
3. Point the app at it — either:
   - set `FLIGHT_PROXY_URL` in `src/lib/data.ts` and redeploy, **or**
   - at runtime in the browser console:
     ```js
     localStorage.setItem('orbital.flightProxy', 'https://orbital-flights.<your-account>.workers.dev');
     location.reload();
     ```

The aircraft layer then shows **LIVE** real transponders. Without a proxy the app
still tries a best-effort public CORS relay, and if that is unavailable it falls
back to clearly-labeled **SIMULATED** great-circle traffic — never presented as live.

## Test locally (no Cloudflare needed)

```bash
node proxy/server.mjs                 # serves http://localhost:8787
# then in the app console:
localStorage.setItem('orbital.flightProxy', 'http://localhost:8787'); location.reload();
```

## Behavior & courtesy

- Polls 5 regions (New York, Los Angeles, London, Tokyo, Dubai) at ~150 nm radius.
- Upstream feeds are rate-limited to ~1 req/s, so regions are staggered 1 s apart
  and the merged result is cached ~20 s. A failed refresh keeps the last good data.
- Returns ADS-B v2 `ac[]` (hex, flight, lat, lon, alt_baro, gs, track, squawk, …),
  capped at 700 aircraft. The app maps feet→metres and knots→m/s.
- Data © the respective ADS-B aggregators and their feeders; personal /
  non-commercial use. Please consider running a feeder to support them.
