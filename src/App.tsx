import React, { useEffect, useRef, useState } from 'react';
import { OrbitalEngine, CAMERA_PRESETS } from './lib/engine';
import { setState, useApp } from './state/store';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { InfoPanel } from './components/InfoPanel';
import { LaunchTimeline } from './components/LaunchTimeline';
import { CameraPresets, ZoomControls, FollowBanner } from './components/CameraControls';
import { Icon } from './components/Icons';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<OrbitalEngine | null>(null);
  const app = useApp();

  useEffect(() => {
    if (!containerRef.current) return;
    let eng: OrbitalEngine | null = null;
    try {
      eng = new OrbitalEngine(containerRef.current);
      (window as any).__orbital = eng;
      setEngine(eng);
      eng.start().catch((e) => setState({ error: String(e?.message || e) }));
    } catch (e) {
      setState({ error: 'WebGL is unavailable in this browser. ORBITAL requires hardware-accelerated graphics.' });
    }
    return () => { eng?.dispose(); };
  }, []);

  // Remove the static boot splash once the render core is live.
  useEffect(() => {
    if (app.ready) {
      const boot = document.getElementById('boot');
      if (boot) {
        boot.style.opacity = '0';
        setTimeout(() => boot.remove(), 850);
      }
    }
  }, [app.ready]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!engine) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') engine.select(null);
      else if (e.key === 'f' || e.key === 'F') engine.setFollowing(!app.selection?.following);
      else if (e.key === '+' || e.key === '=') engine.zoom(0.55);
      else if (e.key === '-' || e.key === '_') engine.zoom(1.8);
      else if (e.key >= '1' && e.key <= '5') engine.flyToPreset(CAMERA_PRESETS[Number(e.key) - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine, app.selection]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-space-950">
      {/* Cesium render target */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Ambient overlays */}
      <div className="vignette z-10" />
      <div className="grid-overlay z-10" />
      <div className="scanline z-10" />

      {/* UI */}
      <TopBar engine={engine} />
      <CameraPresets engine={engine} />
      <FollowBanner />
      <Sidebar engine={engine} />
      <InfoPanel engine={engine} />
      <ZoomControls engine={engine} />
      <LaunchTimeline engine={engine} />

      {/* Loading overlay */}
      {!app.ready && !app.error && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(4,7,15,0.55)] backdrop-blur-[2px]">
          <div className="relative glass hud rounded-2xl px-8 py-7 text-center slide-up max-w-[320px]">
            <div className="mx-auto w-12 h-12 rounded-full border-2 border-[rgba(56,225,255,0.15)] border-t-glow-cyan animate-spin mb-5" />
            <div className="display font-semibold tracking-[0.3em] text-ink text-[15px] glow-text">ORBITAL</div>
            <div className="label mt-3" style={{ fontSize: 9 }}>{app.loadingLabel}…</div>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {app.error && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-space-950">
          <div className="relative glass hud rounded-2xl px-8 py-7 text-center max-w-[380px]">
            <div className="text-glow-red mb-3 flex justify-center"><Icon name="info" size={30} /></div>
            <div className="display font-semibold text-ink text-[15px] mb-2">Render core offline</div>
            <p className="text-[12px] text-ink-dim leading-relaxed">{app.error}</p>
          </div>
        </div>
      )}
    </div>
  );
}