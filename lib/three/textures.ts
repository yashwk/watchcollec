import * as THREE from 'three';
import { BezelOption, DialOption, WatchBrand, WatchSpec } from '@/lib/watches';
import {
  drawArcPadText,
  drawBezelEngravedText,
  drawDialCartouche,
  drawPadText,
  drawSevenSegmentString,
  horoFont,
} from './typography';

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

/**
 * Disposes and clears text-bearing cached static textures so they re-render
 * crisply once web fonts finish loading via document.fonts.ready.
 */
export function invalidateStaticTextTextures() {
  for (const [key, tex] of staticTextureCache.entries()) {
    if (
      key.startsWith('skydisc:') ||
      key.startsWith('reversoBack:') ||
      key.startsWith('quartz-pcb:')
    ) {
      tex.dispose();
      staticTextureCache.delete(key);
    }
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
  hours24?: number;
  minutes?: number;
  seconds?: number;
}

export function createDialTexture(
  watch: WatchSpec,
  dial: DialOption,
  maxAnisotropy: number,
  dateOverride?: DialDateOverride,
  reuseTexture?: THREE.CanvasTexture
): THREE.CanvasTexture {
  const logicalSize = 1024;
  const isFastDigital =
    watch.id === 'casio-gshock-dw5600' || watch.id === 'casio-f91w';
  const scaleFactor = isFastDigital ? 1 : 2;
  const targetPx = logicalSize * scaleFactor;
  const canReuse =
    reuseTexture !== undefined &&
    reuseTexture.image instanceof HTMLCanvasElement &&
    reuseTexture.image.width === targetPx &&
    reuseTexture.image.height === targetPx;
  const canvas = canReuse
    ? (reuseTexture.image as HTMLCanvasElement)
    : (() => {
        const c = document.createElement('canvas');
        c.width = targetPx;
        c.height = targetPx;
        return c;
      })();
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);

  const finishTex = (): THREE.CanvasTexture => {
    if (canReuse && reuseTexture) {
      reuseTexture.needsUpdate = true;
      return reuseTexture;
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAnisotropy;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  };

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
  } else if (watch.id === 'breguet-classique') {
    // Classic engine-turned Clous de Paris hobnail guilloche center field
    const pitch = 16;
    for (let y = 0; y < logicalSize; y += pitch) {
      for (let x = 0; x < logicalSize; x += pitch) {
        const dx = x + pitch * 0.5 - cx;
        const dy = y + pitch * 0.5 - cy;
        if (Math.hypot(dx, dy) < radius * 0.68) {
          const g = ctx.createLinearGradient(x, y, x + pitch, y + pitch);
          g.addColorStop(0, 'rgba(255,255,255,0.45)');
          g.addColorStop(0.5, 'rgba(180,175,165,0.08)');
          g.addColorStop(1, 'rgba(60,55,48,0.22)');
          ctx.fillStyle = g;
          ctx.fillRect(x, y, pitch - 1, pitch - 1);
        }
      }
    }
  } else if (watch.id === 'omega-seamaster') {
    // Laser-engraved ZrO2 sinusoidal wave pattern across dial center
    ctx.save();
    ctx.strokeStyle = dial.lightText ? 'rgba(255,255,255,0.16)' : 'rgba(10,20,35,0.16)';
    ctx.lineWidth = 4.5;
    for (let wy = cy - radius * 0.78; wy <= cy + radius * 0.78; wy += 48) {
      ctx.beginPath();
      for (let wx = cx - radius * 0.88; wx <= cx + radius * 0.88; wx += 8) {
        const yOff = Math.sin((wx - cx) * 0.036) * 14;
        if (wx === cx - radius * 0.88) ctx.moveTo(wx, wy + yOff);
        else ctx.lineTo(wx, wy + yOff);
      }
      ctx.stroke();
    }
    ctx.restore();
  } else if (watch.id === 'gp-laureato') {
    // Deep Clous de Paris hobnail pyramid grid
    const pitch = 20;
    for (let y = 0; y < logicalSize; y += pitch) {
      for (let x = 0; x < logicalSize; x += pitch) {
        const g = ctx.createLinearGradient(x, y, x + pitch - 2, y + pitch - 2);
        g.addColorStop(0, 'rgba(255,255,255,0.2)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.03)');
        g.addColorStop(1, 'rgba(0,0,0,0.44)');
        ctx.fillStyle = g;
        ctx.fillRect(x + 1, y + 1, pitch - 3, pitch - 3);
      }
    }
  } else if (watch.id === 'gs-white-birch') {
    // Sculpted Iwate White Birch vertical organic bark ridges
    for (let x = 0; x < logicalSize; x += 6) {
      const wave = Math.sin(x * 0.085) * 0.5 + 0.5;
      const g = ctx.createLinearGradient(x, 0, x + 6, 0);
      g.addColorStop(0, `rgba(255,255,255,${0.26 + wave * 0.2})`);
      g.addColorStop(0.55, 'rgba(175,184,196,0.12)');
      g.addColorStop(1, `rgba(110,122,138,${0.18 + (1 - wave) * 0.14})`);
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 6, logicalSize);
    }
    for (let i = 0; i < 650; i++) {
      const gx = (i * 173) % logicalSize;
      const gy = (i * 257) % logicalSize;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(120,132,146,0.16)';
      ctx.fillRect(gx, gy, 3, 28 + (i % 42));
    }
  } else if (watch.id === 'piaget-polo-79') {
    // Horizontal brushed gold alternating with mirror-polished gadroon ribs
    for (let y = 0; y < logicalSize; y += 36) {
      const rib = ctx.createLinearGradient(0, y, 0, y + 12);
      rib.addColorStop(0, 'rgba(255,250,224,0.65)');
      rib.addColorStop(0.5, 'rgba(255,245,205,0.22)');
      rib.addColorStop(1, 'rgba(115,82,22,0.45)');
      ctx.fillStyle = rib;
      ctx.fillRect(0, y, logicalSize, 12);
      ctx.fillStyle = 'rgba(120,88,24,0.12)';
      ctx.fillRect(0, y + 12, logicalSize, 24);
    }
  } else if (watch.id === 'moser-streamliner') {
    // Signature H. Moser dramatic smoked fumé sunburst vignette
    const fume = ctx.createRadialGradient(cx, cy, radius * 0.08, cx, cy, radius * 0.96);
    fume.addColorStop(0, 'rgba(72, 186, 122, 0.45)');
    fume.addColorStop(0.52, 'rgba(22, 92, 58, 0.18)');
    fume.addColorStop(0.84, 'rgba(4, 14, 9, 0.72)');
    fume.addColorStop(1, 'rgba(2, 6, 4, 0.94)');
    ctx.fillStyle = fume;
    ctx.fillRect(0, 0, logicalSize, logicalSize);
  } else if (
    watch.id === 'tudor-bb58' ||
    watch.id === 'panerai-luminor' ||
    watch.id === 'mbf-lm101' ||
    watch.id === 'bulgari-octo-finissimo' ||
    watch.id === 'hamilton-murph'
  ) {
    // Matte micro-grained / frosted / sandblasted titanium texture
    for (let i = 0; i < 4200; i++) {
      const gx = (i * 197) % logicalSize;
      const gy = (i * 311) % logicalSize;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.028)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(gx, gy, 2, 2);
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
        drawPadText(ctx, mLabel, Math.cos(a) * (radius * 0.845), Math.sin(a) * (radius * 0.845), {
          role: 'condensed',
          weight: 700,
          size: 17,
          color: '#FB923C',
          tracking: 0.6,
          halo: 'dark',
          inkStroke: 0.4,
        });
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
    for (let s = 5; s <= 60; s += 5) {
      const a = (s / 60) * Math.PI * 2 - Math.PI / 2;
      drawPadText(
        ctx,
        s === 60 ? '60' : String(s).padStart(2, '0'),
        Math.cos(a) * (radius * 0.822),
        Math.sin(a) * (radius * 0.822),
        {
          role: 'condensed',
          weight: 600,
          size: 18,
          color: s === 60 ? '#E85C45' : softCream,
          tracking: 0.6,
          halo: 'dark',
        }
      );
    }

    // Bold layered luminous Arabic hour indices (skip 3, 6, 9 for bi-compax & 6h tunnel date)
    for (let h = 1; h <= 12; h++) {
      if (h === 3 || h === 6 || h === 9) continue;
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      const rx = Math.cos(a) * (radius * 0.68);
      const ry = Math.sin(a) * (radius * 0.68);
      if (h === 12) {
        ctx.fillStyle = bronzeRim;
        ctx.beginPath();
        ctx.roundRect(-25, ry - 21, 50, 42, 6);
        ctx.fill();
        drawPadText(ctx, '12', 0, ry + 1, {
          role: 'condensed',
          weight: 700,
          size: 40,
          color: creamInk,
          tracking: 1,
          halo: 'dark',
        });
      } else {
        drawPadText(ctx, String(h), rx, ry, {
          role: 'condensed',
          weight: 700,
          size: 46,
          color: creamInk,
          halo: 'dark',
          inkStroke: 0.5,
        });
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
      sub.labels.forEach((lbl) => {
        const a = (lbl.idx / lbl.n) * Math.PI * 2 - Math.PI / 2;
        drawPadText(
          ctx,
          lbl.val,
          sub.x + Math.cos(a) * (sr - 34),
          sub.y + Math.sin(a) * (sr - 34),
          { role: 'condensed', weight: 600, size: 18, color: creamInk, halo: 'dark' }
        );
      });

      drawPadText(ctx, sub.title, sub.x, sub.y + 24, {
        role: 'condensed',
        weight: 600,
        size: 13,
        color: '#E0543E',
        tracking: 1.4,
      });
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

    drawPadText(ctx, 'AVI-8', 0, -118, {
      role: 'condensed',
      weight: 700,
      size: 34,
      color: creamInk,
      tracking: 6.5,
      finish: dial.lightText ? 'silver' : 'dark-metallic',
      halo: dial.lightText ? 'dark' : 'none',
    });
    drawPadText(ctx, 'SPITFIRE LOCK', 0, -86, {
      role: 'sans',
      weight: 700,
      size: 14,
      color: bronzeRim,
      tracking: 3.4,
      halo: 'dark',
    });
    drawPadText(ctx, 'CHRONOGRAPH · 5 ATM', 0, 126, {
      role: 'condensed',
      weight: 600,
      size: 13,
      color: softCream,
      tracking: 2.2,
      halo: 'dark',
    });

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

    drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), 0, dy + 1, {
      role: 'mono',
      weight: 700,
      size: 31,
      color: creamInk,
    });

    drawArcPadText(ctx, 'HAWKER SPITFIRE', 0, 0, radius * 0.76, Math.PI, {
      role: 'condensed',
      weight: 600,
      size: 12,
      color: softCream,
      tracking: 3.4,
      bottomArc: true,
    });
    ctx.restore();

    return finishTex();
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

    drawPadText(ctx, 'Ω', 0, -190, {
      role: 'engraved',
      weight: 700,
      size: 36,
      color: ink,
      finish: dial.lightText ? 'silver' : 'dark-metallic',
    });
    drawPadText(ctx, 'OMEGA', 0, -148, {
      role: 'sans',
      weight: 600,
      size: 25,
      color: ink,
      tracking: 6.2,
      finish: dial.lightText ? 'silver' : 'dark-metallic',
      inkStroke: 0.35,
    });
    drawPadText(ctx, 'Speedmaster', 0, -114, {
      role: 'serif',
      weight: 600,
      size: 24,
      italic: true,
      color: ink,
      tracking: 0.8,
      halo: dial.lightText ? 'dark' : 'none',
    });
    drawPadText(ctx, 'PROFESSIONAL', 0, -88, {
      role: 'condensed',
      weight: 600,
      size: 13.5,
      color: mutedInk,
      tracking: 3.2,
      inkStroke: 0.25,
    });

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
      sub.ticks.forEach((num, idx) => {
        const a = ((idx + 1) / sub.ticks.length) * Math.PI * 2 - Math.PI / 2;
        drawPadText(ctx, String(num), sub.x + Math.cos(a) * (sr - 34), sub.y + Math.sin(a) * (sr - 34), {
          role: 'condensed',
          weight: 600,
          size: 18,
          color: ink,
        });
      });
      ctx.restore();
    });

    drawArcPadText(ctx, 'SWISS MADE', 0, 0, radius * 0.855, Math.PI, {
      role: 'sans',
      weight: 600,
      size: 12,
      color: mutedInk,
      tracking: 3.4,
      bottomArc: true,
    });
    ctx.restore();

    return finishTex();
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

    // Authentic Petite Tapisserie smooth signature cartouche behind AUDEMARS PIGUET
    drawDialCartouche(ctx, 0, -138, 256, 36, dial.baseHex, {
      radius: 3,
      borderColor: 'rgba(0,0,0,0.28)',
      borderWidth: 1.5,
      opacity: 0.92,
    });
    // Authentic Ref. 16202 applied AP monogram at 6 o'clock (or upper register)
    drawPadText(ctx, 'AP', 0, -182, {
      role: 'engraved',
      weight: 700,
      size: 32,
      color: '#EEF2F6',
      tracking: 2.2,
      finish: 'silver',
      halo: 'dark',
    });
    drawPadText(ctx, 'AUDEMARS PIGUET', 0, -138, {
      role: 'sans',
      weight: 600,
      size: 16.5,
      color: ink,
      tracking: 3.0,
      halo: dial.lightText ? 'dark' : 'none',
      inkStroke: 0.3,
    });
    drawDialCartouche(ctx, 0, 152, 134, 26, dial.baseHex, {
      radius: 3,
      opacity: 0.86,
    });
    drawPadText(ctx, 'AUTOMATIC', 0, 152, {
      role: 'sans',
      weight: 600,
      size: 12.5,
      color: mutedInk,
      tracking: 3.2,
      halo: dial.lightText ? 'dark' : 'none',
    });
    drawPadText(ctx, 'SWISS MADE', 0, radius * 0.785, {
      role: 'sans',
      weight: 600,
      size: 11.5,
      color: mutedInk,
      tracking: 3.0,
      halo: dial.lightText ? 'dark' : 'none',
    });

    // 3 o'clock beveled date window (matching dial color or dark backing)
    const dx = radius * 0.62;
    ctx.fillStyle = '#0D131D';
    ctx.strokeStyle = '#D2D7DC';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(dx - 38, -28, 76, 56, 4);
    ctx.fill();
    ctx.stroke();
    drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), dx, 2, {
      role: 'condensed',
      weight: 600,
      size: 36,
      color: '#F4F6F8',
      tracking: 1,
    });
    ctx.restore();

    return finishTex();
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

    // Authentic Nautilus flat signature cartouche interrupting horizontal grooves
    drawDialCartouche(ctx, 0, -128, 250, 62, dial.baseHex, {
      radius: 4,
      opacity: 0.93,
    });
    drawPadText(ctx, 'PATEK PHILIPPE', 0, -141, {
      role: 'engraved',
      weight: 600,
      size: 20,
      color: ink,
      tracking: 2.8,
      finish: dial.lightText ? 'silver' : 'dark-metallic',
      halo: dial.lightText ? 'dark' : 'none',
    });
    drawPadText(ctx, 'GENÈVE', 0, -112, {
      role: 'engraved',
      weight: 500,
      size: 13.5,
      color: mutedInk,
      tracking: 4.0,
      halo: dial.lightText ? 'dark' : 'none',
    });
    drawPadText(ctx, 'SWISS', 0, radius * 0.785, {
      role: 'sans',
      weight: 600,
      size: 11.5,
      color: mutedInk,
      tracking: 3.4,
      halo: dial.lightText ? 'dark' : 'none',
    });

    const dx = radius * 0.62;
    ctx.fillStyle = '#F6F5F0';
    ctx.strokeStyle = '#C9CFD4';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(dx - 38, -28, 76, 56, 4);
    ctx.fill();
    ctx.stroke();
    drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), dx, 2, {
      role: 'condensed',
      weight: 600,
      size: 36,
      color: '#121518',
      tracking: 0.8,
    });
    ctx.restore();

    return finishTex();
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
      ctx.font = horoFont('engraved', 700, 48);
      ctx.fillText(rom, 0, 0);
      if (rom === 'VII') {
        // Cartier secret micro-signature in VII stroke (visible under 2.5x Loupe)
        drawPadText(ctx, 'CARTIER', -6, -16, {
          role: 'sans',
          weight: 700,
          size: 7.5,
          color: '#14171A',
          tracking: 0.6,
        });
      }
      ctx.restore();
    });

    drawPadText(ctx, 'CARTIER', 0, -124, {
      role: 'engraved',
      weight: 700,
      size: 27,
      color: '#14171A',
      tracking: 6.4,
      inkStroke: 0.35,
    });
    drawPadText(ctx, 'AUTOMATIC', 0, 128, {
      role: 'sans',
      weight: 600,
      size: 13,
      color: '#2B2F36',
      tracking: 3.4,
    });
    drawPadText(ctx, 'SWISS MADE', 0, radius * 0.855, {
      role: 'sans',
      weight: 600,
      size: 11,
      color: '#2B2F36',
      tracking: 3.2,
    });
    ctx.restore();

    return finishTex();
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

    drawPadText(ctx, 'JAEGER-LECOULTRE', 0, -rh * 0.44, {
      role: 'engraved',
      weight: 600,
      size: 18.5,
      color: ink,
      tracking: 2.2,
      finish: dial.lightText ? 'silver' : 'dark-metallic',
      halo: dial.lightText ? 'dark' : 'none',
    });
    drawPadText(ctx, 'REVERSO', 0, -rh * 0.32, {
      role: 'sans',
      weight: 600,
      size: 12,
      color: mutedInk,
      tracking: 3.8,
    });
    drawPadText(ctx, 'SWISS MADE', 0, rh * 0.94, {
      role: 'sans',
      weight: 600,
      size: 10.5,
      color: mutedInk,
      tracking: 2.8,
    });
    ctx.restore();

    return finishTex();
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

    drawPadText(ctx, 'GS', 0, -172, {
      role: 'serif',
      weight: 700,
      size: 46,
      color: ink,
      tracking: 2.4,
      finish: dial.lightText ? 'silver' : 'dark-metallic',
      halo: dial.lightText ? 'dark' : 'light',
    });
    drawPadText(ctx, 'Grand Seiko', 0, -128, {
      role: 'serif',
      weight: 600,
      size: 29,
      color: ink,
      tracking: 1.0,
      halo: dial.lightText ? 'dark' : 'light',
    });
    drawPadText(ctx, 'SPRING DRIVE', 0, 126, {
      role: 'sans',
      weight: 600,
      size: 14,
      color: mutedInk,
      tracking: 3.4,
      halo: dial.lightText ? 'dark' : 'light',
    });

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
    drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), dx, 2, {
      role: 'condensed',
      weight: 600,
      size: 38,
      color: '#14171A',
    });

    drawArcPadText(ctx, 'MADE IN JAPAN', 0, 0, radius * 0.855, Math.PI, {
      role: 'sans',
      weight: 600,
      size: 11,
      color: mutedInk,
      tracking: 3.0,
      bottomArc: true,
    });
    ctx.restore();

    return finishTex();
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
    ctx.font = horoFont('engraved', 700, 23);
    langeRomans.forEach((lbl, idx) => {
      const a = (idx / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(lbl, mx + Math.cos(a) * (mr - 44), my + Math.sin(a) * (mr - 44));
    });
    drawPadText(ctx, 'A. LANGE & SÖHNE', mx, my - 64, {
      role: 'engraved',
      weight: 700,
      size: 16.5,
      color: ink,
      tracking: 1.6,
      inkStroke: 0.25,
    });
    drawPadText(ctx, 'GLASHÜTTE I/SA', mx, my - 42, {
      role: 'sans',
      weight: 600,
      size: 10.5,
      color: mutedInk,
      tracking: 2.2,
    });

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
    drawPadText(ctx, dayStr[0], bdx - 37, bdy + 2, {
      role: 'condensed',
      weight: 600,
      size: 58,
      color: '#14171A',
    });
    drawPadText(ctx, dayStr[1], bdx + 33, bdy + 2, {
      role: 'condensed',
      weight: 600,
      size: 58,
      color: '#14171A',
    });

    // AUF / AB Power Reserve Indicator at 3 o'clock (240, 12)
    const prx = 246;
    const pry = 12;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(prx, pry, 82, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();
    drawPadText(ctx, 'AUF', prx + 34, pry - 86, {
      role: 'condensed',
      weight: 700,
      size: 15,
      color: ink,
      tracking: 1.6,
    });
    drawPadText(ctx, 'AB', prx + 34, pry + 86, {
      role: 'condensed',
      weight: 700,
      size: 15,
      color: '#B91C1C',
      tracking: 1.6,
    });

    // Lower-Right Moonphase + Small Seconds Sub-Register Frame (150, 185)
    ctx.strokeStyle = '#C99672';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(150, 185, 114, 0, Math.PI * 2);
    ctx.stroke();

    drawArcPadText(ctx, 'MADE IN GERMANY', 0, 0, radius * 0.885, Math.PI, {
      role: 'sans',
      weight: 600,
      size: 11,
      color: mutedInk,
      tracking: 2.8,
      bottomArc: true,
    });
    ctx.restore();

    return finishTex();
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

    drawPadText(ctx, 'RICHARD MILLE', 0, -210, {
      role: 'condensed',
      weight: 700,
      size: 25,
      color: '#F8FAFC',
      tracking: 4.5,
      finish: 'silver',
      halo: 'dark',
    });
    drawPadText(ctx, 'RM 11-03 · TOURBILLON CHRONO', 0, -176, {
      role: 'mono',
      weight: 700,
      size: 12.5,
      color: '#F59E0B',
      tracking: 1.6,
      halo: 'dark',
    });

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
      drawPadText(ctx, sub.lbl, sub.x, sub.y + 52, {
        role: 'condensed',
        weight: 700,
        size: 12.5,
        color: '#F59E0B',
        tracking: 1.8,
        halo: 'dark',
      });
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'vc-overseas') {
    ctx.save();
    ctx.translate(cx, cy);

    // Authentic 4520V stepped velvet outer seconds/minute flange (slightly deeper satin tone)
    ctx.strokeStyle = dial.lightText ? 'rgba(4, 14, 34, 0.34)' : 'rgba(18, 26, 38, 0.1)';
    ctx.lineWidth = 42;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.905, 0, Math.PI * 2);
    ctx.stroke();

    // Inner & outer concentric chapter hairlines framing the velvet flange
    ctx.strokeStyle = dial.lightText ? 'rgba(235, 242, 252, 0.28)' : 'rgba(20, 26, 34, 0.25)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.858, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.946, 0, Math.PI * 2);
    ctx.stroke();

    // Crisp 60-division minute/seconds track + outer luminous hour pips
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const maj = i % 5 === 0;
      ctx.strokeStyle = maj ? ink : mutedInk;
      ctx.lineWidth = maj ? 3.0 : 1.4;
      ctx.beginPath();
      ctx.moveTo(
        Math.cos(a) * radius * (maj ? 0.865 : 0.892),
        Math.sin(a) * radius * (maj ? 0.865 : 0.892)
      );
      ctx.lineTo(Math.cos(a) * radius * 0.94, Math.sin(a) * radius * 0.94);
      ctx.stroke();
    }

    // Signature typography positioned cleanly beneath the sculpted 3D applied Maltese Cross (y = +0.46 * dialR)
    drawPadText(ctx, 'VACHERON CONSTANTIN', 0, -130, {
      role: 'engraved',
      weight: 600,
      size: 19,
      color: ink,
      tracking: 2.6,
      finish: dial.lightText ? 'silver' : 'dark-metallic',
      halo: dial.lightText ? 'dark' : 'none',
    });
    drawPadText(ctx, 'GENÈVE', 0, -100, {
      role: 'engraved',
      weight: 500,
      size: 13.5,
      color: mutedInk,
      tracking: 4.4,
    });
    // Authentic 4520V lower dial stays uncluttered — only curved SWISS MADE framing 6 o'clock
    drawArcPadText(ctx, 'SWISS MADE', 0, 0, radius * 0.895, Math.PI, {
      role: 'sans',
      weight: 600,
      size: 11,
      color: mutedInk,
      tracking: 3.4,
      bottomArc: true,
    });

    // 3 o'clock color-matched beveled date aperture (deep lacquer navy disc on dark dials)
    const dx = radius * 0.655;
    const dateBg = dial.lightText ? '#0A254E' : '#F4F2EC';
    const dateInk = dial.lightText ? '#F8FAFC' : '#121518';
    ctx.fillStyle = dateBg;
    ctx.strokeStyle = '#DCE2E8';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.roundRect(dx - 37, -27, 74, 54, 4);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(dx - 33, -23, 66, 46, 2);
    ctx.stroke();
    drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), dx, 1.5, {
      role: 'condensed',
      weight: 600,
      size: 35,
      color: dateInk,
      halo: dial.lightText ? 'dark' : 'none',
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'omega-seamaster') {
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const maj = i % 5 === 0;
      ctx.strokeStyle = maj ? ink : mutedInk;
      ctx.lineWidth = maj ? 3.5 : 1.6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * (maj ? 0.875 : 0.905), Math.sin(a) * radius * (maj ? 0.875 : 0.905));
      ctx.lineTo(Math.cos(a) * radius * 0.945, Math.sin(a) * radius * 0.945);
      ctx.stroke();
    }

    drawPadText(ctx, 'Ω', 0, -184, {
      role: 'engraved',
      weight: 700,
      size: 34,
      color: ink,
      finish: dial.lightText ? 'silver' : 'dark-metallic',
      halo: dial.lightText ? 'dark' : 'none',
    });
    drawPadText(ctx, 'OMEGA', 0, -146, {
      role: 'sans',
      weight: 600,
      size: 24,
      color: ink,
      tracking: 6.0,
      finish: dial.lightText ? 'silver' : 'dark-metallic',
      halo: dial.lightText ? 'dark' : 'none',
    });
    drawPadText(ctx, 'Seamaster', 0, -112, {
      role: 'serif',
      weight: 700,
      size: 26,
      color: '#EF4444',
      tracking: 0.9,
      halo: 'dark',
    });

    drawPadText(ctx, '[ZrO2]', 0, -44, {
      role: 'mono',
      weight: 600,
      size: 11.5,
      color: mutedInk,
      tracking: 1.4,
      halo: dial.lightText ? 'dark' : 'none',
    });
    drawPadText(ctx, 'CO-AXIAL', 0, 102, {
      role: 'condensed',
      weight: 600,
      size: 13.5,
      color: mutedInk,
      tracking: 2.8,
      halo: dial.lightText ? 'dark' : 'none',
    });
    drawPadText(ctx, 'MASTER CHRONOMETER', 0, 122, {
      role: 'condensed',
      weight: 600,
      size: 13,
      color: mutedInk,
      tracking: 2.4,
      halo: dial.lightText ? 'dark' : 'none',
    });
    drawPadText(ctx, '300m / 1000ft', 0, 144, {
      role: 'sans',
      weight: 600,
      size: 13.5,
      color: ink,
      tracking: 1.6,
      halo: dial.lightText ? 'dark' : 'none',
    });

    // 6 o'clock trapezoidal date aperture
    const dy = radius * 0.72;
    ctx.fillStyle = '#0B172B';
    ctx.strokeStyle = '#C9CFD4';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-38, dy - 26);
    ctx.lineTo(38, dy - 26);
    ctx.lineTo(30, dy + 26);
    ctx.lineTo(-30, dy + 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), 0, dy + 1, {
      role: 'condensed',
      weight: 600,
      size: 34,
      color: '#F3F4F6',
    });

    drawArcPadText(ctx, 'SWISS MADE', 0, 0, radius * 0.875, Math.PI, {
      role: 'sans',
      weight: 600,
      size: 11.5,
      color: mutedInk,
      tracking: 3.0,
      bottomArc: true,
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'tudor-bb58') {
    const gilt = '#D6AD66';
    ctx.save();
    ctx.translate(cx, cy);
    // Crisp gilt rose-gold railway chapter track
    ctx.strokeStyle = gilt;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.945, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const maj = i % 5 === 0;
      ctx.strokeStyle = gilt;
      ctx.lineWidth = maj ? 3.5 : 1.7;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * (maj ? 0.885 : 0.91), Math.sin(a) * radius * (maj ? 0.885 : 0.91));
      ctx.lineTo(Math.cos(a) * radius * 0.945, Math.sin(a) * radius * 0.945);
      ctx.stroke();
    }

    // Tudor Shield Emblem
    ctx.fillStyle = gilt;
    ctx.beginPath();
    ctx.moveTo(0, -210);
    ctx.lineTo(18, -204);
    ctx.lineTo(15, -180);
    ctx.lineTo(0, -166);
    ctx.lineTo(-15, -180);
    ctx.lineTo(-18, -204);
    ctx.closePath();
    ctx.fill();

    drawPadText(ctx, 'TUDOR', 0, -142, {
      role: 'sans',
      weight: 700,
      size: 26,
      color: gilt,
      tracking: 6.4,
      finish: 'gilt',
      halo: 'dark',
    });
    drawPadText(ctx, 'GENÈVE', 0, -112, {
      role: 'engraved',
      weight: 500,
      size: 14,
      color: gilt,
      tracking: 4.0,
      finish: 'gilt',
    });

    drawPadText(ctx, '200m : 660ft', 0, 118, {
      role: 'sans',
      weight: 600,
      size: 17,
      color: gilt,
      tracking: 1.8,
      finish: 'gilt',
    });
    drawPadText(ctx, 'CHRONOMETER', 0, 146, {
      role: 'condensed',
      weight: 600,
      size: 13.5,
      color: gilt,
      tracking: 2.8,
      finish: 'gilt',
    });
    drawPadText(ctx, 'OFFICIALLY CERTIFIED', 0, 166, {
      role: 'condensed',
      weight: 600,
      size: 13,
      color: gilt,
      tracking: 2.4,
      finish: 'gilt',
    });
    drawArcPadText(ctx, 'SWISS MADE', 0, 0, radius * 0.855, Math.PI, {
      role: 'sans',
      weight: 600,
      size: 11.5,
      color: gilt,
      tracking: 3.2,
      bottomArc: true,
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'panerai-luminor') {
    const panLume = '#D9ECC9';
    ctx.save();
    ctx.translate(cx, cy);
    // Sandwich dial glowing cut-out numerals (12, 6) + recessed luminous bar slots
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let h = 1; h <= 12; h++) {
      if (h === 3 || h === 9) continue;
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      const rr = radius * 0.74;
      const hx = Math.cos(a) * rr;
      const hy = Math.sin(a) * rr;
      if (h === 12 || h === 6) {
        drawPadText(ctx, String(h), hx, hy, {
          role: 'condensed',
          weight: 700,
          size: 72,
          color: panLume,
          tracking: 2,
          halo: 'dark',
          inkStroke: 1.0,
        });
      } else {
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.beginPath();
        ctx.roundRect(-11, -34, 22, 68, 8);
        ctx.fill();
        ctx.fillStyle = panLume;
        ctx.beginPath();
        ctx.roundRect(-7.5, -29, 15, 58, 6);
        ctx.fill();
        ctx.restore();
      }
    }

    // 9 o'clock Small Seconds Sub-Register
    const sx = -radius * 0.44;
    ctx.strokeStyle = 'rgba(217, 236, 201, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, 0, 76, 0, Math.PI * 2);
    ctx.stroke();
    for (let t = 0; t < 12; t++) {
      const ta = (t / 12) * Math.PI * 2;
      ctx.strokeStyle = panLume;
      ctx.lineWidth = t % 3 === 0 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(ta) * 56, Math.sin(ta) * 56);
      ctx.lineTo(sx + Math.cos(ta) * 72, Math.sin(ta) * 72);
      ctx.stroke();
    }

    // 3 o'clock Date Window
    const dx = radius * 0.62;
    ctx.fillStyle = '#0A0B0C';
    ctx.strokeStyle = '#33383E';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(dx - 38, -28, 76, 56, 6);
    ctx.fill();
    ctx.stroke();
    drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), dx, 2, {
      role: 'condensed',
      weight: 600,
      size: 36,
      color: panLume,
    });

    drawPadText(ctx, 'LUMINOR', 0, -148, {
      role: 'condensed',
      weight: 600,
      size: 24,
      color: ink,
      tracking: 6.0,
      halo: 'dark',
    });
    drawPadText(ctx, 'PANERAI', 0, -114, {
      role: 'condensed',
      weight: 700,
      size: 29,
      color: ink,
      tracking: 7.0,
      finish: dial.lightText ? 'silver' : 'dark-metallic',
      halo: 'dark',
    });
    drawPadText(ctx, 'MARINA', 0, 134, {
      role: 'condensed',
      weight: 600,
      size: 19,
      color: mutedInk,
      tracking: 5.0,
    });
    drawPadText(ctx, 'AUTOMATIC · 300M', 0, 162, {
      role: 'sans',
      weight: 600,
      size: 12.5,
      color: mutedInk,
      tracking: 2.6,
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'tag-monaco') {
    ctx.save();
    ctx.translate(cx, cy);
    // Inner circular white minute ring inside square petrol-blue dial
    ctx.strokeStyle = '#F3F4F6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.67, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const maj = i % 5 === 0;
      ctx.strokeStyle = maj ? '#F3F4F6' : 'rgba(243,244,246,0.65)';
      ctx.lineWidth = maj ? 3.5 : 1.6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * (maj ? 0.61 : 0.64), Math.sin(a) * radius * (maj ? 0.61 : 0.64));
      ctx.lineTo(Math.cos(a) * radius * 0.67, Math.sin(a) * radius * 0.67);
      ctx.stroke();
    }

    // Radial polished + crimson-tipped horizontal Monaco hour batons
    for (let h = 0; h < 12; h++) {
      if (h === 3 || h === 6 || h === 9) continue;
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      const bx = Math.cos(a) * radius * 0.74;
      const by = Math.sin(a) * radius * 0.74;
      ctx.save();
      ctx.translate(bx, by);
      ctx.fillStyle = '#E5E7EB';
      ctx.fillRect(-32, -8, 64, 16);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(Math.cos(a) > 0 ? -32 : 20, -8, 12, 16);
      ctx.restore();
    }

    // Twin Rounded-Square Silvered Chrono Subdials (9h & 3h)
    [
      { x: -162, y: 0, lbl: 'MIN' },
      { x: 162, y: 0, lbl: 'SEC' },
    ].forEach((sub) => {
      ctx.fillStyle = '#F3F4F6';
      ctx.strokeStyle = '#9CA3AF';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(sub.x - 76, sub.y - 76, 152, 152, 22);
      ctx.fill();
      ctx.stroke();
      for (let t = 0; t < 12; t++) {
        const ta = (t / 12) * Math.PI * 2 - Math.PI / 2;
        ctx.strokeStyle = '#181C20';
        ctx.lineWidth = t % 3 === 0 ? 3 : 1.5;
        ctx.beginPath();
        ctx.moveTo(sub.x + Math.cos(ta) * 46, sub.y + Math.sin(ta) * 46);
        ctx.lineTo(sub.x + Math.cos(ta) * 60, sub.y + Math.sin(ta) * 60);
        ctx.stroke();
      }
      drawPadText(ctx, sub.lbl, sub.x, sub.y + 34, {
        role: 'condensed',
        weight: 700,
        size: 13.5,
        color: '#181C20',
        tracking: 1.8,
      });
    });

    // Classic Heuer shield + MONACO badge
    ctx.fillStyle = '#F3F4F6';
    ctx.beginPath();
    ctx.moveTo(-26, -214);
    ctx.lineTo(26, -214);
    ctx.lineTo(22, -178);
    ctx.lineTo(0, -162);
    ctx.lineTo(-22, -178);
    ctx.closePath();
    ctx.fill();
    drawPadText(ctx, 'HEUER', 0, -190, {
      role: 'condensed',
      weight: 700,
      size: 13,
      color: '#14171A',
      tracking: 1.0,
    });

    drawPadText(ctx, 'MONACO', 0, -134, {
      role: 'condensed',
      weight: 700,
      size: 24,
      color: ink,
      tracking: 4.4,
      finish: dial.lightText ? 'silver' : 'dark-metallic',
      halo: 'dark',
    });
    drawPadText(ctx, 'CALIBRE 11 · AUTOMATIC', 0, 128, {
      role: 'condensed',
      weight: 600,
      size: 13,
      color: mutedInk,
      tracking: 2.2,
    });

    // 6 o'clock Date Window
    const dy = radius * 0.56;
    ctx.fillStyle = '#F7F6F2';
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-34, dy - 24, 68, 48, 4);
    ctx.fill();
    ctx.stroke();
    drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), 0, dy + 1, {
      role: 'condensed',
      weight: 700,
      size: 32,
      color: '#111827',
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'breitling-navitimer') {
    ctx.save();
    ctx.translate(cx, cy);
    // White circular E6B slide-rule perimeter ring + dense logarithmic graduations
    ctx.strokeStyle = '#F5F2EA';
    ctx.lineWidth = 76;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.87, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#B91C1C';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.79, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 180; i++) {
      const a = (i / 180) * Math.PI * 2 - Math.PI / 2;
      const maj = i % 15 === 0;
      const mid = i % 5 === 0;
      ctx.strokeStyle = maj ? '#B91C1C' : '#181B20';
      ctx.lineWidth = maj ? 2.8 : mid ? 1.8 : 1.0;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * (maj ? 0.79 : mid ? 0.82 : 0.84), Math.sin(a) * radius * (maj ? 0.79 : mid ? 0.82 : 0.84));
      ctx.lineTo(Math.cos(a) * radius * 0.92, Math.sin(a) * radius * 0.92);
      ctx.stroke();
    }

    const slideNums = ['60', '70', '80', '90', '10', '12', '15', '20', '25', '30', '35', '40', '45', '50'];
    ctx.fillStyle = '#181B20';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    slideNums.forEach((lbl, idx) => {
      const a = (idx / slideNums.length) * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.rotate(a + Math.PI / 2);
      drawPadText(ctx, lbl, 0, -radius * 0.925, {
        role: 'condensed',
        weight: 700,
        size: 19,
        color: lbl === '10' || lbl === '60' ? '#B91C1C' : '#181B20',
      });
      ctx.restore();
    });

    // Reverse-Panda contrasting silver tri-compax subdials
    const naviSubs = [
      { x: 162, y: 12, ticks: [10, 20, 30] },
      { x: -162, y: 12, ticks: [20, 40, 60] },
      { x: 0, y: 172, ticks: [3, 6, 9, 12] },
    ];
    naviSubs.forEach((sub, sIdx) => {
      const sr = 86;
      ctx.save();
      ctx.beginPath();
      ctx.arc(sub.x, sub.y, sr, 0, Math.PI * 2);
      ctx.fillStyle = '#F3F1EA';
      ctx.fill();
      ctx.strokeStyle = '#9CA3AF';
      ctx.lineWidth = 3;
      ctx.stroke();
      for (let t = 0; t < 24; t++) {
        const ta = (t / 24) * Math.PI * 2 - Math.PI / 2;
        ctx.strokeStyle = '#14171A';
        ctx.lineWidth = t % 4 === 0 ? 2.4 : 1.1;
        ctx.beginPath();
        ctx.moveTo(sub.x + Math.cos(ta) * (sr - 15), sub.y + Math.sin(ta) * (sr - 15));
        ctx.lineTo(sub.x + Math.cos(ta) * (sr - 6), sub.y + Math.sin(ta) * (sr - 6));
        ctx.stroke();
      }
      sub.ticks.forEach((num, idx) => {
        const a = ((idx + 1) / sub.ticks.length) * Math.PI * 2 - Math.PI / 2;
        drawPadText(ctx, String(num), sub.x + Math.cos(a) * (sr - 30), sub.y + Math.sin(a) * (sr - 30), {
          role: 'condensed',
          weight: 700,
          size: 16,
          color: '#14171A',
        });
      });
      if (sIdx === 2) {
        ctx.fillStyle = '#111827';
        ctx.fillRect(sub.x - 24, sub.y + 30, 48, 34);
        drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), sub.x, sub.y + 48, {
          role: 'condensed',
          weight: 600,
          size: 24,
          color: '#F9FAFB',
        });
      }
      ctx.restore();
    });

    drawPadText(ctx, 'B', 0, -172, {
      role: 'serif',
      weight: 700,
      size: 36,
      italic: true,
      color: '#D4AF37',
      finish: 'gold',
      halo: 'dark',
    });
    drawPadText(ctx, 'BREITLING', 0, -136, {
      role: 'sans',
      weight: 700,
      size: 19,
      color: '#F3F1EA',
      tracking: 4.4,
      finish: 'silver',
      halo: 'dark',
    });
    drawPadText(ctx, 'NAVITIMER', 0, -110, {
      role: 'condensed',
      weight: 600,
      size: 14.5,
      color: '#E2BD6B',
      tracking: 3.2,
      finish: 'gilt',
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'zenith-el-primero') {
    ctx.save();
    ctx.translate(cx, cy);
    // 1/10th-second outer precision chapter track
    for (let i = 0; i < 100; i++) {
      const a = (i / 100) * Math.PI * 2 - Math.PI / 2;
      const maj = i % 10 === 0;
      ctx.strokeStyle = maj ? '#DC2626' : '#1E242B';
      ctx.lineWidth = maj ? 3.2 : 1.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * (maj ? 0.865 : 0.895), Math.sin(a) * radius * (maj ? 0.865 : 0.895));
      ctx.lineTo(Math.cos(a) * radius * 0.945, Math.sin(a) * radius * 0.945);
      ctx.stroke();
    }

    // Iconic Overlapping Tri-Color El Primero Subdials: Slate-Grey (9h), Charcoal (6h), Midnight Blue (3h)
    const triSubs = [
      { x: -138, y: 18, bg: '#C6CBD1', fg: '#14171A', ticks: [20, 40, 60] },
      { x: 0, y: 152, bg: '#373C44', fg: '#F3F4F6', ticks: [15, 30, 45, 60] },
      { x: 138, y: 18, bg: '#1D3C6B', fg: '#F3F4F6', ticks: [20, 40, 60] },
    ];
    triSubs.forEach((sub) => {
      const sr = 104;
      ctx.save();
      ctx.beginPath();
      ctx.arc(sub.x, sub.y, sr, 0, Math.PI * 2);
      ctx.fillStyle = sub.bg;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 3;
      ctx.stroke();
      for (let t = 0; t < 30; t++) {
        const ta = (t / 30) * Math.PI * 2 - Math.PI / 2;
        const maj = t % 5 === 0;
        ctx.strokeStyle = sub.fg;
        ctx.lineWidth = maj ? 2.4 : 1.1;
        ctx.beginPath();
        ctx.moveTo(sub.x + Math.cos(ta) * (sr - (maj ? 18 : 12)), sub.y + Math.sin(ta) * (sr - (maj ? 18 : 12)));
        ctx.lineTo(sub.x + Math.cos(ta) * (sr - 5), sub.y + Math.sin(ta) * (sr - 5));
        ctx.stroke();
      }
      sub.ticks.forEach((num, idx) => {
        const a = ((idx + 1) / sub.ticks.length) * Math.PI * 2 - Math.PI / 2;
        drawPadText(ctx, String(num), sub.x + Math.cos(a) * (sr - 33), sub.y + Math.sin(a) * (sr - 33), {
          role: 'condensed',
          weight: 700,
          size: 17,
          color: sub.fg,
        });
      });
      ctx.restore();
    });

    // Zenith 5-point Star & Branding
    drawPadText(ctx, '★', 0, -196, {
      role: 'engraved',
      weight: 700,
      size: 28,
      color: '#14171A',
      finish: 'dark-metallic',
    });
    drawPadText(ctx, 'ZENITH', 0, -152, {
      role: 'sans',
      weight: 700,
      size: 23,
      color: '#14171A',
      tracking: 6.2,
      inkStroke: 0.3,
    });
    drawPadText(ctx, 'EL PRIMERO · 36,000 VpH', 0, -122, {
      role: 'condensed',
      weight: 700,
      size: 13.5,
      color: '#DC2626',
      tracking: 1.8,
    });

    // 4:30 Trapezoid Date Window
    ctx.save();
    ctx.translate(216, 206);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 3;
    ctx.fillRect(-26, -22, 52, 44);
    ctx.strokeRect(-26, -22, 52, 44);
    drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), 0, 1, {
      role: 'condensed',
      weight: 700,
      size: 28,
      color: '#111827',
    });
    ctx.restore();

    drawArcPadText(ctx, 'SWISS MADE', 0, 0, radius * 0.875, Math.PI, {
      role: 'sans',
      weight: 600,
      size: 11.5,
      color: mutedInk,
      tracking: 3.0,
      bottomArc: true,
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'iwc-big-pilot') {
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const maj = i % 5 === 0;
      ctx.strokeStyle = ink;
      ctx.lineWidth = maj ? 5 : 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * (maj ? 0.85 : 0.89), Math.sin(a) * radius * (maj ? 0.85 : 0.89));
      ctx.lineTo(Math.cos(a) * radius * 0.945, Math.sin(a) * radius * 0.945);
      ctx.stroke();
    }

    // 12 o'clock Aviation Orientation Triangle + Twin Dots
    ctx.fillStyle = '#E8EFE2';
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.82);
    ctx.lineTo(26, -radius * 0.7);
    ctx.lineTo(-26, -radius * 0.7);
    ctx.closePath();
    ctx.fill();
    [-38, 38].forEach((dx) => {
      ctx.beginPath();
      ctx.arc(dx, -radius * 0.76, 9, 0, Math.PI * 2);
      ctx.fill();
    });

    // Crisp luminous cockpit Arabic numerals
    for (let h = 1; h <= 11; h++) {
      if (h === 3 || h === 6) continue;
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      drawPadText(ctx, String(h), Math.cos(a) * radius * 0.69, Math.sin(a) * radius * 0.69, {
        role: 'condensed',
        weight: 600,
        size: 52,
        color: '#EDF2E8',
        halo: 'dark',
      });
    }

    // Inner 24-hour UTC track
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.44, 0, Math.PI * 2);
    ctx.stroke();
    for (let u = 2; u <= 24; u += 2) {
      const a = (u / 24) * Math.PI * 2 - Math.PI / 2;
      drawPadText(ctx, String(u), Math.cos(a) * radius * 0.37, Math.sin(a) * radius * 0.37, {
        role: 'condensed',
        weight: 700,
        size: 17,
        color: '#EF4444',
      });
    }

    // 3 o'clock Power Reserve Gauge
    const prx = radius * 0.54;
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(prx, 0, 74, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();
    drawPadText(ctx, '7 DAYS', prx + 8, 52, {
      role: 'condensed',
      weight: 700,
      size: 14,
      color: '#EF4444',
      tracking: 1.6,
    });

    // 6 o'clock date window
    const dy = radius * 0.66;
    ctx.fillStyle = '#0B0D0F';
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 3;
    ctx.fillRect(-34, dy - 24, 68, 48);
    ctx.strokeRect(-34, dy - 24, 68, 48);
    drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), 0, dy + 1, {
      role: 'condensed',
      weight: 600,
      size: 34,
      color: '#F3F4F6',
    });

    drawPadText(ctx, 'IWC', 0, -158, {
      role: 'engraved',
      weight: 700,
      size: 31,
      color: ink,
      tracking: 6.5,
      finish: dial.lightText ? 'silver' : 'dark-metallic',
      halo: 'dark',
    });
    drawPadText(ctx, 'SCHAFFHAUSEN', 0, -124, {
      role: 'sans',
      weight: 600,
      size: 12.5,
      color: mutedInk,
      tracking: 3.4,
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'breguet-classique') {
    ctx.save();
    ctx.translate(cx, cy);
    // Smooth brushed silvered chapter ring framing the Clous de Paris guilloche center
    ctx.strokeStyle = 'rgba(235, 232, 224, 0.92)';
    ctx.lineWidth = 96;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#8C8579';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.89, 0, Math.PI * 2);
    ctx.stroke();

    // Breguet minute dots + fleur-de-lis 5-minute markers
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const rDot = radius * 0.865;
      ctx.fillStyle = '#181A1E';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rDot, Math.sin(a) * rDot, i % 5 === 0 ? 4.5 : 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Classic calligraphic Breguet Arabic numerals (1–12)
    for (let h = 1; h <= 12; h++) {
      if (h === 3) continue;
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      drawPadText(ctx, String(h), Math.cos(a) * radius * 0.77, Math.sin(a) * radius * 0.77, {
        role: 'serif',
        weight: 700,
        size: 52,
        italic: true,
        color: '#15171A',
      });
    }

    // Cartouche plaque + Secret Breguet signatures flanking 12
    drawDialCartouche(ctx, 0, -140, 216, 46, '#F1EEE7', {
      radius: 4,
      borderColor: '#9C9486',
      borderWidth: 1.8,
      opacity: 0.98,
    });
    drawPadText(ctx, 'Breguet', 0, -140, {
      role: 'serif',
      weight: 700,
      size: 38,
      italic: true,
      color: '#15171A',
      tracking: 0.8,
    });

    drawPadText(ctx, 'Breguet', -58, -radius * 0.63, {
      role: 'serif',
      weight: 600,
      size: 12,
      italic: true,
      color: 'rgba(21,23,26,0.52)',
    });
    drawPadText(ctx, 'Breguet', 58, -radius * 0.63, {
      role: 'serif',
      weight: 600,
      size: 12,
      italic: true,
      color: 'rgba(21,23,26,0.52)',
    });
    drawDialCartouche(ctx, 0, 144, 210, 26, '#F1EEE7', {
      radius: 3,
      opacity: 0.92,
    });
    drawPadText(ctx, 'N° 5177 · SWISS GUILLOCHÉ', 0, 144, {
      role: 'engraved',
      weight: 600,
      size: 11.5,
      color: '#374151',
      tracking: 1.6,
    });

    // 3 o'clock beveled oval date aperture
    const dx = radius * 0.76;
    ctx.fillStyle = '#FAF8F4';
    ctx.strokeStyle = '#8C8579';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(dx - 34, -24, 68, 48, 12);
    ctx.fill();
    ctx.stroke();
    drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), dx, 2, {
      role: 'serif',
      weight: 700,
      size: 36,
      color: '#15171A',
    });
    ctx.restore();

    return finishTex();
  }

  // --- PACK 1: INDEPENDENT & HAUTE HORLOGERIE ---
  if (watch.id === 'fpj-chronometre-bleu') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outer cream minute track
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const maj = i % 5 === 0;
      ctx.strokeStyle = '#F5EFE0';
      ctx.lineWidth = maj ? 3.5 : 1.6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * (maj ? 0.86 : 0.89), Math.sin(a) * radius * (maj ? 0.86 : 0.89));
      ctx.lineTo(Math.cos(a) * radius * 0.93, Math.sin(a) * radius * 0.93);
      ctx.stroke();
    }

    // Iconic Journe tilted cream Arabic numerals
    for (let h = 1; h <= 12; h++) {
      if (h === 7 || h === 8) continue;
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      const rNum = radius * 0.74;
      drawPadText(ctx, String(h), Math.cos(a) * rNum, Math.sin(a) * rNum, {
        role: 'serif',
        weight: 600,
        size: 52,
        italic: true,
        color: '#F7F1E1',
        halo: 'dark',
      });
    }

    // Recessed guilloché small seconds at 7:30
    const sx = -radius * 0.36;
    const sy = radius * 0.28;
    const sr = 104;
    ctx.fillStyle = '#0D438E';
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#E5D9BD';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    for (let r = 18; r < sr - 12; r += 8) {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    [60, 15, 30, 45].forEach((n, i) => {
      const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
      drawPadText(ctx, String(n), sx + Math.cos(a) * (sr - 24), sy + Math.sin(a) * (sr - 24), {
        role: 'serif',
        weight: 700,
        size: 22,
        color: '#F7F1E1',
      });
    });

    drawPadText(ctx, 'F.P. JOURNE', 0, -148, {
      role: 'engraved',
      weight: 700,
      size: 23,
      color: '#F7F1E1',
      tracking: 3.4,
      halo: 'dark',
    });
    drawPadText(ctx, 'Invenit et Fecit', 0, -116, {
      role: 'serif',
      weight: 600,
      size: 21,
      italic: true,
      color: '#DCE6F5',
      tracking: 0.8,
    });
    drawPadText(ctx, 'CHRONOMÈTRE BLEU', 0, 185, {
      role: 'sans',
      weight: 600,
      size: 12.5,
      color: '#E5ECF7',
      tracking: 3.0,
      halo: 'dark',
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'moser-streamliner') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Racing dual-track outer seconds scale (signature Streamliner)
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const maj = i % 5 === 0;
      ctx.strokeStyle = maj ? '#E5E7EB' : 'rgba(229,231,235,0.5)';
      ctx.lineWidth = maj ? 3.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * (maj ? 0.84 : 0.88), Math.sin(a) * radius * (maj ? 0.84 : 0.88));
      ctx.lineTo(Math.cos(a) * radius * 0.93, Math.sin(a) * radius * 0.93);
      ctx.stroke();
    }

    // Minimalist stealth transparent lacquer signature (zero loud text)
    drawPadText(ctx, 'H. MOSER & CIE', 0, -155, {
      role: 'engraved',
      weight: 600,
      size: 18,
      color: 'rgba(255,255,255,0.19)',
      tracking: 3.4,
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'mbf-lm101') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Subtle frosted movement plate rings
    ctx.strokeStyle = 'rgba(220,226,235,0.22)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.91, 0, Math.PI * 2);
    ctx.stroke();

    // Floating white lacquer Time sub-dial (2 o'clock)
    const tx = radius * 0.34;
    const ty = -radius * 0.16;
    const tr = 152;
    ctx.fillStyle = '#F7F5EE';
    ctx.beginPath();
    ctx.arc(tx, ty, tr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#C9A857';
    ctx.lineWidth = 6;
    ctx.stroke();

    const romans = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    ctx.fillStyle = '#15181C';
    ctx.font = horoFont('engraved', 700, 22);
    romans.forEach((r, idx) => {
      const a = (idx / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(r, tx + Math.cos(a) * (tr - 26), ty + Math.sin(a) * (tr - 26));
    });

    // Floating white lacquer 45h Power Reserve sub-dial (6 o'clock)
    const px = 0;
    const py = radius * 0.44;
    const pr = 98;
    ctx.fillStyle = '#F7F5EE';
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#C9A857';
    ctx.lineWidth = 5;
    ctx.stroke();
    drawPadText(ctx, '45H', px, py - 34, {
      role: 'condensed',
      weight: 700,
      size: 15,
      color: '#15181C',
      tracking: 1.4,
    });
    drawPadText(ctx, 'POWER', px, py + 46, {
      role: 'sans',
      weight: 700,
      size: 11.5,
      color: '#15181C',
      tracking: 2.2,
    });
    // Clean 240° arc from 7:30 (red empty) clockwise over 12:00 to 4:30 (full 45H)
    for (let t = 0; t <= 12; t++) {
      const a = Math.PI * 0.78 + (t / 12) * Math.PI * 1.44;
      ctx.strokeStyle = t <= 2 ? '#DC2626' : '#1F242B';
      ctx.lineWidth = t % 3 === 0 ? 3.5 : 2.2;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * (pr - 24), py + Math.sin(a) * (pr - 24));
      ctx.lineTo(px + Math.cos(a) * (pr - 10), py + Math.sin(a) * (pr - 10));
      ctx.stroke();
    }

    // Subtle bridge anchor recess at 9 o'clock & 3 o'clock
    drawPadText(ctx, 'MB&F', -radius * 0.44, -radius * 0.46, {
      role: 'engraved',
      weight: 700,
      size: 20,
      color: '#D4AF37',
      tracking: 2.8,
      finish: 'gold',
    });
    drawPadText(ctx, 'LEGACY MACHINE 101', -radius * 0.36, -radius * 0.37, {
      role: 'condensed',
      weight: 600,
      size: 12,
      color: '#CBD5E1',
      tracking: 1.8,
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'bulgari-octo-finissimo') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Crisp monochrome black architectural markers + 12 & 6 numerals
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      if (h === 0 || h === 6) {
        drawPadText(ctx, h === 0 ? '12' : '6', Math.cos(a) * radius * 0.74, Math.sin(a) * radius * 0.74, {
          role: 'sans',
          weight: 700,
          size: 48,
          color: '#181A1D',
          tracking: 1.5,
        });
      } else {
        ctx.strokeStyle = '#181A1D';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * radius * 0.67, Math.sin(a) * radius * 0.67);
        ctx.lineTo(Math.cos(a) * radius * 0.84, Math.sin(a) * radius * 0.84);
        ctx.stroke();
      }
    }

    // Off-center 7:30 small seconds register
    const sx = -radius * 0.34;
    const sy = radius * 0.25;
    const sr = 92;
    ctx.strokeStyle = '#262A2F';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 60; i += 5) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * (sr - 14), sy + Math.sin(a) * (sr - 14));
      ctx.lineTo(sx + Math.cos(a) * sr, sy + Math.sin(a) * sr);
      ctx.stroke();
    }

    drawPadText(ctx, 'BVLGARI', 0, -148, {
      role: 'engraved',
      weight: 700,
      size: 27,
      color: '#141619',
      tracking: 7.4,
      inkStroke: 0.35,
    });
    drawPadText(ctx, 'OCTO FINISSIMO', 0, 178, {
      role: 'sans',
      weight: 600,
      size: 12.5,
      color: '#1E2226',
      tracking: 3.4,
    });
    ctx.restore();

    return finishTex();
  }

  // --- PACK 2: WORLDTIMERS, FIELD & EXPLORATION ---
  if (watch.id === 'pp-worldtime') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outer ivory 24-city world time ring
    ctx.fillStyle = '#F1EDE4';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.94, 0, Math.PI * 2);
    ctx.fill();

    // Inner 24-hour day/night ring
    ctx.fillStyle = '#182436';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.67, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#EAE4D4';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius * 0.67, -Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();

    // Hand-guilloché charcoal center disc
    ctx.fillStyle = '#2B323C';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    for (let r = 24; r < radius * 0.49; r += 12) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#C9A857';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.67, 0, Math.PI * 2);
    ctx.stroke();

    const cities = [
      'GENEVA', 'CAIRO', 'MOSCOW', 'DUBAI', 'KARACHI', 'DHAKA',
      'BANGKOK', 'HONG KONG', 'TOKYO', 'SYDNEY', 'NOUMEA', 'AUCKLAND',
      'MIDWAY', 'HONOLULU', 'ANCHORAGE', 'DENVER', 'MEXICO', 'NEW YORK',
      'CARACAS', 'RIO', 'S. GEORGIA', 'AZORES', 'LONDON', 'PARIS',
    ];
    cities.forEach((city, idx) => {
      const a = (idx / 24) * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.rotate(a + Math.PI / 2);
      drawPadText(ctx, city, 0, -radius * (idx % 2 === 0 ? 0.86 : 0.76), {
        role: 'condensed',
        weight: 600,
        size: 13.5,
        color: idx === 0 ? '#B91C1C' : '#181A1E',
        tracking: 1.0,
      });
      ctx.restore();

      const h24 = (idx + 12) % 24 || 24;
      ctx.save();
      ctx.rotate(a + Math.PI / 2);
      drawPadText(ctx, String(h24), 0, -radius * 0.585, {
        role: 'condensed',
        weight: 700,
        size: 18,
        color: idx < 12 ? '#14171A' : '#F3F4F6',
      });
      ctx.restore();
    });

    drawPadText(ctx, 'PATEK PHILIPPE', 0, -92, {
      role: 'engraved',
      weight: 700,
      size: 18,
      color: '#F3EFE6',
      tracking: 2.2,
      finish: 'silver',
      halo: 'dark',
    });
    drawPadText(ctx, 'GENÈVE · WORLD TIME', 0, -68, {
      role: 'sans',
      weight: 600,
      size: 10.5,
      color: '#CBD5E1',
      tracking: 2.2,
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'longines-zulu-time') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outer gilt minute track with diamond lume pips
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = i % 5 === 0 ? '#E2BD6B' : 'rgba(226,189,107,0.45)';
      ctx.lineWidth = i % 5 === 0 ? 3.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * 0.86, Math.sin(a) * radius * 0.86);
      ctx.lineTo(Math.cos(a) * radius * 0.93, Math.sin(a) * radius * 0.93);
      ctx.stroke();
    }

    // Applied gilt Arabic aviation numerals
    for (let h = 1; h <= 12; h++) {
      if (h === 6) continue;
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      drawPadText(ctx, String(h), Math.cos(a) * radius * 0.72, Math.sin(a) * radius * 0.72, {
        role: 'condensed',
        weight: 600,
        size: 46,
        color: '#EAD092',
        finish: 'gilt',
        halo: 'dark',
      });
    }

    drawPadText(ctx, 'LONGINES', 0, -148, {
      role: 'engraved',
      weight: 700,
      size: 25,
      color: '#F2EFE6',
      tracking: 6.4,
      finish: 'silver',
      halo: 'dark',
    });
    drawPadText(ctx, 'ZULU TIME', 0, 96, {
      role: 'condensed',
      weight: 700,
      size: 15,
      color: '#E2BD6B',
      tracking: 3.4,
      finish: 'gilt',
    });
    drawPadText(ctx, '★★★★★', 0, 132, {
      role: 'engraved',
      weight: 700,
      size: 18,
      color: '#E2BD6B',
      tracking: 7,
      finish: 'gold',
    });

    // 6 o'clock date window
    ctx.fillStyle = '#111316';
    ctx.strokeStyle = '#C9A857';
    ctx.lineWidth = 3;
    ctx.fillRect(-30, radius * 0.66 - 24, 60, 48);
    ctx.strokeRect(-30, radius * 0.66 - 24, 60, 48);
    drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), 0, radius * 0.66 + 1, {
      role: 'condensed',
      weight: 600,
      size: 32,
      color: '#F5F5F4',
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'hamilton-murph') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Vintage railroad minute track
    ctx.strokeStyle = 'rgba(235, 224, 192, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      ctx.lineWidth = i % 5 === 0 ? 3.5 : 1.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * 0.85, Math.sin(a) * radius * 0.85);
      ctx.lineTo(Math.cos(a) * radius * 0.92, Math.sin(a) * radius * 0.92);
      ctx.stroke();
    }

    // Aged radium-tone Arabic numerals (1-12)
    for (let h = 1; h <= 12; h++) {
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      drawPadText(ctx, String(h), Math.cos(a) * radius * 0.71, Math.sin(a) * radius * 0.71, {
        role: 'serif',
        weight: 700,
        size: 52,
        color: '#E8D5A3',
        halo: 'dark',
      });
    }

    drawPadText(ctx, 'HAMILTON', 0, -142, {
      role: 'engraved',
      weight: 700,
      size: 26,
      color: '#F3EFE4',
      tracking: 4.5,
      halo: 'dark',
    });
    drawPadText(ctx, 'KHAKI · AUTOMATIC', 0, 146, {
      role: 'sans',
      weight: 600,
      size: 13.5,
      color: '#CFC6B0',
      tracking: 3.0,
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'nomos-tangente') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Pure Bauhaus slender minute track
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const maj = i % 5 === 0;
      ctx.strokeStyle = '#181B20';
      ctx.lineWidth = maj ? 3 : 1.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * (maj ? 0.87 : 0.9), Math.sin(a) * radius * (maj ? 0.87 : 0.9));
      ctx.lineTo(Math.cos(a) * radius * 0.94, Math.sin(a) * radius * 0.94);
      ctx.stroke();
    }

    // Alternating slender Bauhaus Arabic numerals (12, 2, 4, 8, 10) & elongated indices
    for (let h = 1; h <= 12; h++) {
      if (h === 6) continue;
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      if (h % 2 === 0) {
        drawPadText(ctx, String(h), Math.cos(a) * radius * 0.74, Math.sin(a) * radius * 0.74, {
          role: 'sans',
          weight: 400,
          size: 46,
          color: '#14171A',
          scaleX: 0.92,
        });
      } else {
        ctx.strokeStyle = '#14171A';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * radius * 0.68, Math.sin(a) * radius * 0.68);
        ctx.lineTo(Math.cos(a) * radius * 0.83, Math.sin(a) * radius * 0.83);
        ctx.stroke();
      }
    }

    // Recessed 6 o'clock concentric sub-seconds
    const sy = radius * 0.48;
    const sr = 100;
    ctx.fillStyle = '#ECE9E0';
    ctx.beginPath();
    ctx.arc(0, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    for (let r = 16; r < sr; r += 8) {
      ctx.strokeStyle = 'rgba(20,23,26,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, sy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let t = 0; t < 60; t += 5) {
      const a = (t / 60) * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = '#181B20';
      ctx.lineWidth = t % 15 === 0 ? 2.5 : 1.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (sr - 14), sy + Math.sin(a) * (sr - 14));
      ctx.lineTo(Math.cos(a) * (sr - 4), sy + Math.sin(a) * (sr - 4));
      ctx.stroke();
    }

    drawPadText(ctx, 'NOMOS', 0, -148, {
      role: 'sans',
      weight: 600,
      size: 27,
      color: '#14171A',
      tracking: 8.0,
    });
    drawPadText(ctx, 'GLASHÜTTE · neomatik', 0, -118, {
      role: 'sans',
      weight: 500,
      size: 13,
      color: '#2B3036',
      tracking: 2.0,
    });
    ctx.restore();

    return finishTex();
  }

  // --- PACK 3: CULT DIVE & ASYMMETRIC TOOL ICONS ---
  if (watch.id === 'blancpain-fifty-fathoms') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Brushed outer chapter ring
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.87, 0, Math.PI * 2);
    ctx.stroke();

    // Bold luminous 12, 3, 6, 9 numerals + wedge dive indices
    for (let h = 1; h <= 12; h++) {
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      if (h === 12 || h === 3 || h === 6 || h === 9) {
        drawPadText(ctx, String(h), Math.cos(a) * radius * 0.72, Math.sin(a) * radius * 0.72, {
          role: 'condensed',
          weight: 700,
          size: 54,
          color: '#F3F4F6',
          halo: 'dark',
        });
      } else {
        ctx.save();
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = '#E5F7EE';
        ctx.strokeStyle = '#D4D8DD';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.64);
        ctx.lineTo(14, -radius * 0.82);
        ctx.lineTo(-14, -radius * 0.82);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // 4:30 date aperture
    const da = (4.5 / 12) * Math.PI * 2 - Math.PI / 2;
    const dx = Math.cos(da) * radius * 0.63;
    const dy = Math.sin(da) * radius * 0.63;
    ctx.fillStyle = '#090B0E';
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 2.5;
    ctx.fillRect(dx - 24, dy - 20, 48, 40);
    ctx.strokeRect(dx - 24, dy - 20, 48, 40);
    drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), dx, dy + 1, {
      role: 'condensed',
      weight: 600,
      size: 26,
      color: '#F3F4F6',
    });

    drawPadText(ctx, 'BLANCPAIN', 0, -142, {
      role: 'engraved',
      weight: 700,
      size: 25,
      color: '#F3F4F6',
      tracking: 4.2,
      finish: 'silver',
      halo: 'dark',
    });
    drawPadText(ctx, 'Fifty Fathoms', 0, 128, {
      role: 'serif',
      weight: 600,
      size: 24,
      italic: true,
      color: '#DCE4EE',
      tracking: 0.9,
      halo: 'dark',
    });
    drawPadText(ctx, '300m / 1000ft', 0, 156, {
      role: 'sans',
      weight: 600,
      size: 12.5,
      color: '#CBD5E1',
      tracking: 1.8,
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'doxa-sub300') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // High-contrast black minute track on signature DOXA Professional Orange
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = '#111315';
      ctx.lineWidth = i % 5 === 0 ? 5 : 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * 0.85, Math.sin(a) * radius * 0.85);
      ctx.lineTo(Math.cos(a) * radius * 0.93, Math.sin(a) * radius * 0.93);
      ctx.stroke();
    }

    // Chunky black-framed luminous block indices
    for (let h = 0; h < 12; h++) {
      if (h === 3) continue;
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.rotate(a + Math.PI / 2);
      const isCard = h === 0 || h === 6 || h === 9;
      ctx.fillStyle = '#111315';
      ctx.fillRect(isCard ? -18 : -11, -radius * 0.82, isCard ? 36 : 22, isCard ? 58 : 44);
      ctx.fillStyle = '#F7F5E8';
      ctx.fillRect(isCard ? -11 : -6, -radius * 0.79, isCard ? 22 : 12, isCard ? 44 : 30);
      ctx.restore();
    }

    // 3 o'clock black-framed white date
    const dx = radius * 0.67;
    ctx.fillStyle = '#F9FAFB';
    ctx.strokeStyle = '#111315';
    ctx.lineWidth = 4;
    ctx.fillRect(dx - 32, -26, 64, 52);
    ctx.strokeRect(dx - 32, -26, 64, 52);
    drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), dx, 2, {
      role: 'condensed',
      weight: 700,
      size: 34,
      color: '#111315',
    });

    drawPadText(ctx, 'DOXA', -92, -110, {
      role: 'condensed',
      weight: 700,
      size: 36,
      color: '#111315',
      tracking: 3.6,
      inkStroke: 0.45,
    });
    drawPadText(ctx, 'SUB 300', 84, 106, {
      role: 'condensed',
      weight: 700,
      size: 20,
      color: '#111315',
      tracking: 2.0,
    });
    drawPadText(ctx, 'PROFESSIONAL', 84, 134, {
      role: 'sans',
      weight: 700,
      size: 12.5,
      color: '#111315',
      tracking: 2.0,
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'cartier-tank-louis') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Rectangular UV span is ±0.636*radius horizontally and ±0.942*radius vertically
    // Keep inner chemin-de-fer & radial Romans cleanly inside with authentic Tank Louis proportions
    const rw = radius * 0.34;
    const rh = radius * 0.56;
    ctx.strokeStyle = '#181A1E';
    ctx.lineWidth = 3;
    ctx.strokeRect(-rw, -rh, rw * 2, rh * 2);
    ctx.strokeRect(-rw + 14, -rh + 14, (rw - 14) * 2, (rh - 14) * 2);

    // Minute chemin-de-fer ticks between the two inner rails
    for (let m = 0; m < 60; m++) {
      const a = (m / 60) * Math.PI * 2 - Math.PI / 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const tx = ca === 0 ? 1e9 : rw / Math.abs(ca);
      const ty = sa === 0 ? 1e9 : rh / Math.abs(sa);
      const tOut = Math.min(tx, ty);
      const tIn = Math.min(
        ca === 0 ? 1e9 : (rw - 14) / Math.abs(ca),
        sa === 0 ? 1e9 : (rh - 14) / Math.abs(sa)
      );
      ctx.strokeStyle = '#181A1E';
      ctx.lineWidth = m % 5 === 0 ? 2.6 : 1.1;
      ctx.beginPath();
      ctx.moveTo(ca * tIn, sa * tIn);
      ctx.lineTo(ca * tOut, sa * tOut);
      ctx.stroke();
    }

    // Subtle guilloché rays inside center
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      ctx.strokeStyle = 'rgba(20,22,25,0.045)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * rw * 0.86, Math.sin(a) * rh * 0.86);
      ctx.stroke();
    }

    // Crisp Cartier radial Roman numerals cleanly inside ±0.56*R × ±0.82*R
    const numX = rw + 54;
    const numY = rh + 58;
    const tankPos: [string, number, number, number][] = [
      ['XII', 0, -numY, 0],
      ['I', rw * 0.62, -numY, 0.35],
      ['II', numX, -rh * 0.62, 1.1],
      ['III', numX, 0, Math.PI / 2],
      ['IIII', numX, rh * 0.62, 2.05],
      ['V', rw * 0.62, numY, 2.75],
      ['VI', 0, numY, Math.PI],
      ['VII', -rw * 0.62, numY, -2.75],
      ['VIII', -numX, rh * 0.62, -2.05],
      ['IX', -numX, 0, -Math.PI / 2],
      ['X', -numX, -rh * 0.62, -1.1],
      ['XI', -rw * 0.62, -numY, -0.35],
    ];
    ctx.fillStyle = '#141619';
    ctx.font = horoFont('engraved', 700, 34);
    tankPos.forEach(([lbl, x, y, rot]) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(0.84, 1.18);
      ctx.fillText(lbl, 0, 0);
      ctx.restore();
    });

    drawPadText(ctx, 'CARTIER', 0, -108, {
      role: 'engraved',
      weight: 700,
      size: 22,
      color: '#141619',
      tracking: 4.4,
      inkStroke: 0.3,
    });
    drawPadText(ctx, 'SWISS MADE', 0, 128, {
      role: 'sans',
      weight: 600,
      size: 11,
      color: '#2B2F36',
      tracking: 2.6,
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'cartier-crash') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Canvas Y-down is vertically inverted relative to Three.js Y-up, so evaluate 3D crash angle at -ang
    // Scaled by 1/1.24 to match createShapedDiscGeometry's crash uvSpan = radius * 1.24 (zero edge clamping)
    const crashScale = radius / 1.24;
    const crashR = (ang: number, frac: number) => {
      const a3d = -ang;
      return (
        crashScale *
        frac *
        (0.92 +
          0.16 * Math.sin(2 * a3d - 0.55) -
          0.11 * Math.cos(3 * a3d + 0.4) +
          0.08 * Math.sin(a3d + 0.35))
      );
    };

    ctx.strokeStyle = '#15171A';
    ctx.lineWidth = 2.6;
    [0.52, 0.56].forEach((scale) => {
      ctx.beginPath();
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        const r = crashR(a, scale);
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    });

    // Organically distorted Dalí-esque Roman numerals hugged inside the 3D melted bezel contour
    const romans = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    ctx.fillStyle = '#15171A';
    romans.forEach((lbl, idx) => {
      const a = (idx / 12) * Math.PI * 2 - Math.PI / 2;
      const r = crashR(a, 0.72);
      ctx.save();
      ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
      ctx.rotate(a + Math.PI / 2 + Math.sin(-a * 2) * 0.2);
      ctx.scale(0.84, 1.26);
      ctx.font = horoFont('serif', 700, 34, true);
      ctx.fillText(lbl, 0, 0);
      ctx.restore();
    });

    drawPadText(ctx, 'CARTIER', -6, -72, {
      role: 'engraved',
      weight: 700,
      size: 20,
      color: '#15171A',
      tracking: 3.6,
    });
    drawPadText(ctx, 'LONDON', 8, 86, {
      role: 'sans',
      weight: 600,
      size: 11,
      color: '#2B2F36',
      tracking: 3.2,
    });
    ctx.restore();

    return finishTex();
  }

  // --- PACK 4: PRECISION HIGH-BEAT & AVANT-GARDE ENGINEERING ---
  if (watch.id === 'gs-white-birch') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Crisp outer minute track
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = '#1F242C';
      ctx.lineWidth = i % 5 === 0 ? 3.5 : 1.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * 0.87, Math.sin(a) * radius * 0.87);
      ctx.lineTo(Math.cos(a) * radius * 0.93, Math.sin(a) * radius * 0.93);
      ctx.stroke();
    }

    // 3 o'clock Zaratsu-framed date window
    const dx = radius * 0.66;
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.fillRect(dx - 34, -26, 68, 52);
    ctx.strokeRect(dx - 34, -26, 68, 52);
    drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), dx, 2, {
      role: 'condensed',
      weight: 600,
      size: 34,
      color: '#111827',
    });

    drawPadText(ctx, 'GS', 0, -162, {
      role: 'serif',
      weight: 700,
      size: 42,
      color: '#111827',
      tracking: 2.2,
      finish: 'dark-metallic',
      halo: 'light',
    });
    drawPadText(ctx, 'Grand Seiko', 0, -122, {
      role: 'serif',
      weight: 600,
      size: 27,
      color: '#111827',
      tracking: 1.0,
      halo: 'light',
    });
    drawPadText(ctx, 'AUTOMATIC', 0, 124, {
      role: 'sans',
      weight: 600,
      size: 13.5,
      color: '#1E293B',
      tracking: 3.2,
      halo: 'light',
    });
    drawPadText(ctx, 'HI-BEAT 36000', 0, 150, {
      role: 'condensed',
      weight: 700,
      size: 16,
      color: '#1E3A8A',
      tracking: 2.2,
      halo: 'light',
    });
    drawPadText(ctx, '80 HOURS · CAL. 9SA5', 0, 174, {
      role: 'sans',
      weight: 600,
      size: 11.5,
      color: '#334155',
      tracking: 2.0,
      halo: 'light',
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'gp-laureato') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outer cobalt minute track ring
    ctx.strokeStyle = 'rgba(226,232,240,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.87, 0, Math.PI * 2);
    ctx.stroke();

    // 3 o'clock color-matched cobalt date aperture
    const dx = radius * 0.65;
    ctx.fillStyle = '#102B52';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 3;
    ctx.fillRect(dx - 30, -24, 60, 48);
    ctx.strokeRect(dx - 30, -24, 60, 48);
    drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), dx, 2, {
      role: 'condensed',
      weight: 600,
      size: 32,
      color: '#F8FAFC',
    });

    // Smooth Clous de Paris signature cartouche behind GIRARD-PERREGAUX
    drawDialCartouche(ctx, 0, -124, 246, 34, dial.baseHex, {
      radius: 3,
      opacity: 0.9,
    });
    drawPadText(ctx, 'GP', 0, -162, {
      role: 'engraved',
      weight: 700,
      size: 32,
      color: '#F1F5F9',
      tracking: 5.0,
      finish: 'silver',
      halo: 'dark',
    });
    drawPadText(ctx, 'GIRARD-PERREGAUX', 0, -124, {
      role: 'sans',
      weight: 600,
      size: 14.5,
      color: '#F1F5F9',
      tracking: 2.6,
      halo: 'dark',
    });
    drawDialCartouche(ctx, 0, 148, 174, 28, dial.baseHex, {
      radius: 3,
      opacity: 0.88,
    });
    drawPadText(ctx, 'LAUREATO · 1791', 0, 148, {
      role: 'condensed',
      weight: 600,
      size: 14,
      color: '#CBD5E1',
      tracking: 2.8,
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'piaget-polo-79') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Subtle 18k gold dot hour markers aligned with gadroon ribs
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.fillStyle = '#3B2B0A';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * radius * 0.78, Math.sin(a) * radius * 0.78, h % 3 === 0 ? 7 : 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    drawDialCartouche(ctx, 0, -138, 198, 40, dial.baseHex, {
      radius: 3,
      opacity: 0.9,
    });
    drawPadText(ctx, 'PIAGET', 0, -138, {
      role: 'engraved',
      weight: 700,
      size: 27,
      color: '#2B1F06',
      tracking: 6.4,
      halo: 'light',
    });
    drawPadText(ctx, 'SWISS · 1979', 0, 152, {
      role: 'sans',
      weight: 600,
      size: 12.5,
      color: '#2B1F06',
      tracking: 3.0,
      halo: 'light',
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'lange-zeitwerk') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Sculpted German silver horizontal time-bridge spanning 9 to 3 o'clock & wrapping 6h subdial
    const bridgeGrad = ctx.createLinearGradient(-radius * 0.86, -80, radius * 0.86, 220);
    bridgeGrad.addColorStop(0, '#D8D4C9');
    bridgeGrad.addColorStop(0.5, '#EFECE3');
    bridgeGrad.addColorStop(1, '#BDB8AB');
    ctx.fillStyle = bridgeGrad;
    ctx.strokeStyle = '#8C877B';
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.roundRect(-radius * 0.84, -84, radius * 1.68, 168, 36);
    ctx.fill();
    ctx.stroke();

    // Lower bridge extension framing the 6 o'clock small seconds
    ctx.beginPath();
    ctx.arc(0, radius * 0.45, 118, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Left (Hours) & Right (Minutes) jumping mechanical digital apertures
    const drawWindow = (wx: number, text: string) => {
      ctx.fillStyle = '#111316';
      ctx.strokeStyle = '#736F65';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(wx - 92, -56, 184, 112, 10);
      ctx.fill();
      ctx.stroke();
      drawPadText(ctx, text, wx, 4, {
        role: 'condensed',
        weight: 600,
        size: 88,
        color: '#F8FAFC',
        tracking: 4,
      });
    };
    const fallbackNow = new Date();
    const h24 = dateOverride?.hours24 ?? fallbackNow.getHours();
    const mins = dateOverride?.minutes ?? fallbackNow.getMinutes();
    const hh = String(h24 % 12 || 12).padStart(2, '0');
    const mm = String(mins).padStart(2, '0');
    drawWindow(-radius * 0.44, hh);
    drawWindow(radius * 0.44, mm);

    // Center jewel & blued screws on bridge
    ctx.fillStyle = '#C81D4E';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 6 o'clock recessed dark small seconds
    ctx.fillStyle = '#15181C';
    ctx.beginPath();
    ctx.arc(0, radius * 0.45, 96, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 60; i += 5) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = i % 15 === 0 ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 78, radius * 0.45 + Math.sin(a) * 78);
      ctx.lineTo(Math.cos(a) * 90, radius * 0.45 + Math.sin(a) * 90);
      ctx.stroke();
    }

    // 12 o'clock UP / DOWN power reserve arc (white AUF left -> red AB right)
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -radius * 0.42, 82, -Math.PI * 0.85, -Math.PI * 0.32);
    ctx.stroke();
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, -radius * 0.42, 82, -Math.PI * 0.32, -Math.PI * 0.15);
    ctx.stroke();
    drawPadText(ctx, 'AB', 88, -radius * 0.46, {
      role: 'condensed',
      weight: 700,
      size: 14,
      color: '#EF4444',
      tracking: 1.4,
    });
    drawPadText(ctx, 'AUF', -92, -radius * 0.46, {
      role: 'condensed',
      weight: 700,
      size: 14,
      color: '#E5E7EB',
      tracking: 1.4,
    });

    drawPadText(ctx, 'A. LANGE & SÖHNE', 0, -radius * 0.72, {
      role: 'engraved',
      weight: 700,
      size: 20,
      color: '#F3F4F6',
      tracking: 2.2,
      finish: 'silver',
      halo: 'dark',
    });
    drawPadText(ctx, 'GLASHÜTTE I/SA · ZEITWERK', 0, -radius * 0.62, {
      role: 'sans',
      weight: 600,
      size: 11.5,
      color: '#CBD5E1',
      tracking: 2.6,
    });
    ctx.restore();

    return finishTex();
  }

  // --- CASIO ICONS ---
  if (watch.id === 'casio-gshock-dw5600') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Classic brick-wall grid border & red/blue DW-5600 graphic frame
    const fw = radius * 0.78;
    const fh = radius * 0.68;
    ctx.fillStyle = '#111418';
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);

    // Subtle solar/brick micro-pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1.5;
    for (let y = -fh; y <= fh; y += 22) {
      ctx.beginPath();
      ctx.moveTo(-fw, y);
      ctx.lineTo(fw, y);
      ctx.stroke();
    }

    // Red outer line + blue inner line (iconic DW-5600C / 5600E heritage)
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 7;
    ctx.strokeRect(-fw, -fh, fw * 2, fh * 2);
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 4;
    ctx.strokeRect(-fw + 14, -fh + 14, (fw - 14) * 2, (fh - 14) * 2);

    // Top / Bottom Legends
    drawPadText(ctx, 'CASIO', 0, -fh + 54, {
      role: 'sans',
      weight: 700,
      size: 32,
      color: '#F8FAFC',
      tracking: 4.5,
    });
    drawPadText(ctx, 'ILLUMINATOR · SHOCK RESIST', 0, -fh + 86, {
      role: 'condensed',
      weight: 600,
      size: 15,
      color: '#F59E0B',
      tracking: 2.2,
    });

    drawPadText(ctx, 'WATER 20BAR RESIST', 0, fh - 48, {
      role: 'condensed',
      weight: 700,
      size: 16.5,
      color: '#38BDF8',
      tracking: 2.0,
    });
    drawPadText(ctx, 'ALARM CHRONO · ELECTRO LUMINESCENCE', 0, fh - 24, {
      role: 'condensed',
      weight: 600,
      size: 12.5,
      color: '#94A3B8',
      tracking: 1.6,
    });

    // Central recessed greenish-grey positive LCD panel
    const lw = fw - 44;
    const lh = fh - 116;
    const lcdGrad = ctx.createLinearGradient(-lw, -lh, lw, lh);
    lcdGrad.addColorStop(0, '#96A48E');
    lcdGrad.addColorStop(0.5, '#A5B39D');
    lcdGrad.addColorStop(1, '#85937D');
    ctx.fillStyle = lcdGrad;
    ctx.fillRect(-lw, -lh + 10, lw * 2, lh * 2 - 20);
    ctx.strokeStyle = '#2A2F36';
    ctx.lineWidth = 6;
    ctx.strokeRect(-lw, -lh + 10, lw * 2, lh * 2 - 20);

    // LCD status dividers
    ctx.strokeStyle = 'rgba(20, 28, 20, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-lw + 14, -18);
    ctx.lineTo(lw - 14, -18);
    ctx.stroke();

    const dayStr = (dateOverride?.weekday ?? 'SUN').slice(0, 2);
    const dateNum = dateOverride?.dayNum ?? new Date().getDate();
    const monthNum = (dateOverride?.monthIdx ?? new Date().getMonth()) + 1;
    drawPadText(ctx, dayStr, -124, -lh + 64, {
      role: 'condensed',
      weight: 700,
      size: 38,
      color: '#151C16',
      tracking: 2,
    });
    drawSevenSegmentString(ctx, `${monthNum}-${dateNum}`, 66, -lh + 64, 42, {
      activeColor: '#151C16',
      ghostColor: 'rgba(20, 28, 22, 0.08)',
    });

    // Main digital time readout (authentic beveled vector 7-segment LCD)
    const fallbackNow = new Date();
    const hh = String(dateOverride?.hours24 ?? fallbackNow.getHours()).padStart(2, '0');
    const mm = String(dateOverride?.minutes ?? fallbackNow.getMinutes()).padStart(2, '0');
    const ss = String(dateOverride?.seconds ?? fallbackNow.getSeconds()).padStart(2, '0');
    drawSevenSegmentString(ctx, `${hh}:${mm}`, -56, 56, 102, {
      activeColor: '#131A14',
      ghostColor: 'rgba(19, 26, 20, 0.085)',
    });
    drawSevenSegmentString(ctx, ss, lw - 70, 74, 52, {
      activeColor: '#131A14',
      ghostColor: 'rgba(19, 26, 20, 0.085)',
    });

    drawPadText(ctx, '24H   ALM   SIG', -lw + 92, -lh + 28, {
      role: 'condensed',
      weight: 700,
      size: 14,
      color: '#151C16',
      tracking: 1.4,
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'casio-casioak-ga2100') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Faceted stealth chapter ring with minute ticks
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.88, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = i % 5 === 0 ? '#9CA3AF' : 'rgba(156,163,175,0.35)';
      ctx.lineWidth = i % 5 === 0 ? 4 : 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * 0.84, Math.sin(a) * radius * 0.84);
      ctx.lineTo(Math.cos(a) * radius * 0.91, Math.sin(a) * radius * 0.91);
      ctx.stroke();
    }

    // Stealth faceted dark indices
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = '#374151';
      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 2;
      ctx.fillRect(-10, -radius * 0.82, 20, h === 0 ? 64 : 46);
      ctx.strokeRect(-10, -radius * 0.82, 20, h === 0 ? 64 : 46);
      ctx.restore();
    }

    // 9 o'clock G-Shock Day-of-Week semicircular fan gauge
    const fx = -radius * 0.34;
    ctx.strokeStyle = '#4B5563';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fx, 0, 94, Math.PI * 0.62, Math.PI * 1.38);
    ctx.stroke();
    const dLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    dLabels.forEach((d, idx) => {
      const a = Math.PI * 0.68 + (idx / 6) * Math.PI * 0.64;
      drawPadText(ctx, d, fx + Math.cos(a) * 74, Math.sin(a) * 74, {
        role: 'condensed',
        weight: 700,
        size: 18,
        color: '#D1D5DB',
      });
    });
    // Day pointer needle synced to active weekday
    const weekdayKeys = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const wdIdx = Math.max(0, weekdayKeys.indexOf((dateOverride?.weekday ?? 'SUN').slice(0, 3).toUpperCase()));
    const needleAng = Math.PI * 0.68 + (wdIdx / 6) * Math.PI * 0.64;
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(fx, 0);
    ctx.lineTo(fx + Math.cos(needleAng) * 58, Math.sin(needleAng) * 58);
    ctx.stroke();

    // 4:30 Negative-Display Ana-Digi LCD Sub-Window
    ctx.save();
    ctx.translate(radius * 0.27, radius * 0.24);
    ctx.rotate(-0.32);
    ctx.fillStyle = '#0D1014';
    ctx.strokeStyle = '#4B5563';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-92, -46, 184, 92, 12);
    ctx.fill();
    ctx.stroke();
    drawPadText(ctx, 'WR20BAR  MUTE', 0, -24, {
      role: 'condensed',
      weight: 600,
      size: 13,
      color: '#9CA3AF',
      tracking: 1.5,
    });
    const fallbackNow = new Date();
    const h24 = dateOverride?.hours24 ?? fallbackNow.getHours();
    const mins = dateOverride?.minutes ?? fallbackNow.getMinutes();
    drawSevenSegmentString(
      ctx,
      `${String(h24).padStart(2, '0')}:${String(mins).padStart(2, '0')}`,
      0,
      14,
      36,
      {
        activeColor: '#E5E7EB',
        ghostColor: 'rgba(229, 231, 235, 0.08)',
      }
    );
    ctx.restore();

    drawPadText(ctx, 'G-SHOCK', 0, -142, {
      role: 'condensed',
      weight: 700,
      size: 26,
      color: '#E5E7EB',
      tracking: 3.4,
    });
    drawPadText(ctx, 'CASIO · CARBON CORE', 0, -114, {
      role: 'condensed',
      weight: 600,
      size: 13.5,
      color: '#9CA3AF',
      tracking: 2.2,
    });
    ctx.restore();

    return finishTex();
  }

  if (watch.id === 'casio-f91w') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Sized cleanly inside compact-octagon UV span (±0.89*R × ±0.97*R) with chamfered corners
    const fw = radius * 0.68;
    const fh = radius * 0.72;
    const ch = 46;
    ctx.fillStyle = '#111419';
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);

    const traceChamferRect = (w: number, h: number, cut: number) => {
      ctx.beginPath();
      ctx.moveTo(-w + cut, -h);
      ctx.lineTo(w - cut, -h);
      ctx.lineTo(w, -h + cut);
      ctx.lineTo(w, h - cut);
      ctx.lineTo(w - cut, h);
      ctx.lineTo(-w + cut, h);
      ctx.lineTo(-w, h - cut);
      ctx.lineTo(-w, -h + cut);
      ctx.closePath();
    };

    // Signature F-91W Cobalt Blue & Warm Gold chamfered retro border lines
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 7;
    traceChamferRect(fw, fh, ch);
    ctx.stroke();
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 3.2;
    traceChamferRect(fw - 13, fh - 13, ch - 6);
    ctx.stroke();

    // Header typography
    drawPadText(ctx, 'CASIO', -fw + 102, -fh + 54, {
      role: 'sans',
      weight: 700,
      size: 31,
      color: '#F8FAFC',
      tracking: 3.4,
    });
    drawPadText(ctx, 'F-91W', fw - 84, -fh + 54, {
      role: 'condensed',
      weight: 700,
      size: 19,
      color: '#F59E0B',
      tracking: 1.4,
    });
    drawPadText(ctx, 'ALARM CHRONOGRAPH', 0, -fh + 92, {
      role: 'condensed',
      weight: 700,
      size: 14.5,
      color: '#60A5FA',
      tracking: 2.2,
    });

    // Classic light-silver greenish LCD screen
    const lw = fw - 38;
    const lh = 112;
    ctx.fillStyle = '#9EA99A';
    ctx.fillRect(-lw, -lh + 12, lw * 2, lh * 2 - 24);
    ctx.strokeStyle = '#1E232A';
    ctx.lineWidth = 5;
    ctx.strokeRect(-lw, -lh + 12, lw * 2, lh * 2 - 24);

    const dayStr = (dateOverride?.weekday ?? 'SUN').slice(0, 2);
    const dateNum = dateOverride?.dayNum ?? new Date().getDate();
    drawPadText(ctx, dayStr, 12, -46, {
      role: 'condensed',
      weight: 700,
      size: 32,
      color: '#141A15',
      tracking: 2,
    });
    drawSevenSegmentString(ctx, String(dateNum), 118, -46, 36, {
      activeColor: '#141A15',
      ghostColor: 'rgba(20, 26, 21, 0.08)',
    });
    const fallbackNow = new Date();
    const h24 = dateOverride?.hours24 ?? fallbackNow.getHours();
    const mins = dateOverride?.minutes ?? fallbackNow.getMinutes();
    const secs = dateOverride?.seconds ?? fallbackNow.getSeconds();
    drawPadText(ctx, h24 >= 12 ? 'PM' : 'AM', -lw + 34, -44, {
      role: 'condensed',
      weight: 700,
      size: 17,
      color: '#141A15',
    });

    drawSevenSegmentString(
      ctx,
      `${String(h24 % 12 || 12).padStart(2, '0')}:${String(mins).padStart(2, '0')}`,
      -42,
      38,
      82,
      {
        activeColor: '#141A15',
        ghostColor: 'rgba(20, 26, 21, 0.085)',
      }
    );
    drawSevenSegmentString(ctx, String(secs).padStart(2, '0'), lw - 52, 54, 42, {
      activeColor: '#141A15',
      ghostColor: 'rgba(20, 26, 21, 0.085)',
    });

    // Bottom WR emblem & Water Resist
    drawPadText(ctx, 'WATER', -84, fh - 60, {
      role: 'condensed',
      weight: 700,
      size: 21,
      color: '#EF4444',
      tracking: 1.6,
    });
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(-26, fh - 76, 52, 32);
    drawPadText(ctx, 'WR', 0, fh - 60, {
      role: 'condensed',
      weight: 700,
      size: 21,
      color: '#F8FAFC',
      tracking: 1.4,
    });
    drawPadText(ctx, 'RESIST', 86, fh - 60, {
      role: 'condensed',
      weight: 700,
      size: 21,
      color: '#60A5FA',
      tracking: 1.6,
    });
    drawPadText(ctx, '◄ LIGHT     MODE     24H ►', 0, fh - 26, {
      role: 'condensed',
      weight: 600,
      size: 12,
      color: '#94A3B8',
      tracking: 1.4,
    });
    ctx.restore();

    return finishTex();
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
    drawPadText(ctx, weekday, cx, cy - 201, {
      role: 'sans',
      weight: 700,
      size: 20,
      color: '#141719',
      tracking: 2.2,
    });
    ctx.restore();
  }

  const rolexHalo = dial.lightText ? 'dark' : 'light';
  drawPadText(ctx, 'ROLEX', cx, watch.hasDayWindow ? cy - 142 : cy - 130, {
    role: 'engraved',
    weight: 700,
    size: 31,
    color: ink,
    tracking: 8.2,
    finish: dial.lightText ? 'silver' : 'dark-metallic',
    halo: rolexHalo,
    inkStroke: 0.35,
  });

  drawPadText(ctx, 'OYSTER PERPETUAL', cx, watch.hasDayWindow ? cy - 109 : cy - 97, {
    role: 'sans',
    weight: 600,
    size: 14.5,
    color: mutedInk,
    tracking: 3.4,
    halo: rolexHalo,
    inkStroke: 0.25,
  });

  if (watch.id === 'submariner') {
    drawPadText(ctx, 'SUBMARINER', cx, cy + 110, {
      role: 'sans',
      weight: 700,
      size: 17.5,
      color: ink,
      tracking: 3.2,
      halo: rolexHalo,
      inkStroke: 0.3,
    });
    drawPadText(ctx, '1000ft = 300m', cx, cy + 138, {
      role: 'sans',
      weight: 600,
      size: 14,
      color: mutedInk,
      tracking: 1.8,
      halo: rolexHalo,
    });
    drawPadText(ctx, 'SUPERLATIVE CHRONOMETER', cx, cy + 164, {
      role: 'condensed',
      weight: 600,
      size: 12.5,
      color: mutedInk,
      tracking: 2.2,
      halo: rolexHalo,
    });
    drawPadText(ctx, 'OFFICIALLY CERTIFIED', cx, cy + 182, {
      role: 'condensed',
      weight: 600,
      size: 12.5,
      color: mutedInk,
      tracking: 2.4,
      halo: rolexHalo,
    });
  } else if (watch.id === 'yachtmaster') {
    drawPadText(ctx, 'YACHT-MASTER', cx, cy + 112, {
      role: 'sans',
      weight: 700,
      size: 17.5,
      color: accentInk,
      tracking: 3.0,
      halo: rolexHalo,
      inkStroke: 0.3,
    });
    drawPadText(ctx, '330ft = 100m', cx, cy + 138, {
      role: 'sans',
      weight: 600,
      size: 14,
      color: mutedInk,
      tracking: 1.8,
      halo: rolexHalo,
    });
    drawPadText(ctx, 'SUPERLATIVE CHRONOMETER', cx, cy + 164, {
      role: 'condensed',
      weight: 600,
      size: 12.5,
      color: mutedInk,
      tracking: 2.2,
      halo: rolexHalo,
    });
    drawPadText(ctx, 'OFFICIALLY CERTIFIED', cx, cy + 182, {
      role: 'condensed',
      weight: 600,
      size: 12.5,
      color: mutedInk,
      tracking: 2.4,
      halo: rolexHalo,
    });
  } else if (watch.id === 'datejust' || watch.id === 'daydate') {
    drawPadText(ctx, watch.id === 'daydate' ? 'DAY-DATE' : 'DATEJUST', cx, cy - 76, {
      role: 'sans',
      weight: 600,
      size: 15.5,
      color: ink,
      tracking: 3.4,
      halo: rolexHalo,
    });
    drawPadText(ctx, 'SUPERLATIVE CHRONOMETER', cx, cy + 148, {
      role: 'condensed',
      weight: 600,
      size: 12.5,
      color: mutedInk,
      tracking: 2.2,
      halo: rolexHalo,
    });
    drawPadText(ctx, 'OFFICIALLY CERTIFIED', cx, cy + 166, {
      role: 'condensed',
      weight: 600,
      size: 12.5,
      color: mutedInk,
      tracking: 2.4,
      halo: rolexHalo,
    });
  } else if (watch.id === 'gmt' || watch.id === 'explorer2') {
    drawPadText(ctx, watch.id === 'explorer2' ? 'EXPLORER II' : 'GMT-MASTER II', cx, cy + 114, {
      role: 'sans',
      weight: 700,
      size: 16.5,
      color: accentInk,
      tracking: 2.8,
      halo: rolexHalo,
      inkStroke: 0.25,
    });
    drawPadText(ctx, 'SUPERLATIVE CHRONOMETER', cx, cy + 146, {
      role: 'condensed',
      weight: 600,
      size: 12.5,
      color: mutedInk,
      tracking: 2.2,
      halo: rolexHalo,
    });
    drawPadText(ctx, 'OFFICIALLY CERTIFIED', cx, cy + 164, {
      role: 'condensed',
      weight: 600,
      size: 12.5,
      color: mutedInk,
      tracking: 2.4,
      halo: rolexHalo,
    });
  } else if (watch.id === 'milgauss') {
    drawPadText(ctx, 'MILGAUSS', cx, cy + 116, {
      role: 'sans',
      weight: 700,
      size: 18,
      color: accentInk,
      tracking: 5.2,
      halo: rolexHalo,
      inkStroke: 0.3,
    });
    drawPadText(ctx, 'SUPERLATIVE CHRONOMETER', cx, cy + 148, {
      role: 'condensed',
      weight: 600,
      size: 12.5,
      color: mutedInk,
      tracking: 2.2,
      halo: rolexHalo,
    });
    drawPadText(ctx, 'OFFICIALLY CERTIFIED', cx, cy + 166, {
      role: 'condensed',
      weight: 600,
      size: 12.5,
      color: mutedInk,
      tracking: 2.4,
      halo: rolexHalo,
    });
  } else if (watch.id === 'skydweller') {
    drawPadText(ctx, 'SKY-DWELLER', cx, cy - 70, {
      role: 'sans',
      weight: 600,
      size: 15.5,
      color: ink,
      tracking: 3.2,
      halo: rolexHalo,
    });
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
    drawPadText(ctx, 'SUPERLATIVE CHRONOMETER', cx, cy - 72, {
      role: 'condensed',
      weight: 600,
      size: 13,
      color: mutedInk,
      tracking: 2.2,
      halo: rolexHalo,
    });
    drawPadText(ctx, 'OFFICIALLY CERTIFIED', cx, cy - 53, {
      role: 'condensed',
      weight: 600,
      size: 13,
      color: mutedInk,
      tracking: 2.4,
      halo: rolexHalo,
    });
    drawPadText(ctx, 'COSMOGRAPH', cx, cy - 32, {
      role: 'sans',
      weight: 600,
      size: 13.5,
      color: ink,
      tracking: 3.2,
      halo: rolexHalo,
    });

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
      sub.ticks.forEach((num, idx) => {
        const a = ((idx + 1) / sub.ticks.length) * Math.PI * 2 - Math.PI / 2;
        drawPadText(
          ctx,
          String(num),
          sub.x + Math.cos(a) * (sr - 34),
          sub.y + Math.sin(a) * (sr - 34),
          { role: 'condensed', weight: 600, size: 19, color: '#F2EFE9' }
        );
      });
      ctx.restore();
    });

    // Iconic crimson curved DAYTONA signature hugging the 6 o'clock subdial rim
    drawArcPadText(ctx, 'DAYTONA', cx, cy + 178, 111, 0, {
      role: 'sans',
      weight: 700,
      size: 18,
      color: '#DC2626',
      tracking: 4.8,
      halo: rolexHalo,
      inkStroke: 0.35,
    });
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

    drawPadText(ctx, String(dateOverride?.dayNum ?? new Date().getDate()), dx, dy + 2, {
      role: 'condensed',
      weight: 700,
      size: 46,
      color: '#111315',
      tracking: 0.6,
    });
    ctx.restore();
  }

  // Authentic curved SWISS MADE at 6 o'clock perimeter
  drawArcPadText(ctx, 'SWISS  MADE', cx, cy, radius * 0.855, Math.PI, {
    role: 'sans',
    weight: 600,
    size: 12,
    color: mutedInk,
    tracking: 3.0,
    halo: rolexHalo,
    bottomArc: true,
  });

  return finishTex();
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

  // Radial satin brush lines for Explorer II fixed steel bezel & DOXA SUB 300 steel bezel
  if (isSteel24 || (watch.id === 'doxa-sub300' && bezel.id === 'default')) {
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

  const isTudorGilt =
    (watch.id === 'tudor-bb58' || watch.id === 'longines-zulu-time') &&
    bezel.id === 'default';
  const isDoxaBezel = watch.id === 'doxa-sub300' && bezel.id === 'default';
  const numColor = isSteel24 || isDoxaBezel
    ? '#14171A'
    : watch.bezelType === 'tachymeter'
      ? '#E8D39B'
      : isTudorGilt
        ? '#E3BE78'
        : watch.id === 'blancpain-fifty-fathoms'
          ? '#E5F7EE'
          : '#EAECEF';
  const rText = size * 0.422;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (
    watch.bezelType === 'dive-cerachrom' ||
    watch.bezelType === 'yacht-cerachrom' ||
    watch.bezelType === 'seamaster'
  ) {
    if (isDoxaBezel) {
      // Authentic DOXA SUB 300 dual-scale brushed steel bezel:
      // Inner black 0-60 dive minutes + divider groove + outer orange US Navy no-decompression depth ring (FT)
      ctx.strokeStyle = 'rgba(20, 23, 26, 0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.424, 0, Math.PI * 2);
      ctx.stroke();

      const rInnerMin = size * 0.392;
      const rOuterDepth = size * 0.456;
      const doxaDepths: [number, string][] = [
        [5, '190'],
        [10, '170'],
        [15, '150'],
        [20, '130'],
        [25, '120'],
        [30, '110'],
        [35, '100'],
        [40, '90'],
        [45, '80'],
        [50, '70'],
        [55, '60'],
      ];

      for (let m = 0; m < 60; m++) {
        const a = (m / 60) * Math.PI * 2 - Math.PI / 2;
        if (m === 0) {
          ctx.save();
          ctx.rotate(a + Math.PI / 2);
          drawBezelEngravedText(ctx, 'FT', 0, -rOuterDepth, {
            size: 22,
            color: '#E65314',
            role: 'condensed',
            weight: 700,
            darkInk: true,
            tracking: 1.4,
          });
          ctx.restore();
        } else if (m % 5 === 0) {
          ctx.save();
          ctx.rotate(a + Math.PI / 2);
          drawBezelEngravedText(ctx, String(m), 0, -rInnerMin, {
            size: 27,
            color: '#111418',
            role: 'condensed',
            weight: 700,
            darkInk: true,
            tracking: 1.0,
          });
          ctx.restore();
        } else {
          ctx.strokeStyle = '#181C20';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * (rInnerMin - 8), Math.sin(a) * (rInnerMin - 8));
          ctx.lineTo(Math.cos(a) * (rInnerMin + 8), Math.sin(a) * (rInnerMin + 8));
          ctx.stroke();
        }
      }
      doxaDepths.forEach(([m, ft]) => {
        const a = (m / 60) * Math.PI * 2 - Math.PI / 2;
        ctx.save();
        ctx.rotate(a + Math.PI / 2);
        drawBezelEngravedText(ctx, ft, 0, -rOuterDepth, {
          size: 24,
          color: '#E65314',
          role: 'condensed',
          weight: 700,
          darkInk: true,
          tracking: 1.1,
        });
        ctx.restore();
      });
    } else if (watch.id === 'blancpain-fifty-fathoms') {
      // Iconic Blancpain Fifty Fathoms luminous sapphire bezel: diamond 12h + bold 15/30/45 + luminous bars
      for (let m = 0; m < 60; m++) {
        const a = (m / 60) * Math.PI * 2 - Math.PI / 2;
        if (m === 0) {
          ctx.save();
          ctx.rotate(a + Math.PI / 2);
          ctx.fillStyle = '#D9FCE8';
          ctx.beginPath();
          ctx.moveTo(0, -rText - 22);
          ctx.lineTo(18, -rText);
          ctx.lineTo(0, -rText + 22);
          ctx.lineTo(-18, -rText);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (m === 15 || m === 30 || m === 45) {
          ctx.save();
          ctx.rotate(a + Math.PI / 2);
          drawBezelEngravedText(ctx, String(m), 0, -rText, {
            size: 48,
            color: '#D9FCE8',
            role: 'condensed',
            weight: 700,
            tracking: 1.8,
          });
          ctx.restore();
        } else if (m % 5 === 0) {
          ctx.strokeStyle = '#D9FCE8';
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * (rText - 20), Math.sin(a) * (rText - 20));
          ctx.lineTo(Math.cos(a) * (rText + 20), Math.sin(a) * (rText + 20));
          ctx.stroke();
        } else if (m < 15) {
          ctx.fillStyle = '#D9FCE8';
          ctx.beginPath();
          ctx.arc(Math.cos(a) * rText, Math.sin(a) * rText, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
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
          ctx.fillStyle = isTudorGilt ? '#A81C1C' : isYacht ? '#E5E8EC' : numColor;
          ctx.beginPath();
          ctx.moveTo(-24, -rText - 16);
          ctx.lineTo(24, -rText - 16);
          ctx.lineTo(0, -rText + 24);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (m % 10 === 0) {
          ctx.save();
          ctx.rotate(a + Math.PI / 2);
          drawBezelEngravedText(ctx, String(m), 0, -rText, {
            size: 46,
            color: isYacht ? '#E5E8EC' : numColor,
            role: 'condensed',
            weight: 700,
            raised: isYacht,
            tracking: 1.6,
          });
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
    }
  } else if (watch.bezelType === 'navitimer') {
    const naviOuterNums = ['10', '11', '12', '13', '14', '15', '17', '20', '25', '30', '35', '40', '45', '50', '60', '70', '80', '90'];
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2 - Math.PI / 2;
      const maj = i % 10 === 0;
      ctx.strokeStyle = maj ? '#EF4444' : '#F3F4F6';
      ctx.lineWidth = maj ? 4 : 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (rText - (maj ? 20 : 12)), Math.sin(a) * (rText - (maj ? 20 : 12)));
      ctx.lineTo(Math.cos(a) * (rText - 2), Math.sin(a) * (rText - 2));
      ctx.stroke();
    }
    naviOuterNums.forEach((lbl, idx) => {
      const a = (idx / naviOuterNums.length) * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.rotate(a + Math.PI / 2);
      drawPadText(ctx, lbl, 0, -rText + 10, {
        role: 'condensed',
        weight: 700,
        size: 26,
        color: lbl === '10' || lbl === '60' ? '#EF4444' : '#F3F4F6',
        tracking: 0.9,
        halo: 'dark',
      });
      ctx.restore();
    });
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
        drawBezelEngravedText(ctx, String(h), 0, -rText, {
          size: 44,
          color: numColor,
          role: 'condensed',
          weight: 700,
          darkInk: isSteel24,
          tracking: 1.6,
        });
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
    drawBezelEngravedText(
      ctx,
      watch.id === 'omega-speedmaster' ? 'TACHYMETRE' : 'UNITS PER HOUR',
      0,
      -rText,
      {
        size: 19,
        color: tachyInk,
        role: 'condensed',
        weight: 700,
        tracking: 1.5,
      }
    );
    ctx.restore();

    tachyMarks.forEach(({ deg, label }) => {
      const a = ((deg - 90) * Math.PI) / 180;
      ctx.save();
      ctx.rotate(a + Math.PI / 2);
      drawBezelEngravedText(ctx, label, 0, -rText + 4, {
        size: 29,
        color: tachyInk,
        role: 'condensed',
        weight: 700,
        tracking: 1.1,
      });
      ctx.fillStyle = tachyInk;
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
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
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

  const inkColor =
    brand === 'AVI-8' ? 'rgba(237, 227, 194, 0.84)' : 'rgba(34, 38, 42, 0.78)';

  const slots = 12;
  const brandMarks: Record<WatchBrand, string> = {
    ROLEX: 'ROLEX',
    'AVI-8': 'AVI-8',
    OMEGA: 'OMEGA',
    TUDOR: 'TUDOR',
    'VACHERON CONSTANTIN': 'VACHERON CONSTANTIN',
    'AUDEMARS PIGUET': 'AUDEMARS PIGUET',
    'PATEK PHILIPPE': 'PATEK PHILIPPE',
    CARTIER: 'CARTIER',
    'JAEGER-LECOULTRE': 'JAEGER-LECOULTRE',
    PANERAI: 'PANERAI',
    'TAG HEUER': 'TAG HEUER',
    BREITLING: 'BREITLING',
    ZENITH: 'ZENITH',
    'IWC SCHAFFHAUSEN': 'IWC SCHAFFHAUSEN',
    BREGUET: 'BREGUET',
    'GRAND SEIKO': 'GRAND SEIKO',
    'A. LANGE & SÖHNE': 'A. LANGE & SÖHNE',
    'RICHARD MILLE': 'RICHARD MILLE',
    'F.P. JOURNE': 'F.P. JOURNE',
    'H. MOSER & CIE': 'H. MOSER & CIE',
    'MB&F': 'MB&F',
    BULGARI: 'BVLGARI',
    LONGINES: 'LONGINES',
    HAMILTON: 'HAMILTON',
    'NOMOS GLASHÜTTE': 'NOMOS GLASHÜTTE',
    BLANCPAIN: 'BLANCPAIN',
    DOXA: 'DOXA',
    'GIRARD-PERREGAUX': 'GIRARD-PERREGAUX',
    PIAGET: 'PIAGET',
    CASIO: 'CASIO · G-SHOCK',
  };
  const brandMark = brandMarks[brand] ?? 'ROLEX';
  const markTracking = brandMark.length <= 6 ? 7.5 : brandMark.length <= 10 ? 4.2 : 1.5;
  const markSize = brandMark.length > 14 ? 19 : 23;
  for (let i = 0; i < slots; i++) {
    const x = ((i + 0.5) / slots) * w;
    if (i === 6) {
      drawPadText(ctx, reference, x, h * 0.52, {
        role: 'mono',
        weight: 600,
        size: 21,
        color: inkColor,
        tracking: 1.6,
        finish: 'engraved',
      });
    } else {
      drawPadText(ctx, brandMark, x, h * 0.52, {
        role: 'engraved',
        weight: 600,
        size: markSize,
        color: inkColor,
        tracking: markTracking,
        finish: 'engraved',
      });
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = maxAnisotropy;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
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

  // Crisp laser-carved burin circular text around the center medallion (bottom half upright left-to-right)
  const drawArcText = (text: string, radius: number, centerAngle: number, step: number) => {
    const isBottom = Math.abs(centerAngle - Math.PI) < 0.01;
    drawArcPadText(ctx, text, cx, cy, radius, centerAngle, {
      role: 'engraved',
      weight: 600,
      size: 16.5,
      color: 'rgba(30, 34, 38, 0.78)',
      finish: 'engraved',
      bottomArc: isBottom,
      fixedStepRad: step,
    });
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
    if (watch.id === 'omega-seamaster') {
      drawArcText('SEAMASTER DIVER 300M · CO-AXIAL', 136, 0, 0.068);
      drawArcText(`MASTER CHRONOMETER · ${watch.reference}`, 136, Math.PI, 0.064);
    } else {
      drawArcText('FLIGHT-QUALIFIED BY NASA', 136, 0, 0.078);
      drawArcText('SPEEDMASTER · MOONWATCH', 136, Math.PI, 0.078);
    }
  } else if (watch.brand === 'TUDOR') {
    drawArcText('TUDOR GENEVE · BORN TO DARE', 136, 0, 0.074);
    drawArcText(`BLACK BAY 58 · ${watch.reference}`, 136, Math.PI, 0.074);
  } else if (watch.brand === 'VACHERON CONSTANTIN') {
    drawArcText('VACHERON CONSTANTIN GENEVE', 136, 0, 0.072);
    drawArcText(`OVERSEAS · POINCON DE GENEVE`, 136, Math.PI, 0.07);
  } else if (watch.brand === 'AUDEMARS PIGUET') {
    drawArcText('ROYAL OAK · EXTRA-THIN', 136, 0, 0.08);
    drawArcText(`REF. ${watch.reference} · LE BRASSUS`, 136, Math.PI, 0.076);
  } else if (watch.brand === 'PATEK PHILIPPE') {
    if (watch.id === 'pp-worldtime') {
      drawArcText('PATEK PHILIPPE GENEVE', 136, 0, 0.082);
      drawArcText(`WORLD TIME · CAL. 240 HU · ${watch.reference}`, 136, Math.PI, 0.062);
    } else {
      drawArcText('PATEK PHILIPPE GENEVE', 136, 0, 0.082);
      drawArcText(`NAUTILUS · REF. ${watch.reference}`, 136, Math.PI, 0.074);
    }
  } else if (watch.brand === 'CARTIER') {
    if (watch.id === 'cartier-tank-louis') {
      drawArcText('TANK LOUIS CARTIER · PARIS', 136, 0, 0.074);
      drawArcText(`OR 750 · SWISS MADE · ${watch.reference}`, 136, Math.PI, 0.068);
    } else if (watch.id === 'cartier-crash') {
      drawArcText('CARTIER LONDON · CRASH 1967', 136, 0, 0.072);
      drawArcText(`OR 750 · ${watch.reference}`, 136, Math.PI, 0.074);
    } else {
      drawArcText('SANTOS DE CARTIER · WATER RESISTANT', 136, 0, 0.068);
      drawArcText(`SWISS MADE · ${watch.reference}`, 136, Math.PI, 0.078);
    }
  } else if (watch.brand === 'JAEGER-LECOULTRE') {
    drawArcText('JAEGER-LECOULTRE · REVERSO DUOFACE', 136, 0, 0.068);
    drawArcText(`MANUFACTURE LE SENTIER · ${watch.reference}`, 136, Math.PI, 0.064);
  } else if (watch.brand === 'PANERAI') {
    drawArcText('OFFICINE PANERAI · FIRENZE 1860', 136, 0, 0.068);
    drawArcText(`LUMINOR MARINA · 300M · ${watch.reference}`, 136, Math.PI, 0.066);
  } else if (watch.brand === 'TAG HEUER') {
    drawArcText('TAG HEUER MONACO · CALIBRE 11', 136, 0, 0.07);
    drawArcText(`SWISS AVANT-GARDE · ${watch.reference}`, 136, Math.PI, 0.068);
  } else if (watch.brand === 'BREITLING') {
    drawArcText('BREITLING · NAVITIMER CHRONOGRAPH', 136, 0, 0.066);
    drawArcText(`MANUFACTURE CAL. B01 · ${watch.reference}`, 136, Math.PI, 0.064);
  } else if (watch.brand === 'ZENITH') {
    drawArcText('ZENITH · EL PRIMERO 36,000 VpH', 136, 0, 0.068);
    drawArcText(`LE LOCLE MANUFACTURE · ${watch.reference}`, 136, Math.PI, 0.064);
  } else if (watch.brand === 'IWC SCHAFFHAUSEN') {
    drawArcText('IWC SCHAFFHAUSEN · BIG PILOT UTC', 136, 0, 0.066);
    drawArcText(`PROBUS SCAFUSIA · ${watch.reference}`, 136, Math.PI, 0.072);
  } else if (watch.brand === 'BREGUET') {
    drawArcText('HORLOGER DE LA MARINE · BREGUET', 136, 0, 0.068);
    drawArcText(`CLASSIQUE 5177 · ${watch.reference}`, 136, Math.PI, 0.074);
  } else if (watch.brand === 'GRAND SEIKO') {
    if (watch.id === 'gs-white-birch') {
      drawArcText('GRAND SEIKO · HI-BEAT 36000', 136, 0, 0.072);
      drawArcText(`CAL. 9SA5 · SHIZUKUISHI · ${watch.reference}`, 136, Math.PI, 0.064);
    } else {
      drawArcText('GRAND SEIKO · SPRING DRIVE', 136, 0, 0.076);
      drawArcText(`ZARATSU POLISH · ${watch.reference}`, 136, Math.PI, 0.072);
    }
  } else if (watch.brand === 'A. LANGE & SÖHNE') {
    if (watch.id === 'lange-zeitwerk') {
      drawArcText('A. LANGE & SOHNE · ZEITWERK', 136, 0, 0.072);
      drawArcText(`CALIBER L043.6 · ${watch.reference}`, 136, Math.PI, 0.072);
    } else {
      drawArcText('A. LANGE & SOHNE · GLASHUTTE I/SA', 136, 0, 0.068);
      drawArcText(`CALIBER L121.3 · ${watch.reference}`, 136, Math.PI, 0.072);
    }
  } else if (watch.brand === 'RICHARD MILLE') {
    drawArcText('RICHARD MILLE · SWISS RACING MACHINE', 136, 0, 0.064);
    drawArcText(`GRADE 5 TITANIUM · ${watch.reference}`, 136, Math.PI, 0.066);
  } else if (watch.brand === 'F.P. JOURNE') {
    drawArcText('F.P. JOURNE · INVENIT ET FECIT', 136, 0, 0.068);
    drawArcText(`CHRONOMETRE BLEU · TANTALUM`, 136, Math.PI, 0.068);
  } else if (watch.brand === 'H. MOSER & CIE') {
    drawArcText('H. MOSER & CIE · SCHAFFHAUSEN', 136, 0, 0.068);
    drawArcText(`STREAMLINER · CAL. HMC 200`, 136, Math.PI, 0.07);
  } else if (watch.brand === 'MB&F') {
    drawArcText('MB&F · LEGACY MACHINE 101', 136, 0, 0.072);
    drawArcText(`KARI VOUTILAINEN · GENEVE`, 136, Math.PI, 0.072);
  } else if (watch.brand === 'BULGARI') {
    drawArcText('BVLGARI · OCTO FINISSIMO', 136, 0, 0.074);
    drawArcText(`TITANIUM · CAL. BVL 138 · ${watch.reference}`, 136, Math.PI, 0.064);
  } else if (watch.brand === 'LONGINES') {
    drawArcText('LONGINES · SPIRIT ZULU TIME', 136, 0, 0.07);
    drawArcText(`CHRONOMETER · CAL. L844.4`, 136, Math.PI, 0.07);
  } else if (watch.brand === 'HAMILTON') {
    drawArcText('HAMILTON · KHAKI FIELD MURPH', 136, 0, 0.068);
    drawArcText(`CALIBER H-10 · ${watch.reference}`, 136, Math.PI, 0.072);
  } else if (watch.brand === 'NOMOS GLASHÜTTE') {
    drawArcText('NOMOS GLASHUTTE · TANGENTE', 136, 0, 0.07);
    drawArcText(`NEOMATIK · DUW 3001 · ${watch.reference}`, 136, Math.PI, 0.066);
  } else if (watch.brand === 'BLANCPAIN') {
    drawArcText('BLANCPAIN · FIFTY FATHOMS', 136, 0, 0.074);
    drawArcText(`300M · CAL. 1315 · 1953`, 136, Math.PI, 0.074);
  } else if (watch.brand === 'DOXA') {
    drawArcText('DOXA · SUB 300 PROFESSIONAL', 136, 0, 0.068);
    drawArcText(`SYNCHRON · 300M · SWISS MADE`, 136, Math.PI, 0.068);
  } else if (watch.brand === 'GIRARD-PERREGAUX') {
    drawArcText('GIRARD-PERREGAUX · LAUREATO', 136, 0, 0.068);
    drawArcText(`MANUFACTURE 1791 · ${watch.reference}`, 136, Math.PI, 0.062);
  } else if (watch.brand === 'PIAGET') {
    drawArcText('PIAGET · POLO 79 · 18K GOLD', 136, 0, 0.07);
    drawArcText(`CAL. 1200P1 · ${watch.reference}`, 136, Math.PI, 0.072);
  } else if (watch.brand === 'CASIO') {
    if (watch.id === 'casio-gshock-dw5600') {
      drawArcText('CASIO · G-SHOCK · DW-5600E', 136, 0, 0.072);
      drawArcText('SHOCK RESIST · MODULE 3229', 136, Math.PI, 0.07);
    } else if (watch.id === 'casio-casioak-ga2100') {
      drawArcText('CASIO · G-SHOCK · GA-2100', 136, 0, 0.072);
      drawArcText('CARBON CORE GUARD · 20BAR', 136, Math.PI, 0.07);
    } else {
      drawArcText('CASIO · F-91W · MODULE 593', 136, 0, 0.072);
      drawArcText('WATER RESIST · STAINLESS BACK', 136, Math.PI, 0.066);
    }
  } else if (watch.brand === 'ROLEX') {
    drawArcText('ROLEX OYSTER PERPETUAL', 136, 0, 0.082);
    drawArcText(`REF. ${watch.reference} · GENEVE`, 136, Math.PI, 0.082);
  } else {
    drawArcText(`${watch.brand} · ${watch.shortName.toUpperCase()}`, 136, 0, 0.068);
    drawArcText(`REF. ${watch.reference} · SWISS`, 136, Math.PI, 0.072);
  }

  // Optional bespoke user engraving rendered cleanly across center medallion
  const cleaned = customEngraving?.trim().slice(0, 18);
  if (cleaned) {
    drawPadText(ctx, cleaned.toUpperCase(), cx, cy, {
      role: 'serif',
      weight: 600,
      size: 24,
      italic: true,
      color: 'rgba(26, 30, 34, 0.84)',
      tracking: 2.2,
      finish: 'engraved',
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
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
    const rNum = size * 0.36;
    for (let h = 2; h <= 24; h += 2) {
      const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.rotate(a + Math.PI / 2);
      drawPadText(ctx, String(h), 0, -rNum, {
        role: 'condensed',
        weight: 700,
        size: 32,
        color: '#181B1F',
        tracking: 1.0,
      });
      ctx.restore();
    }
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
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

    drawPadText(ctx, 'JAEGER-LECOULTRE', 0, -210, {
      role: 'engraved',
      weight: 600,
      size: 21,
      color: '#1B222C',
      tracking: 3.0,
      finish: 'dark-metallic',
    });
    drawPadText(ctx, 'HOME TIME · DUOFACE', 0, -34, {
      role: 'sans',
      weight: 600,
      size: 12.5,
      color: '#27303C',
      tracking: 2.2,
    });

    // Lower 24-hour Night / Day subdial
    ctx.beginPath();
    ctx.arc(0, 210, 118, 0, Math.PI * 2);
    ctx.fillStyle = '#15253D';
    ctx.fill();
    ctx.strokeStyle = '#B89B5E';
    ctx.lineWidth = 4;
    ctx.stroke();
    drawPadText(ctx, '24H', 0, 148, {
      role: 'condensed',
      weight: 700,
      size: 25,
      color: '#F7E7B8',
      finish: 'gilt',
      halo: 'dark',
      tracking: 1.6,
    });
    drawPadText(ctx, '12', 0, 272, {
      role: 'condensed',
      weight: 700,
      size: 25,
      color: '#F7E7B8',
      finish: 'gilt',
      halo: 'dark',
      tracking: 1.6,
    });
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
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

export function createQuartzPcbTexture(
  moduleLabel: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  return getCachedTexture(`quartz-pcb:${moduleLabel}:${maxAnisotropy}`, () => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;

    // Deep solder-mask emerald green fiberglass substrate
    const bg = ctx.createRadialGradient(cx, cy, 20, cx, cy, size * 0.55);
    bg.addColorStop(0, '#145338');
    bg.addColorStop(1, '#0B3322');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // Subtle fiberglass weave grid
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let i = 0; i < size; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }

    // Gold-plated copper PCB bus traces
    ctx.strokeStyle = '#C9A24B';
    ctx.lineWidth = 3;
    const traces: [number, number, number, number, number, number][] = [
      [110, 140, 190, 140, 230, 180],
      [110, 160, 182, 160, 222, 200],
      [110, 180, 174, 180, 214, 220],
      [140, 340, 210, 340, 250, 300],
      [140, 360, 224, 360, 264, 320],
      [310, 140, 360, 140, 390, 170],
      [300, 160, 350, 160, 380, 190],
      [290, 370, 360, 370, 400, 330],
    ];
    traces.forEach(([x0, y0, x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.fillStyle = '#E8C975';
      ctx.beginPath();
      ctx.arc(x0, y0, 5, 0, Math.PI * 2);
      ctx.arc(x2, y2, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Perimeter gold test contact pads (AC / + / -)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.25;
      const px = cx + Math.cos(a) * 195;
      const py = cy + Math.sin(a) * 195;
      ctx.fillStyle = '#D4AF37';
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111614';
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crisp white PCB silkscreen markings
    drawPadText(ctx, moduleLabel, cx, 88, {
      role: 'mono',
      weight: 700,
      size: 18,
      color: 'rgba(241, 245, 249, 0.9)',
      tracking: 1.4,
      halo: 'dark',
    });
    drawPadText(ctx, '32,768 Hz · AC RESET · JAPAN', cx, 424, {
      role: 'mono',
      weight: 600,
      size: 13,
      color: 'rgba(241, 245, 249, 0.85)',
      tracking: 1.0,
      halo: 'dark',
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  });
}

export function createRatchetSunburstTexture(maxAnisotropy: number): THREE.CanvasTexture {
  return getCachedTexture(`ratchet-sunburst:${maxAnisotropy}`, () => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;

    ctx.fillStyle = '#B8BDC4';
    ctx.fillRect(0, 0, size, size);

    // Classic Glashütte / Swiss solarized curved sunburst snailing
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(40,46,54,0.24)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16);
      ctx.quadraticCurveTo(
        cx + Math.cos(a + 0.35) * 72,
        cy + Math.sin(a + 0.35) * 72,
        cx + Math.cos(a + 0.55) * 126,
        cy + Math.sin(a + 0.55) * 126
      );
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    return tex;
  });
}

export function createHandEngravedCockTexture(maxAnisotropy: number): THREE.CanvasTexture {
  return getCachedTexture(`engraved-cock:${maxAnisotropy}`, () => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#DDD4BC';
    ctx.fillRect(0, 0, size, size);

    // Delicate floral Glashütte burin scrollwork
    ctx.strokeStyle = 'rgba(55, 45, 28, 0.55)';
    ctx.lineWidth = 2.6;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const x = 32 + col * 64;
        const y = 32 + row * 64;
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 1.65);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + 8, y - 6, 11, Math.PI * 0.4, Math.PI * 1.9);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    return tex;
  });
}




