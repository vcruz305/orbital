import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  eciToEcf,
  degreesLat,
  degreesLong,
  radiansToDegrees,
  type SatRec,
} from 'satellite.js';
import type { SatGroup } from '../types';

export interface TLE {
  name: string;
  line1: string;
  line2: string;
  norad: string;
}

export interface SatFix {
  lat: number;
  lon: number;
  alt: number; // meters
  speed: number; // m/s
  ecf: [number, number, number]; // meters
}

/** Parse a CelesTrak TLE text blob (name / line1 / line2 triplets). */
export function parseTLE(text: string): TLE[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: TLE[] = [];
  for (let i = 0; i + 2 < lines.length + 1; i++) {
    if (lines[i]?.startsWith('1 ') && lines[i + 1]?.startsWith('2 ')) {
      const name = i > 0 && !lines[i - 1].startsWith('1 ') && !lines[i - 1].startsWith('2 ')
        ? lines[i - 1]
        : `NORAD ${lines[i].slice(2, 7).trim()}`;
      out.push({
        name,
        line1: lines[i],
        line2: lines[i + 1],
        norad: lines[i].slice(2, 7).trim(),
      });
      i += 1;
    }
  }
  return out;
}

export interface SatRecord {
  tle: TLE;
  rec: SatRec;
  group: SatGroup;
  inclination: number;
  period: number; // minutes
  eccentricity: number;
}

export function buildSatRecord(tle: TLE, group: SatGroup): SatRecord | null {
  try {
    const rec = twoline2satrec(tle.line1, tle.line2);
    if (!rec || rec.error) return null;
    const period = rec.no > 0 ? (2 * Math.PI) / rec.no : 0;
    return {
      tle,
      rec,
      group,
      inclination: radiansToDegrees(rec.inclo),
      period,
      eccentricity: rec.ecco,
    };
  } catch {
    return null;
  }
}

/** Propagate a satellite to a Date, returning geodetic fix + ECF position. */
export function propagateSat(sat: SatRecord, date: Date): SatFix | null {
  try {
    const pv = propagate(sat.rec, date);
    if (!pv || !pv.position || sat.rec.error) return null;
    const gmst = gstime(date);
    const geo = eciToGeodetic(pv.position, gmst);
    const lat = degreesLat(geo.latitude);
    const lon = degreesLong(geo.longitude);
    const alt = geo.height * 1000;
    if (!isFinite(lat) || !isFinite(lon) || !isFinite(alt) || alt < -100000) return null;
    const v = pv.velocity;
    const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) * 1000;
    const ecf = eciToEcf(pv.position, gmst);
    return {
      lat,
      lon,
      alt,
      speed,
      ecf: [ecf.x * 1000, ecf.y * 1000, ecf.z * 1000],
    };
  } catch {
    return null;
  }
}

/**
 * Sample one orbital period of ground-relative positions (ECEF meters) to draw
 * the orbit path as it currently sits over the rotating Earth.
 */
export function computeOrbitPath(sat: SatRecord, date: Date, steps = 96): [number, number, number][] {
  const periodMs = Math.max(60, sat.period) * 60 * 1000;
  const pts: [number, number, number][] = [];
  const start = date.getTime();
  for (let i = 0; i <= steps; i++) {
    const t = new Date(start + (i / steps) * periodMs);
    try {
      const pv = propagate(sat.rec, t);
      if (!pv || !pv.position) continue;
      const gmst = gstime(t);
      const ecf = eciToEcf(pv.position, gmst);
      pts.push([ecf.x * 1000, ecf.y * 1000, ecf.z * 1000]);
    } catch {
      /* skip bad sample */
    }
  }
  return pts;
}