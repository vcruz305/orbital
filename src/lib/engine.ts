import * as Cesium from 'cesium';
import { SAT_GROUPS, SimTraffic, fetchLaunches, fetchLiveAircraft, fetchSatellites, textureUrl } from './data';
import { computeOrbitPath, propagateSat, type SatRecord } from './satellite';
import type { CameraPreset, LaunchInfo, LayerVisibility, SatFilter, TrackObject } from '../types';
import { setState, getState } from '../state/store';

const EARTH_R = 6371000;

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'overview', label: 'Overview', lon: -30, lat: 18, height: 2.6e7, pitch: -90 },
  { id: 'americas', label: 'Americas', lon: -85, lat: 22, height: 2.0e7, pitch: -90 },
  { id: 'europe', label: 'Europe · Africa', lon: 18, lat: 22, height: 2.0e7, pitch: -90 },
  { id: 'asia', label: 'Asia · Pacific', lon: 115, lat: 22, height: 2.0e7, pitch: -90 },
  { id: 'polar', label: 'North Pole', lon: 0, lat: 89.5, height: 2.2e7, pitch: -90 },
];

function makePlaneIcon(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d')!;
  g.translate(32, 32);
  g.shadowColor = 'rgba(255,255,255,0.9)';
  g.shadowBlur = 7;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(0, -26);
  g.lineTo(4.5, -9); g.lineTo(24, 3); g.lineTo(24, 9); g.lineTo(4.5, 5);
  g.lineTo(3.5, 17); g.lineTo(11, 23); g.lineTo(11, 27); g.lineTo(0, 24);
  g.lineTo(-11, 27); g.lineTo(-11, 23); g.lineTo(-3.5, 17); g.lineTo(-4.5, 5);
  g.lineTo(-24, 9); g.lineTo(-24, 3); g.lineTo(-4.5, -9);
  g.closePath();
  g.fill();
  return c;
}

function makeLaunchIcon(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d')!;
  g.translate(32, 34);
  g.shadowColor = 'rgba(255,179,71,0.95)';
  g.shadowBlur = 10;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(0, -26);
  g.quadraticCurveTo(8, -12, 8, 2);
  g.lineTo(14, 12); g.lineTo(8, 12); g.lineTo(8, 18);
  g.lineTo(-8, 18); g.lineTo(-8, 12); g.lineTo(-14, 12); g.lineTo(-8, 2);
  g.quadraticCurveTo(-8, -12, 0, -26);
  g.closePath();
  g.fill();
  return c;
}

interface SatEntry { sat: SatRecord; obj: TrackObject; point: Cesium.PointPrimitive; }

export class OrbitalEngine {
  viewer: Cesium.Viewer;
  private scene: Cesium.Scene;
  private satEntries: SatEntry[] = [];
  private aircraft: TrackObject[] = [];
  private sim: SimTraffic | null = null;
  private aircraftLive = false;
  private lastAircraftRefresh = 0;
  private aircraftRefreshing = false;
  private launches: LaunchInfo[] = [];
  private objects = new Map<string, TrackObject>();

  private satPoints!: Cesium.PointPrimitiveCollection;
  private aircraftBillboards!: Cesium.BillboardCollection;
  private orbitLines!: Cesium.PolylineCollection;
  private trailLines!: Cesium.PolylineCollection;
  private launchMarkers!: Cesium.BillboardCollection;
  private cloudEntity: Cesium.Entity | null = null;
  private nightLayer: Cesium.ImageryLayer | null = null;
  private followEntity: Cesium.Entity | null = null;
  private planeIcon: HTMLCanvasElement;
  private launchIcon: HTMLCanvasElement;

  private selectedId: string | null = null;
  private following = false;
  private followPos = new Cesium.Cartesian3();
  private trailPts: Cesium.Cartesian3[] = [];
  private trailLine: Cesium.Polyline | null = null;
  private selectedOrbit: Cesium.Polyline | null = null;
  private orbitSet: Cesium.Polyline[] = [];
  private lastOrbitRefresh = 0;
  private lastSimMs = 0;
  private lastCounterPush = 0;
  private lastInteraction = 0;
  private disposed = false;
  private scratch = new Cesium.Cartesian3();
  private handler: Cesium.ScreenSpaceEventHandler | null = null;
  private removePreRender: (() => void) | null = null;

  constructor(private container: HTMLElement) {
    Cesium.Ion.defaultAccessToken = '';
    this.planeIcon = makePlaneIcon();
    this.launchIcon = makeLaunchIcon();

    this.viewer = new Cesium.Viewer(container, {
      baseLayer: new Cesium.ImageryLayer(new Cesium.UrlTemplateImageryProvider({
        url: textureUrl('day/{z}/{x}/{y}.jpg'),
        tilingScheme: new Cesium.GeographicTilingScheme(),
        maximumLevel: 4,
        tileWidth: 256, tileHeight: 256,
        hasAlphaChannel: false,
        credit: 'Earth imagery: Solar System Scope (CC BY 4.0)',
      })),
      terrain: new Cesium.Terrain(Promise.resolve(new Cesium.EllipsoidTerrainProvider())),
      baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false,
      navigationHelpButton: false, animation: false, timeline: false, fullscreenButton: false,
      vrButton: false, infoBox: false, selectionIndicator: false, shadows: false,
      shouldAnimate: true, scene3DOnly: true,
      contextOptions: { webgl: { alpha: false, antialias: true, powerPreference: 'high-performance' } },
      requestRenderMode: false,
    });
    this.scene = this.viewer.scene;
    this.setupGlobe();
    this.setupStars();
    this.setupCollections();
    this.setupFollow();
    this.setupInteraction();
    this.startLoop();
    this.introCamera();
  }

  private setupGlobe(): void {
    const globe = this.scene.globe;
    globe.enableLighting = true;
    globe.showGroundAtmosphere = true;
    globe.baseColor = Cesium.Color.fromCssColorString('#0a1428');
    globe.maximumScreenSpaceError = 2;
    const atm = this.scene.skyAtmosphere;
    if (atm) {
      atm.show = true;
      atm.brightnessShift = 0.15;
      atm.saturationShift = 0.25;
    }
    if (this.scene.sun) this.scene.sun.show = true;
    if (this.scene.moon) this.scene.moon.show = true;
    this.scene.backgroundColor = Cesium.Color.BLACK;
    this.scene.fog.enabled = true;
    this.scene.highDynamicRange = false;

    this.nightLayer = this.viewer.imageryLayers.addImageryProvider(new Cesium.SingleTileImageryProvider({
      url: textureUrl('earth_night.png'),
      rectangle: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90),
      tileWidth: 4096, tileHeight: 2048,
    }));
    this.nightLayer.alpha = 1.0;
    // City lights belong to the night side only; without this they wash over the
    // day map as blocky blotches. dayAlpha/nightAlpha blend with globe.enableLighting.
    this.nightLayer.dayAlpha = 0.0;
    this.nightLayer.nightAlpha = 0.95;
    this.nightLayer.brightness = 1.5;

    this.cloudEntity = this.viewer.entities.add({
      position: Cesium.Cartesian3.ZERO,
      ellipsoid: {
        radii: new Cesium.Cartesian3(EARTH_R + 14000, EARTH_R + 14000, EARTH_R + 14000),
        material: new Cesium.ImageMaterialProperty({ image: textureUrl('earth_clouds.png'), transparent: true }),
      },
    });

    const ssc = this.scene.screenSpaceCameraController;
    ssc.minimumZoomDistance = 15000;
    ssc.maximumZoomDistance = 1.4e8;
    ssc.enableCollisionDetection = true;
    this.viewer.clock.shouldAnimate = true;
    this.viewer.clock.multiplier = 1;
    const credit = (this.viewer.cesiumWidget as any).creditContainer as HTMLElement | undefined;
    if (credit) credit.style.display = 'none';
  }

  private setupStars(): void {
    this.scene.skyBox = new Cesium.SkyBox({
      sources: {
        positiveX: textureUrl('stars_px.png'), negativeX: textureUrl('stars_nx.png'),
        positiveY: textureUrl('stars_py.png'), negativeY: textureUrl('stars_ny.png'),
        positiveZ: textureUrl('stars_pz.png'), negativeZ: textureUrl('stars_nz.png'),
      },
    });
  }

  private setupCollections(): void {
    this.satPoints = this.scene.primitives.add(new Cesium.PointPrimitiveCollection());
    this.aircraftBillboards = this.scene.primitives.add(new Cesium.BillboardCollection());
    this.orbitLines = this.scene.primitives.add(new Cesium.PolylineCollection());
    this.trailLines = this.scene.primitives.add(new Cesium.PolylineCollection());
    this.launchMarkers = this.scene.primitives.add(new Cesium.BillboardCollection());
  }

  private setupFollow(): void {
    const self = this;
    this.followEntity = this.viewer.entities.add({
      position: new Cesium.CallbackPositionProperty(() => self.followPos, false),
    });
  }

  private setupInteraction(): void {
    this.handler = new Cesium.ScreenSpaceEventHandler(this.scene.canvas);
    this.handler.setInputAction((e: { position: Cesium.Cartesian2 }) => {
      this.lastInteraction = performance.now();
      const picked = this.scene.pick(e.position) as { id?: TrackObject } | undefined;
      if (picked && picked.id && (picked.id as TrackObject).category) {
        this.select((picked.id as TrackObject).id);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.handler.setInputAction(() => { this.lastInteraction = performance.now(); }, Cesium.ScreenSpaceEventType.WHEEL);
    this.handler.setInputAction(() => { this.lastInteraction = performance.now(); }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
  }

  private introCamera(): void {
    const cam = this.scene.camera;
    cam.setView({ destination: Cesium.Cartesian3.fromDegrees(-30, 12, 7.5e7) });
    cam.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-30, 18, 2.6e7),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
      duration: 3.6,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
      complete: () => setState({ introDone: true }),
    });
  }

  private startLoop(): void {
    const fn = () => this.frame();
    this.scene.preRender.addEventListener(fn);
    this.removePreRender = () => this.scene.preRender.removeEventListener(fn);
  }

  async start(): Promise<void> {
    setState({ loadingLabel: 'Acquiring orbital element sets' });
    const satPromise = fetchSatellites().then(({ sats, status }) => {
      this.buildSatellites(sats);
      setState({ statuses: { ...getState().statuses, satellites: status } });
    });
    setState({ loadingLabel: 'Connecting launch network' });
    const launchPromise = fetchLaunches().then(({ launches, status }) => {
      this.launches = launches;
      this.buildLaunchMarkers();
      setState({ launches, statuses: { ...getState().statuses, launches: status } });
    });
    setState({ loadingLabel: 'Scanning airspace' });
    const airPromise = this.loadAircraft();
    await Promise.all([satPromise, launchPromise, airPromise]);
    this.pushCounters();
    setState({ ready: true });
  }

  private async loadAircraft(): Promise<void> {
    // Populate simulated traffic immediately so the globe is never empty, then
    // upgrade to live ADS-B in the background (the live fetch can be slow).
    this.sim = new SimTraffic(320);
    this.aircraft = this.sim.objects;
    this.aircraftLive = false;
    this.buildAircraft();
    this.lastAircraftRefresh = performance.now();
    setState({ statuses: { ...getState().statuses, aircraft: { source: 'ADS-B · adsb.lol', state: 'simulated' as const, message: 'Simulated traffic · acquiring live ADS-B…', count: this.aircraft.length, updated: Date.now() } } });
    void this.refreshLiveAircraft();
  }

  /** Fetch live ADS-B and apply it when available. A failed refresh never
   *  downgrades an already-live feed to simulation — it keeps dead-reckoning the
   *  last real positions until the next successful poll. */
  private async refreshLiveAircraft(): Promise<void> {
    if (this.aircraftRefreshing) return;
    this.aircraftRefreshing = true;
    try {
      const live = await fetchLiveAircraft();
      if (live && live.length) {
        this.aircraft = live;
        this.aircraftLive = true;
        this.sim = null;
        this.buildAircraft();
        setState({ statuses: { ...getState().statuses, aircraft: { source: 'ADS-B · adsb.lol', state: 'live' as const, message: `${live.length} live transponders`, count: live.length, updated: Date.now() } } });
        this.pushCounters();
      } else if (!this.aircraftLive) {
        setState({ statuses: { ...getState().statuses, aircraft: { source: 'ADS-B · adsb.lol', state: 'simulated' as const, message: 'Live ADS-B unreachable · simulated great-circle traffic', count: this.aircraft.length, updated: Date.now() } } });
      }
    } finally {
      this.aircraftRefreshing = false;
    }
  }

  private buildSatellites(sats: SatRecord[]): void {
    this.satPoints.removeAll();
    this.satEntries = [];
    this.objects.forEach((v, k) => { if (v.category === 'satellite') this.objects.delete(k); });
    const seen = new Set<string>();
    for (const sat of sats) {
      if (seen.has(sat.tle.norad)) continue;
      seen.add(sat.tle.norad);
      const color = SAT_GROUPS[sat.group].color;
      const obj: TrackObject = {
        id: `sat-${sat.tle.norad}`,
        category: 'satellite',
        name: sat.tle.name,
        subtitle: SAT_GROUPS[sat.group].label,
        lat: 0, lon: 0, alt: 0, heading: 0, speed: 0,
        simulated: false, color,
        group: sat.group, norad: sat.tle.norad,
        inclination: sat.inclination, period: sat.period, eccentricity: sat.eccentricity,
      };
      const point = this.satPoints.add({
        position: Cesium.Cartesian3.fromDegrees(0, 0, 400000),
        color: Cesium.Color.fromCssColorString(color),
        pixelSize: 6,
        outlineColor: Cesium.Color.fromCssColorString(color).withAlpha(0.28),
        outlineWidth: 3,
        scaleByDistance: new Cesium.NearFarScalar(2e6, 1.3, 6e7, 0.55),
        id: obj,
      });
      this.satEntries.push({ sat, obj, point });
      this.objects.set(obj.id, obj);
    }
    this.refreshOrbits(true);
  }

  private buildAircraft(): void {
    this.aircraftBillboards.removeAll();
    this.objects.forEach((v, k) => { if (v.category === 'aircraft') this.objects.delete(k); });
    for (const obj of this.aircraft) {
      this.aircraftBillboards.add({
        position: Cesium.Cartesian3.fromDegrees(obj.lon, obj.lat, obj.alt),
        image: this.planeIcon,
        rotation: Cesium.Math.toRadians(obj.heading),
        scale: 0.34,
        color: Cesium.Color.fromCssColorString(obj.color),
        scaleByDistance: new Cesium.NearFarScalar(1.5e6, 0.6, 5e7, 0.16),
        id: obj,
      });
      this.objects.set(obj.id, obj);
    }
  }

  private buildLaunchMarkers(): void {
    this.launchMarkers.removeAll();
    this.objects.forEach((v, k) => { if (v.category === 'launch') this.objects.delete(k); });
    for (const l of this.launches) {
      if (!isFinite(l.lat) || !isFinite(l.lon) || (l.lat === 0 && l.lon === 0)) continue;
      const obj: TrackObject = {
        id: `launch-${l.id}`, category: 'launch', name: l.name, subtitle: l.provider,
        lat: l.lat, lon: l.lon, alt: 0, heading: 0, speed: 0,
        simulated: l.simulated, color: '#ffb347', launchId: l.id,
      };
      this.launchMarkers.add({
        position: Cesium.Cartesian3.fromDegrees(l.lon, l.lat, 2000),
        image: this.launchIcon, scale: 0.5,
        color: Cesium.Color.fromCssColorString('#ffb347'),
        scaleByDistance: new Cesium.NearFarScalar(2e6, 0.7, 6e7, 0.3),
        id: obj,
      });
      this.objects.set(obj.id, obj);
    }
  }

  private frame(): void {
    if (this.disposed) return;
    const now = performance.now();
    const simDate = Cesium.JulianDate.toDate(this.viewer.clock.currentTime);
    const simMs = simDate.getTime();
    const dtSim = this.lastSimMs ? Math.min(5, (simMs - this.lastSimMs) / 1000) : 0;
    this.lastSimMs = simMs;

    this.updateSatellites(simDate);
    this.updateAircraft(dtSim);
    this.updateClouds(simMs);
    this.updateSelectedVisuals(simDate, now);
    this.updateFollow();
    this.idleDrift(now);

    if (now - this.lastCounterPush > 1200) {
      this.lastCounterPush = now;
      this.pushCounters();
    }
    if (now - this.lastOrbitRefresh > 30000) this.refreshOrbits(false);
    if (now - this.lastAircraftRefresh > 30000) {
      this.lastAircraftRefresh = now;
      void this.refreshLiveAircraft();
    }
  }

  private updateSatellites(date: Date): void {
    const filter = getState().satFilter;
    const show = getState().layers.satellites;
    for (const e of this.satEntries) {
      const fix = propagateSat(e.sat, date);
      const visible = show && filter[e.sat.group];
      e.point.show = visible && !!fix;
      if (!fix) continue;
      e.obj.lat = fix.lat; e.obj.lon = fix.lon; e.obj.alt = fix.alt; e.obj.speed = fix.speed;
      Cesium.Cartesian3.fromElements(fix.ecf[0], fix.ecf[1], fix.ecf[2], this.scratch);
      e.point.position = this.scratch;
    }
  }

  private updateAircraft(dt: number): void {
    if (this.sim) this.sim.step(dt);
    else if (this.aircraftLive && dt > 0) {
      for (const a of this.aircraft) {
        if (a.onGround) continue;
        const dist = a.speed * dt;
        const br = Cesium.Math.toRadians(a.heading);
        const dLat = (dist * Math.cos(br)) / EARTH_R;
        const dLon = (dist * Math.sin(br)) / (EARTH_R * Math.cos(Cesium.Math.toRadians(a.lat)));
        a.lat = Cesium.Math.clamp(a.lat + Cesium.Math.toDegrees(dLat), -89, 89);
        a.lon += Cesium.Math.toDegrees(dLon);
      }
    }
    const show = getState().layers.aircraft;
    const bbs = this.aircraftBillboards;
    for (let i = 0; i < this.aircraft.length; i++) {
      const a = this.aircraft[i];
      const bb = bbs.get(i);
      bb.show = show;
      if (!show) continue;
      Cesium.Cartesian3.fromDegrees(a.lon, a.lat, a.alt, undefined, this.scratch);
      bb.position = this.scratch;
      bb.rotation = Cesium.Math.toRadians(a.heading);
    }
  }

  private updateClouds(ms: number): void {
    if (!this.cloudEntity) return;
    const show = getState().layers.clouds;
    this.cloudEntity.show = show;
    if (!show) return;
    const angle = (ms / 1000) * 0.004;
    this.cloudEntity.orientation = new Cesium.ConstantProperty(
      Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_Z, angle),
    );
  }

  private updateSelectedVisuals(date: Date, now: number): void {
    const layers = getState().layers;
    const sel = this.selectedId ? this.objects.get(this.selectedId) : null;
    // trail
    if (sel && layers.trails && (sel.category === 'aircraft' || sel.category === 'satellite')) {
      const pos = Cesium.Cartesian3.fromDegrees(sel.lon, sel.lat, sel.alt);
      if (!this.trailPts.length || Cesium.Cartesian3.distance(this.trailPts[this.trailPts.length - 1], pos) > 1) {
        this.trailPts.push(pos);
        if (this.trailPts.length > 160) this.trailPts.shift();
      }
      if (!this.trailLine) {
        this.trailLine = this.trailLines.add({
          positions: this.trailPts, width: 2.5,
          material: Cesium.Material.fromType('PolylineGlow', {
            color: Cesium.Color.fromCssColorString(sel.color).withAlpha(0.7), glowPower: 0.25,
          }),
        });
      } else {
        this.trailLine.positions = this.trailPts;
        this.trailLine.show = true;
      }
    } else if (this.trailLine) {
      this.trailLine.show = false;
    }
    // selected orbit
    if (sel && sel.category === 'satellite' && layers.orbits) {
      const entry = this.satEntries.find((e) => e.obj.id === sel.id);
      if (entry && (!this.selectedOrbit || now - this.lastOrbitRefresh > 4000)) {
        const pts = computeOrbitPath(entry.sat, date, 120).map((p) => Cesium.Cartesian3.fromElements(p[0], p[1], p[2]));
        if (!this.selectedOrbit) {
          this.selectedOrbit = this.orbitLines.add({
            positions: pts, width: 2,
            material: Cesium.Material.fromType('PolylineGlow', {
              color: Cesium.Color.fromCssColorString(sel.color).withAlpha(0.8), glowPower: 0.3,
            }),
          });
        } else {
          this.selectedOrbit.positions = pts;
        }
        this.selectedOrbit.show = true;
      }
    } else if (this.selectedOrbit) {
      this.selectedOrbit.show = false;
    }
  }

  private refreshOrbits(force: boolean): void {
    this.lastOrbitRefresh = performance.now();
    if (!getState().layers.orbits) {
      this.orbitSet.forEach((p) => { p.show = false; });
      return;
    }
    const date = Cesium.JulianDate.toDate(this.viewer.clock.currentTime);
    this.orbitSet.forEach((p) => this.orbitLines.remove(p));
    this.orbitSet = [];
    const filter = getState().satFilter;
    let starlinkCount = 0;
    for (const e of this.satEntries) {
      if (!filter[e.sat.group]) continue;
      let draw = false;
      if (e.sat.group === 'stations' || e.sat.group === 'gps') draw = true;
      else if (e.sat.group === 'starlink') { draw = starlinkCount % 18 === 0; starlinkCount++; }
      else if (e.sat.group === 'visual') draw = starlinkCount % 12 === 0;
      if (!draw) continue;
      const pts = computeOrbitPath(e.sat, date, 72).map((p) => Cesium.Cartesian3.fromElements(p[0], p[1], p[2]));
      if (pts.length < 8) continue;
      const line = this.orbitLines.add({
        positions: pts, width: 1.2,
        material: Cesium.Material.fromType('PolylineGlow', {
          color: Cesium.Color.fromCssColorString(e.obj.color).withAlpha(0.28), glowPower: 0.18,
        }),
      });
      this.orbitSet.push(line);
      if (this.orbitSet.length > 70) break;
    }
  }

  private updateFollow(): void {
    const sel = this.selectedId ? this.objects.get(this.selectedId) : null;
    if (sel) Cesium.Cartesian3.fromDegrees(sel.lon, sel.lat, sel.alt, undefined, this.followPos);
    if (this.following && sel) {
      if (this.viewer.trackedEntity !== this.followEntity) this.viewer.trackedEntity = this.followEntity ?? undefined;
    } else if (this.viewer.trackedEntity) {
      this.viewer.trackedEntity = undefined;
    }
  }

  private idleDrift(now: number): void {
    if (this.following || !getState().introDone) return;
    if (now - this.lastInteraction < 6000) return;
    this.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, 0.00012);
  }

  private pushCounters(): void {
    const filter = getState().satFilter;
    const satCount = this.satEntries.filter((e) => filter[e.sat.group]).length;
    setState({
      counters: {
        aircraft: this.aircraft.length,
        satellites: satCount,
        launches: this.launches.length,
        aircraftLive: this.aircraftLive,
      },
    });
  }

  // ---- public API ----
  getObject(id: string): TrackObject | undefined { return this.objects.get(id); }
  getAllObjects(): TrackObject[] { return Array.from(this.objects.values()); }
  getLaunches(): LaunchInfo[] { return this.launches; }

  select(id: string | null): void {
    this.selectedId = id;
    this.trailPts = [];
    if (this.trailLine) { this.trailLines.remove(this.trailLine); this.trailLine = null; }
    if (this.selectedOrbit) { this.orbitLines.remove(this.selectedOrbit); this.selectedOrbit = null; }
    this.lastOrbitRefresh = 0;
    const obj = id ? this.objects.get(id) : null;
    if (obj) {
      setState({ selection: { object: obj, following: this.following } });
      if (!this.following) this.flyToObject(obj);
    } else {
      this.following = false;
      setState({ selection: null });
    }
  }

  setFollowing(follow: boolean): void {
    this.following = follow;
    const sel = this.selectedId ? this.objects.get(this.selectedId) : null;
    if (sel) setState({ selection: { object: sel, following: follow } });
    if (follow && sel) this.flyToObject(sel, 1.6, true);
    if (!follow) this.viewer.trackedEntity = undefined;
  }

  flyToObject(obj: TrackObject, duration = 2.0, close = false): void {
    setState({ activePreset: '' });
    // Default: frame the whole Earth as a centered sphere with the object on the
    // near side. Nadir pitch puts the object and Earth's center on the camera's
    // vertical axis, so the globe lands dead-center (not pushed to the bottom).
    // Stay above high-orbit satellites so they remain in frame. `close` is the
    // tight approach used when engaging the follow/chase camera.
    const height = close
      ? (obj.category === 'satellite' ? Math.max(obj.alt * 3, 3e6) : 2.5e6)
      : (obj.category === 'satellite' ? Math.max(obj.alt * 1.6, 2.2e7) : 2.2e7);
    this.scene.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(obj.lon, obj.lat, height),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
      duration,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }

  flyToPreset(p: CameraPreset): void {
    this.following = false;
    this.viewer.trackedEntity = undefined;
    const sel = getState().selection;
    if (sel) setState({ selection: { ...sel, following: false } });
    setState({ activePreset: p.id });
    this.scene.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height),
      orientation: { heading: Cesium.Math.toRadians(p.heading ?? 0), pitch: Cesium.Math.toRadians(p.pitch ?? -90), roll: 0 },
      duration: 2.2,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }

  zoom(factor: number): void {
    const cam = this.scene.camera;
    const carto = Cesium.Cartographic.fromCartesian(cam.position);
    if (!carto) return;
    const newH = Cesium.Math.clamp(carto.height * factor, 15000, 1.4e8);
    cam.flyTo({
      destination: Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, newH),
      duration: 0.6,
    });
  }

  setTimeScale(t: number): void {
    this.viewer.clock.multiplier = t;
    setState({ timeScale: t });
  }

  applyLayers(layers: LayerVisibility): void {
    if (this.nightLayer) this.nightLayer.show = layers.nightLights;
    if (this.cloudEntity) this.cloudEntity.show = layers.clouds;
    if (this.scene.skyAtmosphere) this.scene.skyAtmosphere.show = layers.atmosphere;
    this.scene.globe.showGroundAtmosphere = layers.atmosphere;
    this.launchMarkers.show = layers.launches;
    if (!layers.orbits) this.orbitSet.forEach((p) => { p.show = false; });
    else this.refreshOrbits(true);
    if (!layers.trails && this.trailLine) this.trailLine.show = false;
  }

  applySatFilter(_filter: SatFilter): void {
    this.pushCounters();
    this.refreshOrbits(true);
  }

  async retry(source: 'satellites' | 'aircraft' | 'launches'): Promise<void> {
    if (source === 'satellites') {
      setState({ statuses: { ...getState().statuses, satellites: { ...getState().statuses.satellites, state: 'loading', message: 'Reconnecting…' } } });
      const { sats, status } = await fetchSatellites();
      if (sats.length) this.buildSatellites(sats);
      setState({ statuses: { ...getState().statuses, satellites: status } });
    } else if (source === 'launches') {
      setState({ statuses: { ...getState().statuses, launches: { ...getState().statuses.launches, state: 'loading', message: 'Reconnecting…' } } });
      const { launches, status } = await fetchLaunches();
      if (launches.length) { this.launches = launches; this.buildLaunchMarkers(); setState({ launches }); }
      setState({ statuses: { ...getState().statuses, launches: status } });
    } else {
      setState({ statuses: { ...getState().statuses, aircraft: { ...getState().statuses.aircraft, state: 'loading', message: 'Reconnecting…' } } });
      await this.loadAircraft();
    }
    this.pushCounters();
  }

  dispose(): void {
    this.disposed = true;
    if (this.removePreRender) this.removePreRender();
    if (this.handler) this.handler.destroy();
    if (!this.viewer.isDestroyed()) this.viewer.destroy();
  }
}