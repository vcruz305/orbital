import React, { useMemo, useRef, useState } from 'react';
import { Icon } from './Icons';
import { useApp, setSearch, useNow, setState } from '../state/store';
import { fmtClockUTC, fmtDateUTC } from '../lib/format';
import type { OrbitalEngine } from '../lib/engine';
import type { TrackObject } from '../types';

const CAT_ICON = { aircraft: 'plane', satellite: 'sat', launch: 'rocket' } as const;
const CAT_COLOR = { aircraft: '#ffd23e', satellite: '#38e1ff', launch: '#ffb347' } as const;

function StatusDot({ state }: { state: string }) {
  const cls = state === 'live' ? 'dot-live' : state === 'simulated' ? 'dot-sim' : state === 'error' ? 'dot-err' : 'dot-load';
  return <span className={`dot ${cls}`} />;
}

export function TopBar({ engine }: { engine: OrbitalEngine | null }) {
  const app = useApp();
  const now = useNow(1000);
  const [focused, setFocused] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = useMemo<TrackObject[]>(() => {
    const q = app.search.trim().toLowerCase();
    if (!engine || q.length < 1) return [];
    return engine.getAllObjects()
      .filter((o) => o.name.toLowerCase().includes(q) || (o.callsign || '').toLowerCase().includes(q) || (o.norad || '').includes(q) || o.subtitle.toLowerCase().includes(q))
      .slice(0, 9);
  }, [app.search, engine]);

  const pick = (o: TrackObject) => {
    engine?.select(o.id);
    setSearch('');
    setFocused(false);
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-3 sm:px-4 h-[58px] glass border-b border-[rgba(56,225,255,0.14)]" style={{ borderRadius: 0 }}>
      <button className="btn btn-icon" title="Toggle control sidebar" onClick={() => setState({ leftOpen: !app.leftOpen })}>
        <Icon name="menu" size={17} />
      </button>

      <div className="flex items-center gap-2.5 select-none">
        <div className="relative w-8 h-8 flex-none">
          <div className="absolute inset-0 rounded-full border border-[rgba(56,225,255,0.5)]" />
          <div className="absolute inset-[3px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#1b3a63,#0a1428)]" />
          <div className="absolute inset-[-3px] rounded-full border border-[rgba(56,225,255,0.35)]" style={{ transform: 'rotate(-24deg) scaleY(0.42)' }} />
          <div className="absolute top-[-1px] right-[1px] w-1.5 h-1.5 rounded-full bg-glow-amber shadow-[0_0_8px_#ffb347]" />
        </div>
        <div className="leading-none">
          <div className="display font-bold text-[17px] tracking-[0.32em] text-ink glow-text">ORBITAL</div>
          <div className="label mt-[3px] hide-mobile" style={{ fontSize: 8 }}>Earth Intelligence Platform</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-[440px] ml-1" ref={boxRef}>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none"><Icon name="search" size={15} /></span>
        <input
          className="search-input"
          placeholder="Search aircraft, satellites, launches…"
          value={app.search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 160)}
        />
        {focused && results.length > 0 && (
          <div className="absolute top-[42px] left-0 right-0 glass hud rounded-lg overflow-hidden z-40 slide-up">
            {results.map((o) => (
              <button key={o.id} onMouseDown={() => pick(o)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[rgba(56,225,255,0.08)] transition-colors border-b border-[rgba(56,225,255,0.06)] last:border-0">
                <span style={{ color: CAT_COLOR[o.category] }}><Icon name={CAT_ICON[o.category]} size={15} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] text-ink truncate mono">{o.name}</span>
                  <span className="block text-[10px] text-ink-faint truncate">{o.subtitle}</span>
                </span>
                {o.simulated && <span className="chip text-glow-amber border-[rgba(255,179,71,0.4)]">SIM</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Time scale */}
      <div className="hidden md:flex items-center gap-1 glass-soft rounded-lg px-1.5 py-1">
        <span className="label px-1" style={{ fontSize: 8 }}>Time</span>
        {[1, 10, 60, 300].map((t) => (
          <button key={t} onClick={() => engine?.setTimeScale(t)} className={`btn ${app.timeScale === t ? 'active' : ''}`} style={{ padding: '3px 7px', fontSize: 10 }}>{t}×</button>
        ))}
      </div>

      {/* Status */}
      <div className="hidden lg:flex items-center gap-3 glass-soft rounded-lg px-3 py-1.5">
        {(['satellites', 'aircraft', 'launches'] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5" title={`${app.statuses[k].source}: ${app.statuses[k].message}`}>
            <StatusDot state={app.statuses[k].state} />
            <span className="label" style={{ fontSize: 8 }}>{k === 'satellites' ? 'SAT' : k === 'aircraft' ? 'AIR' : 'LNC'}</span>
          </span>
        ))}
      </div>

      {/* Clock */}
      <div className="text-right leading-none select-none">
        <div className="mono text-[16px] text-glow-cyan glow-text tracking-wider">{fmtClockUTC(now)}<span className="text-[9px] text-ink-faint ml-1 hide-mobile">UTC</span></div>
        <div className="label mt-[3px] hide-mobile" style={{ fontSize: 8 }}>{fmtDateUTC(now)}</div>
      </div>
    </header>
  );
}