import React from 'react';
import { Icon } from './Icons';
import { setState, useApp, useNow } from '../state/store';
import { countdown, fmtCountdown, fmtLaunchDate } from '../lib/format';
import type { OrbitalEngine } from '../lib/engine';
import type { LaunchInfo } from '../types';

function statusColor(abbrev: string): string {
  const a = abbrev.toLowerCase();
  if (a.includes('go') || a === 'success') return '#5eead4';
  if (a.includes('tbd') || a.includes('hold')) return '#ffb347';
  if (a.includes('fail')) return '#ff6b6b';
  return '#4d8dff';
}

function LaunchCard({ l, now, onPick, next }: { l: LaunchInfo; now: number; onPick: () => void; next: boolean }) {
  const cd = countdown(l.net, now);
  const sc = statusColor(l.statusAbbrev);
  return (
    <button onClick={onPick} className={`flex-none w-[236px] text-left glass-soft rounded-lg px-3 py-2.5 transition-all hover:bg-[rgba(56,225,255,0.07)] hover:border-[rgba(56,225,255,0.4)] ${next ? 'border-[rgba(255,179,71,0.5)]' : 'border-[rgba(56,225,255,0.12)]'}`} style={{ borderWidth: 1, borderStyle: 'solid' }}>
      <div className="flex items-center justify-between gap-2">
        <span className={`mono text-[15px] ${cd.past ? 'text-glow-green' : 'text-glow-amber'}`}>{fmtCountdown(cd)}</span>
        <span className="chip" style={{ color: sc, borderColor: `${sc}55`, fontSize: 8 }}>{l.statusAbbrev}</span>
      </div>
      <div className="text-[12px] text-ink font-medium mt-1.5 truncate">{l.name}</div>
      <div className="text-[10px] text-ink-dim truncate mt-0.5">{l.provider}</div>
      <div className="flex items-center gap-1 mt-1.5 text-[9px] text-ink-faint">
        <Icon name="rocket" size={10} />
        <span className="truncate">{l.vehicle}</span>
      </div>
      <div className="flex items-center justify-between mt-1 text-[9px] text-ink-faint">
        <span className="truncate">{l.location}</span>
        <span className="mono flex-none ml-1">{fmtLaunchDate(l.net)}</span>
      </div>
    </button>
  );
}

export function LaunchTimeline({ engine }: { engine: OrbitalEngine | null }) {
  const app = useApp();
  const now = useNow(1000);
  const launches = app.launches;
  const status = app.statuses.launches;

  const pick = (l: LaunchInfo) => {
    engine?.select(`launch-${l.id}`);
  };

  if (!app.timelineOpen) {
    return (
      <button onClick={() => setState({ timelineOpen: true })} className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 btn glass hud">
        <Icon name="rocket" size={14} /> Launch Manifest · {launches.length} <Icon name="chevronDown" size={13} />
      </button>
    );
  }

  return (
    <section className="absolute bottom-3 left-3 right-3 z-20 glass hud rounded-xl slide-up">
      <div className="flex items-center gap-2 px-4 pt-2.5 pb-1.5">
        <span className="text-glow-amber"><Icon name="rocket" size={15} /></span>
        <span className="display font-semibold text-[12px] tracking-[0.2em] text-ink">LAUNCH MANIFEST</span>
        <span className="chip text-glow-amber border-[rgba(255,179,71,0.4)]">{launches.length} upcoming</span>
        {status.state === 'simulated' && <span className="chip text-glow-amber border-[rgba(255,179,71,0.4)]">Simulated</span>}
        <div className="flex-1" />
        <span className="label hide-mobile" style={{ fontSize: 8 }}>{status.source}</span>
        <button className="btn btn-icon" style={{ width: 26, height: 26 }} onClick={() => setState({ timelineOpen: false })} title="Collapse"><Icon name="chevronDown" size={14} /></button>
      </div>
      <div className="px-3 pb-3">
        {launches.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto scroll-slim pb-1">
            {launches.map((l, i) => (
              <LaunchCard key={l.id} l={l} now={now} next={i === 0} onPick={() => pick(l)} />
            ))}
          </div>
        ) : status.state === 'error' ? (
          <div className="flex items-center gap-3 py-3 px-1 text-[12px] text-ink-dim">
            <span className="dot dot-err" /> Launch feed offline.
            <button className="btn" onClick={() => engine?.retry('launches')}><Icon name="refresh" size={13} /> Retry</button>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-3 px-1 text-[12px] text-ink-dim"><span className="dot dot-load" /> Acquiring launch schedule…</div>
        )}
      </div>
    </section>
  );
}