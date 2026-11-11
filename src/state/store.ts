import { useEffect, useState, useSyncExternalStore } from 'react';
import type {
  Counters, DataStatus, LaunchInfo, LayerVisibility, SatFilter, SatGroup, Selection,
} from '../types';

export interface AppState {
  ready: boolean;
  loadingLabel: string;
  layers: LayerVisibility;
  satFilter: SatFilter;
  selection: Selection | null;
  counters: Counters;
  statuses: { satellites: DataStatus; aircraft: DataStatus; launches: DataStatus };
  launches: LaunchInfo[];
  search: string;
  leftOpen: boolean;
  timelineOpen: boolean;
  timeScale: number;
  activePreset: string;
  introDone: boolean;
  error: string | null;
}

const initialStatus = (source: string): DataStatus => ({
  source, state: 'loading', message: 'Connecting…', count: 0, updated: null,
});

const wide = typeof window !== 'undefined' ? window.innerWidth >= 768 : true;

let state: AppState = {
  ready: false,
  loadingLabel: 'Initializing render core',
  layers: {
    aircraft: true, satellites: true, launches: true, orbits: true, trails: true,
    clouds: true, nightLights: true, atmosphere: true, labels: false,
  },
  satFilter: { stations: true, gps: true, starlink: true, visual: true, weather: true, science: true },
  selection: null,
  counters: { aircraft: 0, satellites: 0, launches: 0, aircraftLive: false },
  statuses: {
    satellites: initialStatus('CelesTrak'),
    aircraft: initialStatus('OpenSky Network'),
    launches: initialStatus('Launch Library 2'),
  },
  launches: [],
  search: '',
  leftOpen: wide,
  timelineOpen: wide,
  timeScale: 1,
  activePreset: 'overview',
  introDone: false,
  error: null,
};

const listeners = new Set<() => void>();

export function getState(): AppState { return state; }
export function setState(patch: Partial<AppState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function toggleLayer(key: keyof LayerVisibility): void {
  setState({ layers: { ...state.layers, [key]: !state.layers[key] } });
}
export function toggleSatGroup(g: SatGroup): void {
  setState({ satFilter: { ...state.satFilter, [g]: !state.satFilter[g] } });
}
export function setSelection(sel: Selection | null): void {
  setState({ selection: sel });
}
export function setFollowing(following: boolean): void {
  if (!state.selection) return;
  setState({ selection: { ...state.selection, following } });
}
export function setSearch(q: string): void { setState({ search: q }); }
export function setTimeScale(t: number): void { setState({ timeScale: t }); }

/** Ticking clock hook (kept out of the global store to limit re-renders). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}