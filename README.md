# ORBITAL · Earth Intelligence Platform

A cinematic, fully interactive 3D Earth tracking dashboard that fuses **FlightRadar24-style air traffic**, **live satellite tracking**, and **NASA Mission Control launch intelligence** into one futuristic command center.

**Live demo:** https://vcruz305.github.io/orbital/

Built with **React + TypeScript + CesiumJS + Tailwind CSS** and a premium dark, glassmorphic HUD aesthetic — glowing orbital paths, a photorealistic Earth with atmosphere, clouds, day/night lighting and city lights, and smooth cinematic camera work.

---

## Features

- **Photorealistic 3D globe** — NASA Blue Marble imagery, a rotating cloud shell, atmospheric limb glow, real Sun-driven day/night terminator, night-side city lights (Black Marble), a Milky Way starfield, and Sun/Moon rendering. Drag to orbit, scroll to zoom, with damped cinematic camera moves and an idle drift.
- **Live satellite tracking** — real orbital element sets from **CelesTrak** propagated with **satellite.js (SGP4)**. Space Stations (ISS, CSS…), the GPS constellation, Starlink, bright/visual, weather and science satellites. Glowing category-colored markers, orbital ground tracks, altitude/velocity/inclination/period telemetry, and a locked **follow camera**.
- **Air traffic** — attempts the live **OpenSky Network** feed; when the browser is blocked by OpenSky's CORS policy it transparently falls back to a clearly-labeled **simulated** great-circle traffic model flying real airport pairs. Heading-oriented aircraft icons, callsign/route/squawk/altitude/speed telemetry and motion trails.
- **Rocket launch intelligence** — live upcoming launches from **Launch Library 2** (SpaceX, NASA, ULA, Rocket Lab, Arianespace, ISRO, CNSA…). A docked **Launch Manifest** timeline with live T-minus countdowns, GO/TBC status, vehicle, mission, pad and launch site. Clicking a launch flies to its pad. Trajectories are shown only when real telemetry exists — never fabricated.
- **Mission Control dashboard** — collapsible sidebars, live object counters, global search (aircraft / satellites / NORAD ID / launches), per-constellation filters, tracking & display layer toggles, an object information panel, camera presets, time-warp (1×/10×/60×/300×), and data-source health with retry.
- **Honest data labeling** — every source shows LIVE / SIMULATED / OFFLINE status; simulated objects carry a SIM badge. No API keys are required or embedded.

## Controls

| Action | Input |
|---|---|
| Orbit globe | drag |
| Zoom | scroll / `+` / `−` / on-screen buttons |
| Select object | click a marker, or search |
| Follow / unlock | `F` or the Follow button |
| Deselect | `Esc` |
| Camera presets | `1`–`5` or the preset bar |
| Time warp | 1× / 10× / 60× / 300× in the top bar |

## Tech stack

- **React 18 + TypeScript** — UI and state (a lightweight `useSyncExternalStore` store keeps per-frame Cesium updates out of React).
- **CesiumJS 1.147** — the 3D globe, imagery, atmosphere, lighting, primitives and camera. No ion token required; all Earth textures are bundled locally.
- **satellite.js 6** — SGP4/SDP4 orbital propagation from TLEs.
- **Tailwind CSS 3** — the glassmorphic HUD design system, custom scrollbars and glow accents.
- **Vite 5 + vite-plugin-cesium** — build and asset pipeline.

## Data sources

| Layer | Source | Mode |
|---|---|---|
| Satellites | [CelesTrak](https://celestrak.org) TLEs | **Live** (CORS-enabled) |
| Launches | [Launch Library 2](https://thespacedevs.com) | **Live** (CORS-enabled) |
| Aircraft | [OpenSky Network](https://opensky-network.org) | Live attempt → **labeled simulation** fallback (OpenSky restricts CORS to its own origin) |
| Imagery | NASA Blue Marble / Black Marble | Bundled |

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
```

## Build & deploy

```bash
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build locally
npm run deploy     # build + publish dist/ to the gh-pages branch (GitHub Pages)
```

The app uses a relative base path so it works both at a domain root and at a GitHub Pages project path (`/orbital/`).

## Performance

The render loop propagates the full catalog efficiently — ~600 satellites + ~320 aircraft update in roughly **3 ms of CPU per frame**, using point/billboard primitive collections (not per-object entities), a capped resolution scale, and a single `requestAnimationFrame`-driven loop. Orbit paths are drawn for a representative subset plus the selected object, and refresh on a slow cadence. On GPU-accelerated hardware the scene runs smoothly at full quality.

Element sets are **stream-parsed** — the multi-MB Starlink catalog is read only up to the display cap, then the download is aborted — and **cached client-side** for CelesTrak's 2-hour update window, with a stale-cache fallback. CelesTrak refuses repeat downloads of unchanged data (HTTP 403), so this keeps reloads populated without re-hammering the service.

## Project structure

```
src/
  lib/        engine.ts (Cesium scene + render loop), satellite.ts (SGP4),
              data.ts (API fetchers + simulated traffic), format.ts
  state/      store.ts (external store + hooks)
  components/ TopBar, Sidebar, InfoPanel, LaunchTimeline, CameraControls, Icons
  App.tsx     layout + engine lifecycle + keyboard shortcuts
public/textures/  bundled Earth day/night/clouds + starfield cubemap
```

## Attribution

Imagery: NASA Blue Marble / Black Marble (via the three-globe & three.js example assets). Orbital elements: CelesTrak. Launch data: The Space Devs / Launch Library 2. Air traffic: OpenSky Network. Built on CesiumJS.

---

*ORBITAL is a demonstration of live space situational awareness. Simulated or predicted data is always labeled as such.*