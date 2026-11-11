import React from 'react';

export type IconName =
  | 'plane' | 'sat' | 'rocket' | 'search' | 'layers' | 'target' | 'zoomIn' | 'zoomOut'
  | 'close' | 'chevronLeft' | 'chevronRight' | 'chevronDown' | 'globe' | 'follow'
  | 'clock' | 'orbit' | 'cloud' | 'moon' | 'sparkle' | 'refresh' | 'menu' | 'camera'
  | 'trail' | 'filter' | 'play' | 'pause' | 'info' | 'crosshair' | 'signal' | 'gauge';

export function Icon({ name, size = 16, className = '', strokeWidth = 1.8 }: {
  name: IconName; size?: number; className?: string; strokeWidth?: number;
}) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className };
  switch (name) {
    case 'plane':
      return <svg {...p}><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>;
    case 'sat':
      return <svg {...p}><rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)"/><path d="M4 4l3.5 3.5M20 4l-3.5 3.5M4 20l3.5-3.5M20 20l-3.5-3.5"/><path d="M2.5 2.5l4 1-3 3zM21.5 2.5l-4 1 3 3zM2.5 21.5l4-1-3-3zM21.5 21.5l-4-1 3-3z"/></svg>;
    case 'rocket':
      return <svg {...p}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>;
    case 'search':
      return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>;
    case 'layers':
      return <svg {...p}><path d="m12 2 10 6-10 6L2 8z"/><path d="m2 14 10 6 10-6"/></svg>;
    case 'target':
      return <svg {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>;
    case 'crosshair':
      return <svg {...p}><circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>;
    case 'zoomIn':
      return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/></svg>;
    case 'zoomOut':
      return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6"/></svg>;
    case 'close':
      return <svg {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case 'chevronLeft':
      return <svg {...p}><path d="m15 18-6-6 6-6"/></svg>;
    case 'chevronRight':
      return <svg {...p}><path d="m9 18 6-6-6-6"/></svg>;
    case 'chevronDown':
      return <svg {...p}><path d="m6 9 6 6 6-6"/></svg>;
    case 'globe':
      return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/></svg>;
    case 'follow':
      return <svg {...p}><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>;
    case 'clock':
      return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'orbit':
      return <svg {...p}><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-25 12 12)"/><circle cx="20" cy="7" r="1.6" fill="currentColor"/></svg>;
    case 'cloud':
      return <svg {...p}><path d="M17.5 19a4.5 4.5 0 1 0-.42-8.98 6 6 0 1 0-11 3.18A3.5 3.5 0 0 0 7 19z"/></svg>;
    case 'moon':
      return <svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>;
    case 'sparkle':
      return <svg {...p}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>;
    case 'refresh':
      return <svg {...p}><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/></svg>;
    case 'menu':
      return <svg {...p}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case 'camera':
      return <svg {...p}><path d="M23 7l-7 5 7 5z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;
    case 'trail':
      return <svg {...p}><path d="M3 17c4-8 8 8 12 0 2-4 4-6 6-6"/><circle cx="3" cy="17" r="1.6" fill="currentColor"/></svg>;
    case 'filter':
      return <svg {...p}><path d="M22 3H2l8 9.46V19l4 2v-8.54z"/></svg>;
    case 'play':
      return <svg {...p}><path d="M6 4l14 8-14 8z" fill="currentColor"/></svg>;
    case 'pause':
      return <svg {...p}><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></svg>;
    case 'info':
      return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>;
    case 'signal':
      return <svg {...p}><path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 20V4"/></svg>;
    case 'gauge':
      return <svg {...p}><path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0z"/></svg>;
    default:
      return <svg {...p}><circle cx="12" cy="12" r="9"/></svg>;
  }
}