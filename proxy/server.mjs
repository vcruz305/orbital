// Local test harness ONLY — runs worker.js's fetch handler on localhost so the
// live ADS-B path can be exercised in a browser before deploying to Cloudflare.
// Production deployment is `npx wrangler deploy` (see README.md), not this file.
//   node proxy/server.mjs            # http://localhost:8787
//   PORT=9000 node proxy/server.mjs
import http from 'node:http';
import worker from './worker.js';

const PORT = Number(process.env.PORT || 8787);

const server = http.createServer(async (req, res) => {
  try {
    const request = new Request(`http://localhost:${PORT}${req.url}`, { method: req.method });
    const response = await worker.fetch(request);
    const body = response.status === 204 ? null : await response.text();
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(body);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: String(e) }));
  }
});

server.listen(PORT, () => {
  console.log(`ORBITAL flight proxy (local test) listening on http://localhost:${PORT}`);
});
