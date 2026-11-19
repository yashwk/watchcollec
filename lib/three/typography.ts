// Precision Horological Typography & Pad-Printing Engine for Canvas2D 3D Watch Textures

export type HoroFontRole = 'engraved' | 'serif' | 'sans' | 'condensed' | 'mono';

export type PadInkFinish =
  | 'lacquer'
  | 'silver'
  | 'gold'
  | 'gilt'
  | 'rose'
  | 'dark-metallic'
  | 'engraved';

interface ResolvedCanvasFonts {
  engraved: string;
  serif: string;
  sans: string;
  condensed: string;
  mono: string;
}

let cachedFonts: ResolvedCanvasFonts | null = null;

function readCssFontVar(varName: string, fallback: string): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fallback;
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return fallback;
  return `${raw}, ${fallback}`;
}

export function invalidateCanvasFontCache() {
  cachedFonts = null;
}

export function resolveCanvasFonts(): ResolvedCanvasFonts {
  if (cachedFonts) return cachedFonts;
  cachedFonts = {
    engraved: readCssFontVar('--font-cinzel', 'Georgia, "Times New Roman", serif'),
    serif: readCssFontVar('--font-cormorant', 'Georgia, "Times New Roman", serif'),
    sans: readCssFontVar('--font-jakarta', '"Helvetica Neue", Arial, sans-serif'),
    condensed: readCssFontVar('--font-oswald', '"Arial Narrow", Arial, sans-serif'),
    mono: readCssFontVar('--font-jetbrains', 'ui-monospace, monospace'),
  };
  return cachedFonts;
}

export function horoFont(
  role: HoroFontRole,
  weight: number | string,
  sizePx: number,
  italic = false
): string {
  const f = resolveCanvasFonts()[role];
  return `${italic ? 'italic ' : ''}${weight} ${sizePx}px ${f}`;
}

export interface PadTextOptions {
  role?: HoroFontRole;
  weight?: number | string;
  size: number;
  italic?: boolean;
  color: string;
  tracking?: number;
  align?: 'center' | 'left' | 'right';
  finish?: PadInkFinish;
  /** Subtle high-contrast micro-backing so thin dial print floats cleanly over sunburst/guilloché/wave textures */
  halo?: 'dark' | 'light' | 'none';
  /** Micro ink thickness stroke (px) to preserve optical weight through GPU mipmapping */
  inkStroke?: number;
  /** Optional horizontal/vertical optical scale */
  scaleX?: number;
  scaleY?: number;
}

function buildInkFillStyle(
  ctx: CanvasRenderingContext2D,
  y: number,
  size: number,
  color: string,
  finish: PadInkFinish
): string | CanvasGradient {
  if (finish === 'lacquer' || finish === 'engraved') return color;
  const g = ctx.createLinearGradient(0, y - size * 0.55, 0, y + size * 0.55);
  if (finish === 'silver') {
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.42, '#EAEFF5');
    g.addColorStop(0.68, '#C8D1DC');
    g.addColorStop(1, '#F6F9FC');
    return g;
  }
  if (finish === 'gold') {
    g.addColorStop(0, '#FFF1C2');
    g.addColorStop(0.38, '#E6C265');
    g.addColorStop(0.7, '#B88E32');
    g.addColorStop(1, '#F2D685');
    return g;
  }
  if (finish === 'gilt') {
    g.addColorStop(0, '#F5DB9B');
    g.addColorStop(0.45, '#DCBA72');
    g.addColorStop(0.75, '#B68F48');
    g.addColorStop(1, '#E8C87D');
    return g;
  }
  if (finish === 'rose') {
    g.addColorStop(0, '#FCE0CE');
    g.addColorStop(0.45, '#DDA483');
    g.addColorStop(0.75, '#B07554');
    g.addColorStop(1, '#EBC0A4');
    return g;
  }
  if (finish === 'dark-metallic') {
    g.addColorStop(0, '#363C44');
    g.addColorStop(0.45, '#171A1E');
    g.addColorStop(0.78, '#0D0F12');
    g.addColorStop(1, '#2D323A');
    return g;
  }
  return color;
}

/**
 * Draws optically tracked horological pad-printed text with lacquer micro-relief,
 * metallic specular sheen, and anti-mipmap thinning precision.
 */
export function drawPadText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: PadTextOptions
) {
  const {
    role = 'sans',
    weight = 600,
    size,
    italic = false,
    color,
    tracking = 0,
    align = 'center',
    finish = 'lacquer',
    halo = 'none',
    inkStroke = 0,
    scaleX = 1,
    scaleY = 1,
  } = opts;

  ctx.save();
  ctx.translate(x, y);
  if (scaleX !== 1 || scaleY !== 1) {
    ctx.scale(scaleX, scaleY);
  }
  ctx.font = horoFont(role, weight, size, italic);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const totalW =
    widths.reduce((acc, w) => acc + w, 0) + Math.max(0, chars.length - 1) * tracking;

  let cursorX =
    align === 'center' ? -totalW * 0.5 : align === 'left' ? 0 : -totalW;

  const drawGlyphPass = (
    dx: number,
    dy: number,
    style: string | CanvasGradient,
    strokeOnly = false,
    strokeW = 0
  ) => {
    let cxPos = cursorX;
    if (strokeOnly) {
      ctx.strokeStyle = style;
      ctx.lineWidth = strokeW;
      ctx.lineJoin = 'round';
    } else {
      ctx.fillStyle = style;
    }
    for (let i = 0; i < chars.length; i++) {
      const gw = widths[i];
      const gx = cxPos + gw * 0.5 + dx;
      if (strokeOnly) {
        ctx.strokeText(chars[i], gx, dy);
      } else {
        ctx.fillText(chars[i], gx, dy);
      }
      cxPos += gw + tracking;
    }
  };

  if (finish === 'engraved') {
    // Laser/burin metal engraving: crisp bright catch-light below + recessed dark channel
    drawGlyphPass(0, 1.15, 'rgba(255, 255, 255, 0.44)');
    drawGlyphPass(0, -0.4, 'rgba(12, 16, 20, 0.34)');
    drawGlyphPass(0, 0, color);
    ctx.restore();
    return;
  }

  // Optional soft pad-print relief shadow / contrast halo
  if (halo === 'dark') {
    drawGlyphPass(0, 1.35, 'rgba(4, 6, 9, 0.58)');
    drawGlyphPass(0, 0.45, 'rgba(4, 6, 9, 0.32)', true, Math.max(1.2, size * 0.05));
  } else if (halo === 'light') {
    drawGlyphPass(0, 1.0, 'rgba(255, 255, 255, 0.42)');
  } else if (finish !== 'lacquer') {
    // Applied metallic wordmarks cast a crisp hairline micro-shadow onto the dial
    drawGlyphPass(0, 1.5, 'rgba(0, 0, 0, 0.52)');
  }

  const fillStyle = buildInkFillStyle(ctx, 0, size, color, finish);
  if (inkStroke > 0) {
    drawGlyphPass(0, 0, fillStyle, true, inkStroke);
  }
  drawGlyphPass(0, 0, fillStyle);

  // Subtle top specular highlight on applied metallic signatures
  if (finish === 'silver' || finish === 'gold' || finish === 'gilt' || finish === 'rose') {
    ctx.globalAlpha = 0.24;
    drawGlyphPass(0, -0.65, '#FFFFFF');
  }

  ctx.restore();
}

export interface ArcPadTextOptions extends PadTextOptions {
  /** Set true for 6 o'clock bottom-of-dial curved text so letters remain upright left-to-right */
  bottomArc?: boolean;
  /** Angular spacing override in radians (if omitted, computed automatically from glyph widths + tracking) */
  fixedStepRad?: number;
}

/**
 * Draws optically tracked horological text cleanly along a circular dial or caseback arc.
 * centerAngleRad uses standard watch convention: 0 = 12 o'clock, Math.PI = 6 o'clock.
 */
export function drawArcPadText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  centerAngleRad: number,
  opts: ArcPadTextOptions
) {
  const {
    role = 'sans',
    weight = 600,
    size,
    italic = false,
    color,
    tracking = 1.2,
    finish = 'lacquer',
    halo = 'none',
    inkStroke = 0,
    bottomArc = false,
    fixedStepRad,
  } = opts;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.font = horoFont(role, weight, size, italic);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);

  let angles: number[] = [];
  if (fixedStepRad !== undefined) {
    const totalSpan = (chars.length - 1) * fixedStepRad;
    const dir = bottomArc ? -1 : 1;
    const start = centerAngleRad - dir * totalSpan * 0.5;
    angles = chars.map((_, i) => start + dir * i * fixedStepRad);
  } else {
    const glyphSteps = widths.map((w) => (w + tracking) / radius);
    const totalArc =
      glyphSteps.reduce((acc, s) => acc + s, 0) - tracking / radius;
    const dir = bottomArc ? -1 : 1;
    let cursor = centerAngleRad - dir * totalArc * 0.5;
    angles = chars.map((_, i) => {
      const half = widths[i] / (2 * radius);
      const a = cursor + dir * half;
      cursor += dir * ((widths[i] + tracking) / radius);
      return a;
    });
  }

  const drawChar = (
    ch: string,
    angle: number,
    dx: number,
    dy: number,
    style: string | CanvasGradient,
    strokeOnly = false,
    strokeW = 0
  ) => {
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(0, -radius);
    if (bottomArc) {
      ctx.rotate(Math.PI);
    }
    if (strokeOnly) {
      ctx.strokeStyle = style;
      ctx.lineWidth = strokeW;
      ctx.lineJoin = 'round';
      ctx.strokeText(ch, dx, dy);
    } else {
      ctx.fillStyle = style;
      ctx.fillText(ch, dx, dy);
    }
    ctx.restore();
  };

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const ang = angles[i];
    if (finish === 'engraved') {
      drawChar(ch, ang, 0, 1.15, 'rgba(255, 255, 255, 0.45)');
      drawChar(ch, ang, 0, -0.45, 'rgba(12, 16, 20, 0.38)');
      drawChar(ch, ang, 0, 0, color);
      continue;
    }

    if (halo === 'dark') {
      drawChar(ch, ang, 0, 1.2, 'rgba(4, 6, 9, 0.58)');
    } else if (halo === 'light') {
      drawChar(ch, ang, 0, 0.9, 'rgba(255, 255, 255, 0.42)');
    }

    if (inkStroke > 0) {
      drawChar(ch, ang, 0, 0, color, true, inkStroke);
    }
    drawChar(ch, ang, 0, 0, color);
  }

  ctx.restore();
}

/**
 * Carves an authentic smooth recessed signature cartouche over heavy dial textures
 * (Petite Tapisserie, Nautilus grooves, Clous de Paris, Polo gadroons) so pad-printed
 * Maison signatures read cleanly like the real watches.
 */
export function drawDialCartouche(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  baseHex: string,
  opts?: {
    radius?: number;
    borderColor?: string;
    borderWidth?: number;
    opacity?: number;
  }
) {
  const r = opts?.radius ?? 4;
  const opacity = opts?.opacity ?? 0.94;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = baseHex;
  ctx.beginPath();
  ctx.roundRect(x - w * 0.5, y - h * 0.5, w, h, r);
  ctx.fill();

  // Subtle satin recessed inner bevel
  const grad = ctx.createLinearGradient(0, y - h * 0.5, 0, y + h * 0.5);
  grad.addColorStop(0, 'rgba(0,0,0,0.22)');
  grad.addColorStop(0.22, 'rgba(255,255,255,0.04)');
  grad.addColorStop(0.82, 'rgba(0,0,0,0.03)');
  grad.addColorStop(1, 'rgba(255,255,255,0.14)');
  ctx.fillStyle = grad;
  ctx.fill();

  if (opts?.borderColor) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = opts.borderColor;
    ctx.lineWidth = opts.borderWidth ?? 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws machined / platinum-PVD recessed or raised-relief Cerachrom bezel numerals.
 */
export function drawBezelEngravedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: {
    size: number;
    color: string;
    role?: HoroFontRole;
    weight?: number | string;
    raised?: boolean;
    darkInk?: boolean;
    tracking?: number;
  }
) {
  const {
    size,
    color,
    role = 'condensed',
    weight = 700,
    raised = false,
    darkInk = false,
    tracking = 1.2,
  } = opts;

  ctx.save();
  ctx.font = horoFont(role, weight, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const totalW =
    widths.reduce((acc, w) => acc + w, 0) + Math.max(0, chars.length - 1) * tracking;
  const startX = x - totalW * 0.5;

  const drawPass = (
    dx: number,
    dy: number,
    style: string | CanvasGradient,
    stroke = false,
    lw = 0
  ) => {
    let cur = startX;
    if (stroke) {
      ctx.strokeStyle = style;
      ctx.lineWidth = lw;
      ctx.lineJoin = 'round';
    } else {
      ctx.fillStyle = style;
    }
    for (let i = 0; i < chars.length; i++) {
      const gw = widths[i];
      if (stroke) {
        ctx.strokeText(chars[i], cur + gw * 0.5 + dx, y + dy);
      } else {
        ctx.fillText(chars[i], cur + gw * 0.5 + dx, y + dy);
      }
      cur += gw + tracking;
    }
  };

  if (raised) {
    // Yacht-Master raised polished numerals over matte sandblasted Cerachrom
    drawPass(0, 2.4, 'rgba(0,0,0,0.88)');
    drawPass(0, 0.8, 'rgba(0,0,0,0.6)', true, 2.6);
    const g = ctx.createLinearGradient(0, y - size * 0.5, 0, y + size * 0.5);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.5, '#E2E7EE');
    g.addColorStop(1, '#BCC4CE');
    drawPass(0, 0, g);
  } else if (darkInk) {
    // Black-lacquered engraved numerals on brushed steel (Explorer II, DOXA)
    drawPass(0, 1.1, 'rgba(255,255,255,0.42)');
    drawPass(0, 0, color);
  } else {
    // Recessed platinum/gold PVD filled Cerachrom engraving
    drawPass(0, -1.2, 'rgba(0,0,0,0.68)', true, 2.2);
    drawPass(0, 0.9, 'rgba(255,255,255,0.22)');
    drawPass(0, 0, color);
  }
  ctx.restore();
}

// Authentic beveled 7-segment LCD polygon definitions (Casio DW-5600 / F-91W / GA-2100)
// Segments: 0=top, 1=top-right, 2=bot-right, 3=bottom, 4=bot-left, 5=top-left, 6=middle
const SEVEN_SEG_MAP: Record<string, number[]> = {
  '0': [1, 1, 1, 1, 1, 1, 0],
  '1': [0, 1, 1, 0, 0, 0, 0],
  '2': [1, 1, 0, 1, 1, 0, 1],
  '3': [1, 1, 1, 1, 0, 0, 1],
  '4': [0, 1, 1, 0, 0, 1, 1],
  '5': [1, 0, 1, 1, 0, 1, 1],
  '6': [1, 0, 1, 1, 1, 1, 1],
  '7': [1, 1, 1, 0, 0, 0, 0],
  '8': [1, 1, 1, 1, 1, 1, 1],
  '9': [1, 1, 1, 1, 0, 1, 1],
  '-': [0, 0, 0, 0, 0, 0, 1],
  ' ': [0, 0, 0, 0, 0, 0, 0],
};

function drawSingleSevenSegDigit(
  ctx: CanvasRenderingContext2D,
  ch: string,
  x: number,
  y: number,
  w: number,
  h: number,
  activeColor: string,
  ghostColor: string
) {
  const mask = SEVEN_SEG_MAP[ch] ?? SEVEN_SEG_MAP[' '];
  const t = Math.max(3, w * 0.21);
  const gap = Math.max(1.2, t * 0.22);
  const halfH = h * 0.5;
  const bevel = t * 0.5;

  const drawHSeg = (sy: number, on: boolean) => {
    ctx.fillStyle = on ? activeColor : ghostColor;
    ctx.beginPath();
    ctx.moveTo(x + gap + bevel, sy - bevel);
    ctx.lineTo(x + w - gap - bevel, sy - bevel);
    ctx.lineTo(x + w - gap, sy);
    ctx.lineTo(x + w - gap - bevel, sy + bevel);
    ctx.lineTo(x + gap + bevel, sy + bevel);
    ctx.lineTo(x + gap, sy);
    ctx.closePath();
    ctx.fill();
  };

  const drawVSeg = (sx: number, syTop: number, syBot: number, on: boolean) => {
    ctx.fillStyle = on ? activeColor : ghostColor;
    ctx.beginPath();
    ctx.moveTo(sx, syTop + gap);
    ctx.lineTo(sx + bevel, syTop + gap + bevel);
    ctx.lineTo(sx + bevel, syBot - gap - bevel);
    ctx.lineTo(sx, syBot - gap);
    ctx.lineTo(sx - bevel, syBot - gap - bevel);
    ctx.lineTo(sx - bevel, syTop + gap + bevel);
    ctx.closePath();
    ctx.fill();
  };

  drawHSeg(y + bevel, mask[0] === 1); // top
  drawVSeg(x + w - bevel, y + bevel, y + halfH, mask[1] === 1); // top-right
  drawVSeg(x + w - bevel, y + halfH, y + h - bevel, mask[2] === 1); // bot-right
  drawHSeg(y + h - bevel, mask[3] === 1); // bottom
  drawVSeg(x + bevel, y + halfH, y + h - bevel, mask[4] === 1); // bot-left
  drawVSeg(x + bevel, y + bevel, y + halfH, mask[5] === 1); // top-left
  drawHSeg(y + halfH, mask[6] === 1); // middle
}

export function drawSevenSegmentString(
  ctx: CanvasRenderingContext2D,
  value: string,
  centerX: number,
  centerY: number,
  digitHeight: number,
  opts: {
    activeColor: string;
    ghostColor?: string;
    skew?: number;
    spacingRatio?: number;
  }
) {
  const {
    activeColor,
    ghostColor = 'rgba(20, 28, 22, 0.085)',
    skew = -0.09,
    spacingRatio = 0.22,
  } = opts;

  const digitW = digitHeight * 0.56;
  const colonW = digitHeight * 0.24;
  const spaceW = digitHeight * 0.28;
  const gap = digitW * spacingRatio;

  const chars = Array.from(value);
  const widths = chars.map((ch) =>
    ch === ':' ? colonW : ch === ' ' ? spaceW : digitW
  );
  const totalW =
    widths.reduce((acc, w) => acc + w, 0) + Math.max(0, chars.length - 1) * gap;

  ctx.save();
  ctx.translate(centerX, centerY);
  if (skew !== 0) {
    ctx.transform(1, 0, skew, 1, 0, 0);
  }

  let curX = -totalW * 0.5;
  const topY = -digitHeight * 0.5;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const cw = widths[i];
    if (ch === ':') {
      const dotR = Math.max(2.6, digitHeight * 0.068);
      ctx.fillStyle = activeColor;
      ctx.fillRect(curX + cw * 0.5 - dotR, -digitHeight * 0.22 - dotR, dotR * 2, dotR * 2);
      ctx.fillRect(curX + cw * 0.5 - dotR, digitHeight * 0.22 - dotR, dotR * 2, dotR * 2);
    } else if (ch !== ' ') {
      drawSingleSevenSegDigit(
        ctx,
        ch,
        curX,
        topY,
        cw,
        digitHeight,
        activeColor,
        ghostColor
      );
    }
    curX += cw + gap;
  }
  ctx.restore();
}
