import React, { useMemo } from 'react';
import { Icon, type IconName } from './Icons';
import { getState, setState, toggleLayer, toggleSatGroup, useApp } from '../state/store';
import { SAT_GROUPS } from '../lib/data';
import { fmtNumber, timeAgo } from '../lib/format';
import { useNow } from '../state/store';
import type { OrbitalEngine } from '../lib/engine';
import type { LayerVisibility, SatGroup } from '../types';

const TRACK_LAYERS: { key: keyof LayerVisibility; label: string; icon: IconName; color: string }[] = [
  { key: 'aircraft', label: 'Air Traffic', icon: 'plane', color: '#ffd23e' },
  { key: 'satellites', label: 'Satellites', icon: 'sat', color: '#38e1ff' },
  { key: 'launches', label: 'Launch Sites', icon: 'rocket', color: '#ffb347' },
];

const DISPLAY_LAYERS: { key: keyof LayerVisibility; label: string; icon: IconName }[] = [
  { key: 'orbits', label: 'Orbital Paths', icon: 'orbit' },
  { key: 'trails', label: 'Motion Trails', icon: 'trail' },
  { key: 'clouds', label: 'Cloud Layer', icon: 'cloud' },
  { key: 'nightLights', label: 'City Lights', icon: 'moon' },
  { key: 'atmosphere', label: 'Atmosphere', icon: 'globe' },
];

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return <button className={`switch ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on} />;
}

function Counter({ value, label, color, icon }: { value: number; label: string; color: string; icon: IconName }) {
  return (
    <div className="glass-soft rounded-lg px-2.5 py-2 flex flex-col items-center gap-1 flex-1">
      <span style={{ color }}><Icon name={icon} size={15} /></span>
      <span className="mono text-[19px] leading-none" style={{ color }}>{fmtNumber(value)}</span>
      <span className="label" style={{ fontSize: 7.5 }}>{label}</span>
    </div>
  );
}

export function Sidebar({ engine }: { engine: OrbitalEngine | null }) {
  const app = useApp();
  const now = useNow(5000);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!engine) return counts;
    for (const o of engine.getAllObjects()) {
      if (o.category === 'satellite' && o.group) counts[o.group] = (counts[o.group] || 0) + 1;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.counters.satellites, engine]);

  const onLayer = (key: keyof LayerVisibility) => {
    toggleLayer(key);
    engine?.applyLayers(getState().layers);
  };
  const onGroup = (g: SatGroup) => {
    toggleSatGroup(g);
    engine?.applySatFilter(getState().satFilter);
  };

  return (
    <aside
      className={`absolute left-3 top-[70px] ${app.timelineOpen ? 'bottom-[210px]' : 'bottom-[60px]'} z-20 w-[280px] glass hud rounded-xl flex flex-col transition-all duration-300 scroll-slim`}
      style={{ transform: app.leftOpen ? 'translateX(0)' : 'translateX(-320px)' }}
    >
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-[rgba(56,225,255,0.1)]">
        <div>
          <div className="display font-semibold text-[13px] tracking-[0.2em] text-ink">MISSION CONTROL</div>
          <div className="label mt-0.5" style={{ fontSize: 8 }}>Tracking &amp; Display Layers</div>
        </div>
        <button className="btn btn-icon" style={{ width: 28, height: 28 }} onClick={() => setState({ leftOpen: false })} title="Collapse">
          <Icon name="chevronLeft" size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-slim px-4 py-3 space-y-4">
        {/* Counters */}
        <div className="flex gap-2">
          <Counter value={app.counters.aircraft} label="Aircraft" color="#ffd23e" icon="plane" />
          <Counter value={app.counters.satellites} label="Satellites" color="#38e1ff" icon="sat" />
          <Counter value={app.counters.launches} label="Launches" color="#ffb347" icon="rocket" />
        </div>

        {/* Tracking layers */}
        <section>
          <div className="label mb-2 flex items-center gap-1.5"><Icon name="layers" size={11} /> Tracking Layers</div>
          <div className="space-y-1.5">
            {TRACK_LAYERS.map((l) => (
              <div key={l.key} className="flex items-center gap-2.5 glass-soft rounded-lg px-2.5 py-2">
                <span style={{ color: l.color }}><Icon name={l.icon} size={15} /></span>
                <span className="flex-1 text-[12px] text-ink-dim">{l.label}</span>
                <Switch on={app.layers[l.key]} onClick={() => onLayer(l.key)} />
              </div>
            ))}
          </div>
        </section>

        {/* Satellite constellations */}
        <section>
          <div className="label mb-2 flex items-center gap-1.5"><Icon name="filter" size={11} /> Constellations</div>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(SAT_GROUPS) as SatGroup[]).map((g) => {
              const cfg = SAT_GROUPS[g];
              const on = app.satFilter[g];
              return (
                <button key={g} onClick={() => onGroup(g)} className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 border transition-all text-left ${on ? 'border-[rgba(56,225,255,0.3)] bg-[rgba(56,225,255,0.07)]' : 'border-[rgba(95,119,153,0.2)] opacity-45'}`}>
                  <span className="dot" style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[10.5px] text-ink truncate">{cfg.label}</span>
                    <span className="block mono text-[9px] text-ink-faint">{groupCounts[g] || 0}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Display layers */}
        <section>
          <div className="label mb-2 flex items-center gap-1.5"><Icon name="sparkle" size={11} /> Display</div>
          <div className="space-y-1.5">
            {DISPLAY_LAYERS.map((l) => (
              <div key={l.key} className="flex items-center gap-2.5 px-1 py-1">
                <span className="text-ink-faint"><Icon name={l.icon} size={14} /></span>
                <span className="flex-1 text-[11.5px] text-ink-dim">{l.label}</span>
                <Switch on={app.layers[l.key]} onClick={() => onLayer(l.key)} />
              </div>
            ))}
          </div>
        </section>

        {/* Data sources */}
        <section>
          <div className="label mb-2 flex items-center gap-1.5"><Icon name="signal" size={11} /> Data Sources</div>
          <div className="space-y-1.5">
            {(['satellites', 'aircraft', 'launches'] as const).map((k) => {
              const s = app.statuses[k];
              const dotCls = s.state === 'live' ? 'dot-live' : s.state === 'simulated' ? 'dot-sim' : s.state === 'error' ? 'dot-err' : 'dot-load';
              const stateLabel = s.state === 'live' ? 'LIVE' : s.state === 'simulated' ? 'SIMULATED' : s.state === 'error' ? 'OFFLINE' : 'SYNCING';
              const stateColor = s.state === 'live' ? '#5eead4' : s.state === 'simulated' ? '#ffb347' : s.state === 'error' ? '#ff6b6b' : '#4d8dff';
              return (
                <div key={k} className="glass-soft rounded-lg px-2.5 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`dot ${dotCls}`} />
                    <span className="flex-1 text-[11.5px] text-ink">{s.source}</span>
                    <span className="chip" style={{ color: stateColor, borderColor: `${stateColor}55`, fontSize: 8 }}>{stateLabel}</span>
                    {(s.state === 'error' || s.state === 'simulated') && (
                      <button className="text-ink-faint hover:text-glow-cyan transition-colors" title="Retry connection" onClick={() => engine?.retry(k)}>
                        <Icon name="refresh" size={13} />
                      </button>
                    )}
                  </div>
                  <div className="text-[9.5px] text-ink-faint mt-1 leading-snug">{s.message}{s.updated ? ` · ${timeAgo(s.updated, now)}` : ''}</div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="px-4 py-2.5 border-t border-[rgba(56,225,255,0.1)] text-[8.5px] text-ink-faint leading-relaxed">
        Imagery: Solar System Scope (CC BY 4.0) · Orbits: CelesTrak SGP4 · Launches: The Space Devs
      </div>
    </aside>
  );
}