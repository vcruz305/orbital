export function fmtAlt(meters: number): string {
  if (!isFinite(meters)) return '—';
  const ft = meters * 3.28084;
  if (meters >= 100000) return `${(meters / 1000).toFixed(0)} km`;
  return `${Math.round(ft).toLocaleString()} ft`;
}

export function fmtAltKm(meters: number): string {
  if (!isFinite(meters)) return '—';
  return `${(meters / 1000).toFixed(1)} km`;
}

export function fmtSpeed(ms: number): string {
  if (!isFinite(ms)) return '—';
  const kt = ms * 1.94384;
  return `${Math.round(kt).toLocaleString()} kt`;
}

export function fmtSpeedKms(ms: number): string {
  if (!isFinite(ms)) return '—';
  return `${(ms / 1000).toFixed(2)} km/s`;
}

export function fmtHeading(deg: number): string {
  if (!isFinite(deg)) return '—';
  const d = ((deg % 360) + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(d / 45) % 8;
  return `${Math.round(d)}° ${dirs[idx]}`;
}

export function fmtCoord(lat: number, lon: number): string {
  const la = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
  const lo = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
  return `${la} ${lo}`;
}

export function fmtNumber(n: number): string {
  return n.toLocaleString();
}

export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export interface Countdown {
  sign: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  past: boolean;
}

export function countdown(target: number, now: number): Countdown {
  let diff = target - now;
  const past = diff < 0;
  diff = Math.abs(diff);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { sign: past ? 'T+' : 'T−', days, hours, minutes, seconds, total: target - now, past };
}

export function fmtCountdown(c: Countdown): string {
  if (c.days > 0) return `${c.sign}${c.days}d ${pad2(c.hours)}:${pad2(c.minutes)}:${pad2(c.seconds)}`;
  return `${c.sign}${pad2(c.hours)}:${pad2(c.minutes)}:${pad2(c.seconds)}`;
}

export function fmtClockUTC(now: number): string {
  const d = new Date(now);
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

export function fmtDateUTC(now: number): string {
  const d = new Date(now);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${pad2(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function fmtLaunchDate(net: number): string {
  const d = new Date(net);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getUTCMonth()]} ${pad2(d.getUTCDate())} · ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
}

export function timeAgo(ts: number | null, now: number): string {
  if (!ts) return '—';
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}