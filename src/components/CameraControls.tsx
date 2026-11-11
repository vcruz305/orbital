import React from 'react';
import { Icon } from './Icons';
import { useApp } from '../state/store';
import { CAMERA_PRESETS, type OrbitalEngine } from '../lib/engine';

export function CameraPresets({ engine }: { engine: OrbitalEngine | null }) {
  const app = useApp();
  return (
    <div className="absolute top-[70px] left-1/2 -translate-x-1/2 z-10 hidden md:flex items-center gap-1 glass rounded-full px-1.5 py-1 fade-in">
      <span className="text-ink-faint px-1.5"><Icon name="camera" size={14} /></span>
      {CAMERA_PRESETS.map((p) => (
        <button key={p.id} onClick={() => engine?.flyToPreset(p)} className={`btn ${app.activePreset === p.id ? 'active' : ''}`} style={{ padding: '4px 10px', fontSize: 10, borderRadius: 999 }}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

export function ZoomControls({ engine }: { engine: OrbitalEngine | null }) {
  const app = useApp();
  return (
    <div className={`absolute right-3 ${app.timelineOpen ? 'bottom-[210px]' : 'bottom-[60px]'} z-10 flex flex-col gap-1.5 fade-in transition-all duration-300`}>
      <button className="btn btn-icon glass" title="Zoom in" onClick={() => engine?.zoom(0.55)}><Icon name="zoomIn" size={16} /></button>
      <button className="btn btn-icon glass" title="Zoom out" onClick={() => engine?.zoom(1.8)}><Icon name="zoomOut" size={16} /></button>
      <button className="btn btn-icon glass" title="Reset view" onClick={() => engine?.flyToPreset(CAMERA_PRESETS[0])}><Icon name="globe" size={16} /></button>
    </div>
  );
}

export function FollowBanner() {
  const app = useApp();
  if (!app.selection?.following) return null;
  return (
    <div className="absolute top-[112px] left-1/2 -translate-x-1/2 z-10 chip text-glow-cyan border-[rgba(56,225,255,0.5)] glass px-3 py-1.5 fade-in">
      <span className="dot dot-live" style={{ width: 5, height: 5 }} /> Tracking locked · {app.selection.object.name}
    </div>
  );
}