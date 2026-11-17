import * as THREE from 'three';
import { BezelOption, DialOption, WatchBrand, WatchSpec } from '@/lib/watches';

// Shared GPU texture cache for immutable procedural maps (cuts rebuild cost & GC pressure)
const staticTextureCache = new Map<string, THREE.Texture>();
let staticTextureRefCount = 0;

export function retainStaticTextures() {
  staticTextureRefCount++;
}

export function releaseStaticTextures() {
  staticTextureRefCount = Math.max(0, staticTextureRefCount - 1);
  if (staticTextureRefCount === 0) {
    staticTextureCache.forEach((tex) => tex.dispose());
    staticTextureCache.clear();
  }
}

function getCachedTexture<T extends THREE.Texture>(key: string, factory: () => T): T {
  const existing = staticTextureCache.get(key);
  if (existing) return existing as T;
  const created = factory();
  staticTextureCache.set(key, created);
  return created;
}

function drawCrownIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  color: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  // Base ellipse
  ctx.beginPath();
  ctx.ellipse(0, 14, 15, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Five crown spikes + pearls
  const tips = [
    { x: -20, y: -12 },
    { x: -10, y: -20 },
    { x: 0, y: -24 },
    { x: 10, y: -20 },
    { x: 20, y: -12 },
  ];
  ctx.beginPath();
  ctx.moveTo(-14, 12);
  tips.forEach((tip, i) => {
    ctx.lineTo(tip.x, tip.y);
    if (i < tips.length - 1) {
      const midX = (tip.x + tips[i + 1].x) * 0.5;
      ctx.lineTo(midX, 1);
    }
  });
  ctx.lineTo(14, 12);
  ctx.closePath();
  ctx.fill();

  tips.forEach((tip) => {
    ctx.beginPath();
    ctx.arc(tip.x, tip.y - 3, 3.1, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

export interface DialDateOverride {
  dayNum: number;
  weekday: string;
  monthIdx: number;
}

export function createDialTexture(
  watch: WatchSpec,
  dial: DialOption,
  maxAnisotropy: number,
  dateOverride?: DialDateOverride
): THREE.CanvasTexture {
  const logicalSize = 1024;
  const scaleFactor = 2;
  const canvas = document.createElement('canvas');
  canvas.width = logicalSize * scaleFactor;
  canvas.height = logicalSize * scaleFactor;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scaleFactor, scaleFactor);
  const cx = logicalSize / 2;
  const cy = logicalSize / 2;
  const radius = logicalSize * 0.48;

  // Base fill
  const radGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, radius);
  radGrad.addColorStop(0, dial.baseHex);
  radGrad.addColorStop(0.72, dial.baseHex);
  radGrad.addColorStop(1, dial.edgeHex);
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, logicalSize, logicalSize);

  // Sunburst anisotropic streaks (Rolex) or matte riveted cockpit plate (AVI-8)
  if (watch.brand === 'AVI-8') {
    // Subtle matte aircraft-panel radial vignette + micro bead-blast grain
    for (let i = 0; i < 4200; i++) {
      const gx = (i * 193) % logicalSize;
      const gy = (i * 317) % logicalSize;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,240,0.03)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(gx, gy, 2, 2);
    }

    // Subtle fuselage panel crosshairs & micro-rivet perimeter
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(18, 22, 16, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.56, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(236, 228, 200, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.56, 0);
    ctx.lineTo(radius * 0.56, 0);
    ctx.moveTo(0, -radius * 0.56);
    ctx.lineTo(0, radius * 0.56);
    ctx.stroke();
    ctx.restore();
  } else if (watch.id === 'ap-royal-oak') {
    // Iconic Petite Tapisserie waffle pyramid relief across entire dial
    const pitch = 24;
    for (let y = 0; y < logicalSize; y += pitch) {
      for (let x = 0; x < logicalSize; x += pitch) {
        const g = ctx.createLinearGradient(x, y, x + pitch - 3, y + pitch - 3);
        g.addColorStop(0, 'rgba(255,255,255,0.16)');
        g.addColorStop(0.48, 'rgba(255,255,255,0.03)');
        g.addColorStop(1, 'rgba(0,0,0,0.42)');
        ctx.fillStyle = g;
        ctx.fillRect(x + 1.5, y + 1.5, pitch - 4, pitch - 4);
        ctx.strokeStyle = 'rgba(0,0,0,0.38)';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(x + 1, y + 1, pitch - 3, pitch - 3);
      }
    }
  } else if (watch.id === 'pp-nautilus') {
    // Horizontal embossed Nautilus groove lines
    for (let y = 0; y < logicalSize; y += 28) {
      const band = ctx.createLinearGradient(0, y, 0, y + 28);
      band.addColorStop(0, 'rgba(0,0,0,0.44)');
      band.addColorStop(0.22, 'rgba(255,255,255,0.13)');
      band.addColorStop(0.55, 'rgba(255,255,255,0.02)');
      band.addColorStop(1, 'rgba(0,0,0,0.34)');
      ctx.fillStyle = band;
      ctx.fillRect(0, y, logicalSize, 28);
    }
  } else if (dial.id === 'meteorite') {
    // Authentic Gibeon Meteorite Widmanstatten interlocking nickel-iron crystal facets
    ctx.save();
    ctx.translate(cx, cy);
    const angles = [0.42, -0.64, 1.48];
    angles.forEach((ang, idx) => {
      ctx.save();
      ctx.rotate(ang);
      for (let x = -logicalSize; x < logicalSize; x += 26) {
        const shade = ((x * 7 + idx * 19) & 15) / 15;
        ctx.fillStyle =
          shade > 0.5
            ? `rgba(255,255,255,${(0.04 + shade * 0.14).toFixed(3)})`
            : `rgba(18,22,28,${(0.08 + shade * 0.18).toFixed(3)})`;
        ctx.fillRect(x, -logicalSize, 14 + (idx % 3) * 4, logicalSize * 2);
      }
      ctx.restore();
    });
    ctx.restore();
  } else if (dial.id === 'aventurine') {
    // Deep cosmic aventurine glass with suspended copper & silver crystal flecks
    for (let i = 0; i < 650; i++) {
      const gx = (i * 229 + (i % 7) * 31) % logicalSize;
      const gy = (i * 383 + (i % 11) * 19) % logicalSize;
      const r = 0.65 + (i % 4) * 0.52;
      ctx.fillStyle =
        i % 5 === 0
          ? 'rgba(255, 224, 175, 0.85)'
          : i % 3 === 0
            ? 'rgba(186, 225, 255, 0.82)'
            : 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (dial.id === 'mother-of-pearl') {
    // Soft iridescent nacreous Mother-of-Pearl sheen ribbons
    ctx.save();
    const mopBands = [
      { ang: 0.35, col: 'rgba(255, 200, 222, 0.16)' },
      { ang: -0.45, col: 'rgba(180, 240, 232, 0.16)' },
      { ang: 0.95, col: 'rgba(220, 205, 255, 0.15)' },
    ];
    mopBands.forEach((b, bIdx) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(b.ang);
      for (let y = -logicalSize * 0.6; y < logicalSize * 0.6; y += 72) {
        const g = ctx.createLinearGradient(0, y, 0, y + 72);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, b.col);
        g.addColorStop(1, bIdx % 2 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.03)');
        ctx.fillStyle = g;
        ctx.fillRect(-logicalSize, y, logicalSize * 2, 72);
      }
      ctx.restore();
    });
    ctx.restore();
  } else if (dial.id === 'snowflake') {
    // Organic Shinshu wind-swept snow paper texture (Zaratsu Snowflake)
    for (let i = 0; i < 4800; i++) {
      const gx = (i * 197 + (i % 13) * 17) % logicalSize;
      const gy = (i * 311 + (i % 9) * 23) % logicalSize;
      const w = 4 + (i % 7);
      ctx.fillStyle =
        i % 2 === 0 ? 'rgba(255,255,255,0.32)' : 'rgba(165, 178, 195, 0.14)';
      ctx.fillRect(gx, gy, w, 2);
    }
  } else if (dial.sunburst) {
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 360; i++) {
      const angle = (i * Math.PI) / 180;
      const alpha = 0.03 + 0.045 * Math.sin(i * 0.37) + 0.025 * Math.cos(i * 0.89);
      ctx.strokeStyle =
        alpha > 0.04
          ? `rgba(255,255,255,${alpha.toFixed(3)})`
          : `rgba(0,0,0,${(alpha * 0.8).toFixed(3)})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      ctx.stroke();
    }
    ctx.restore();
  }

  const ink = dial.lightText ? '#F3F1EC' : '#16181A';
  const mutedInk = dial.lightText ? 'rgba(243,241,236,0.78)' : 'rgba(22,24,26,0.78)';
  const accentInk =
    watch.id === 'submariner'
      ? '#34D399'
      : watch.id === 'daytona' || watch.id === 'yachtmaster'
      ? '#DC2626'
      : watch.id === 'gmt'
      ? '#E04848'
      : watch.id === 'explorer2' || watch.id === 'milgauss'
      ? '#F97316'
      : '#D4AF37';

  // Outer minute / seconds chapter track (Rolex & Speedmaster models)
  if (watch.brand === 'ROLEX' || watch.id === 'omega-speedmaster') {
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const isMajor = i % 5 === 0;
      const rOuter = radius * 0.945;
      const rInner = isMajor ? radius * 0.885 : radius * 0.91;
      ctx.strokeStyle = isMajor ? ink : mutedInk;
      ctx.lineWidth = isMajor ? 3.5 : 1.8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * rInner, Math.sin(a) * rInner);
      ctx.lineTo(Math.cos(a) * rOuter, Math.sin(a) * rOuter);
      ctx.stroke();

      // Milgauss signature orange 5-minute perimeter numerals
      if (watch.id === 'milgauss' && isMajor) {
        const mLabel = i === 0 ? '60' : String(i);
        ctx.save();
        ctx.fillStyle = '#F97316';
        ctx.font = '700 15px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(mLabel, Math.cos(a) * (radius * 0.845), Math.sin(a) * (radius * 0.845));
        ctx.restore();
      }
    }

    // Sky-Dweller Saros 12-Month Aperture Pips (crimson pip at current month index)
    if (watch.hasSkyDwellerDisc) {
      const nowMonth = dateOverride?.monthIdx ?? new Date().getMonth();
      for (let m = 0; m < 12; m++) {
        const a = ((m + 1) / 12) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * (radius * 0.905);
        const py = Math.sin(a) * (radius * 0.905);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = m === nowMonth ? '#DC2626' : 'rgba(255,255,255,0.22)';
        ctx.strokeStyle = '#C9A857';
        ctx.lineWidth = 1.6;
        ctx.fillRect(-10, -8, 20, 16);
        ctx.strokeRect(-10, -8, 20, 16);
        ctx.restore();
      }
    }

    // Sub-ticks for Daytona & Speedmaster 1/5th second chronograph track
    if (watch.id === 'daytona' || watch.id === 'omega-speedmaster') {
      for (let i = 0; i < 300; i++) {
        if (i % 5 === 0) continue;
        const a = (i / 300) * Math.PI * 2 - Math.PI / 2;
        ctx.strokeStyle = mutedInk;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * radius * 0.922, Math.sin(a) * radius * 0.922);
        ctx.lineTo(Math.cos(a) * radius * 0.945, Math.sin(a) * radius * 0.945);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  if (watch.brand === 'AVI-8') {
    const creamInk = dial.lightText ? '#EDE3C2' : '#1A2018';
    const bronzeRim = '#AE8152';
    const softCream = dial.lightText ? 'rgba(237,227,194,0.75)' : 'rgba(26,32,24,0.75)';

    ctx.save();
    ctx.translate(cx, cy);

    // Outer stepped dark khaki telemetry flange
    ctx.strokeStyle = 'rgba(14, 19, 12, 0.55)';
    ctx.lineWidth = 52;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.915, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = bronzeRim;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.855, 0, Math.PI * 2);
    ctx.stroke();

    // 1/5th second outer chronograph graduation + 5-min markers
    for (let i = 0; i < 300; i++) {
      const a = (i / 300) * Math.PI * 2 - Math.PI / 2;
      const isHour = i % 25 === 0;
      const isSec = i % 5 === 0;
      const rOut = radius * 0.962;
      const rIn = isHour ? radius * 0.872 : isSec ? radius * 0.9 : radius * 0.93;
      ctx.strokeStyle = isHour ? '#E0543E' : isSec ? creamInk : softCream;
      ctx.lineWidth = isHour ? 4.2 : isSec ? 2.4 : 1.0;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
      ctx.lineTo(Math.cos(a) * rOut, Math.sin(a) * rOut);
      ctx.stroke();
    }

    // 5-second crisp numerals along perimeter flange
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let s = 5; s <= 60; s += 5) {
      const a = (s / 60) * Math.PI * 2 - Math.PI / 2;
      ctx.fillStyle = s === 60 ? '#E0543E' : softCream;
      ctx.font = '700 17px "JetBrains Mono", monospace';
      ctx.fillText(
        s === 60 ? '60' : String(s).padStart(2, '0'),
        Math.cos(a) * (radius * 0.822),
        Math.sin(a) * (radius * 0.822)
      );
    }

    // Bold layered luminous Arabic hour indices (skip 3, 6, 9 for bi-compax & 6h tunnel date)
    for (let h = 1; h <= 12; h++) {
      if (h === 3 || h === 6 || h === 9) continue;
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      const rx = Math.cos(a) * (radius * 0.68);
      const ry = Math.sin(a) * (radius * 0.68);
      if (h === 12) {
        // Double luminous pilot bars + 12 chevron
        ctx.fillStyle = bronzeRim;
        ctx.beginPath();
        ctx.roundRect(-24, ry - 20, 48, 40, 6);
        ctx.fill();
        ctx.fillStyle = creamInk;
        ctx.font = '800 40px "JetBrains Mono", "Plus Jakarta Sans", sans-serif';
        ctx.fillText('12', 0, ry + 1);
      } else {
        ctx.fillStyle = 'rgba(18, 24, 15, 0.55)';
        ctx.font = '800 44px "JetBrains Mono", "Plus Jakarta Sans", sans-serif';
        ctx.fillText(String(h), rx + 2, ry + 3);
        ctx.fillStyle = creamInk;
        ctx.fillText(String(h), rx, ry);
      }
    }

    // Bi-Compax Chronograph Sub-Dials at 9 o'clock (60-Min Chrono) & 3 o'clock (24-Hour)
    const compaxSpecs = [
      {
        x: -172,
        y: 0,
        title: 'MIN',
        labels: [
          { val: '60', idx: 0, n: 6 },
          { val: '10', idx: 1, n: 6 },
          { val: '20', idx: 2, n: 6 },
          { val: '30', idx: 3, n: 6 },
          { val: '40', idx: 4, n: 6 },
          { val: '50', idx: 5, n: 6 },
        ],
      },
      {
        x: 172,
        y: 0,
        title: '24H',
        labels: [
          { val: '24', idx: 0, n: 4 },
          { val: '06', idx: 1, n: 4 },
          { val: '12', idx: 2, n: 4 },
          { val: '18', idx: 3, n: 4 },
        ],
      },
    ];

    compaxSpecs.forEach((sub) => {
      const sr = 94;
      ctx.save();
      // Deep recessed bevel shadow + antique bronze instrument collar
      ctx.beginPath();
      ctx.arc(sub.x, sub.y, sr + 6, 0, Math.PI * 2);
      ctx.fillStyle = '#151C12';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sub.x, sub.y, sr, 0, Math.PI * 2);
      ctx.fillStyle = '#1D2719';
      ctx.fill();

      ctx.lineWidth = 5;
      ctx.strokeStyle = bronzeRim;
      ctx.stroke();

      // Concentric instrument lathe grooves
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let r = 20; r < sr - 12; r += 6) {
        ctx.beginPath();
        ctx.arc(sub.x, sub.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Tick graduations
      const tickCount = sub.title === 'MIN' ? 30 : 24;
      for (let t = 0; t < tickCount; t++) {
        const ta = (t / tickCount) * Math.PI * 2 - Math.PI / 2;
        const maj = sub.title === 'MIN' ? t % 5 === 0 : t % 6 === 0;
        ctx.strokeStyle = maj ? creamInk : softCream;
        ctx.lineWidth = maj ? 2.4 : 1.1;
        ctx.beginPath();
        ctx.moveTo(sub.x + Math.cos(ta) * (sr - (maj ? 20 : 14)), sub.y + Math.sin(ta) * (sr - (maj ? 20 : 14)));
        ctx.lineTo(sub.x + Math.cos(ta) * (sr - 7), sub.y + Math.sin(ta) * (sr - 7));
        ctx.stroke();
      }

      // Subdial numerals
      ctx.fillStyle = creamInk;
      ctx.font = '700 17px "JetBrains Mono", monospace';
      sub.labels.forEach((lbl) => {
        const a = (lbl.idx / lbl.n) * Math.PI * 2 - Math.PI / 2;
        ctx.fillText(
          lbl.val,
          sub.x + Math.cos(a) * (sr - 34),
          sub.y + Math.sin(a) * (sr - 34)
        );
      });

      ctx.fillStyle = '#E0543E';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillText(sub.title, sub.x, sub.y + 24);
      ctx.restore();
    });

    // RAF Roundel Emblem + Brand & Spitfire Lock Telemetry
    const ry = -170;
    ctx.fillStyle = '#1D3E78';
    ctx.beginPath();
    ctx.arc(0, ry, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#EDE3C2';
    ctx.beginPath();
    ctx.arc(0, ry, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#C92A2A';
    ctx.beginPath();
    ctx.arc(0, ry, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = creamInk;
    ctx.font = '800 32px "JetBrains Mono", "Plus Jakarta Sans", sans-serif';
    ctx.fillText('A V I - 8', 0, -118);

    ctx.fillStyle = bronzeRim;
    ctx.font = '700 16px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('SPITFIRE LOCK', 0, -88);

    ctx.fillStyle = softCream;
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText('CHRONOGRAPH · 5 ATM', 0, 126);

    // Deeply Recessed "Tunnel" Date Window at 6 o'clock
    const dy = radius * 0.56;
    ctx.fillStyle = '#0E130C';
    ctx.strokeStyle = bronzeRim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-42, dy - 29, 84, 58, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#181E16';
    ctx.beginPath();
    ctx.roundRect(-34, dy - 22, 68, 44, 6);
    ctx.fill();

    ctx.fillStyle = creamInk;
    ctx.font = '700 32px "JetBrains Mono", monospace';
    ctx.fillText(String(dateOverride?.dayNum ?? new Date().getDate()), 0, dy + 1);

    ctx.fillStyle = softCream;
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillText('HAWKER   SPITFIRE', 0, radius * 0.745);
    ctx.restore();

    const avi8Tex = new THREE.CanvasTexture(canvas);
    avi8Tex.colorSpace = THREE.SRGBColorSpace;
    avi8Tex.anisotropy = maxAnisotropy;
    avi8Tex.needsUpdate = true;
    return avi8Tex;
  }

  if (watch.id === 'omega-speedmaster') {
    ctx.save();
    ctx.translate(cx, cy);
    // Stepped dial inner bevel ring
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ink;
    ctx.font = '700 32px Georgia, serif';
    ctx.fillText('Ω', 0, -190);
    ctx.font = '600 26px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('O M E G A', 0, -148);
    ctx.font = '500 18px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('Speedmaster', 0, -116);
    ctx.fillStyle = mutedInk;
    ctx.font = '600 13px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('PROFESSIONAL', 0, -92);

    const speedySubs = [
      { x: 168, y: 12, ticks: [10, 20, 30], tickN: 30 },
      { x: -168, y: 12, ticks: [20, 40, 60], tickN: 30 },
      { x: 0, y: 178, ticks: [3, 6, 9, 12], tickN: 24 },
    ];
    speedySubs.forEach((sub) => {
      const sr = 92;
      ctx.save();
      ctx.beginPath();
      ctx.arc(sub.x, sub.y, sr, 0, Math.PI * 2);
      ctx.fillStyle = '#0E1012';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#2B2F34';
      ctx.stroke();
      for (let t = 0; t < sub.tickN; t++) {
        const ta = (t / sub.tickN) * Math.PI * 2 - Math.PI / 2;
        const maj = t % (sub.tickN === 24 ? 2 : 5) === 0;
        ctx.strokeStyle = ink;
        ctx.lineWidth = maj ? 2.4 : 1.1;
        ctx.beginPath();
        ctx.moveTo(sub.x + Math.cos(ta) * (sr - (maj ? 20 : 14)), sub.y + Math.sin(ta) * (sr - (maj ? 20 : 14)));
        ctx.lineTo(sub.x + Math.cos(ta) * (sr - 8), sub.y + Math.sin(ta) * (sr - 8));
        ctx.stroke();
      }
      ctx.fillStyle = ink;
      ctx.font = '600 17px "JetBrains Mono", monospace';
      sub.ticks.forEach((num, idx) => {
        const a = ((idx + 1) / sub.ticks.length) * Math.PI * 2 - Math.PI / 2;
        ctx.fillText(String(num), sub.x + Math.cos(a) * (sr - 34), sub.y + Math.sin(a) * (sr - 34));
      });
      ctx.restore();
    });

    ctx.fillStyle = mutedInk;
    ctx.font = '500 13px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('SWISS   MADE', 0, radius * 0.84);
    ctx.restore();

    const spTex = new THREE.CanvasTexture(canvas);
    spTex.colorSpace = THREE.SRGBColorSpace;
    spTex.anisotropy = maxAnisotropy;
    spTex.needsUpdate = true;
    return spTex;
  }

  if (watch.id === 'ap-royal-oak') {
    ctx.save();
    ctx.translate(cx, cy);
    // Outer brushed-flat minute chapter
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 32;
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const rx = Math.cos(a) * radius * 0.9;
      const ry = Math.sin(a) * radius * 0.9;
      if (k === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.stroke();

    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const maj = i % 5 === 0;
      ctx.strokeStyle = ink;
      ctx.lineWidth = maj ? 3.2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * (maj ? 0.8 : 0.83), Math.sin(a) * radius * (maj ? 0.8 : 0.83));
      ctx.lineTo(Math.cos(a) * radius * 0.865, Math.sin(a) * radius * 0.865);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#E5E8EC';
    ctx.font = '700 28px Georgia, serif';
    ctx.fillText('AP', 0, -182);
    ctx.fillStyle = ink;
    ctx.font = '600 20px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('AUDEMARS PIGUET', 0, -138);
    ctx.fillStyle = mutedInk;
    ctx.font = '500 14px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('AUTOMATIC', 0, 152);
    ctx.fillText('SWISS MADE', 0, radius * 0.78);

    // 3 o'clock beveled date window (matching dial color or dark backing)
    const dx = radius * 0.62;
    ctx.fillStyle = '#0D131D';
    ctx.strokeStyle = '#D2D7DC';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(dx - 38, -28, 76, 56, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#F3F4F6';
    ctx.font = '700 34px "JetBrains Mono", monospace';
    ctx.fillText(String(dateOverride?.dayNum ?? new Date().getDate()), dx, 2);
    ctx.restore();

    const roTex = new THREE.CanvasTexture(canvas);
    roTex.colorSpace = THREE.SRGBColorSpace;
    roTex.anisotropy = maxAnisotropy;
    roTex.needsUpdate = true;
    return roTex;
  }

  if (watch.id === 'pp-nautilus') {
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const maj = i % 5 === 0;
      ctx.strokeStyle = ink;
      ctx.lineWidth = maj ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * (maj ? 0.81 : 0.835), Math.sin(a) * radius * (maj ? 0.81 : 0.835));
      ctx.lineTo(Math.cos(a) * radius * 0.87, Math.sin(a) * radius * 0.87);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ink;
    ctx.font = '600 22px Georgia, serif';
    ctx.fillText('PATEK PHILIPPE', 0, -142);
    ctx.fillStyle = mutedInk;
    ctx.font = '500 15px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('GENEVE', 0, -112);
    ctx.font = '500 13px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('SWISS', 0, radius * 0.78);

    const dx = radius * 0.62;
    ctx.fillStyle = '#F6F5F0';
    ctx.strokeStyle = '#C9CFD4';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(dx - 38, -28, 76, 56, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#121518';
    ctx.font = '700 34px "JetBrains Mono", monospace';
    ctx.fillText(String(dateOverride?.dayNum ?? new Date().getDate()), dx, 2);
    ctx.restore();

    const ppTex = new THREE.CanvasTexture(canvas);
    ppTex.colorSpace = THREE.SRGBColorSpace;
    ppTex.anisotropy = maxAnisotropy;
    ppTex.needsUpdate = true;
    return ppTex;
  }

  if (watch.id === 'cartier-santos') {
    ctx.save();
    ctx.translate(cx, cy);
    // Inner square Chemins de Fer (railway minute track)
    const tr = radius * 0.52;
    ctx.strokeStyle = '#181B20';
    ctx.lineWidth = 3;
    ctx.strokeRect(-tr, -tr, tr * 2, tr * 2);
    ctx.strokeRect(-(tr - 16), -(tr - 16), (tr - 16) * 2, (tr - 16) * 2);

    for (let m = 0; m < 60; m++) {
      const a = (m / 60) * Math.PI * 2 - Math.PI / 2;
      const sx = Math.cos(a);
      const sy = Math.sin(a);
      const denom = Math.max(Math.abs(sx), Math.abs(sy)) || 1;
      const px = (sx / denom) * tr;
      const py = (sy / denom) * tr;
      const pxIn = (sx / denom) * (tr - 16);
      const pyIn = (sy / denom) * (tr - 16);
      ctx.lineWidth = m % 5 === 0 ? 4.5 : 2;
      ctx.beginPath();
      ctx.moveTo(pxIn, pyIn);
      ctx.lineTo(px, py);
      ctx.stroke();
    }

    // Slanted bold Cartier Roman numerals along perimeter square
    const romans = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    ctx.fillStyle = '#14171A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    romans.forEach((rom, idx) => {
      const a = (idx / 12) * Math.PI * 2 - Math.PI / 2;
      const sx = Math.cos(a);
      const sy = Math.sin(a);
      const denom = Math.max(Math.abs(sx), Math.abs(sy)) || 1;
      const dist = radius * 0.69;
      const rx = (sx / denom) * dist;
      const ry = (sy / denom) * dist;
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(a + Math.PI / 2);
      ctx.font = '700 48px Georgia, serif';
      ctx.fillText(rom, 0, 0);
      if (rom === 'VII') {
        // Cartier secret micro-signature in VII stroke (visible under 2.5x Loupe)
        ctx.fillStyle = '#14171A';
        ctx.font = '700 7px "Plus Jakarta Sans", Arial, sans-serif';
        ctx.fillText('CARTIER', -6, -16);
      }
      ctx.restore();
    });

    ctx.fillStyle = '#14171A';
    ctx.font = '700 28px Georgia, serif';
    ctx.fillText('C A R T I E R', 0, -124);
    ctx.font = '500 14px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('AUTOMATIC', 0, 128);
    ctx.font = '500 11px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('SWISS   MADE', 0, radius * 0.85);
    ctx.restore();

    const sTex = new THREE.CanvasTexture(canvas);
    sTex.colorSpace = THREE.SRGBColorSpace;
    sTex.anisotropy = maxAnisotropy;
    sTex.needsUpdate = true;
    return sTex;
  }

  if (watch.id === 'jlc-reverso') {
    ctx.save();
    ctx.translate(cx, cy);
    const rw = radius * 0.62;
    const rh = radius * 0.88;

    // Inner Art Deco minute railway track (Chemin de fer)
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.6;
    ctx.strokeRect(-rw, -rh, rw * 2, rh * 2);
    ctx.strokeRect(-(rw - 18), -(rh - 18), (rw - 18) * 2, (rh - 18) * 2);

    // Corner decorative Art Deco accents & baton markers
    for (let h = 0; h < 12; h++) {
      if (h === 6) continue;
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      const sx = Math.cos(a);
      const sy = Math.sin(a);
      const scaleX = Math.abs(sx) > 0.01 ? rw * 0.72 / Math.abs(sx) : 9999;
      const scaleY = Math.abs(sy) > 0.01 ? rh * 0.78 / Math.abs(sy) : 9999;
      const t = Math.min(scaleX, scaleY);
      const px = sx * t;
      const py = sy * t;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = '#D7DCE2';
      ctx.fillRect(-6, -24, 12, 48);
      ctx.restore();
    }

    // 6 o'clock small-seconds square sub-register
    ctx.strokeStyle = mutedInk;
    ctx.lineWidth = 2;
    ctx.strokeRect(-62, rh * 0.44, 124, 108);
    for (let t = 0; t < 12; t++) {
      const ta = (t / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ta) * 38, rh * 0.44 + 54 + Math.sin(ta) * 38);
      ctx.lineTo(Math.cos(ta) * 46, rh * 0.44 + 54 + Math.sin(ta) * 46);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ink;
    ctx.font = '600 22px Georgia, serif';
    ctx.fillText('JAEGER-LECOULTRE', 0, -rh * 0.44);
    ctx.fillStyle = mutedInk;
    ctx.font = '500 13px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('REVERSO', 0, -rh * 0.32);
    ctx.fillText('SWISS MADE', 0, rh * 0.94);
    ctx.restore();

    const revTex = new THREE.CanvasTexture(canvas);
    revTex.colorSpace = THREE.SRGBColorSpace;
    revTex.anisotropy = maxAnisotropy;
    revTex.needsUpdate = true;
    return revTex;
  }

  if (watch.id === 'gs-snowflake') {
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const maj = i % 5 === 0;
      ctx.strokeStyle = ink;
      ctx.lineWidth = maj ? 3.2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * (maj ? 0.89 : 0.915), Math.sin(a) * radius * (maj ? 0.89 : 0.915));
      ctx.lineTo(Math.cos(a) * radius * 0.95, Math.sin(a) * radius * 0.95);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ink;
    ctx.font = '700 38px Georgia, serif';
    ctx.fillText('GS', 0, -172);
    ctx.font = '600 25px Georgia, serif';
    ctx.fillText('Grand Seiko', 0, -130);
    ctx.fillStyle = mutedInk;
    ctx.font = '600 15px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('SPRING DRIVE', 0, 126);

    // 7-8 o'clock recessed fan Power-Reserve scale
    const prx = -146;
    const pry = 122;
    ctx.strokeStyle = '#9AA4AE';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(prx, pry, 74, -Math.PI * 0.72, -Math.PI * 0.08);
    ctx.stroke();
    ctx.fillStyle = 'rgba(130, 145, 160, 0.22)';
    ctx.beginPath();
    ctx.moveTo(prx, pry);
    ctx.arc(prx, pry, 74, -Math.PI * 0.72, -Math.PI * 0.08);
    ctx.closePath();
    ctx.fill();
    for (let k = 0; k <= 4; k++) {
      const ka = THREE.MathUtils.lerp(-Math.PI * 0.72, -Math.PI * 0.08, k / 4);
      ctx.strokeStyle = ink;
      ctx.lineWidth = k === 0 || k === 4 ? 3 : 1.8;
      ctx.beginPath();
      ctx.moveTo(prx + Math.cos(ka) * 58, pry + Math.sin(ka) * 58);
      ctx.lineTo(prx + Math.cos(ka) * 74, pry + Math.sin(ka) * 74);
      ctx.stroke();
    }

    // 3 o'clock Zaratsu beveled date window
    const dx = radius * 0.65;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#B8BFC6';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(dx - 40, -28, 80, 56, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#14171A';
    ctx.font = '700 36px "JetBrains Mono", monospace';
    ctx.fillText(String(dateOverride?.dayNum ?? new Date().getDate()), dx, 2);

    ctx.fillStyle = mutedInk;
    ctx.font = '500 11px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('MADE IN JAPAN', 0, radius * 0.85);
    ctx.restore();

    const gsTex = new THREE.CanvasTexture(canvas);
    gsTex.colorSpace = THREE.SRGBColorSpace;
    gsTex.anisotropy = maxAnisotropy;
    gsTex.needsUpdate = true;
    return gsTex;
  }

  if (watch.id === 'lange-1') {
    ctx.save();
    ctx.translate(cx, cy);
    // Asymmetric Main Time Subdial centered at (-118, 22)
    const mx = -118;
    const my = 22;
    const mr = 212;
    ctx.strokeStyle = '#A69D8D';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx, my, mr - 22, 0, Math.PI * 2);
    ctx.stroke();

    for (let m = 0; m < 60; m++) {
      const a = (m / 60) * Math.PI * 2 - Math.PI / 2;
      const maj = m % 5 === 0;
      ctx.strokeStyle = ink;
      ctx.lineWidth = maj ? 3 : 1.3;
      ctx.beginPath();
      ctx.moveTo(mx + Math.cos(a) * (mr - (maj ? 20 : 12)), my + Math.sin(a) * (mr - (maj ? 20 : 12)));
      ctx.lineTo(mx + Math.cos(a) * mr, my + Math.sin(a) * mr);
      ctx.stroke();
    }

    const langeRomans = ['XII', '•', 'II', '•', 'IIII', '•', 'VI', '•', 'VIII', '•', 'X', '•'];
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 22px Georgia, serif';
    langeRomans.forEach((lbl, idx) => {
      const a = (idx / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(lbl, mx + Math.cos(a) * (mr - 44), my + Math.sin(a) * (mr - 44));
    });
    ctx.font = '700 18px Georgia, serif';
    ctx.fillText('A. LANGE & SÖHNE', mx, my - 64);
    ctx.font = '500 11px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillStyle = mutedInk;
    ctx.fillText('GLASHÜTTE I/SA', mx, my - 42);

    // Outsize Twin-Window Big Date at Upper Right (1:30)
    const dayStr = String(dateOverride?.dayNum ?? new Date().getDate()).padStart(2, '0');
    const bdx = 152;
    const bdy = -148;
    ctx.strokeStyle = '#C99672';
    ctx.lineWidth = 4;
    ctx.fillStyle = '#FAF8F4';
    ctx.fillRect(bdx - 68, bdy - 40, 62, 80);
    ctx.strokeRect(bdx - 68, bdy - 40, 62, 80);
    ctx.fillRect(bdx + 2, bdy - 40, 62, 80);
    ctx.strokeRect(bdx + 2, bdy - 40, 62, 80);
    ctx.fillStyle = '#14171A';
    ctx.font = '700 54px "JetBrains Mono", monospace';
    ctx.fillText(dayStr[0], bdx - 37, bdy + 3);
    ctx.fillText(dayStr[1], bdx + 33, bdy + 3);

    // AUF / AB Power Reserve Indicator at 3 o'clock (240, 12)
    const prx = 246;
    const pry = 12;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(prx, pry, 82, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.font = '700 15px "JetBrains Mono", monospace';
    ctx.fillText('AUF', prx + 34, pry - 86);
    ctx.fillStyle = '#B91C1C';
    ctx.fillText('AB', prx + 34, pry + 86);

    // Lower-Right Moonphase + Small Seconds Sub-Register Frame (150, 185)
    ctx.strokeStyle = '#C99672';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(150, 185, 114, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = mutedInk;
    ctx.font = '500 12px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('MADE IN GERMANY', 0, radius * 0.88);
    ctx.restore();

    const lTex = new THREE.CanvasTexture(canvas);
    lTex.colorSpace = THREE.SRGBColorSpace;
    lTex.anisotropy = maxAnisotropy;
    lTex.needsUpdate = true;
    return lTex;
  }

  if (watch.id === 'rm-tonneau') {
    ctx.save();
    ctx.translate(cx, cy);
    // Smoked translucent skeleton veil so selected dial finish (meteorite, aventurine, etc.) shows underneath
    ctx.fillStyle =
      dial.id === 'default' || dial.id === 'obsidian'
        ? 'rgba(13, 15, 18, 0.88)'
        : 'rgba(13, 15, 18, 0.44)';
    ctx.fillRect(-logicalSize * 0.5, -logicalSize * 0.5, logicalSize, logicalSize);

    // Industrial titanium lattice struts
    ctx.strokeStyle = 'rgba(43, 48, 55, 0.88)';
    ctx.lineWidth = 14;
    [
      [-260, -240, 260, 240],
      [260, -240, -260, 240],
      [-320, 0, 320, 0],
    ].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Stepped carbon-slate flange minute track
    for (let m = 0; m < 60; m++) {
      const a = (m / 60) * Math.PI * 2 - Math.PI / 2;
      const sx = Math.cos(a);
      const sy = Math.sin(a);
      const rScale = 1 / Math.pow(Math.pow(Math.abs(sx) / 0.88, 2.6) + Math.pow(Math.abs(sy) / 1.12, 2.6), 1 / 2.6);
      const rOuter = radius * 0.82 * rScale;
      const maj = m % 5 === 0;
      ctx.strokeStyle = maj ? '#F59E0B' : '#94A3B8';
      ctx.lineWidth = maj ? 5 : 2;
      ctx.beginPath();
      ctx.moveTo(sx * rOuter * 0.9, sy * rOuter * 0.9);
      ctx.lineTo(sx * rOuter, sy * rOuter);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F4F2ED';
    ctx.font = '800 22px "JetBrains Mono", sans-serif';
    ctx.fillText('RICHARD MILLE', 0, -210);
    ctx.fillStyle = '#F59E0B';
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.fillText('RM 11-03 · TOURBILLON CHRONO', 0, -176);

    // Skeleton chronograph rings at 9h / 3h / 6h tourbillon aperture
    [
      { x: -148, y: -10, lbl: '60M' },
      { x: 148, y: -10, lbl: '30M' },
      { x: 0, y: 195, lbl: 'TOURBILLON' },
    ].forEach((sub) => {
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sub.x, sub.y, 74, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#F59E0B';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillText(sub.lbl, sub.x, sub.y + 52);
    });
    ctx.restore();

    const rmTex = new THREE.CanvasTexture(canvas);
    rmTex.colorSpace = THREE.SRGBColorSpace;
    rmTex.anisotropy = maxAnisotropy;
    rmTex.needsUpdate = true;
    return rmTex;
  }

  // Brand crown & typography (positioned upper dial)
  const crownColor = dial.lightText ? '#E6C875' : '#A6832C';
  if (watch.id !== 'datejust' && watch.id !== 'daydate') {
    drawCrownIcon(ctx, cx, cy - 178, 0.72, crownColor);
  }

  // Day-Date 40 curved 12 o'clock Day-of-Week aperture
  if (watch.hasDayWindow) {
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const weekday = dateOverride?.weekday ?? dayNames[new Date().getDay()];
    ctx.save();
    ctx.fillStyle = '#F7F6F2';
    ctx.strokeStyle = '#C9A857';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(cx - 115, cy - 226, 230, 48, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#141719';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 22px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(weekday, cx, cy - 201);
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = ink;
  ctx.font = '600 32px Georgia, serif';
  ctx.fillText('R O L E X', cx, watch.hasDayWindow ? cy - 142 : cy - 130);

  ctx.fillStyle = mutedInk;
  ctx.font = '500 16px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('OYSTER PERPETUAL', cx, watch.hasDayWindow ? cy - 110 : cy - 98);

  if (watch.id === 'submariner') {
    ctx.fillStyle = ink;
    ctx.font = '600 19px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('SUBMARINER', cx, cy + 110);
    ctx.fillStyle = mutedInk;
    ctx.font = '500 15px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('1000ft = 300m', cx, cy + 138);
    ctx.font = '500 12px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('SUPERLATIVE CHRONOMETER', cx, cy + 164);
    ctx.fillText('OFFICIALLY CERTIFIED', cx, cy + 182);
  } else if (watch.id === 'yachtmaster') {
    ctx.fillStyle = accentInk;
    ctx.font = '700 19px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('YACHT-MASTER', cx, cy + 112);
    ctx.fillStyle = mutedInk;
    ctx.font = '500 15px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('330ft = 100m', cx, cy + 138);
    ctx.font = '500 12px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('SUPERLATIVE CHRONOMETER', cx, cy + 164);
    ctx.fillText('OFFICIALLY CERTIFIED', cx, cy + 182);
  } else if (watch.id === 'datejust' || watch.id === 'daydate') {
    ctx.fillStyle = ink;
    ctx.font = '600 18px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(watch.id === 'daydate' ? 'DAY-DATE' : 'DATEJUST', cx, cy - 78);
    ctx.fillStyle = mutedInk;
    ctx.font = '500 12px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('SUPERLATIVE CHRONOMETER', cx, cy + 148);
    ctx.fillText('OFFICIALLY CERTIFIED', cx, cy + 166);
  } else if (watch.id === 'gmt' || watch.id === 'explorer2') {
    ctx.fillStyle = accentInk;
    ctx.font = '600 18px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(watch.id === 'explorer2' ? 'EXPLORER II' : 'GMT-MASTER II', cx, cy + 114);
    ctx.fillStyle = mutedInk;
    ctx.font = '500 12px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('SUPERLATIVE CHRONOMETER', cx, cy + 146);
    ctx.fillText('OFFICIALLY CERTIFIED', cx, cy + 164);
  } else if (watch.id === 'milgauss') {
    ctx.fillStyle = accentInk;
    ctx.font = '700 19px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('M I L G A U S S', cx, cy + 116);
    ctx.fillStyle = mutedInk;
    ctx.font = '500 12px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('SUPERLATIVE CHRONOMETER', cx, cy + 148);
    ctx.fillText('OFFICIALLY CERTIFIED', cx, cy + 166);
  } else if (watch.id === 'skydweller') {
    ctx.fillStyle = ink;
    ctx.font = '600 17px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('SKY-DWELLER', cx, cy - 70);
    // Static outer frame around off-center 24h disc
    ctx.strokeStyle = '#C9A857';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy + 92, 118, 0, Math.PI * 2);
    ctx.stroke();
    // Fixed inverted red reading triangle at 12 o'clock on the 24h ring
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 42);
    ctx.lineTo(cx + 10, cy - 42);
    ctx.lineTo(cx, cy - 26);
    ctx.closePath();
    ctx.fill();
  } else if (watch.id === 'daytona') {
    ctx.fillStyle = mutedInk;
    ctx.font = '500 14px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('SUPERLATIVE CHRONOMETER', cx, cy - 72);
    ctx.fillText('OFFICIALLY CERTIFIED', cx, cy - 52);
    ctx.fillText('COSMOGRAPH', cx, cy - 32);

    // Three Daytona contrasting chronograph sub-dials (3, 6, 9 o'clock)
    const subDials = [
      { x: cx + 168, y: cy + 12, label: '30', ticks: [10, 20, 30] },
      { x: cx - 168, y: cy + 12, label: '12', ticks: [3, 6, 9, 12] },
      { x: cx, y: cy + 178, label: '60', ticks: [20, 40, 60] },
    ];
    subDials.forEach((sub) => {
      const sr = 92;
      ctx.save();
      ctx.beginPath();
      ctx.arc(sub.x, sub.y, sr, 0, Math.PI * 2);
      ctx.fillStyle = '#131618';
      ctx.fill();

      // Metallic outer ring
      ctx.lineWidth = 10;
      ctx.strokeStyle = dial.lightText ? '#2D3236' : '#1B1E21';
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#C9A857';
      ctx.beginPath();
      ctx.arc(sub.x, sub.y, sr - 6, 0, Math.PI * 2);
      ctx.stroke();

      // Azurage concentric rings inside subdial
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let r = 18; r < sr - 14; r += 6) {
        ctx.beginPath();
        ctx.arc(sub.x, sub.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Subdial tick marks
      for (let t = 0; t < 30; t++) {
        const ta = (t / 30) * Math.PI * 2 - Math.PI / 2;
        const maj = t % 5 === 0;
        ctx.strokeStyle = '#F2EFE9';
        ctx.lineWidth = maj ? 2.4 : 1.1;
        ctx.beginPath();
        ctx.moveTo(sub.x + Math.cos(ta) * (sr - (maj ? 20 : 15)), sub.y + Math.sin(ta) * (sr - (maj ? 20 : 15)));
        ctx.lineTo(sub.x + Math.cos(ta) * (sr - 9), sub.y + Math.sin(ta) * (sr - 9));
        ctx.stroke();
      }

      // Numerals
      ctx.fillStyle = '#F2EFE9';
      ctx.font = '600 18px "Plus Jakarta Sans", Arial, sans-serif';
      sub.ticks.forEach((num, idx) => {
        const a = ((idx + 1) / sub.ticks.length) * Math.PI * 2 - Math.PI / 2;
        ctx.fillText(
          String(num),
          sub.x + Math.cos(a) * (sr - 34),
          sub.y + Math.sin(a) * (sr - 34)
        );
      });
      ctx.restore();
    });

    // Red DAYTONA arc above 6 o'clock subdial
    ctx.fillStyle = '#D93838';
    ctx.font = '700 19px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('D A Y T O N A', cx, cy + 72);
  }

  // Date aperture at 3 o'clock (for cyclops models)
  if (watch.hasCyclops) {
    const dx = cx + radius * 0.65;
    const dy = cy;
    const dw = 92;
    const dh = 70;
    ctx.save();
    ctx.fillStyle = '#F7F6F2';
    ctx.strokeStyle = '#C9A857';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(dx - dw / 2, dy - dh / 2, dw, dh, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#111315';
    ctx.font = '700 44px "JetBrains Mono", monospace';
    ctx.fillText(String(dateOverride?.dayNum ?? new Date().getDate()), dx, dy + 2);
    ctx.restore();
  }

  // SWISS MADE at 6 o'clock
  ctx.fillStyle = mutedInk;
  ctx.font = '500 13px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('SWISS   MADE', cx, cy + radius * 0.84);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createBezelInsertTexture(
  watch: WatchSpec,
  bezel: BezelOption,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 1024;
  const scaleFactor = 2;
  const canvas = document.createElement('canvas');
  canvas.width = size * scaleFactor;
  canvas.height = size * scaleFactor;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scaleFactor, scaleFactor);
  const cx = size / 2;
  const cy = size / 2;

  const isSteel24 = watch.bezelType === 'steel-24h';
  const primary = isSteel24
    ? '#C5CBD0'
    : bezel.id === 'default'
      ? watch.bezelPrimaryHex
      : bezel.primaryHex;
  const secondary = isSteel24
    ? undefined
    : bezel.id === 'default'
      ? watch.bezelSecondaryHex
      : bezel.secondaryHex;

  if (secondary) {
    // Top half (9 o'clock across 12 to 3 o'clock): night / primary ceramic
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, size * 0.52, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();

    // Bottom half (3 o'clock across 6 to 9 o'clock): day / secondary ceramic
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, size * 0.52, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, size, size);
  }

  // Radial satin brush lines for Explorer II fixed steel bezel
  if (isSteel24) {
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 360; i++) {
      const a = (i * Math.PI) / 180;
      ctx.strokeStyle =
        i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(20,25,30,0.07)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * size * 0.34, Math.sin(a) * size * 0.34);
      ctx.lineTo(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Subtle ceramic / steel radial sheen
  const sheen = ctx.createRadialGradient(cx, cy, size * 0.34, cx, cy, size * 0.5);
  sheen.addColorStop(0, 'rgba(0,0,0,0.22)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.06)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.26)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, size, size);

  const numColor = isSteel24
    ? '#14171A'
    : watch.bezelType === 'tachymeter'
      ? '#E8D39B'
      : '#EAECEF';
  const rText = size * 0.422;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (watch.bezelType === 'dive-cerachrom' || watch.bezelType === 'yacht-cerachrom') {
    const isYacht = watch.bezelType === 'yacht-cerachrom';
    if (isYacht) {
      // Matte sandblasted Cerachrom background micro-grain
      for (let i = 0; i < 4800; i++) {
        const gx = (i * 197) % size;
        const gy = (i * 313) % size;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.14)';
        ctx.fillRect(gx, gy, 2, 2);
      }
    }
    // 60-minute markings (0..15 every minute, then every 5 minutes)
    for (let m = 0; m < 60; m++) {
      const a = (m / 60) * Math.PI * 2 - Math.PI / 2;
      if (m === 0) {
        ctx.save();
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = isYacht ? '#E5E8EC' : numColor;
        ctx.beginPath();
        ctx.moveTo(-22, -rText - 14);
        ctx.lineTo(22, -rText - 14);
        ctx.lineTo(0, -rText + 22);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (m % 10 === 0) {
        ctx.save();
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = isYacht ? '#E5E8EC' : numColor;
        ctx.font = '700 44px "Plus Jakarta Sans", Arial, sans-serif';
        if (isYacht) {
          ctx.shadowColor = 'rgba(0,0,0,0.85)';
          ctx.shadowOffsetY = 2;
          ctx.shadowBlur = 3;
        }
        ctx.fillText(String(m), 0, -rText);
        ctx.restore();
      } else if (m <= 15 || m % 5 === 0) {
        const isFive = m % 5 === 0;
        ctx.strokeStyle = isYacht ? '#E5E8EC' : numColor;
        ctx.lineWidth = isFive ? 10 : 4.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (rText - (isFive ? 18 : 11)), Math.sin(a) * (rText - (isFive ? 18 : 11)));
        ctx.lineTo(Math.cos(a) * (rText + (isFive ? 18 : 11)), Math.sin(a) * (rText + (isFive ? 18 : 11)));
        ctx.stroke();
      }
    }
  } else if (watch.bezelType === 'gmt-cerachrom' || watch.bezelType === 'steel-24h') {
    // 24-hour markings (2, 4, 6, ... 22, triangle at 24)
    for (let h = 0; h < 24; h++) {
      const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
      if (h === 0) {
        ctx.save();
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = numColor;
        ctx.beginPath();
        ctx.moveTo(-22, -rText - 14);
        ctx.lineTo(22, -rText - 14);
        ctx.lineTo(0, -rText + 22);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (h % 2 === 0) {
        ctx.save();
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = numColor;
        ctx.font = '700 42px "Plus Jakarta Sans", Arial, sans-serif';
        ctx.fillText(String(h), 0, -rText);
        ctx.restore();
      } else {
        ctx.fillStyle = numColor;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rText, Math.sin(a) * rText, 6.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (watch.bezelType === 'tachymeter') {
    // Authentic Daytona tachymeter scale values
    const tachyMarks: { deg: number; label: string }[] = [
      { deg: 36, label: '400' },
      { deg: 52, label: '300' },
      { deg: 70, label: '240' },
      { deg: 90, label: '200' },
      { deg: 108, label: '180' },
      { deg: 126, label: '160' },
      { deg: 144, label: '140' },
      { deg: 162, label: '130' },
      { deg: 180, label: '120' },
      { deg: 202, label: '110' },
      { deg: 224, label: '100' },
      { deg: 250, label: '90' },
      { deg: 276, label: '80' },
      { deg: 300, label: '75' },
      { deg: 322, label: '70' },
      { deg: 342, label: '65' },
      { deg: 357, label: '60' },
    ];
    // UNITS PER HOUR / TACHYMETRE at 1 o'clock
    const tachyInk = watch.id === 'omega-speedmaster' ? '#F3F4F6' : numColor;
    ctx.save();
    ctx.rotate((18 * Math.PI) / 180);
    ctx.fillStyle = tachyInk;
    ctx.font = '700 18px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(
      watch.id === 'omega-speedmaster' ? 'TACHYMETRE' : 'UNITS PER HOUR',
      0,
      -rText
    );
    ctx.restore();

    tachyMarks.forEach(({ deg, label }) => {
      const a = ((deg - 90) * Math.PI) / 180;
      ctx.save();
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = tachyInk;
      ctx.font = '700 28px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(label, 0, -rText + 4);
      ctx.beginPath();
      ctx.arc(0, -rText + (watch.id === 'omega-speedmaster' && label === '90' ? -22 : 26), 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createBrushedMetalBumpTexture(): THREE.CanvasTexture {
  return getCachedTexture('brushedBump', () => {
    const w = 512;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, w, h);

    // Fine directional vertical satin brushing lines
    for (let x = 0; x < w; x++) {
      const shade = 112 + Math.floor(Math.sin(x * 1.9) * 14 + ((x * 37) % 19));
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(x, 0, 1, h);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    texture.needsUpdate = true;
    return texture;
  });
}

export function createPerlageTexture(maxAnisotropy: number): THREE.CanvasTexture {
  return getCachedTexture(`perlage:${maxAnisotropy}`, () => {
    const size = 512;
    const scaleFactor = 2;
    const canvas = document.createElement('canvas');
    canvas.width = size * scaleFactor;
    canvas.height = size * scaleFactor;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scaleFactor, scaleFactor);
    ctx.fillStyle = '#B8BDC2';
    ctx.fillRect(0, 0, size, size);

    // Classic Swiss circular perlage overlapping swirls
    const step = 28;
    for (let y = 0; y <= size; y += step) {
      for (let x = 0; x <= size; x += step) {
        const offsetX = (Math.floor(y / step) % 2) * (step * 0.5);
        const grad = ctx.createRadialGradient(x + offsetX, y, 2, x + offsetX, y, 18);
        grad.addColorStop(0, 'rgba(255,255,255,0.42)');
        grad.addColorStop(0.55, 'rgba(170,176,182,0.2)');
        grad.addColorStop(1, 'rgba(90,96,102,0.35)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x + offsetX, y, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
    texture.needsUpdate = true;
    return texture;
  });
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  return getCachedTexture('contactShadow', () => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.36)');
    grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  });
}

export function createAlligatorLeatherTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const map = getCachedTexture(`leatherMap:${maxAnisotropy}`, () => {
    const w = 512;
    const h = 512;
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = w;
    colorCanvas.height = h;
    const cCtx = colorCanvas.getContext('2d')!;

    cCtx.fillStyle = '#140C08';
    cCtx.fillRect(0, 0, w, h);

    const rows = 12;
    const rowH = h / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const cols = 5;
      for (let c = 0; c < cols; c++) {
        const pad = 4.5;
        const isEdge = c === 0 || c === cols - 1;
        const cellW = w / cols;
        const x = c * cellW + pad;
        const cw = cellW - pad * 2;
        const ch = rowH - pad * 2;
        const rad = isEdge ? 12 : 6;

        const warm = 38 + ((r * 13 + c * 7) % 16);
        const grad = cCtx.createRadialGradient(
          x + cw * 0.5,
          y + ch * 0.42,
          4,
          x + cw * 0.5,
          y + ch * 0.5,
          cw * 0.72
        );
        grad.addColorStop(0, `rgb(${warm + 28}, ${Math.floor(warm * 0.84)}, ${Math.floor(warm * 0.58)})`);
        grad.addColorStop(1, `rgb(${warm}, ${Math.floor(warm * 0.56)}, ${Math.floor(warm * 0.38)})`);
        cCtx.fillStyle = grad;
        cCtx.beginPath();
        cCtx.roundRect(x, y + pad, cw, ch, rad);
        cCtx.fill();
      }
    }

    const stitchPositions = [w * 0.075, w * 0.925];
    stitchPositions.forEach((sx) => {
      for (let sy = 10; sy < h; sy += 26) {
        cCtx.strokeStyle = '#D9C28E';
        cCtx.lineWidth = 4;
        cCtx.lineCap = 'round';
        cCtx.beginPath();
        cCtx.moveTo(sx, sy);
        cCtx.lineTo(sx, sy + 14);
        cCtx.stroke();
      }
    });

    const tex = new THREE.CanvasTexture(colorCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 2);
    tex.anisotropy = maxAnisotropy;
    return tex;
  });

  const bumpMap = getCachedTexture('leatherBump', () => {
    const w = 512;
    const h = 512;
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = w;
    bumpCanvas.height = h;
    const bCtx = bumpCanvas.getContext('2d')!;

    bCtx.fillStyle = '#2A2A2A';
    bCtx.fillRect(0, 0, w, h);

    const rows = 12;
    const rowH = h / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const cols = 5;
      for (let c = 0; c < cols; c++) {
        const pad = 4.5;
        const isEdge = c === 0 || c === cols - 1;
        const cellW = w / cols;
        const x = c * cellW + pad;
        const cw = cellW - pad * 2;
        const ch = rowH - pad * 2;
        const rad = isEdge ? 12 : 6;

        const bGrad = bCtx.createRadialGradient(
          x + cw * 0.5,
          y + ch * 0.5,
          2,
          x + cw * 0.5,
          y + ch * 0.5,
          cw * 0.75
        );
        bGrad.addColorStop(0, '#E0E0E0');
        bGrad.addColorStop(0.75, '#B0B0B0');
        bGrad.addColorStop(1, '#262626');
        bCtx.fillStyle = bGrad;
        bCtx.beginPath();
        bCtx.roundRect(x, y + pad, cw, ch, rad);
        bCtx.fill();
      }
    }

    const stitchPositions = [w * 0.075, w * 0.925];
    stitchPositions.forEach((sx) => {
      for (let sy = 10; sy < h; sy += 26) {
        bCtx.strokeStyle = '#FFFFFF';
        bCtx.lineWidth = 5;
        bCtx.lineCap = 'round';
        bCtx.beginPath();
        bCtx.moveTo(sx, sy);
        bCtx.lineTo(sx, sy + 14);
        bCtx.stroke();
      }
    });

    const tex = new THREE.CanvasTexture(bumpCanvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 2);
    return tex;
  });

  return { map, bumpMap };
}

export function createOysterflexBumpTexture(): THREE.CanvasTexture {
  return getCachedTexture('oysterflexBump', () => {
    const w = 256;
    const h = 256;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, w, h);

    // Subtle matte vulcanized micro-grain + center longitudinal rib groove
    for (let i = 0; i < 4500; i++) {
      const gx = (i * 73) % w;
      const gy = (i * 137) % h;
      const v = 112 + ((i * 29) % 32);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(gx, gy, 2, 2);
    }
    ctx.fillStyle = '#484848';
    ctx.fillRect(w * 0.28, 0, 4, h);
    ctx.fillRect(w * 0.72, 0, 4, h);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 4);
    return tex;
  });
}

export function createRehautTexture(
  reference: string,
  maxAnisotropy: number,
  brand: WatchBrand = 'ROLEX'
): THREE.CanvasTexture {
  const w = 2048;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  if (brand === 'AVI-8') {
    grad.addColorStop(0, '#785535');
    grad.addColorStop(0.5, '#9F744A');
    grad.addColorStop(1, '#5D4025');
  } else {
    grad.addColorStop(0, '#B9BFC4');
    grad.addColorStop(0.5, '#E4E7EA');
    grad.addColorStop(1, '#AEB5BA');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = brand === 'AVI-8' ? 'rgba(237, 227, 194, 0.78)' : 'rgba(40, 44, 48, 0.72)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 26px "Plus Jakarta Sans", Arial, sans-serif';

  const slots = 12;
  const brandMarks: Record<WatchBrand, string> = {
    ROLEX: 'R O L E X',
    'AVI-8': 'A V I - 8',
    OMEGA: 'O M E G A',
    'AUDEMARS PIGUET': 'AUDEMARS PIGUET',
    'PATEK PHILIPPE': 'PATEK PHILIPPE',
    CARTIER: 'C A R T I E R',
    'JAEGER-LECOULTRE': 'JAEGER-LECOULTRE',
    'GRAND SEIKO': 'GRAND SEIKO',
    'A. LANGE & SÖHNE': 'A. LANGE & SÖHNE',
    'RICHARD MILLE': 'RICHARD MILLE',
  };
  const brandMark = brandMarks[brand] ?? 'R O L E X';
  for (let i = 0; i < slots; i++) {
    const x = ((i + 0.5) / slots) * w;
    if (i === 6) {
      ctx.font = '600 22px "JetBrains Mono", monospace';
      ctx.fillText(reference, x, h * 0.52);
      ctx.font = '600 26px "Plus Jakarta Sans", Arial, sans-serif';
    } else {
      ctx.fillText(brandMark, x, h * 0.52);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

export function createCalfskinLiningTexture(maxAnisotropy: number): THREE.CanvasTexture {
  return getCachedTexture(`calfskin:${maxAnisotropy}`, () => {
    const w = 256;
    const h = 256;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#7D5335';
    ctx.fillRect(0, 0, w, h);

    // Fine natural calfskin pebble grain
    for (let i = 0; i < 2400; i++) {
      const gx = (i * 89) % w;
      const gy = (i * 151) % h;
      const shade = i % 2 === 0 ? 'rgba(255,235,210,0.06)' : 'rgba(30,15,5,0.12)';
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle stitched edge border on lining
    [w * 0.08, w * 0.92].forEach((sx) => {
      for (let sy = 8; sy < h; sy += 20) {
        ctx.strokeStyle = '#C9A875';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy + 10);
        ctx.stroke();
      }
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 2);
    tex.anisotropy = maxAnisotropy;
    return tex;
  });
}

export function createMoteTexture(): THREE.CanvasTexture {
  return getCachedTexture('moteTex', () => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255, 245, 220, 0.9)');
    grad.addColorStop(0.4, 'rgba(212, 175, 55, 0.35)');
    grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

export function createCotesDeGeneveTexture(maxAnisotropy: number): THREE.CanvasTexture {
  return getCachedTexture(`cotes:${maxAnisotropy}`, () => {
    const size = 512;
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    ctx.fillStyle = '#C8CDD2';
    ctx.fillRect(0, 0, size, size);

    // Classic Swiss Geneva ribbing bands
    const stripeW = 42;
    for (let x = 0; x < size; x += stripeW) {
      const grad = ctx.createLinearGradient(x, 0, x + stripeW, 0);
      grad.addColorStop(0, 'rgba(72, 78, 86, 0.34)');
      grad.addColorStop(0.25, 'rgba(245, 248, 250, 0.42)');
      grad.addColorStop(0.65, 'rgba(180, 186, 192, 0.15)');
      grad.addColorStop(1, 'rgba(65, 70, 78, 0.36)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, stripeW, size);

      // Subtle micro abrasive arc grain inside each rib
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let y = 0; y < size + 40; y += 6) {
        ctx.beginPath();
        ctx.arc(x + stripeW * 0.5, y, stripeW * 0.6, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
    texture.needsUpdate = true;
    return texture;
  });
}

export function createCasebackEngravingTexture(
  watch: WatchSpec,
  maxAnisotropy: number,
  customEngraving?: string
): THREE.CanvasTexture {
  const size = 512;
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = size * scale;
  canvas.height = size * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  const cx = size / 2;
  const cy = size / 2;

  const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, size * 0.5);
  grad.addColorStop(0, '#D4D9DE');
  grad.addColorStop(0.7, '#C2C7CC');
  grad.addColorStop(1, '#A4AAB0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle concentric lathe finish on center medallion
  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = 1;
  for (let r = 18; r < size * 0.44; r += 4) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Crisp engraved circular text around the center medallion
  const drawArcText = (text: string, radius: number, centerAngle: number, step: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = 'rgba(34, 38, 42, 0.72)';
    ctx.font = '600 17px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const totalSpan = (text.length - 1) * step;
    const startAngle = centerAngle - totalSpan * 0.5;
    for (let i = 0; i < text.length; i++) {
      const angle = startAngle + i * step;
      ctx.save();
      ctx.rotate(angle);
      ctx.fillText(text[i], 0, -radius);
      ctx.restore();
    }
    ctx.restore();
  };

  if (watch.brand === 'AVI-8') {
    drawArcText('AVI-8 SPITFIRE LOCK CHRONO', 136, 0, 0.075);
    drawArcText(`REF. ${watch.reference} · BRONZE GREEN`, 136, Math.PI, 0.072);

    ctx.save();
    ctx.strokeStyle = 'rgba(34, 38, 42, 0.5)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy - 58, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - 58, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (watch.brand === 'OMEGA') {
    drawArcText('FLIGHT-QUALIFIED BY NASA', 136, 0, 0.078);
    drawArcText('SPEEDMASTER · MOONWATCH', 136, Math.PI, 0.078);
  } else if (watch.brand === 'AUDEMARS PIGUET') {
    drawArcText('ROYAL OAK · EXTRA-THIN', 136, 0, 0.08);
    drawArcText(`REF. ${watch.reference} · LE BRASSUS`, 136, Math.PI, 0.076);
  } else if (watch.brand === 'PATEK PHILIPPE') {
    drawArcText('PATEK PHILIPPE GENEVE', 136, 0, 0.082);
    drawArcText(`NAUTILUS · REF. ${watch.reference}`, 136, Math.PI, 0.074);
  } else if (watch.brand === 'CARTIER') {
    drawArcText('SANTOS DE CARTIER · WATER RESISTANT', 136, 0, 0.068);
    drawArcText(`SWISS MADE · ${watch.reference}`, 136, Math.PI, 0.078);
  } else if (watch.brand === 'JAEGER-LECOULTRE') {
    drawArcText('JAEGER-LECOULTRE · REVERSO DUOFACE', 136, 0, 0.068);
    drawArcText(`MANUFACTURE LE SENTIER · ${watch.reference}`, 136, Math.PI, 0.064);
  } else if (watch.brand === 'GRAND SEIKO') {
    drawArcText('GRAND SEIKO · SPRING DRIVE', 136, 0, 0.076);
    drawArcText(`ZARATSU POLISH · ${watch.reference}`, 136, Math.PI, 0.072);
  } else if (watch.brand === 'A. LANGE & SÖHNE') {
    drawArcText('A. LANGE & SOHNE · GLASHUTTE I/SA', 136, 0, 0.068);
    drawArcText(`CALIBER L121.3 · ${watch.reference}`, 136, Math.PI, 0.072);
  } else if (watch.brand === 'RICHARD MILLE') {
    drawArcText('RICHARD MILLE · SWISS RACING MACHINE', 136, 0, 0.064);
    drawArcText(`GRADE 5 TITANIUM · ${watch.reference}`, 136, Math.PI, 0.066);
  } else {
    drawArcText('ROLEX OYSTER PERPETUAL', 136, 0, 0.082);
    drawArcText(`REF. ${watch.reference} · GENEVE`, 136, Math.PI, 0.082);
  }

  // Optional bespoke user engraving rendered cleanly across center medallion
  const cleaned = customEngraving?.trim().slice(0, 18);
  if (cleaned) {
    ctx.save();
    ctx.fillStyle = 'rgba(28, 32, 36, 0.78)';
    ctx.font = 'italic 600 22px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cleaned.toUpperCase(), cx, cy);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createSapphireCoronetTexture(maxAnisotropy: number): THREE.CanvasTexture {
  return getCachedTexture(`coronet:${maxAnisotropy}`, () => {
    const size = 512;
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    // Microscopic laser-etched Rolex 5-point crown watermark at 6 o'clock (visible under 2.5x Loupe)
    drawCrownIcon(ctx, size * 0.5, size * 0.915, 0.42, 'rgba(244, 248, 255, 0.34)');

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    return tex;
  });
}

export function createSkyDwellerDiscTexture(maxAnisotropy: number): THREE.CanvasTexture {
  return getCachedTexture(`skydisc:${maxAnisotropy}`, () => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;

    ctx.fillStyle = '#E6E8EB';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.49, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#C9A857';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#181B1F';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const rNum = size * 0.36;
    for (let h = 2; h <= 24; h += 2) {
      const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.rotate(a + Math.PI / 2);
      ctx.font = '700 32px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(String(h), 0, -rNum);
      ctx.restore();
    }
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    return tex;
  });
}

export function createCausticsFloorTexture(): THREE.CanvasTexture {
  return getCachedTexture('causticsFloor', () => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    // Subtle intersecting caustic light ribbons
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 42; i++) {
      const x = (i * 137) % size;
      const y = (i * 211) % size;
      const r = 48 + (i % 5) * 22;
      const g = ctx.createRadialGradient(x, y, r * 0.45, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.75, 'rgba(65, 195, 235, 0.14)');
      g.addColorStop(0.9, 'rgba(175, 240, 255, 0.24)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Radial vignette fade so floor edges melt smoothly into horizon
    ctx.globalCompositeOperation = 'destination-in';
    const mask = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size * 0.49);
    mask.addColorStop(0, 'rgba(255,255,255,1)');
    mask.addColorStop(0.65, 'rgba(255,255,255,0.65)');
    mask.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = mask;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return tex;
  });
}

export function createReversoBackDialTexture(maxAnisotropy: number): THREE.CanvasTexture {
  return getCachedTexture(`reversoBack:${maxAnisotropy}`, () => {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.48;

    ctx.fillStyle = '#EBE6DC';
    ctx.fillRect(0, 0, size, size);

    // Clous de Paris hobnail guilloche grid on reverse Duoface dial
    const pitch = 20;
    for (let y = 0; y < size; y += pitch) {
      for (let x = 0; x < size; x += pitch) {
        ctx.fillStyle = ((x + y) / pitch) % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.22)';
        ctx.fillRect(x, y, pitch - 1, pitch - 1);
      }
    }

    ctx.save();
    ctx.translate(cx, cy);
    const rw = radius * 0.6;
    const rh = radius * 0.85;

    ctx.strokeStyle = '#1B222C';
    ctx.lineWidth = 3;
    ctx.strokeRect(-rw, -rh, rw * 2, rh * 2);

    // Upper main dual-time ring + lower 24h Day/Night sub-register
    ctx.beginPath();
    ctx.arc(0, -108, 178, 0, Math.PI * 2);
    ctx.fillStyle = '#F7F4EE';
    ctx.fill();
    ctx.strokeStyle = '#252B33';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1B222C';
    ctx.font = '700 20px Georgia, serif';
    ctx.fillText('JAEGER-LECOULTRE', 0, -210);
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.fillText('HOME TIME · DUOFACE', 0, -34);

    // Lower 24-hour Night / Day subdial
    ctx.beginPath();
    ctx.arc(0, 210, 118, 0, Math.PI * 2);
    ctx.fillStyle = '#15253D';
    ctx.fill();
    ctx.strokeStyle = '#B89B5E';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#F7E7B8';
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.fillText('24H', 0, 148);
    ctx.fillText('12', 0, 272);
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    return tex;
  });
}

export function createMoonphaseDiscTexture(maxAnisotropy: number): THREE.CanvasTexture {
  return getCachedTexture(`moonphase:${maxAnisotropy}`, () => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;

    const sky = ctx.createRadialGradient(cx, cy, 10, cx, cy, size * 0.5);
    sky.addColorStop(0, '#13244D');
    sky.addColorStop(1, '#070E22');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, size, size);

    // Golden starfield across lunar wheel
    for (let i = 0; i < 64; i++) {
      const a = i * 2.39996;
      const r = 34 + ((i * 37) % 190);
      ctx.fillStyle = i % 3 === 0 ? '#FDE68A' : '#F3E8C8';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, i % 4 === 0 ? 3.2 : 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Twin opposing 18ct gold full moons on the 59-tooth lunar disc
    [-1, 1].forEach((dir) => {
      const mx = cx + dir * 116;
      const moonGrad = ctx.createRadialGradient(mx - 12, cy - 12, 8, mx, cy, 56);
      moonGrad.addColorStop(0, '#FFF5D0');
      moonGrad.addColorStop(0.65, '#E4BA5A');
      moonGrad.addColorStop(1, '#9E7726');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(mx, cy, 56, 0, Math.PI * 2);
      ctx.fill();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    return tex;
  });
}



