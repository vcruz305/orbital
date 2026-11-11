import React from 'react';
import { Icon, type IconName } from './Icons';
import { setSelection, useApp, useNow } from '../state/store';
import { countdown, fmtAlt, fmtCoord, fmtCountdown, fmtHeading, fmtSpeed, fmtSpeedKms } from '../lib/format';
import type { OrbitalEngine } from '../lib/engine';

const CAT_ICON: Record<string, IconName> = { aircraft: 'plane', satellite: 'sat', launch: 'rocket' };

function Row({ k, v, accent }: { k: string; v: string; accent?: string }) {
  return <div className="kv"><span className="k">{k}</span><span className="v" style={accent ? { color: accent } : undefined}>{v}</span></div>;
}

export function InfoPanel({ engine }: { engine: OrbitalEngine | null }) {
  const app = useApp();
  const now = useNow(500);
  const sel = app.selection;
  if (!sel || !engine) return null;
  const o = sel.object;
  const color = o.color;

  const launch = o.category === 'launch' ? engine.getLaunches().find((l) => l.id === o.launchId) : null;
  const cd = launch ? countdown(launch.net, now) : null;

  const close = () => { engine.select(null); setSelection(null); };

  return (
    <aside className="absolute right-3 top-[70px] z-20 w-[300px] max-w-[calc(100vw-24px)] glass hud rounded-xl slide-left overflow-hidden">
      {/* header */}
      <div className="px-4 pt-3.5 pb-3 border-b border-[rgba(56,225,255,0.12)]" style={{ background: `linear-gradient(135deg, ${color}14, transparent)` }}>
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5" style={{ color }}><Icon name={CAT_ICON[o.category]} size={20} /></span>
          <div className="flex-1 min-w-0">
            <div className="mono text-[16px] text-ink leading-tight truncate glow-text" style={{ textShadow: `0 0 14px ${color}66` }}>{o.name}</div>
            <div className="label mt-1" style={{ fontSize: 8.5 }}>{o.subtitle}</div>
          </div>
          <button className="btn btn-icon" style={{ width: 28, height: 28 }} onClick={close} title="Close"><Icon name="close" size={14} /></button>
        </div>
        <div className="flex items-center gap-2 mt-2.5">
          {o.simulated ? (
            <span className="chip text-glow-amber border-[rgba(255,179,71,0.45)]"><Icon name="info" size={10} /> Simulated</span>
          ) : (
            <span className="chip text-glow-green border-[rgba(94,234,212,0.45)]"><span className="dot dot-live" style={{ width: 5, height: 5 }} /> Live</span>
          )}
          <span className="chip text-ink-dim border-[rgba(95,119,153,0.4)]">{o.category}</span>
        </div>
      </div>

      <div className="px-4 py-3 max-h-[46vh] overflow-y-auto scroll-slim">
        {launch && cd ? (
          <>
            <div className="text-center py-2">
              <div className="label mb-1" style={{ fontSize: 8 }}>Launch Countdown</div>
              <div className={`mono text-[26px] ${cd.past ? 'text-glow-green' : 'text-glow-amber glow-amber'}`}>{fmtCountdown(cd)}</div>
              <div className="label mt-1" style={{ fontSize: 8 }}>{launch.status}</div>
            </div>
            <Row k="Provider" v={launch.provider} />
            <Row k="Vehicle" v={launch.vehicle} />
            <Row k="Mission" v={launch.mission} />
            <Row k="Type" v={launch.missionType} />
            <Row k="Target Orbit" v={launch.orbit} />
            <Row k="Pad" v={launch.pad} />
            <Row k="Site" v={launch.location} />
            {launch.probability != null && launch.probability >= 0 && <Row k="Weather Prob." v={`${launch.probability}%`} />}
            {launch.description && <p className="text-[11px] text-ink-dim leading-relaxed mt-2.5">{launch.description}</p>}
            <p className="text-[9px] text-ink-faint mt-2.5 leading-snug">Trajectory shown only when live telemetry is available. Predictions are labeled.</p>
          </>
        ) : (
          <>
            <Row k="Position" v={fmtCoord(o.lat, o.lon)} accent={color} />
            <Row k="Altitude" v={fmtAlt(o.alt)} />
            {o.category === 'satellite' ? (
              <>
                <Row k="Velocity" v={fmtSpeedKms(o.speed)} accent={color} />
                <Row k="NORAD ID" v={o.norad || '—'} />
                <Row k="Inclination" v={`${(o.inclination ?? 0).toFixed(2)}°`} />
                <Row k="Period" v={`${(o.period ?? 0).toFixed(1)} min`} />
                <Row k="Eccentricity" v={(o.eccentricity ?? 0).toFixed(5)} />
              </>
            ) : (
              <>
                <Row k="Ground Speed" v={fmtSpeed(o.speed)} accent={color} />
                <Row k="Heading" v={fmtHeading(o.heading)} />
                {o.callsign && <Row k="Callsign" v={o.callsign} />}
                {o.origin && o.destination && <Row k="Route" v={`${o.origin} → ${o.destination}`} />}
                {o.squawk && <Row k="Squawk" v={o.squawk} />}
                {o.country && <Row k="Origin" v={o.country} />}
                {o.onGround && <Row k="Status" v="On ground" />}
              </>
            )}
          </>
        )}
      </div>

      {/* actions */}
      {o.category !== 'launch' && (
        <div className="px-4 py-3 border-t border-[rgba(56,225,255,0.12)] flex gap-2">
          <button className={`btn flex-1 ${sel.following ? 'active' : ''}`} onClick={() => engine.setFollowing(!sel.following)}>
            <Icon name="follow" size={14} /> {sel.following ? 'Following' : 'Follow'}
          </button>
          <button className="btn flex-1" onClick={() => engine.flyToObject(o)}>
            <Icon name="crosshair" size={14} /> Center
          </button>
        </div>
      )}
      {o.category === 'launch' && (
        <div className="px-4 py-3 border-t border-[rgba(56,225,255,0.12)]">
          <button className="btn btn-amber w-full" onClick={() => engine.flyToObject(o)}>
            <Icon name="crosshair" size={14} /> View Launch Site
          </button>
        </div>
      )}
    </aside>
  );
}