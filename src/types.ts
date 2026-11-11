export type Category = 'aircraft' | 'satellite' | 'launch';

export type SatGroup =
  | 'stations'
  | 'gps'
  | 'starlink'
  | 'visual'
  | 'weather'
  | 'science';

export interface LaunchInfo {
  id: string;
  name: string;
  provider: string;
  vehicle: string;
  mission: string;
  missionType: string;
  orbit: string;
  pad: string;
  location: string;
  lat: number;
  lon: number;
  net: number; // epoch ms
  windowStart: number;
  windowEnd: number;
  status: string;
  statusAbbrev: string;
  image?: string;
  description: string;
  simulated: boolean;
  probability: number | null;
}

export interface TrackObject {
  id: string;
  category: Category;
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  alt: number; // meters
  heading: number; // degrees
  speed: number; // m/s
  simulated: boolean;
  color: string;
  // satellite
  group?: SatGroup;
  norad?: string;
  inclination?: number;
  period?: number; // minutes
  eccentricity?: number;
  // aircraft
  callsign?: string;
  squawk?: string;
  onGround?: boolean;
  origin?: string;
  destination?: string;
  country?: string;
  // launch site
  launchId?: string;
}

export type SourceState = 'loading' | 'live' | 'simulated' | 'error';

export interface DataStatus {
  source: string;
  state: SourceState;
  message: string;
  count: number;
  updated: number | null;
}

export interface LayerVisibility {
  aircraft: boolean;
  satellites: boolean;
  launches: boolean;
  orbits: boolean;
  trails: boolean;
  clouds: boolean;
  nightLights: boolean;
  atmosphere: boolean;
  labels: boolean;
}

export type SatFilter = Record<SatGroup, boolean>;

export interface CameraPreset {
  id: string;
  label: string;
  lon: number;
  lat: number;
  height: number;
  heading?: number;
  pitch?: number;
}

export interface Selection {
  object: TrackObject;
  following: boolean;
}

export interface Counters {
  aircraft: number;
  satellites: number;
  launches: number;
  aircraftLive: boolean;
}