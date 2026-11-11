import { buildSatRecord, parseTLE, type SatRecord } from './satellite';
import type { DataStatus, LaunchInfo, SatGroup, TrackObject } from '../types';

const BASE = import.meta.env.BASE_URL;

export const SAT_GROUPS: Record<
  SatGroup,
  { label: string; url: string; color: string; cap: number }
> = {
  stations: { label: 'Space Stations', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle', color: '#ff8a2a', cap: 40 },
  gps: { label: 'GPS Constellation', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle', color: '#4d8dff', cap: 40 },
  starlink: { label: 'Starlink', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle', color: '#38e1ff', cap: 320 },
  visual: { label: 'Bright / Visual', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle', color: '#ff5ea8', cap: 120 },
  weather: { label: 'Weather', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle', color: '#5eead4', cap: 60 },
  science: { label: 'Science', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=science&FORMAT=tle', color: '#2dd4bf', cap: 60 },
};

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchSatellites(): Promise<{ sats: SatRecord[]; status: DataStatus }> {
  const groups = Object.keys(SAT_GROUPS) as SatGroup[];
  const sats: SatRecord[] = [];
  let okGroups = 0;
  await Promise.all(
    groups.map(async (g) => {
      const cfg = SAT_GROUPS[g];
      try {
        const text = await fetchText(cfg.url, 30000);
        const tles = parseTLE(text).slice(0, cfg.cap);
        for (const tle of tles) {
          const rec = buildSatRecord(tle, g);
          if (rec) sats.push(rec);
        }
        if (tles.length) okGroups++;
      } catch {
        /* group unavailable; continue with others */
      }
    }),
  );
  const status: DataStatus = {
    source: 'CelesTrak',
    state: sats.length ? 'live' : 'error',
    message: sats.length
      ? `${okGroups}/${groups.length} element sets · SGP4 propagation`
      : 'Unable to reach CelesTrak element sets',
    count: sats.length,
    updated: Date.now(),
  };
  return { sats, status };
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isFinite(n) ? n : fallback;
}

export async function fetchLaunches(): Promise<{ launches: LaunchInfo[]; status: DataStatus }> {
  const url = 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=14&hide_recent_previous=true';
  try {
    const text = await fetchText(url, 15000);
    const json = JSON.parse(text);
    const results: any[] = json.results || [];
    const launches: LaunchInfo[] = results.map((r) => {
      const pad = r.pad || {};
      const loc = pad.location || {};
      const mission = r.mission || {};
      const rocket = r.rocket?.configuration || {};
      const net = Date.parse(r.net) || Date.now();
      return {
        id: String(r.id),
        name: r.name || 'Unknown launch',
        provider: r.launch_service_provider?.name || 'Unknown provider',
        vehicle: rocket.full_name || rocket.name || 'Unknown vehicle',
        mission: mission.name || '—',
        missionType: mission.type || '—',
        orbit: mission.orbit?.name || '—',
        pad: pad.name || '—',
        location: loc.name || '—',
        lat: num(pad.latitude),
        lon: num(pad.longitude),
        net,
        windowStart: Date.parse(r.window_start) || net,
        windowEnd: Date.parse(r.window_end) || net,
        status: r.status?.name || 'Unknown',
        statusAbbrev: r.status?.abbrev || 'TBD',
        image: r.image || undefined,
        description: mission.description || '',
        simulated: false,
        probability: typeof r.probability === 'number' ? r.probability : null,
      };
    });
    launches.sort((a, b) => a.net - b.net);
    return {
      launches,
      status: {
        source: 'Launch Library 2',
        state: 'live',
        message: `${launches.length} upcoming launches`,
        count: launches.length,
        updated: Date.now(),
      },
    };
  } catch (e) {
    return {
      launches: [],
      status: {
        source: 'Launch Library 2',
        state: 'error',
        message: 'Launch feed offline — retry to reconnect',
        count: 0,
        updated: null,
      },
    };
  }
}

/** Attempt live OpenSky. Returns null when blocked (CORS) or unavailable. */
export async function fetchLiveAircraft(): Promise<TrackObject[] | null> {
  try {
    const text = await fetchText('https://opensky-network.org/api/states/all', 8000);
    const json = JSON.parse(text);
    const states: any[] = json.states || [];
    const out: TrackObject[] = [];
    for (const s of states) {
      const lon = s[5];
      const lat = s[6];
      if (typeof lat !== 'number' || typeof lon !== 'number') continue;
      const callsign = (s[1] || '').trim() || (s[0] || '').toUpperCase();
      out.push({
        id: `live-${s[0]}`,
        category: 'aircraft',
        name: callsign,
        subtitle: s[2] || 'Unknown origin',
        lat,
        lon,
        alt: num(s[13] ?? s[7]) ,
        heading: num(s[10]),
        speed: num(s[9]),
        simulated: false,
        color: '#ffd23e',
        callsign,
        squawk: s[14] || undefined,
        onGround: !!s[8],
        country: s[2] || undefined,
      });
      if (out.length >= 1500) break;
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Simulated air traffic (used when OpenSky is unreachable from the browser).
// Aircraft fly great-circle routes between real-world airports.
// ---------------------------------------------------------------------------

interface Airport { code: string; lat: number; lon: number; }

const AIRPORTS: Airport[] = [
  { code: 'JFK', lat: 40.64, lon: -73.78 }, { code: 'LAX', lat: 33.94, lon: -118.41 },
  { code: 'ORD', lat: 41.98, lon: -87.9 }, { code: 'ATL', lat: 33.64, lon: -84.43 },
  { code: 'DFW', lat: 32.9, lon: -97.04 }, { code: 'SFO', lat: 37.62, lon: -122.38 },
  { code: 'LHR', lat: 51.47, lon: -0.45 }, { code: 'CDG', lat: 49.01, lon: 2.55 },
  { code: 'FRA', lat: 50.03, lon: 8.56 }, { code: 'AMS', lat: 52.31, lon: 4.76 },
  { code: 'MAD', lat: 40.47, lon: -3.56 }, { code: 'FCO', lat: 41.8, lon: 12.25 },
  { code: 'DXB', lat: 25.25, lon: 55.36 }, { code: 'DOH', lat: 25.27, lon: 51.61 },
  { code: 'HND', lat: 35.55, lon: 139.78 }, { code: 'NRT', lat: 35.77, lon: 140.39 },
  { code: 'ICN', lat: 37.46, lon: 126.44 }, { code: 'PEK', lat: 40.08, lon: 116.58 },
  { code: 'PVG', lat: 31.14, lon: 121.8 }, { code: 'SIN', lat: 1.36, lon: 103.99 },
  { code: 'SYD', lat: -33.95, lon: 151.18 }, { code: 'MEL', lat: -37.67, lon: 144.84 },
  { code: 'GRU', lat: -23.43, lon: -46.47 }, { code: 'EZE', lat: -34.82, lon: -58.54 },
  { code: 'MEX', lat: 19.44, lon: -99.07 }, { code: 'YYZ', lat: 43.68, lon: -79.63 },
  { code: 'JNB', lat: -26.13, lon: 28.24 }, { code: 'CAI', lat: 30.12, lon: 31.41 },
  { code: 'DEL', lat: 28.56, lon: 77.1 }, { code: 'BOM', lat: 19.09, lon: 72.87 },
  { code: 'IST', lat: 41.26, lon: 28.74 }, { code: 'SVO', lat: 55.97, lon: 37.41 },
  { code: 'AKL', lat: -37.01, lon: 174.79 }, { code: 'HNL', lat: 21.32, lon: -157.92 },
  { code: 'ANC', lat: 61.17, lon: -150.0 }, { code: 'KEF', lat: 63.99, lon: -22.62 },
];

const AIRLINES = ['UAL', 'DAL', 'AAL', 'SWA', 'BAW', 'AFR', 'DLH', 'KLM', 'UAE', 'QTR', 'SIA', 'ANA', 'JAL', 'KAL', 'CPA', 'THY', 'AFL', 'VIR', 'ACA', 'QFA', 'LAN', 'AVA', 'AMX', 'ETH', 'RAM', 'AIC', 'IGO'];

const DEG = Math.PI / 180;
const R = 6371000;

function toRad(lat: number, lon: number): [number, number] { return [lat * DEG, lon * DEG]; }

function greatCircle(a: Airport, b: Airport, f: number): { lat: number; lon: number } {
  const [p1, l1] = toRad(a.lat, a.lon);
  const [p2, l2] = toRad(b.lat, b.lon);
  const d = 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
  if (d < 1e-6) return { lat: a.lat, lon: a.lon };
  const A = Math.sin((1 - f) * d) / Math.sin(d);
  const B = Math.sin(f * d) / Math.sin(d);
  const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
  const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
  const z = A * Math.sin(p1) + B * Math.sin(p2);
  return { lat: Math.atan2(z, Math.sqrt(x * x + y * y)) / DEG, lon: Math.atan2(y, x) / DEG };
}

function bearing(a: Airport, b: Airport): number {
  const [p1, l1] = toRad(a.lat, a.lon);
  const [p2, l2] = toRad(b.lat, b.lon);
  const dl = l2 - l1;
  const th = Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl));
  return ((th / DEG) + 360) % 360;
}

interface SimPlane {
  obj: TrackObject;
  from: Airport;
  to: Airport;
  f: number;
  dist: number;
}

export class SimTraffic {
  planes: SimPlane[] = [];

  constructor(count: number) {
    for (let i = 0; i < count; i++) this.planes.push(this.spawn(i));
  }

  private spawn(i: number): SimPlane {
    let a = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
    let b = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
    while (b === a) b = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
    const [p1, l1] = toRad(a.lat, a.lon);
    const [p2, l2] = toRad(b.lat, b.lon);
    const dist = 2 * R * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
    const airline = AIRLINES[Math.floor(Math.random() * AIRLINES.length)];
    const flightNum = 100 + Math.floor(Math.random() * 900);
    const callsign = `${airline}${flightNum}`;
    const alt = 9000 + Math.random() * 3200;
    const speed = 225 + Math.random() * 40;
    const f = Math.random();
    const pos = greatCircle(a, b, f);
    const obj: TrackObject = {
      id: `sim-${i}-${callsign}`,
      category: 'aircraft',
      name: callsign,
      subtitle: `${a.code} → ${b.code}`,
      lat: pos.lat,
      lon: pos.lon,
      alt,
      heading: bearing(a, b),
      speed,
      simulated: true,
      color: '#ffd23e',
      callsign,
      origin: a.code,
      destination: b.code,
      country: 'Simulated',
      squawk: String(1000 + Math.floor(Math.random() * 6000)),
    };
    return { obj, from: a, to: b, f, dist: Math.max(dist, 100000) };
  }

  get objects(): TrackObject[] { return this.planes.map((p) => p.obj); }

  step(dtSeconds: number): void {
    for (let i = 0; i < this.planes.length; i++) {
      const p = this.planes[i];
      p.f += (p.obj.speed * dtSeconds) / p.dist;
      if (p.f >= 1) {
        this.planes[i] = this.spawn(i);
        continue;
      }
      const pos = greatCircle(p.from, p.to, p.f);
      p.obj.lat = pos.lat;
      p.obj.lon = pos.lon;
      p.obj.heading = bearing(p.from, p.to);
    }
  }
}

export function textureUrl(name: string): string {
  return `${BASE}textures/${name}`;
}