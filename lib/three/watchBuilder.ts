import * as THREE from 'three';
import {
  BeltId,
  BezelOption,
  DialOption,
  WatchSpec,
  resolveWatchCapabilities,
} from '@/lib/watches';
import { WatchMaterialSet } from './materials';
import {
  DialDateOverride,
  createBezelInsertTexture,
  createCasebackEngravingTexture,
  createContactShadowTexture,
  createCotesDeGeneveTexture,
  createDialTexture,
  createHandEngravedCockTexture,
  createMoonphaseDiscTexture,
  createPerlageTexture,
  createQuartzPcbTexture,
  createRatchetSunburstTexture,
  createRehautTexture,
  createReversoBackDialTexture,
  createSapphireCoronetTexture,
  createSkyDwellerDiscTexture,
} from './textures';

export interface WatchRig {
  root: THREE.Group;
  watchTiltGroup: THREE.Group;
  shadowMesh: THREE.Mesh;
  interactiveMeshes: THREE.Object3D[];
  updateDialTexture: (
    watch: WatchSpec,
    dialOption: DialOption,
    maxAnisotropy: number,
    dateOverride?: DialDateOverride
  ) => void;
  updateBezelTexture: (
    watch: WatchSpec,
    bezelOption: BezelOption,
    maxAnisotropy: number
  ) => void;
  updateCasebackEngraving: (
    watch: WatchSpec,
    customEngraving: string,
    maxAnisotropy: number
  ) => void;
  updateXrayDial: (enabled: boolean) => void;
  setWetStage: (enabled: boolean) => void;
  setWristPreview: (enabled: boolean, wristMm: number) => void;
  layers: {
    crystalGroup: THREE.Group;
    bezelGroup: THREE.Group;
    handsGroup: THREE.Group;
    dialGroup: THREE.Group;
    caseGroup: THREE.Group;
    caliberGroup: THREE.Group;
    casebackGroup: THREE.Group;
  };
  baseLayerZ: {
    crystal: number;
    bezel: number;
    hands: number;
    dial: number;
    caliber: number;
    caseback: number;
  };
  kinematics: {
    hourHand: THREE.Group;
    minuteHand: THREE.Group;
    secondHand: THREE.Group;
    chronoSplitHand: THREE.Group | null;
    gmtHand: THREE.Group | null;
    skyDisc: THREE.Mesh | null;
    powerReserveHand: THREE.Group | null;
    moonphaseDisc: THREE.Mesh | null;
    chronoSubHands: THREE.Group[];
    chronoPushers: THREE.Mesh[];
    gearWheels: THREE.Mesh[];
    perpetualRotor: THREE.Group;
    balanceWheel: THREE.Group;
    dialBalanceWheel: THREE.Group | null;
    palletFork: THREE.Group;
    hairspring: THREE.Mesh;
    tourbillonCage: THREE.Group | null;
    windingCrown: THREE.Group;
    claspSwing: THREE.Group;
    flipLock: THREE.Object3D;
    glidelockGroup: THREE.Group | null;
    reversoSwivel: THREE.Group | null;
    reversoBackHands: { hour: THREE.Group; minute: THREE.Group } | null;
  };
  dispose: () => void;
}

type CaseShapeType =
  | 'round'
  | 'octagonal'
  | 'compact-octagon'
  | 'cushion'
  | 'square'
  | 'rectangular'
  | 'tonneau'
  | 'crash';

function getCaseShapeRadius(
  angle: number,
  baseR: number,
  shape: CaseShapeType
): number {
  if (shape === 'round') return baseR;
  if (shape === 'crash') {
    return (
      baseR *
      (0.92 +
        0.16 * Math.sin(2 * angle - 0.55) -
        0.11 * Math.cos(3 * angle + 0.4) +
        0.08 * Math.sin(angle + 0.35))
    );
  }
  if (shape === 'octagonal') {
    const sector = Math.PI / 4;
    const rel = (((angle % sector) + sector) % sector) - sector * 0.5;
    const apothem = baseR * 0.94;
    const cosSmoothed = THREE.MathUtils.lerp(Math.cos(rel), 1, 0.09);
    return apothem / Math.max(0.75, cosSmoothed);
  }
  if (shape === 'compact-octagon') {
    // Authentic Casio F-91W compact ~1:1.08 chamfered digital octagon
    const c = Math.abs(Math.cos(angle));
    const s = Math.abs(Math.sin(angle));
    const limX = 0.94 / Math.max(1e-4, c);
    const limY = 1.04 / Math.max(1e-4, s);
    const limDiag = 1.56 / Math.max(1e-4, c + s);
    return baseR * Math.min(limX, limY, limDiag);
  }
  if (shape === 'cushion') {
    const p = 3.0;
    const c = Math.abs(Math.cos(angle));
    const s = Math.abs(Math.sin(angle));
    const denom = Math.pow(Math.pow(c, p) + Math.pow(s, p), 1 / p) || 1;
    return (baseR * 0.95) / denom;
  }
  if (shape === 'rectangular') {
    const c = Math.abs(Math.cos(angle)) / 1.0;
    const s = Math.abs(Math.sin(angle)) / 1.48;
    const p = 10.0;
    const denom = Math.pow(Math.pow(c, p) + Math.pow(s, p), 1 / p) || 1;
    return (baseR * 0.98) / denom;
  }
  if (shape === 'tonneau') {
    const c = Math.abs(Math.cos(angle)) / 0.9;
    const s = Math.abs(Math.sin(angle)) / 1.15;
    const p = 2.6;
    const denom = Math.pow(Math.pow(c, p) + Math.pow(s, p), 1 / p) || 1;
    return (baseR * 0.98) / denom;
  }
  // 'square' (Cartier Santos / G-Shock Origin ergonomic rounded square)
  const p = 5.6;
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  const denom = Math.pow(Math.pow(c, p) + Math.pow(s, p), 1 / p) || 1;
  return (baseR * 0.94) / denom;
}

function createShapedMiddleCaseGeometry(
  caseR: number,
  dialR: number,
  halfT: number,
  shape: CaseShapeType
): THREE.BufferGeometry {
  const outerSpline = new THREE.SplineCurve([
    new THREE.Vector2(dialR - 0.05, -halfT),
    new THREE.Vector2(caseR * 0.88, -halfT * 0.99),
    new THREE.Vector2(caseR * 0.96, -halfT * 0.7),
    new THREE.Vector2(caseR * 1.004, -halfT * 0.18),
    new THREE.Vector2(caseR * 1.004, halfT * 0.24),
    new THREE.Vector2(caseR * 0.97, halfT * 0.62),
    new THREE.Vector2(caseR * 0.935, halfT * 0.78),
  ]);
  const profPts: THREE.Vector2[] = [
    new THREE.Vector2(dialR - 0.05, -halfT),
    ...outerSpline.getPoints(20).slice(1),
    new THREE.Vector2(dialR + 0.02, halfT * 0.78),
    new THREE.Vector2(dialR + 0.005, -halfT * 0.68),
    new THREE.Vector2(dialR - 0.05, -halfT),
  ];

  const radialSegs = 128;
  const profCount = profPts.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= radialSegs; i++) {
    const a = (i / radialSegs) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const scaleFactor = getCaseShapeRadius(a, 1, shape);
    for (let j = 0; j < profCount; j++) {
      const r = profPts[j].x * scaleFactor;
      const z = profPts[j].y;
      positions.push(c * r, s * r, z);
      uvs.push(i / radialSegs, j / (profCount - 1));
    }
  }

  for (let i = 0; i < radialSegs; i++) {
    for (let j = 0; j < profCount - 1; j++) {
      const a = i * profCount + j;
      const b = (i + 1) * profCount + j;
      const c = (i + 1) * profCount + (j + 1);
      const d = i * profCount + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createShapedBezelRingGeometry(
  innerR: number,
  outerR: number,
  shape: CaseShapeType
): THREE.BufferGeometry {
  const bezelProfile = [
    new THREE.Vector2(innerR, -0.04),
    new THREE.Vector2(outerR, -0.04),
    new THREE.Vector2(outerR * 1.005, 0.04),
    new THREE.Vector2(outerR * 0.96, 0.125),
    new THREE.Vector2(innerR + 0.025, 0.132),
    new THREE.Vector2(innerR, 0.085),
    new THREE.Vector2(innerR, -0.04),
  ];

  const radialSegs = 128;
  const profCount = bezelProfile.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= radialSegs; i++) {
    const a = (i / radialSegs) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const scaleFactor = getCaseShapeRadius(a, 1, shape);
    for (let j = 0; j < profCount; j++) {
      const r = bezelProfile[j].x * scaleFactor;
      const z = bezelProfile[j].y;
      positions.push(c * r, s * r, z);
      uvs.push(i / radialSegs, j / (profCount - 1));
    }
  }

  for (let i = 0; i < radialSegs; i++) {
    for (let j = 0; j < profCount - 1; j++) {
      const a = i * profCount + j;
      const b = (i + 1) * profCount + j;
      const c = (i + 1) * profCount + (j + 1);
      const d = i * profCount + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createShapedMainPlateGeometry(
  radius: number,
  depth: number,
  shape: CaseShapeType
): THREE.BufferGeometry {
  if (shape === 'round') {
    const geo = new THREE.CylinderGeometry(radius, radius, depth, 64);
    geo.rotateX(Math.PI / 2);
    return geo;
  }
  const segs = 64;
  const plateShape = new THREE.Shape();
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const r = getCaseShapeRadius(a, radius, shape);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) plateShape.moveTo(x, y);
    else plateShape.lineTo(x, y);
  }
  plateShape.closePath();
  const geo = new THREE.ExtrudeGeometry(plateShape, {
    depth,
    bevelEnabled: false,
    curveSegments: 16,
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

function createShapedCasebackGeometry(
  innerR: number,
  outerR: number,
  isOpenRing: boolean,
  shape: CaseShapeType
): THREE.BufferGeometry {
  const profPts: THREE.Vector2[] = isOpenRing
    ? [
        new THREE.Vector2(innerR, -0.125),
        new THREE.Vector2(THREE.MathUtils.lerp(innerR, outerR, 0.48), -0.095),
        new THREE.Vector2(outerR, -0.03),
        new THREE.Vector2(outerR, 0.06),
        new THREE.Vector2(innerR, 0.06),
        new THREE.Vector2(innerR, -0.125),
      ]
    : [
        new THREE.Vector2(0.0005, -0.15),
        new THREE.Vector2(outerR * 0.75, -0.15),
        new THREE.Vector2(outerR * 0.88, -0.11),
        new THREE.Vector2(outerR, -0.03),
        new THREE.Vector2(outerR, 0.06),
        new THREE.Vector2(0.0005, 0.06),
      ];

  const radialSegs = 128;
  const profCount = profPts.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= radialSegs; i++) {
    const a = (i / radialSegs) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const scaleFactor = getCaseShapeRadius(a, 1, shape);
    for (let j = 0; j < profCount; j++) {
      const r = profPts[j].x * scaleFactor;
      const z = profPts[j].y;
      positions.push(c * r, s * r, z);
      uvs.push(i / radialSegs, j / (profCount - 1));
    }
  }

  for (let i = 0; i < radialSegs; i++) {
    for (let j = 0; j < profCount - 1; j++) {
      const a = i * profCount + j;
      const b = (i + 1) * profCount + j;
      const c = (i + 1) * profCount + (j + 1);
      const d = i * profCount + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createShapedDiscGeometry(
  radius: number,
  segs: number,
  shape: CaseShapeType
): THREE.BufferGeometry {
  if (shape === 'round') {
    return new THREE.CircleGeometry(radius, segs);
  }
  const positions: number[] = [0, 0, 0];
  const uvs: number[] = [0.5, 0.5];
  const indices: number[] = [];
  const uvSpan =
    shape === 'square'
      ? radius * 1.06
      : shape === 'compact-octagon'
        ? radius * 1.08
        : shape === 'rectangular'
          ? radius * 1.54
          : shape === 'tonneau' || shape === 'crash'
            ? radius * 1.24
            : radius;

  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const r = getCaseShapeRadius(a, radius, shape);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    positions.push(x, y, 0);
    uvs.push(0.5 + 0.5 * (x / uvSpan), 0.5 + 0.5 * (y / uvSpan));
  }
  for (let i = 1; i <= segs; i++) {
    indices.push(0, i, i + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createShapedRehautGeometry(
  dialR: number,
  height: number,
  shape: CaseShapeType
): THREE.BufferGeometry {
  const segs = 128;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const rBot = getCaseShapeRadius(a, dialR + 0.004, shape);
    const rTop = getCaseShapeRadius(a, dialR + 0.022, shape);

    positions.push(c * rBot, s * rBot, -height * 0.5);
    uvs.push(i / segs, 0);
    positions.push(c * rTop, s * rTop, height * 0.5);
    uvs.push(i / segs, 1);
  }

  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2 + 1;
    const d = (i + 1) * 2;
    indices.push(a, d, b, b, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates an organic barrel-curved Oyster middle case profile via cubic spline.
 */
function createMiddleCaseLatheGeometry(
  caseR: number,
  dialR: number,
  halfT: number
): THREE.LatheGeometry {
  const outerSpline = new THREE.SplineCurve([
    new THREE.Vector2(dialR - 0.05, -halfT),
    new THREE.Vector2(caseR * 0.87, -halfT * 0.99),
    new THREE.Vector2(caseR * 0.955, -halfT * 0.72),
    new THREE.Vector2(caseR * 1.005, -halfT * 0.2),
    new THREE.Vector2(caseR * 1.004, halfT * 0.24),
    new THREE.Vector2(caseR * 0.968, halfT * 0.62),
    new THREE.Vector2(caseR * 0.935, halfT * 0.78),
  ]);

  const pts: THREE.Vector2[] = [
    new THREE.Vector2(dialR - 0.05, -halfT),
    ...outerSpline.getPoints(22).slice(1),
    new THREE.Vector2(dialR + 0.02, halfT * 0.78),
    new THREE.Vector2(dialR + 0.005, -halfT * 0.68),
    new THREE.Vector2(dialR - 0.05, -halfT),
  ];
  const geo = new THREE.LatheGeometry(pts, 96);
  geo.rotateX(Math.PI / 2);
  return geo;
}

/**
 * Creates contoured rounded link geometry with authentic lengthwise D-profile/camber
 * by drawing the cross-section in (length Y, thickness Z) and beveling left/right cheeks along X.
 */
function createSculptedLinkGeometry(
  width: number,
  length: number,
  depth: number,
  style: 'oyster' | 'jubilee' | 'president' | 'keeper'
): THREE.ExtrudeGeometry {
  const bevel = style === 'president' ? 0.042 : style === 'jubilee' ? 0.028 : 0.032;
  const effW = Math.max(0.03, width - bevel * 2);
  const hl = Math.max(0.02, length * 0.5 - bevel * 0.35);
  const hd = Math.max(0.02, depth * 0.5 - bevel * 0.25);

  const shape = new THREE.Shape();
  if (style === 'president' || style === 'jubilee') {
    // True semi-circular D-profile arch on exterior (+Z), gently contoured wrist side (-Z)
    const archTop = style === 'president' ? hd * 1.32 : hd * 1.18;
    const belly = -hd * 0.72;
    shape.moveTo(-hl, belly * 0.45);
    shape.bezierCurveTo(-hl, archTop * 0.88, -hl * 0.45, archTop, 0, archTop);
    shape.bezierCurveTo(hl * 0.45, archTop, hl, archTop * 0.88, hl, belly * 0.45);
    shape.bezierCurveTo(hl, belly, hl * 0.5, belly * 1.05, 0, belly);
    shape.bezierCurveTo(-hl * 0.5, belly * 1.05, -hl, belly, -hl, belly * 0.45);
  } else if (style === 'keeper') {
    const r = Math.min(hd * 0.65, hl * 0.4);
    shape.moveTo(-hl + r, -hd);
    shape.lineTo(hl - r, -hd);
    shape.quadraticCurveTo(hl, -hd, hl, -hd + r);
    shape.lineTo(hl, hd - r);
    shape.quadraticCurveTo(hl, hd, hl - r, hd);
    shape.lineTo(-hl + r, hd);
    shape.quadraticCurveTo(-hl, hd, -hl, hd - r);
    shape.lineTo(-hl, -hd + r);
    shape.quadraticCurveTo(-hl, -hd, -hl + r, -hd);
  } else {
    // Oyster link: sleek cambered top crest + softened chamfered corners
    shape.moveTo(-hl, -hd * 0.7);
    shape.quadraticCurveTo(-hl, -hd, -hl * 0.72, -hd);
    shape.quadraticCurveTo(0, -hd * 1.08, hl * 0.72, -hd);
    shape.quadraticCurveTo(hl, -hd, hl, -hd * 0.7);
    shape.lineTo(hl, hd * 0.58);
    shape.quadraticCurveTo(hl, hd * 0.96, hl * 0.68, hd * 0.98);
    shape.quadraticCurveTo(0, hd * 1.16, -hl * 0.68, hd * 0.98);
    shape.quadraticCurveTo(-hl, hd * 0.96, -hl, hd * 0.58);
    shape.closePath();
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: effW,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.55,
    bevelSegments: 5,
    curveSegments: 20,
  });
  // Center extruded Z (width) then rotate so X = width, Y = arc length, Z = thickness
  geo.translate(0, 0, -effW * 0.5);
  geo.rotateY(Math.PI / 2);
  geo.rotateX(Math.PI / 2);
  return geo;
}

/**
 * Creates a rounded baton/pill extrusion in X-Y plane (beveled for soft specular edges).
 */
function createRoundedLinkGeometry(
  width: number,
  height: number,
  depth: number,
  bevel: number
): THREE.ExtrudeGeometry {
  const hw = Math.max(0.015, width / 2 - bevel);
  const hh = Math.max(0.015, height / 2 - bevel);
  const r = Math.min(bevel * 1.4, hw * 0.45, hh * 0.45);

  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.02, depth - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 10,
  });
  geo.center();
  return geo;
}

/**
 * Shape-conforming full-depth Solid End Link (SEL) whose inner face locks tightly
 * into any case contour (round, octagonal, cushion, square, rectangular, tonneau)
 * and tapers smoothly in Z down to the bracelet entry hinge with zero underside gaps.
 */
function createCaseHuggingEndLinkGeometry(
  xMin: number,
  xMax: number,
  caseR: number,
  caseShape: CaseShapeType,
  attachY: number,
  attachZ: number,
  depth: number,
  halfT: number
): THREE.ExtrudeGeometry {
  const bevel = 0.018;
  const shape = new THREE.Shape();

  const innerYAtX = (x: number): number => {
    const approxY = getCaseShapeRadius(Math.PI / 2, caseR, caseShape) * 0.9;
    const ang = Math.atan2(approxY, x);
    const r = getCaseShapeRadius(ang, caseR, caseShape) * 0.88;
    return Math.max(0.2, Math.sin(ang) * r);
  };

  const yEdgeOut = attachY + 0.02;
  shape.moveTo(xMin, yEdgeOut);
  shape.lineTo(xMax, yEdgeOut);
  const arcSteps = 16;
  for (let i = 0; i <= arcSteps; i++) {
    const x = THREE.MathUtils.lerp(xMax, xMin, i / arcSteps);
    shape.lineTo(x, innerYAtX(x));
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.04, depth - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.65,
    bevelSegments: 3,
    curveSegments: 14,
  });
  geo.translate(0, 0, -(Math.max(0.04, depth - bevel * 2)) * 0.5);

  const pos = geo.attributes.position;
  const rootTopZ = halfT * 0.62;
  const rootBotZ = -halfT * 0.84;
  const rootCenterZ = (rootTopZ + rootBotZ) * 0.5;
  const rootHalfDepth = Math.max(depth * 0.5, (rootTopZ - rootBotZ) * 0.5);
  const tipHalfDepth = depth * 0.5;

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const yInner = innerYAtX(vx);
    const t = THREE.MathUtils.clamp((vy - yInner) / Math.max(0.06, yEdgeOut - yInner), 0, 1);
    const smoothT = t * t * (0.45 + 0.55 * t);
    const zScale = THREE.MathUtils.lerp(rootHalfDepth / Math.max(0.02, tipHalfDepth), 1.0, smoothT);
    const zShift = THREE.MathUtils.lerp(rootCenterZ, attachZ, smoothT);
    const archCrown = 0.014 * (1 - Math.min(1, Math.pow(vx / (caseR * 0.62), 2)));
    pos.setZ(i, vz * zScale + zShift + archCrown);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function createCurvedClaspGeometry(
  width: number,
  spanY: number,
  edgeZ: number,
  centerZ: number,
  depth: number
): THREE.ExtrudeGeometry {
  const halfH = spanY + 0.14;
  const sag = edgeZ - centerZ;
  const halfD = depth * 0.5;
  const shape = new THREE.Shape();

  shape.moveTo(-halfH, sag - halfD);
  shape.quadraticCurveTo(0, -halfD - 0.03, halfH, sag - halfD);
  shape.quadraticCurveTo(halfH + 0.05, sag, halfH, sag + halfD);
  shape.quadraticCurveTo(0, halfD - 0.03, -halfH, sag + halfD);
  shape.quadraticCurveTo(-halfH - 0.05, sag, -halfH, sag - halfD);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.05, width - 0.06),
    bevelEnabled: true,
    bevelThickness: 0.032,
    bevelSize: 0.028,
    bevelSegments: 4,
    curveSegments: 20,
  });
  geo.translate(0, 0, -(width - 0.06) * 0.5);
  geo.rotateY(Math.PI / 2);
  geo.rotateX(Math.PI / 2);
  return geo;
}

function createToothedGearGeometry(
  outerR: number,
  teeth: number,
  thickness: number
): THREE.ExtrudeGeometry {
  const innerR = outerR * 0.86;
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;

  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.22;
    const a2 = a0 + step * 0.48;
    const a3 = a0 + step * 0.72;
    const x0 = Math.cos(a0) * innerR;
    const y0 = Math.sin(a0) * innerR;
    if (i === 0) shape.moveTo(x0, y0);
    else shape.lineTo(x0, y0);
    shape.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
    shape.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
    shape.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
  }
  shape.closePath();

  const holeOuter = outerR * 0.7;
  const holeInner = outerR * 0.24;
  for (let k = 0; k < 4; k++) {
    const startA = (k / 4) * Math.PI * 2 + 0.18;
    const endA = ((k + 1) / 4) * Math.PI * 2 - 0.18;
    const hole = new THREE.Path();
    hole.absarc(0, 0, holeOuter, startA, endA, false);
    hole.absarc(0, 0, holeInner, endA, startA, true);
    hole.closePath();
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 8,
  });
  geo.translate(0, 0, -thickness * 0.5);
  return geo;
}

/**
 * Watertight sculpted lug with BOTH root & tip capped, contour-clamped outer root
 * embedded deeply inside the middle case wall so zero hollow gaps appear from any angle.
 */
function createOysterLugGeometry(
  side: 1 | -1,
  caseR: number,
  lugAttachR: number,
  lugSpanWidth: number,
  halfT: number,
  caseShape: CaseShapeType,
  opts?: {
    tipExtend?: number;
    tipWidthFrac?: number;
    rootClampScale?: number;
    zDropScale?: number;
    squarish?: number;
  }
): THREE.BufferGeometry {
  const segs = 24;
  const yRoot = lugAttachR * 0.62;
  const yTip = lugAttachR * (opts?.tipExtend ?? 1.215);
  const xInnerBase = lugSpanWidth * 0.5 - 0.014;

  // Clamp outer root X strictly inside the actual case contour so lugs never overhang shaped walls
  const rootSampleAng = Math.atan2(yRoot, caseR * 0.72);
  const caseFlankAtRoot = Math.cos(rootSampleAng) * getCaseShapeRadius(rootSampleAng, caseR, caseShape);
  const maxAllowedOuterX = Math.max(xInnerBase + 0.14, caseFlankAtRoot * (opts?.rootClampScale ?? 0.94));
  const xOuterRoot = Math.min(maxAllowedOuterX, lugAttachR * 0.78);
  const xOuterTip = lugSpanWidth * 0.5 + caseR * (opts?.tipWidthFrac ?? 0.115);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const ringCount = 13;
  const squarish = opts?.squarish ?? 0.54;
  const zDropScale = opts?.zDropScale ?? 1.0;

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const easeT = t * t * (0.44 + 0.56 * t);
    const tipRound = t > 0.85 ? (t - 0.85) / 0.15 : 0;
    const noseFactor = Math.sqrt(Math.max(0.12, 1 - tipRound * tipRound * 0.74));

    const y = THREE.MathUtils.lerp(yRoot, yTip, t);
    const xIn = side * (xInnerBase + tipRound * 0.008);
    const xOut =
      side * THREE.MathUtils.lerp(xOuterRoot, xOuterTip, Math.pow(t, 0.78)) -
      side * tipRound * 0.018;
    const cx = (xIn + xOut) * 0.5;
    const hw = Math.max(0.032, Math.abs(xOut - xIn) * 0.5);

    const zTop = halfT * 0.73 - easeT * (halfT * 0.64 + 0.032) * zDropScale;
    const zBot = -halfT * 0.88 - easeT * Math.min(0.15, halfT * 0.4) * zDropScale;
    const cz = (zTop + zBot) * 0.5;
    const hh = Math.max(0.045, (zTop - zBot) * 0.5) * noseFactor;

    const ringPts: [number, number][] = [];
    for (let j = 0; j < ringCount; j++) {
      // Negative angle ensures CW perimeter in (X, Z) so (a, d, b) yields strictly outward normals
      const a = -(j / (ringCount - 1)) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const px = cx + Math.sign(ca) * Math.pow(Math.abs(ca), squarish) * hw * side;
      const pz = cz + Math.sign(sa) * Math.pow(Math.abs(sa), squarish + 0.04) * hh;
      ringPts.push([px, pz]);
    }

    if (side < 0) {
      ringPts.reverse();
    }

    for (let j = 0; j < ringCount; j++) {
      positions.push(ringPts[j][0], y, ringPts[j][1]);
      uvs.push(j / (ringCount - 1), t);
    }
  }

  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < ringCount - 1; j++) {
      const a = i * ringCount + j;
      const b = (i + 1) * ringCount + j;
      const c = (i + 1) * ringCount + (j + 1);
      const d = i * ringCount + (j + 1);
      indices.push(a, d, b, b, d, c);
    }
  }

  // Watertight Root End Cap (i = 0) so no hollow interior is ever visible from any angle
  const cxRoot = side * ((xInnerBase + xOuterRoot) * 0.5);
  const czRoot = (halfT * 0.73 - halfT * 0.88) * 0.5;
  const rootCenterIdx = positions.length / 3;
  positions.push(cxRoot, yRoot, czRoot);
  uvs.push(0.5, 0);
  for (let j = 0; j < ringCount - 1; j++) {
    indices.push(j + 1, j, rootCenterIdx);
  }

  // Watertight Bullnose Tip Cap (i = segs)
  const tipStart = segs * ringCount;
  const cxTip = side * ((xInnerBase + xOuterTip) * 0.5);
  const zTopTip = halfT * 0.73 - (halfT * 0.64 + 0.032) * zDropScale;
  const zBotTip = -halfT * 0.88 - Math.min(0.15, halfT * 0.4) * zDropScale;
  const czTip = (zTopTip + zBotTip) * 0.5;
  const tipCenterIdx = positions.length / 3;
  positions.push(cxTip, yTip + 0.008, czTip);
  uvs.push(0.5, 1);
  for (let j = 0; j < ringCount - 1; j++) {
    indices.push(tipStart + j, tipStart + j + 1, tipCenterIdx);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Watertight full-width sculpted integrated hood / cushion barrel / Casio shroud
 * whose inner base embeds deeply inside the case body (zero tilt wedge gaps)
 * while its outer nose tapers cleanly downward to meet the first link or strap.
 */
function createIntegratedHoodGeometry(
  rootWidth: number,
  tipWidth: number,
  yRoot: number,
  yTip: number,
  halfT: number,
  tipZCenter: number,
  tipHalfDepth: number,
  chamferPow = 0.36,
  rootCurveDrop = 0.24
): THREE.BufferGeometry {
  const segs = 18;
  const ringCount = 17;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const rootHalfW = Math.max(0.25, rootWidth * 0.5);

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const easeT = t * t * (0.4 + 0.6 * t);
    const hw = THREE.MathUtils.lerp(rootWidth * 0.5, tipWidth * 0.5, Math.pow(t, 0.85));

    // Keep top strictly below baseLayerZ.bezel (halfT * 0.76) and bottom flush with middle case
    const zTop = THREE.MathUtils.lerp(halfT * 0.7, tipZCenter + tipHalfDepth, easeT);
    const zBot = THREE.MathUtils.lerp(-halfT * 0.88, tipZCenter - tipHalfDepth, easeT);
    const cz = (zTop + zBot) * 0.5;
    const hh = Math.max(0.035, (zTop - zBot) * 0.5);

    for (let j = 0; j < ringCount; j++) {
      const a = -(j / (ringCount - 1)) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const px = Math.sign(ca) * Math.pow(Math.abs(ca), chamferPow) * hw;
      const pz = cz + Math.sign(sa) * Math.pow(Math.abs(sa), chamferPow + 0.08) * hh;
      // Curve the embedded inner root along the watch case wall so it NEVER enters the dial or exhibition opening
      const xFrac = Math.min(1, Math.abs(px) / rootHalfW);
      const yLocalRoot = yRoot - xFrac * xFrac * rootCurveDrop;
      const py = THREE.MathUtils.lerp(yLocalRoot, yTip, t);
      positions.push(px, py, pz);
      uvs.push(j / (ringCount - 1), t);
    }
  }

  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < ringCount - 1; j++) {
      const a = i * ringCount + j;
      const b = (i + 1) * ringCount + j;
      const c = (i + 1) * ringCount + (j + 1);
      const d = i * ringCount + (j + 1);
      indices.push(a, d, b, b, d, c);
    }
  }

  // Watertight root cap strictly inside solid case rim
  const rootIdx = positions.length / 3;
  positions.push(0, yRoot, (halfT * 0.7 - halfT * 0.88) * 0.5);
  uvs.push(0.5, 0);
  for (let j = 0; j < ringCount - 1; j++) {
    indices.push(j + 1, j, rootIdx);
  }

  // Watertight nose cap
  const tipStart = segs * ringCount;
  const tipIdx = positions.length / 3;
  positions.push(0, yTip, tipZCenter);
  uvs.push(0.5, 1);
  for (let j = 0; j < ringCount - 1; j++) {
    indices.push(tipStart + j, tipStart + j + 1, tipIdx);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a true 4-armed faceted swallowtail V-notched Maltese Cross (Vacheron Constantin hallmark).
 */
function createMalteseCrossGeometry(
  outerR: number,
  depth: number,
  bevel = 0.005
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const waistR = outerR * 0.22;
  const notchR = outerR * 0.64;
  const wingSpread = 0.42;

  for (let k = 0; k < 4; k++) {
    const baseA = (k * Math.PI) / 2;
    const cA = baseA - Math.PI / 4;
    const lA = baseA - wingSpread;
    const rA = baseA + wingSpread;

    const cx = Math.cos(cA) * waistR;
    const cy = Math.sin(cA) * waistR;
    if (k === 0) shape.moveTo(cx, cy);
    else shape.lineTo(cx, cy);

    shape.lineTo(Math.cos(lA) * outerR, Math.sin(lA) * outerR);
    shape.lineTo(Math.cos(baseA) * notchR, Math.sin(baseA) * notchR);
    shape.lineTo(Math.cos(rA) * outerR, Math.sin(rA) * outerR);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.78,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

/**
 * Builds Vacheron Constantin Overseas 4520V's continuous mirror-polished 6-notched Maltese Cross bezel ring.
 * 6 raised curved lobes sit at 12, 2, 4, 6, 8, 10 o'clock with 6 sculpted concave notches at 1, 3, 5, 7, 9, 11.
 */
function createOverseasBezelRingGeometry(
  innerR: number,
  outerR: number,
  depth = 0.068
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const segs = 180;
  const rHigh = outerR * 0.992;
  const rLow = innerR + (outerR - innerR) * 0.46;

  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    // Broad sculpted plateaus at 12, 2, 4, 6, 8, 10 o'clock separated by crisp Maltese-cross flutes
    const wave = Math.cos(6 * (a - Math.PI / 2));
    const lobe = Math.tanh(2.45 * wave) * 0.5 + 0.5;
    const r = THREE.MathUtils.lerp(rLow, rHigh, lobe);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(0, 0, innerR + 0.008, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.012,
    bevelSegments: 3,
    curveSegments: 24,
  });
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds Vacheron Constantin Overseas interlocking half-Maltese-Cross bracelet links.
 */
function createOverseasHalfMalteseLinkGeometry(
  width: number,
  length: number,
  thickness: number,
  isCenter: boolean
): THREE.BufferGeometry {
  const hw = width * 0.5;
  const hl = length * 0.5;
  const shape = new THREE.Shape();

  if (isCenter) {
    // Mirror-polished hourglass / half-Maltese-Cross center link with sculpted flared shoulders
    const waist = hw * 0.64;
    shape.moveTo(-hw * 0.92, -hl);
    shape.quadraticCurveTo(0, -hl * 0.82, hw * 0.92, -hl);
    shape.quadraticCurveTo(waist, 0, hw * 0.92, hl);
    shape.quadraticCurveTo(0, hl * 0.82, -hw * 0.92, hl);
    shape.quadraticCurveTo(-waist, 0, -hw * 0.92, -hl);
    shape.closePath();
  } else {
    // Satin-brushed curved half-Maltese outer shoulder link with gentle scalloped bevel
    const r = Math.min(hw, hl) * 0.24;
    shape.moveTo(-hw + r, -hl);
    shape.quadraticCurveTo(0, -hl * 1.06, hw - r, -hl);
    shape.quadraticCurveTo(hw, -hl, hw, -hl + r);
    shape.quadraticCurveTo(hw * 0.9, 0, hw, hl - r);
    shape.quadraticCurveTo(hw, hl, hw - r, hl);
    shape.quadraticCurveTo(0, hl * 1.06, -hw + r, hl);
    shape.quadraticCurveTo(-hw, hl, -hw, hl - r);
    shape.quadraticCurveTo(-hw * 0.9, 0, -hw, -hl + r);
    shape.quadraticCurveTo(-hw, -hl, -hw + r, -hl);
    shape.closePath();
  }

  const bevel = Math.min(thickness * 0.24, 0.022);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.02, thickness - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.85,
    bevelSegments: 3,
    curveSegments: 16,
  });
  geo.center();
  return geo;
}

/**
 * Builds a 3D faceted dihedral watch hand with tapered needle tip and circular pinion boss.
 */
function createFacetedHandGeometry(
  length: number,
  baseHalfW: number,
  tipHalfW: number,
  ridgeZ: number
): THREE.BufferGeometry {
  const tailLen = length * 0.14;
  const segs = 6;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const y = THREE.MathUtils.lerp(-tailLen, length, t);
    const wProfile = t < 0.18 ? THREE.MathUtils.lerp(baseHalfW * 0.75, baseHalfW, t / 0.18) : THREE.MathUtils.lerp(baseHalfW, tipHalfW, (t - 0.18) / 0.82);

    // 4 vertices per cross-section: center spine (+ridgeZ), right edge (0), bottom (-0.008), left edge (0)
    positions.push(0, y, ridgeZ);
    positions.push(wProfile, y, 0.002);
    positions.push(0, y, -0.008);
    positions.push(-wProfile, y, 0.002);
  }

  for (let i = 0; i < segs; i++) {
    const b0 = i * 4;
    const b1 = (i + 1) * 4;
    for (let k = 0; k < 4; k++) {
      const kNext = (k + 1) % 4;
      indices.push(b0 + k, b0 + kNext, b1 + k);
      indices.push(b1 + k, b0 + kNext, b1 + kNext);
    }
  }

  // Tip apex cap & tail cap
  const tipIdx = positions.length / 3;
  positions.push(0, length + 0.025, ridgeZ * 0.35);
  const lastRing = segs * 4;
  for (let k = 0; k < 4; k++) {
    indices.push(lastRing + k, lastRing + ((k + 1) % 4), tipIdx);
  }

  const tailIdx = positions.length / 3;
  positions.push(0, -tailLen - 0.02, 0);
  for (let k = 0; k < 4; k++) {
    indices.push(0 + ((k + 1) % 4), k, tailIdx);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Conical sloped Cerachrom bezel insert matching planar RingGeometry UVs for crisp dial/bezel mapping.
 */
function createSlopedBezelInsertGeometry(
  innerR: number,
  outerR: number,
  outerZ: number,
  innerZ: number,
  segs = 96
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);

    const ix = c * innerR;
    const iy = s * innerR;
    const ox = c * outerR;
    const oy = s * outerR;

    positions.push(ix, iy, innerZ);
    uvs.push((ix / outerR + 1) * 0.5, (iy / outerR + 1) * 0.5);

    positions.push(ox, oy, outerZ);
    uvs.push((ox / outerR + 1) * 0.5, (oy / outerR + 1) * 0.5);
  }

  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2 + 1;
    const d = (i + 1) * 2;
    indices.push(a, b, d, b, c, d);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Continuous diamond-cut 72-facet fluted bezel mesh (replaces poked-out prism wedges).
 */
function createFlutedBezelRingGeometry(
  innerR: number,
  outerR: number,
  fluteCount = 72
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const steps = fluteCount * 2;

  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const isPeak = i % 2 === 0;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const zPeak = isPeak ? 0.125 : 0.088;
    const rMid = isPeak ? (innerR + outerR) * 0.52 : (innerR + outerR) * 0.48;

    // 4-point cross-section per radial slice: inner lip, crest/valley, outer shoulder, carrier skirt
    positions.push(c * (innerR + 0.005), s * (innerR + 0.005), 0.105);
    positions.push(c * rMid, s * rMid, zPeak);
    positions.push(c * (outerR * 0.988), s * (outerR * 0.988), isPeak ? 0.055 : 0.03);
    positions.push(c * outerR, s * outerR, -0.055);
  }

  for (let i = 0; i < steps; i++) {
    const r0 = i * 4;
    const r1 = (i + 1) * 4;
    for (let k = 0; k < 3; k++) {
      indices.push(r0 + k, r0 + k + 1, r1 + k);
      indices.push(r1 + k, r0 + k + 1, r1 + k + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Optical sapphire meniscus dome / chamfered crystal geometry.
 */
function createDomedSapphireGeometry(
  radius: number,
  highDome: boolean,
  bubbleDome = false
): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  if (bubbleDome) {
    // Tall architectural Legacy Machine hemispherical bubble sapphire clearing dial-side flying balance
    const bubbleSpline = new THREE.SplineCurve([
      new THREE.Vector2(0, 0.24),
      new THREE.Vector2(radius * 0.42, 0.218),
      new THREE.Vector2(radius * 0.76, 0.145),
      new THREE.Vector2(radius * 0.95, 0.048),
      new THREE.Vector2(radius, -0.008),
    ]);
    pts.push(...bubbleSpline.getPoints(20));
  } else if (highDome) {
    const domeSpline = new THREE.SplineCurve([
      new THREE.Vector2(0, 0.095),
      new THREE.Vector2(radius * 0.45, 0.085),
      new THREE.Vector2(radius * 0.82, 0.055),
      new THREE.Vector2(radius * 0.97, 0.018),
      new THREE.Vector2(radius, -0.008),
    ]);
    pts.push(...domeSpline.getPoints(16));
  } else {
    const bevelSpline = new THREE.SplineCurve([
      new THREE.Vector2(0, 0.018),
      new THREE.Vector2(radius * 0.9, 0.017),
      new THREE.Vector2(radius * 0.965, 0.012),
      new THREE.Vector2(radius, -0.004),
    ]);
    pts.push(...bevelSpline.getPoints(12));
  }
  const geo = new THREE.LatheGeometry(pts, 96);
  geo.rotateX(Math.PI / 2);
  return geo;
}

function createCurveSweptStrapGeometry(
  curve: THREE.CatmullRomCurve3,
  signY: 1 | -1,
  widthStart: number,
  widthEnd: number,
  thickness: number,
  isOysterflex: boolean,
  caseR = 0,
  pointedTip = false
): THREE.BufferGeometry {
  const segs = 56;
  const profile: { u: number; xFrac: number; nOff: number }[] = [
    { u: 0.0, xFrac: -0.5, nOff: -0.22 },
    { u: 0.06, xFrac: -0.47, nOff: 0.34 },
    { u: 0.22, xFrac: -0.3, nOff: isOysterflex ? 0.56 : 0.48 },
    { u: 0.5, xFrac: 0.0, nOff: isOysterflex ? 0.68 : 0.55 },
    { u: 0.78, xFrac: 0.3, nOff: isOysterflex ? 0.56 : 0.48 },
    { u: 0.94, xFrac: 0.47, nOff: 0.34 },
    { u: 1.0, xFrac: 0.5, nOff: -0.22 },
    { u: 0.85, xFrac: 0.45, nOff: -0.48 },
    { u: 0.5, xFrac: 0.0, nOff: -0.5 },
    { u: 0.15, xFrac: -0.45, nOff: -0.48 },
    { u: 0.0, xFrac: -0.5, nOff: -0.22 },
  ];

  const ringCount = profile.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const outerIndices: number[] = [];
  const innerIndices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const pt = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    let width = THREE.MathUtils.lerp(widthStart, widthEnd, t);
    if (pointedTip && t > 0.88) {
      const tipFrac = (t - 0.88) / 0.12;
      width *= Math.max(0.18, 1 - tipFrac * tipFrac * 0.78);
    }

    let ny = signY > 0 ? -tan.z : tan.z;
    let nz = signY > 0 ? tan.y : -tan.y;
    const len = Math.hypot(ny, nz) || 1;
    ny /= len;
    nz /= len;

    // Gentle bolster curve ONLY on round cases (straight-end straps stay flat & crisp on rectangular/square/cushion/crash!)
    const hugBlend = caseR > 0 && t < 0.1 ? Math.pow(1 - t / 0.1, 1.8) : 0;
    const thickFactor = t < 0.06 ? THREE.MathUtils.lerp(0.92, 1.0, t / 0.06) : 1.0;

    for (let j = 0; j < ringCount; j++) {
      const p = profile[j];
      const px = p.xFrac * width;
      let py = pt.y + ny * (p.nOff * thickness * thickFactor);
      const pz = pt.z + nz * (p.nOff * thickness * thickFactor);

      if (hugBlend > 0) {
        const safeR = Math.max(Math.abs(px) + 0.15, caseR * 0.96);
        const arcY = Math.sqrt(Math.max(0.1, safeR * safeR - px * px));
        const targetHugY = signY * (arcY + 0.02) + ny * (p.nOff * thickness * 0.9);
        py = THREE.MathUtils.lerp(py, targetHugY, hugBlend);
      }

      positions.push(px, py, pz);
      uvs.push(p.u, t * 2.2);
    }
  }

  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < ringCount - 1; j++) {
      const a = i * ringCount + j;
      const b = (i + 1) * ringCount + j;
      const c = (i + 1) * ringCount + (j + 1);
      const d = i * ringCount + (j + 1);
      const target = j >= 6 ? innerIndices : outerIndices;
      if (signY > 0) {
        target.push(a, d, b, b, d, c);
      } else {
        target.push(a, b, d, b, c, d);
      }
    }
  }

  const addEndCap = (ringStartIdx: number, reverseWinding: boolean) => {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    const uniqueCount = ringCount - 1;
    for (let j = 0; j < uniqueCount; j++) {
      const idx = (ringStartIdx + j) * 3;
      cx += positions[idx];
      cy += positions[idx + 1];
      cz += positions[idx + 2];
    }
    const centerIdx = positions.length / 3;
    positions.push(cx / uniqueCount, cy / uniqueCount, cz / uniqueCount);
    uvs.push(0.5, 0.5);
    for (let j = 0; j < ringCount - 1; j++) {
      const v0 = ringStartIdx + j;
      const v1 = ringStartIdx + j + 1;
      if (reverseWinding) {
        innerIndices.push(centerIdx, v1, v0);
      } else {
        innerIndices.push(centerIdx, v0, v1);
      }
    }
  };

  addEndCap(0, signY < 0);
  addEndCap(segs * ringCount, signY > 0);

  const allIndices = [...outerIndices, ...innerIndices];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(allIndices);
  geo.clearGroups();
  geo.addGroup(0, outerIndices.length, 0);
  geo.addGroup(outerIndices.length, innerIndices.length, 1);
  geo.computeVertexNormals();
  return geo;
}

export function buildWatchAssembly(
  watch: WatchSpec,
  dialOption: DialOption,
  bezelOption: BezelOption,
  beltId: BeltId,
  exhibitionBack: boolean,
  mats: WatchMaterialSet,
  maxAnisotropy: number,
  options?: {
    dateOverride?: DialDateOverride;
    customEngraving?: string;
    xrayDial?: boolean;
  }
): WatchRig {
  const geometries: THREE.BufferGeometry[] = [];
  const textures: THREE.Texture[] = [];
  const localMaterials: THREE.Material[] = [];
  const interactiveMeshes: THREE.Object3D[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    localMaterials.push(m);
    return m;
  };

  // Authentic horological proportions (1 unit = 10mm) with true physical thickness Z-stack
  const capabilities = resolveWatchCapabilities(watch);
  const caseShape: CaseShapeType = watch.caseShape ?? 'round';
  const caseR =
    watch.id === 'jlc-reverso'
      ? 1.55
      : watch.id === 'cartier-tank-louis'
        ? 1.32
        : (watch.caseDiameterMm / 10) * 0.5;
  const lugAttachR =
    caseShape === 'rectangular'
      ? caseR * 1.48
      : caseShape === 'tonneau'
        ? caseR * 1.15
        : caseShape === 'compact-octagon'
          ? caseR * 1.04
          : caseR;
  const caseDepth = watch.caseThicknessMm / 10;
  // Scale middle case, bezel, rehaut & caseback proportionally so total 3D height matches real millimeter thickness
  const zStackScale = THREE.MathUtils.clamp(caseDepth / 1.18, 0.44, 1.05);
  const halfT = caseDepth * 0.34;
  const bezelTopLocal = 0.132 * zStackScale;
  const rehautHeight = Math.max(0.11, halfT * 0.72);
  const baseLayerZ = {
    crystal: halfT * 0.76 + bezelTopLocal * 0.92,
    bezel: halfT * 0.76,
    hands: halfT * 0.08 + Math.max(0.085, halfT * 0.44),
    dial: halfT * 0.08,
    caliber: -halfT * 0.24,
    caseback: -halfT * 0.92,
  };
  const hasRoundBezelOnShapedCase =
    (caseShape === 'cushion' &&
      (watch.bezelType === 'dive-cerachrom' ||
        watch.bezelType === 'gmt-cerachrom' ||
        watch.bezelType === 'seamaster')) ||
    watch.id === 'bulgari-octo-finissimo';
  const hasRoundDialOnShapedCase =
    hasRoundBezelOnShapedCase || watch.id === 'gp-laureato';

  const dialR =
    watch.id === 'ap-royal-oak'
      ? caseR * 0.72
      : watch.id === 'cartier-santos'
        ? caseR * 0.71
        : watch.id === 'jlc-reverso'
          ? caseR * 0.78
          : watch.id === 'cartier-tank-louis'
            ? caseR * 0.74
            : watch.id === 'casio-f91w'
              ? caseR * 0.8
              : watch.id === 'doxa-sub300'
                ? caseR * 0.68
                : watch.id === 'bulgari-octo-finissimo'
                  ? caseR * 0.73
                  : watch.id === 'gp-laureato'
                    ? caseR * 0.71
                    : watch.id === 'rm-tonneau'
                      ? caseR * 0.72
                      : caseR * 0.745;
  const bezelInnerR = dialR + 0.015;
  const bezelOuterR =
    watch.id === 'doxa-sub300'
      ? caseR * 0.92
      : watch.id === 'bulgari-octo-finissimo'
        ? caseR * 0.89
        : caseR * 0.992;

  const lugSpanWidth =
    watch.id === 'avi8-spitfire' || watch.id === 'omega-speedmaster' || watch.id === 'rm-tonneau'
      ? 2.12
      : watch.id === 'ap-royal-oak' ||
          watch.id === 'pp-nautilus' ||
          watch.id === 'gp-laureato' ||
          watch.id === 'vc-overseas'
        ? 2.22
        : watch.id === 'casio-casioak-ga2100'
          ? 2.22
          : watch.id === 'casio-gshock-dw5600'
            ? 2.16
            : watch.id === 'cartier-tank-louis'
              ? 1.76
              : watch.id === 'cartier-crash'
                ? 1.54
                : watch.id === 'casio-f91w'
                  ? 1.82
                  : watch.id === 'cartier-santos' || watch.id === 'jlc-reverso'
                    ? 1.88
                    : watch.caseDiameterMm <= 38.5
                      ? 1.92
                      : 2.04;
  const claspWidth = lugSpanWidth * 0.78;

  const root = new THREE.Group();
  root.name = 'WatchShowcaseRoot';

  // --- 0. WEIGHTLESS STUDIO FLOOR SHADOW ---
  const shadowTex = createContactShadowTexture();
  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.4,
    })
  );
  const shadowMesh = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(9.5, 9.5)),
    shadowMat
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.005;
  root.add(shadowMesh);

  // Floating Watch Assembly (elevated poise clearing the reflective mirror floor cleanly)
  const watchTiltGroup = new THREE.Group();
  watchTiltGroup.position.set(0, 3.55, 0.35);
  watchTiltGroup.rotation.x = -0.3;
  root.add(watchTiltGroup);

  const crystalGroup = new THREE.Group();
  const bezelGroup = new THREE.Group();
  const handsGroup = new THREE.Group();
  const dialGroup = new THREE.Group();
  const caseGroup = new THREE.Group();
  const caliberGroup = new THREE.Group();
  const casebackGroup = new THREE.Group();

  let reversoSwivel: THREE.Group | null = null;
  let reversoBackHands: { hour: THREE.Group; minute: THREE.Group } | null = null;
  const cradleGroup = new THREE.Group();

  if (watch.hasReversoFlip) {
    reversoSwivel = new THREE.Group();
    watchTiltGroup.add(cradleGroup, reversoSwivel);
    reversoSwivel.add(
      caseGroup,
      casebackGroup,
      caliberGroup,
      dialGroup,
      handsGroup,
      bezelGroup,
      crystalGroup
    );

    // Outer Reverso carrier plate & rails with clearance for Duoface back dial + 180° swivel
    const carrierPlate = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(caseR * 2.02, lugAttachR * 2.02, 0.08, 0.03)),
      mats.brushedMetal
    );
    carrierPlate.position.z = -halfT - 0.14 * zStackScale;
    carrierPlate.castShadow = true;
    cradleGroup.add(carrierPlate);
  } else {
    watchTiltGroup.add(
      caseGroup,
      casebackGroup,
      caliberGroup,
      dialGroup,
      handsGroup,
      bezelGroup,
      crystalGroup
    );
  }

  // --- 1. CURVED SPLINE / NON-ROUND CASE, ORGANIC LUGS, KNURLED CROWN & GUARDS ---
  const caseGeo =
    caseShape === 'round'
      ? trackGeo(createMiddleCaseLatheGeometry(caseR, dialR, halfT))
      : trackGeo(createShapedMiddleCaseGeometry(caseR, dialR, halfT, caseShape));
  const middleCaseMesh = new THREE.Mesh(caseGeo, mats.polishedMetal);
  middleCaseMesh.castShadow = true;
  middleCaseMesh.receiveShadow = true;
  if (watch.hasReversoFlip) {
    middleCaseMesh.userData.interactive = 'reverso';
    interactiveMeshes.push(middleCaseMesh);
  }
  caseGroup.add(middleCaseMesh);

  // Continuous Angled Laser-Etched Inner Rehaut sealing dial to crystal
  const rehautTex = trackTex(
    createRehautTexture(watch.reference, maxAnisotropy, watch.brand)
  );
  const rehautMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: rehautTex,
      metalness: 0.92,
      roughness: 0.16,
      side: THREE.BackSide,
      envMapIntensity: 1.45,
    })
  );
  const rehautGeo =
    caseShape === 'round' || hasRoundDialOnShapedCase
      ? (() => {
          const g = new THREE.CylinderGeometry(dialR + 0.022, dialR + 0.004, rehautHeight, 96, 1, true);
          g.rotateX(Math.PI / 2);
          return g;
        })()
      : createShapedRehautGeometry(dialR, rehautHeight, caseShape);
  trackGeo(rehautGeo);
  const rehautMesh = new THREE.Mesh(rehautGeo, rehautMat);
  rehautMesh.position.z = baseLayerZ.dial + rehautHeight * 0.52;
  caseGroup.add(rehautMesh);

  // Nautilus lateral hinge "ears" at 9 o'clock and 3 o'clock
  if (watch.id === 'pp-nautilus') {
    const earShape = new THREE.Shape();
    earShape.moveTo(-0.08, -caseR * 0.42);
    earShape.quadraticCurveTo(0.28, -caseR * 0.38, 0.3, -caseR * 0.18);
    earShape.lineTo(0.3, caseR * 0.18);
    earShape.quadraticCurveTo(0.28, caseR * 0.38, -0.08, caseR * 0.42);
    earShape.closePath();
    const earGeo = trackGeo(
      new THREE.ExtrudeGeometry(earShape, {
        depth: halfT * 1.35,
        bevelEnabled: true,
        bevelThickness: 0.032,
        bevelSize: 0.026,
        bevelSegments: 4,
        curveSegments: 16,
      })
    );
    earGeo.translate(0, 0, -halfT * 0.675);

    const leftEar = new THREE.Mesh(earGeo, mats.brushedMetal);
    leftEar.position.set(-caseR * 0.9, 0, 0.02);
    leftEar.rotation.z = Math.PI;
    leftEar.castShadow = true;

    const rightEar = new THREE.Mesh(earGeo, mats.brushedMetal);
    rightEar.position.set(caseR * 0.9, 0, 0.02);
    rightEar.castShadow = true;

    caseGroup.add(leftEar, rightEar);
  }

  // Sculpted, Watertight, Reference-Faithful Lugs (11 Dedicated Architectures — Zero Open Roots or Gaps)
  const lugParent = watch.hasReversoFlip ? cradleGroup : caseGroup;
  const crashTopY =
    caseShape === 'crash' ? getCaseShapeRadius(Math.PI / 2, caseR, 'crash') : lugAttachR;
  const crashBotY =
    caseShape === 'crash' ? getCaseShapeRadius(-Math.PI / 2, caseR, 'crash') : lugAttachR;
  const lugStyle = capabilities.lugStyle;
  const linkThickness = THREE.MathUtils.clamp(caseDepth * 0.21, 0.145, 0.235);
  const strapThickness = THREE.MathUtils.clamp(caseDepth * 0.195, 0.14, 0.215);

  const addSymmetricOysterPair = (opts?: {
    tipExtend?: number;
    tipWidthFrac?: number;
    rootClampScale?: number;
    zDropScale?: number;
    squarish?: number;
    mat?: THREE.Material;
  }) => {
    const lugMat = opts?.mat ?? mats.brushedMetal;
    const rightLugGeo = trackGeo(
      createOysterLugGeometry(1, caseR, lugAttachR, lugSpanWidth, halfT, caseShape, opts)
    );
    const leftLugGeo = trackGeo(
      createOysterLugGeometry(-1, caseR, lugAttachR, lugSpanWidth, halfT, caseShape, opts)
    );
    [1, -1].forEach((signY) => {
      const pair = new THREE.Group();
      if (signY < 0) pair.rotation.z = Math.PI;
      const rMesh = new THREE.Mesh(rightLugGeo, lugMat);
      const lMesh = new THREE.Mesh(leftLugGeo, lugMat);
      [rMesh, lMesh].forEach((m) => {
        m.castShadow = true;
        m.receiveShadow = true;
        pair.add(m);
      });
      lugParent.add(pair);
    });
  };

  if (lugStyle === 'brancard') {
    // Cartier Tank Louis: Continuous full-depth vertical gold brancards flush from caseback to top bevel
    const brancardW = Math.max(0.24, caseR * 0.98 - lugSpanWidth * 0.5);
    const brancardLen = lugAttachR * 2.26;
    const brancardGeo = trackGeo(
      createRoundedLinkGeometry(brancardW, brancardLen, halfT * 1.88, 0.045)
    );
    const brancardX = lugSpanWidth * 0.5 + brancardW * 0.44;
    [-brancardX, brancardX].forEach((bx) => {
      const bar = new THREE.Mesh(brancardGeo, mats.polishedMetal);
      bar.position.set(bx, 0, -halfT * 0.04);
      bar.castShadow = true;
      bar.receiveShadow = true;
      lugParent.add(bar);
    });
  } else if (lugStyle === 'reverso-cradle') {
    // JLC Reverso: Tapered Art Deco rectangular cradle lugs strictly bounded inside case width
    addSymmetricOysterPair({
      tipExtend: 1.15,
      tipWidthFrac: 0.09,
      rootClampScale: 0.96,
      zDropScale: 0.85,
      squarish: 0.34,
      mat: mats.polishedMetal,
    });
  } else if (lugStyle === 'crash-asymmetric') {
    // Cartier Crash: Contour-sampled asymmetric 18k gold lugs rooted deeply into the melted rim
    const crashAngles = [
      Math.PI / 2 + 0.34,
      Math.PI / 2 - 0.34,
      -Math.PI / 2 - 0.34,
      -Math.PI / 2 + 0.34,
    ];
    crashAngles.forEach((ang, idx) => {
      const isTop = idx < 2;
      const isLeft = idx === 0 || idx === 2;
      const edgeR = getCaseShapeRadius(ang, caseR, 'crash');
      const rootX = Math.cos(ang) * edgeR * 0.78;
      const rootY = Math.sin(ang) * edgeR * 0.78;
      const tipX = (isLeft ? -1 : 1) * (lugSpanWidth * 0.5 + 0.055);
      const tipY = (isTop ? crashTopY : -crashBotY) * 1.07;
      const dx = tipX - rootX;
      const dy = tipY - rootY;
      const len = Math.hypot(dx, dy) + 0.12;
      const lugMesh = new THREE.Mesh(
        trackGeo(createRoundedLinkGeometry(0.145, len, halfT * 1.48, 0.036)),
        mats.polishedMetal
      );
      lugMesh.position.set((rootX + tipX) * 0.5, (rootY + tipY) * 0.5, -halfT * 0.14);
      lugMesh.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
      lugMesh.castShadow = true;
      lugMesh.receiveShadow = true;
      lugParent.add(lugMesh);
    });
  } else if (lugStyle === 'casio-shroud') {
    // Casio G-Shock / CasiOak / F-91W: Solid watertight wedge-sculpted resin hood seated cleanly outside the dial cavity
    const dialTopY = hasRoundDialOnShapedCase
      ? dialR
      : getCaseShapeRadius(Math.PI / 2, dialR, caseShape);
    const rootW = Math.min(caseR * 1.62, lugSpanWidth * 1.24);
    const tipW = lugSpanWidth * 1.1;
    const yRoot = dialTopY + (lugAttachR - dialTopY) * 0.45;
    const yTip = lugAttachR * (watch.id === 'casio-f91w' ? 1.14 : 1.16);
    const rootDrop = Math.min(0.28, (lugAttachR - dialTopY) * 0.54);
    const hoodGeo = trackGeo(
      createIntegratedHoodGeometry(
        rootW,
        tipW,
        yRoot,
        yTip,
        halfT,
        -halfT * 0.22,
        strapThickness * 0.58,
        0.28,
        rootDrop
      )
    );
    [1, -1].forEach((signY) => {
      const hood = new THREE.Mesh(hoodGeo, mats.brushedMetal);
      if (signY < 0) hood.rotation.z = Math.PI;
      hood.castShadow = true;
      hood.receiveShadow = true;
      lugParent.add(hood);
    });
  } else if (lugStyle === 'integrated-shoulder' || lugStyle === 'cushion-hood') {
    // Integrated bracelet icons (Royal Oak, Nautilus, Octo Finissimo, Laureato, Overseas, Polo 79)
    // and Hooded Cushion / Tonneau icons (DOXA SUB 300, Moser Streamliner, Richard Mille)
    const isHooded = lugStyle === 'cushion-hood';
    const dialTopY = hasRoundDialOnShapedCase
      ? dialR
      : getCaseShapeRadius(Math.PI / 2, dialR, caseShape);
    const yRoot = dialTopY + (lugAttachR - dialTopY) * 0.44;
    const rootDrop = Math.min(0.3, (lugAttachR - dialTopY) * 0.56);
    const sampleAng = Math.atan2(yRoot - rootDrop, caseR * 0.72);
    const contourW = Math.cos(sampleAng) * getCaseShapeRadius(sampleAng, caseR, caseShape) * 1.92;
    const rootW = Math.max(lugSpanWidth * 1.12, Math.min(contourW, caseR * 1.68));
    const tipW = isHooded ? lugSpanWidth * 1.06 : lugSpanWidth * 1.08;
    const yTip = lugAttachR * (isHooded ? 1.12 : 1.13);
    const hoodGeo = trackGeo(
      createIntegratedHoodGeometry(
        rootW,
        tipW,
        yRoot,
        yTip,
        halfT,
        -halfT * 0.26,
        Math.max(linkThickness * 0.52, halfT * 0.42),
        isHooded ? 0.44 : 0.28,
        rootDrop
      )
    );
    [1, -1].forEach((signY) => {
      const hood = new THREE.Mesh(hoodGeo, mats.brushedMetal);
      if (signY < 0) hood.rotation.z = Math.PI;
      hood.castShadow = true;
      hood.receiveShadow = true;
      lugParent.add(hood);
    });
  } else if (lugStyle === 'panerai-cushion') {
    // Panerai Luminor: Thick blocky Florentine straight-walled cushion lugs
    addSymmetricOysterPair({
      tipExtend: 1.22,
      tipWidthFrac: 0.145,
      rootClampScale: 0.92,
      zDropScale: 0.88,
      squarish: 0.34,
      mat: mats.polishedMetal,
    });
  } else if (lugStyle === 'santos-integrated') {
    // Cartier Santos & TAG Monaco: Clean beveled square-corner architectural lugs
    addSymmetricOysterPair({
      tipExtend: 1.19,
      tipWidthFrac: 0.115,
      rootClampScale: 0.94,
      zDropScale: 0.92,
      squarish: 0.32,
    });
  } else if (lugStyle === 'wire-breguet') {
    // Breguet Classique: Iconic slender soldered straight fluted wire lugs with screw-pin end caps
    const lugLen = caseR * 0.52;
    const lugGeo = trackGeo(createRoundedLinkGeometry(0.11, lugLen, halfT * 1.25, 0.028));
    const pinCapGeo = trackGeo(new THREE.CylinderGeometry(0.052, 0.052, 0.14, 16));
    pinCapGeo.rotateZ(Math.PI / 2);
    [1, -1].forEach((signY) => {
      [1, -1].forEach((signX) => {
        const bx = signX * (lugSpanWidth * 0.5 + 0.055);
        const by = signY * (lugAttachR * 0.94);
        const bar = new THREE.Mesh(lugGeo, mats.polishedMetal);
        bar.position.set(bx, by, -halfT * 0.12);
        bar.rotation.x = signY * 0.14;
        bar.castShadow = true;
        const cap = new THREE.Mesh(pinCapGeo, mats.polishedMetal);
        cap.position.set(bx, signY * (lugAttachR * 1.14), -halfT * 0.2);
        lugParent.add(bar, cap);
      });
    });
  } else if (lugStyle === 'straight-dress') {
    // Nomos Tangente, FPJ, MB&F, Lange 1, Zeitwerk, PP World Time: Crisp slender dress lugs
    const isBauhaus = watch.id === 'nomos-tangente';
    addSymmetricOysterPair({
      tipExtend: isBauhaus ? 1.26 : 1.2,
      tipWidthFrac: isBauhaus ? 0.072 : 0.095,
      rootClampScale: isBauhaus ? 0.84 : 0.9,
      zDropScale: isBauhaus ? 0.72 : 0.9,
      squarish: isBauhaus ? 0.28 : 0.44,
      mat: mats.polishedMetal,
    });
  } else {
    // Classic Oyster & Sport Curved Horns (watertight capped root embedded cleanly in case)
    addSymmetricOysterPair();
  }

  // Bulgari Octo Finissimo sharp faceted architectural crown shoulders
  if (watch.id === 'bulgari-octo-finissimo') {
    const octoGuardGeo = trackGeo(new THREE.BoxGeometry(0.28, 0.14, halfT * 1.55));
    [-0.28, 0.28].forEach((gy, idx) => {
      const og = new THREE.Mesh(octoGuardGeo, mats.brushedMetal);
      og.position.set(caseR * 0.95, gy, -0.01);
      og.rotation.z = idx === 0 ? 0.24 : -0.24;
      og.castShadow = true;
      caseGroup.add(og);
    });
  }

  // Cartier Santos sculptural screws on the top & bottom case lug shoulders
  if (watch.id === 'cartier-santos') {
    const lugScrewGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 18));
    lugScrewGeo.rotateX(Math.PI / 2);
    [
      [-lugSpanWidth * 0.34, lugAttachR * 1.06],
      [lugSpanWidth * 0.34, lugAttachR * 1.06],
      [-lugSpanWidth * 0.34, -lugAttachR * 1.06],
      [lugSpanWidth * 0.34, -lugAttachR * 1.06],
    ].forEach(([sx, sy]) => {
      const lScrew = new THREE.Mesh(lugScrewGeo, mats.polishedMetal);
      lScrew.position.set(sx, sy, halfT * 0.58);
      caseGroup.add(lScrew);
    });
  }

  // Authentic Casio Side Push-Buttons: 3 slim buttons on F-91W (2 left, 1 right), 4 recessed guarded buttons on G-Shocks
  if (watch.brand === 'CASIO') {
    if (watch.id === 'casio-f91w') {
      const f91BtnGeo = trackGeo(createRoundedLinkGeometry(0.14, 0.22, 0.12, 0.025));
      const f91Coords: [number, number][] = [
        [-caseR * 0.96, 0.44],
        [-caseR * 0.96, -0.44],
        [caseR * 0.96, -0.44],
      ];
      f91Coords.forEach(([bx, by]) => {
        const btn = new THREE.Mesh(f91BtnGeo, mats.handMetal);
        btn.position.set(bx, by, 0.0);
        btn.castShadow = true;
        caseGroup.add(btn);
      });
    } else {
      const btnGeo = trackGeo(new THREE.CylinderGeometry(0.068, 0.068, 0.18, 16));
      btnGeo.rotateZ(Math.PI / 2);
      const guardGeo = trackGeo(createRoundedLinkGeometry(0.16, 0.32, halfT * 1.35, 0.035));
      const gAngles = [0.34, -0.34, Math.PI - 0.34, Math.PI + 0.34];
      gAngles.forEach((ang) => {
        const edgeR = getCaseShapeRadius(ang, caseR, caseShape);
        const sideSign = Math.cos(ang) >= 0 ? 1 : -1;
        const bx = Math.cos(ang) * edgeR;
        const by = Math.sin(ang) * edgeR;
        const guard = new THREE.Mesh(guardGeo, mats.brushedMetal);
        guard.position.set(bx - sideSign * 0.03, by, 0.0);
        guard.castShadow = true;
        const btn = new THREE.Mesh(btnGeo, mats.handMetal);
        btn.position.set(bx + sideSign * 0.055, by, 0.0);
        btn.castShadow = true;
        caseGroup.add(guard, btn);
      });
    }
  }

  // Breguet Classique finely fluted vertical coin-edge middle caseband
  if (watch.hasCoinEdge) {
    const coinCount = 144;
    const coinGeo = trackGeo(new THREE.CapsuleGeometry(0.011, halfT * 1.15, 4, 8));
    coinGeo.rotateX(Math.PI / 2);
    const coinInst = new THREE.InstancedMesh(coinGeo, mats.polishedMetal, coinCount);
    const cDummy = new THREE.Object3D();
    for (let i = 0; i < coinCount; i++) {
      const a = (i / coinCount) * Math.PI * 2;
      cDummy.position.set(Math.cos(a) * (caseR * 1.004), Math.sin(a) * (caseR * 1.004), 0);
      cDummy.rotation.set(0, 0, a);
      cDummy.updateMatrix();
      coinInst.setMatrixAt(i, cDummy.matrix);
    }
    coinInst.instanceMatrix.needsUpdate = true;
    coinInst.computeBoundingSphere();
    caseGroup.add(coinInst);
  }

  // Omega Seamaster 10 o'clock Conical Helium Escape Valve ("He")
  if (watch.hasHeliumValve) {
    const heAngle = (5 * Math.PI) / 6;
    const heGroup = new THREE.Group();
    heGroup.position.set(Math.cos(heAngle) * (caseR + 0.04), Math.sin(heAngle) * (caseR + 0.04), 0.02);
    heGroup.rotation.z = heAngle - Math.PI / 2;
    const heCollar = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.115, 0.13, 0.14, 24)),
      mats.polishedMetal
    );
    const heCap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.145, 0.125, 0.14, 24)),
      mats.brushedMetal
    );
    heCap.position.y = 0.11;
    heCap.castShadow = true;
    heGroup.add(heCollar, heCap);
    caseGroup.add(heGroup);
  }

  // Flowing Sculpted Crown Guards or Panerai 3h Crescent Locking Bridge
  const omitStandardGuards =
    watch.hasCrownGuards === false ||
    watch.id === 'datejust' ||
    watch.id === 'daydate' ||
    watch.id === 'milgauss' ||
    watch.id === 'skydweller' ||
    watch.id === 'gs-snowflake' ||
    watch.id === 'avi8-spitfire' ||
    watch.id === 'pp-nautilus' ||
    watch.id === 'ap-royal-oak' ||
    watch.id === 'cartier-santos' ||
    watch.id === 'jlc-reverso' ||
    watch.id === 'lange-1';

  // A. Lange & Söhne Lange 1 iconic 10 o'clock rectangular 18k gold Outsize Date quick-set pusher
  if (watch.id === 'lange-1') {
    const lAng = (5 * Math.PI) / 6;
    const lpGroup = new THREE.Group();
    lpGroup.position.set(Math.cos(lAng) * (caseR + 0.03), Math.sin(lAng) * (caseR + 0.03), 0);
    lpGroup.rotation.z = lAng - Math.PI / 2;
    const lpButton = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.28, 0.14, halfT * 0.72, 0.02)),
      mats.polishedMetal
    );
    lpButton.position.y = 0.05;
    lpButton.castShadow = true;
    lpGroup.add(lpButton);
    caseGroup.add(lpGroup);
  }

  // Blancpain Fifty Fathoms signature raised 9 o'clock chamfered flank signature plaque
  if (watch.id === 'blancpain-fifty-fathoms') {
    const flankPlaque = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.06, caseR * 0.62, halfT * 0.68, 0.014)),
      mats.polishedMetal
    );
    flankPlaque.position.set(-caseR * 0.995, 0, 0);
    caseGroup.add(flankPlaque);
  }

  if (watch.hasCrownBridge) {
    const panFlankR = getCaseShapeRadius(0, caseR, caseShape);
    const bridgeShape = new THREE.Shape();
    bridgeShape.absarc(0, 0, 0.56, -Math.PI * 0.48, Math.PI * 0.48, false);
    bridgeShape.absarc(0, 0, 0.34, Math.PI * 0.48, -Math.PI * 0.48, true);
    bridgeShape.closePath();
    const bridgeGeo = trackGeo(
      new THREE.ExtrudeGeometry(bridgeShape, {
        depth: halfT * 1.12,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.024,
        bevelSegments: 4,
        curveSegments: 24,
      })
    );
    bridgeGeo.translate(0, 0, -halfT * 0.56);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, mats.brushedMetal);
    bridgeMesh.position.set(panFlankR * 0.95, 0, -0.015 * zStackScale);
    bridgeMesh.castShadow = true;

    const leverArm = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.14, 0.56, halfT * 0.74, 0.032)),
      mats.polishedMetal
    );
    leverArm.position.set(panFlankR + 0.43, -0.16, -0.015 * zStackScale);
    leverArm.rotation.z = 0.14;
    leverArm.castShadow = true;

    const leverPin = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.042, 0.042, halfT * 1.18, 16)),
      mats.polishedMetal
    );
    leverPin.rotation.x = Math.PI / 2;
    leverPin.position.set(panFlankR + 0.39, 0.14, -0.015 * zStackScale);

    const leverTab = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.12, 0.14, halfT * 0.68, 0.022)),
      mats.brushedMetal
    );
    leverTab.position.set(panFlankR + 0.48, -0.42, -0.015 * zStackScale);
    caseGroup.add(bridgeMesh, leverArm, leverPin, leverTab);
  } else if (!omitStandardGuards) {
    const guardShape = new THREE.Shape();
    guardShape.moveTo(-0.24, -0.2);
    guardShape.quadraticCurveTo(0.0, -0.17, 0.18, -0.14);
    guardShape.bezierCurveTo(0.36, -0.11, 0.4, -0.04, 0.4, 0);
    guardShape.bezierCurveTo(0.4, 0.04, 0.36, 0.11, 0.18, 0.14);
    guardShape.quadraticCurveTo(0.0, 0.17, -0.24, 0.2);
    guardShape.closePath();

    const guardGeo = trackGeo(
      new THREE.ExtrudeGeometry(guardShape, {
        depth: Math.min(0.32, halfT * 1.08),
        bevelEnabled: true,
        bevelThickness: 0.055 * zStackScale,
        bevelSize: 0.044,
        bevelSegments: 5,
        curveSegments: 24,
      })
    );
    guardGeo.center();

    const guardFlankR = getCaseShapeRadius(0, caseR, caseShape);
    [-0.35, 0.35].forEach((yPos, idx) => {
      const guard = new THREE.Mesh(guardGeo, mats.polishedMetal);
      guard.position.set(guardFlankR * 0.96, yPos, -0.015 * zStackScale);
      guard.rotation.z = idx === 0 ? 0.14 : -0.14;
      guard.castShadow = true;
      caseGroup.add(guard);
    });
  }

  // CNC-Lathed Winding Crown (Supports Left-Hand 9h Crown, Zeitwerk 2h Crown, AP Hexagonal, Bulgari Octagonal Ceramic,
  // Cartier Heptagonal vs Beaded Pearl Cabochon, Conical Pilot Crown, RM Rubber Torque Crown, Triplock)
  // Casio digital/ana-digi models use 4 side push-buttons instead of a mechanical winding crown
  const crownGroup = new THREE.Group();
  const crownAngle = watch.id === 'lange-zeitwerk' ? Math.PI / 6 : watch.leftCrown ? Math.PI : 0;
  const crownFlankR = getCaseShapeRadius(crownAngle, caseR, caseShape);
  const crownBaseX =
    watch.id === 'pp-nautilus'
      ? crownFlankR + 0.25
      : crownFlankR + 0.14;
  crownGroup.position.set(
    Math.cos(crownAngle) * crownBaseX,
    Math.sin(crownAngle) * crownBaseX,
    -0.015 * zStackScale
  );
  crownGroup.rotation.z = crownAngle - Math.PI / 2;
  const crownScale = THREE.MathUtils.clamp(caseDepth / 1.05, 0.58, 1.05);
  crownGroup.scale.setScalar(crownScale);

  const windingCrown = new THREE.Group();
  if (watch.brand !== 'CASIO') {
    const crownTube = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.14, 0.14, 0.36, 32)),
      watch.id === 'tudor-bb58' ? mats.goldAccent : mats.bezelMetal
    );
    crownTube.position.y = -0.04;
    crownGroup.add(crownTube);

    const crownGasket = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.145, 0.018, 12, 32)),
      mats.goldAccent
    );
    crownGasket.rotation.x = Math.PI / 2;
    crownGasket.position.y = 0.095;
    crownGroup.add(crownGasket);

    crownGroup.add(windingCrown);
  }

  if (watch.brand === 'CASIO') {
    // No mechanical winding crown on Casio resin digital/ana-digi cases
  } else if (watch.brand === 'CARTIER') {
    if (watch.id === 'cartier-santos') {
      // Santos de Cartier: 7-sided faceted heptagonal crown tipped with blue sapphire cabochon
      const heptCrown = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.21, 0.19, 0.22, 7)),
        mats.polishedMetal
      );
      heptCrown.position.y = 0.08;
      heptCrown.castShadow = true;
      heptCrown.userData.interactive = 'crown';
      interactiveMeshes.push(heptCrown);
      windingCrown.add(heptCrown);
    } else {
      // Tank Louis Cartier & Cartier Crash: Classic circular beaded pearl-knurled gold crown
      const pearlCore = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.19, 0.18, 0.18, 28)),
        mats.polishedMetal
      );
      pearlCore.position.y = 0.07;
      pearlCore.castShadow = true;
      pearlCore.userData.interactive = 'crown';
      interactiveMeshes.push(pearlCore);
      windingCrown.add(pearlCore);

      const beadGeo = trackGeo(new THREE.SphereGeometry(0.036, 10, 8));
      const beadCount = 16;
      const beadInst = new THREE.InstancedMesh(beadGeo, mats.polishedMetal, beadCount);
      const bDummy = new THREE.Object3D();
      for (let i = 0; i < beadCount; i++) {
        const a = (i / beadCount) * Math.PI * 2;
        bDummy.position.set(Math.cos(a) * 0.195, 0.075, Math.sin(a) * 0.195);
        bDummy.updateMatrix();
        beadInst.setMatrixAt(i, bDummy.matrix);
      }
      beadInst.instanceMatrix.needsUpdate = true;
      beadInst.computeBoundingSphere();
      windingCrown.add(beadInst);
    }

    const cabochon = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.115, 24, 16)),
      mats.sapphireCabochon
    );
    cabochon.position.y = watch.id === 'cartier-santos' ? 0.21 : 0.185;
    cabochon.scale.set(1, 0.72, 1);
    cabochon.userData.interactive = 'crown';
    interactiveMeshes.push(cabochon);
    windingCrown.add(cabochon);
  } else if (watch.id === 'ap-royal-oak') {
    // Audemars Piguet Royal Oak: Iconic 6-sided hexagonal chamfered crown
    const hexBody = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.2, 6)),
      mats.brushedMetal
    );
    hexBody.position.y = 0.085;
    hexBody.castShadow = true;
    hexBody.userData.interactive = 'crown';
    interactiveMeshes.push(hexBody);

    const hexCap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.2, 0.24, 0.045, 6)),
      mats.polishedMetal
    );
    hexCap.position.y = 0.205;
    hexCap.userData.interactive = 'crown';
    interactiveMeshes.push(hexCap);
    windingCrown.add(hexBody, hexCap);
  } else if (watch.id === 'bulgari-octo-finissimo') {
    // Bulgari Octo Finissimo: Ultra-slim 8-sided octagonal crown inlaid with matte black ceramic disc
    const octoBody = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.25, 0.25, 0.18, 8)),
      mats.brushedMetal
    );
    octoBody.position.y = 0.075;
    octoBody.castShadow = true;
    octoBody.userData.interactive = 'crown';
    interactiveMeshes.push(octoBody);

    const ceramicInlay = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.155, 0.155, 0.035, 24)),
      mats.oysterflexBelt
    );
    ceramicInlay.position.y = 0.175;
    ceramicInlay.userData.interactive = 'crown';
    interactiveMeshes.push(ceramicInlay);
    windingCrown.add(octoBody, ceramicInlay);
  } else if (watch.id === 'avi8-spitfire' || watch.hasConicalCrown) {
    const isIwc = Boolean(watch.hasConicalCrown);
    // Fluted cylindrical (AVI-8) or oversized conical diamond onion crown (IWC Big Pilot)
    const pilotCrownSpline = isIwc
      ? new THREE.SplineCurve([
          new THREE.Vector2(0.0, -0.04),
          new THREE.Vector2(0.16, -0.04),
          new THREE.Vector2(0.32, 0.04),
          new THREE.Vector2(0.35, 0.14),
          new THREE.Vector2(0.28, 0.25),
          new THREE.Vector2(0.12, 0.3),
          new THREE.Vector2(0.0, 0.31),
        ])
      : new THREE.SplineCurve([
          new THREE.Vector2(0.0, -0.04),
          new THREE.Vector2(0.18, -0.04),
          new THREE.Vector2(0.255, 0.015),
          new THREE.Vector2(0.268, 0.115),
          new THREE.Vector2(0.258, 0.215),
          new THREE.Vector2(0.205, 0.255),
          new THREE.Vector2(0.0, 0.268),
        ]);
    const pilotCrownBody = new THREE.Mesh(
      trackGeo(new THREE.LatheGeometry(pilotCrownSpline.getPoints(24), 48)),
      mats.bezelMetal
    );
    pilotCrownBody.castShadow = true;
    pilotCrownBody.userData.interactive = 'crown';
    interactiveMeshes.push(pilotCrownBody);
    windingCrown.add(pilotCrownBody);

    const fluteR = isIwc ? 0.335 : 0.264;
    const pilotFluteGeo = trackGeo(new THREE.CapsuleGeometry(0.017, 0.17, 6, 10));
    const pCount = 24;
    const pRidges = new THREE.InstancedMesh(pilotFluteGeo, mats.brushedMetal, pCount);
    const pDummy = new THREE.Object3D();
    for (let i = 0; i < pCount; i++) {
      const a = (i / pCount) * Math.PI * 2;
      pDummy.position.set(Math.cos(a) * fluteR, 0.125, Math.sin(a) * fluteR);
      pDummy.rotation.set(0, -a, 0);
      pDummy.updateMatrix();
      pRidges.setMatrixAt(i, pDummy.matrix);
    }
    pRidges.instanceMatrix.needsUpdate = true;
    pRidges.computeBoundingSphere();
    windingCrown.add(pRidges);

    if (!isIwc) {
      const capRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.105, 0.014, 10, 28)),
        mats.crimsonAccent
      );
      capRing.rotation.x = Math.PI / 2;
      capRing.position.y = 0.262;
      windingCrown.add(capRing);
    }
  } else {
    const crownSpline = new THREE.SplineCurve([
      new THREE.Vector2(0.0, -0.04),
      new THREE.Vector2(0.19, -0.04),
      new THREE.Vector2(0.235, 0.0),
      new THREE.Vector2(0.242, 0.08),
      new THREE.Vector2(0.235, 0.175),
      new THREE.Vector2(0.19, 0.225),
      new THREE.Vector2(0.09, 0.252),
      new THREE.Vector2(0.0, 0.258),
    ]);
    const crownBodyGeo = trackGeo(new THREE.LatheGeometry(crownSpline.getPoints(24), 48));
    const crownBody = new THREE.Mesh(crownBodyGeo, mats.bezelMetal);
    crownBody.castShadow = true;
    crownBody.userData.interactive = 'crown';
    interactiveMeshes.push(crownBody);
    windingCrown.add(crownBody);

    // Smooth rounded capsule flutes instead of square bars
    const fluteCapsuleGeo = trackGeo(new THREE.CapsuleGeometry(0.019, 0.16, 6, 10));
    const ridgeCount = 20;
    const crownRidges = new THREE.InstancedMesh(fluteCapsuleGeo, mats.bezelMetal, ridgeCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < ridgeCount; i++) {
      const a = (i / ridgeCount) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * 0.242, 0.088, Math.sin(a) * 0.242);
      dummy.rotation.set(0, -a, 0);
      dummy.updateMatrix();
      crownRidges.setMatrixAt(i, dummy.matrix);
    }
    crownRidges.instanceMatrix.needsUpdate = true;
    crownRidges.computeBoundingSphere();
    windingCrown.add(crownRidges);

    if (watch.id === 'rm-tonneau') {
      // Richard Mille torque-limiting vulcanized black rubber grip tire + red racing ring
      const rmTire = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.255, 0.048, 12, 28)),
        mats.oysterflexBelt
      );
      rmTire.rotation.x = Math.PI / 2;
      rmTire.position.y = 0.09;
      const rmRedAccent = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.14, 0.016, 10, 24)),
        mats.crimsonAccent
      );
      rmRedAccent.rotation.x = Math.PI / 2;
      rmRedAccent.position.y = 0.25;
      windingCrown.add(rmTire, rmRedAccent);
    } else if (watch.id === 'vc-overseas') {
      // Vacheron Constantin embossed Maltese Cross crown hallmark
      const crownMaltese = new THREE.Mesh(
        trackGeo(createMalteseCrossGeometry(0.088, 0.018, 0.004)),
        mats.polishedMetal
      );
      crownMaltese.rotation.x = -Math.PI / 2;
      crownMaltese.position.y = 0.262;
      windingCrown.add(crownMaltese);
    } else if (watch.brand === 'ROLEX') {
      // Embossed Rounded Coronet Spikes + Triplock 3-Dot Hallmark
      const coronetBase = new THREE.Mesh(
        trackGeo(createRoundedLinkGeometry(0.1, 0.025, 0.02, 0.006)),
        mats.goldAccent
      );
      coronetBase.rotation.x = Math.PI / 2;
      coronetBase.position.set(0, 0.264, 0.034);
      windingCrown.add(coronetBase);

      [-0.042, -0.021, 0, 0.021, 0.042].forEach((cx, idx) => {
        const spikeH = idx === 2 ? 0.072 : idx === 1 || idx === 3 ? 0.06 : 0.046;
        const spike = new THREE.Mesh(
          trackGeo(new THREE.CapsuleGeometry(0.006, spikeH, 4, 8)),
          mats.goldAccent
        );
        spike.rotation.x = Math.PI / 2;
        spike.position.set(cx, 0.264, 0.008 - spikeH * 0.28);
        spike.rotation.y = (idx - 2) * 0.15;
        windingCrown.add(spike);
      });

      [-0.04, 0, 0.04].forEach((dx, idx) => {
        const dot = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(idx === 1 ? 0.015 : 0.011, 12, 10)),
          mats.goldAccent
        );
        dot.position.set(dx, 0.262, 0.068);
        windingCrown.add(dot);
      });
    }
  }

  if (watch.brand !== 'CASIO') {
    caseGroup.add(crownGroup);
  }

  // Chronograph Pushers (TAG Monaco Horizontal Rectangular Blades · RM Racing Pedals · Classic Pump · Screw-Down Oyster)
  const chronoPushers: THREE.Mesh[] = [];
  if (watch.hasChronoPushers) {
    if (watch.id === 'tag-monaco') {
      // TAG Heuer Monaco Calibre 11: Iconic horizontal rectangular flat-blade steel pushers off the right vertical flank
      const monacoCollarGeo = trackGeo(createRoundedLinkGeometry(0.16, 0.14, halfT * 0.72, 0.02));
      const monacoBladeGeo = trackGeo(createRoundedLinkGeometry(0.28, 0.15, halfT * 0.82, 0.024));
      const monacoFlankX = getCaseShapeRadius(0, caseR, 'square');
      [
        { y: caseR * 0.42, action: 'chrono-toggle' },
        { y: -caseR * 0.42, action: 'chrono-reset' },
      ].forEach(({ y, action }) => {
        const pGroup = new THREE.Group();
        pGroup.position.set(monacoFlankX + 0.04, y, -0.015 * zStackScale);
        pGroup.rotation.z = -Math.PI / 2;
        const collar = new THREE.Mesh(monacoCollarGeo, mats.brushedMetal);
        const cap = new THREE.Mesh(monacoBladeGeo, mats.polishedMetal);
        cap.position.y = 0.14;
        cap.castShadow = true;
        cap.userData.interactive = action;
        interactiveMeshes.push(cap);
        chronoPushers.push(cap);
        pGroup.add(collar, cap);
        caseGroup.add(pGroup);
      });
    } else if (watch.id === 'rm-tonneau') {
      // Richard Mille RM 11-03: Sculpted racing-pedal rectangular pushers flush along the right tonneau curve
      const rmCollarGeo = trackGeo(createRoundedLinkGeometry(0.22, 0.12, halfT * 0.74, 0.02));
      const rmPedalGeo = trackGeo(createRoundedLinkGeometry(0.42, 0.16, halfT * 0.84, 0.028));
      [
        { angle: Math.PI / 5.6, action: 'chrono-toggle' },
        { angle: -Math.PI / 5.6, action: 'chrono-reset' },
      ].forEach(({ angle, action }) => {
        const pGroup = new THREE.Group();
        const baseAnchorR = getCaseShapeRadius(angle, caseR, caseShape) + 0.04;
        pGroup.position.set(
          Math.cos(angle) * baseAnchorR,
          Math.sin(angle) * baseAnchorR,
          -0.015 * zStackScale
        );
        pGroup.rotation.z = angle - Math.PI / 2;
        const collar = new THREE.Mesh(rmCollarGeo, mats.oysterflexBelt);
        const cap = new THREE.Mesh(rmPedalGeo, mats.brushedMetal);
        cap.position.y = 0.13;
        cap.castShadow = true;
        cap.userData.interactive = action;
        interactiveMeshes.push(cap);
        chronoPushers.push(cap);
        pGroup.add(collar, cap);
        caseGroup.add(pGroup);
      });
    } else {
      const isPumpPusher =
        watch.brand === 'AVI-8' ||
        watch.brand === 'OMEGA' ||
        watch.brand === 'ZENITH' ||
        watch.brand === 'BREITLING';
      const pusherCollarSpline = isPumpPusher
        ? new THREE.SplineCurve([
            new THREE.Vector2(0.0, -0.18),
            new THREE.Vector2(0.135, -0.18),
            new THREE.Vector2(0.135, -0.02),
            new THREE.Vector2(0.115, 0.0),
            new THREE.Vector2(0.088, 0.045),
            new THREE.Vector2(0.088, 0.12),
            new THREE.Vector2(0.0, 0.12),
          ])
        : new THREE.SplineCurve([
            new THREE.Vector2(0.0, -0.18),
            new THREE.Vector2(0.155, -0.18),
            new THREE.Vector2(0.155, -0.04),
            new THREE.Vector2(0.17, 0.0),
            new THREE.Vector2(0.165, 0.055),
            new THREE.Vector2(0.135, 0.075),
            new THREE.Vector2(0.0, 0.075),
          ]);
      const collarGeo = trackGeo(new THREE.LatheGeometry(pusherCollarSpline.getPoints(16), 36));

      const pusherCapSpline = isPumpPusher
        ? new THREE.SplineCurve([
            new THREE.Vector2(0.0, -0.04),
            new THREE.Vector2(0.095, -0.04),
            new THREE.Vector2(0.158, -0.01),
            new THREE.Vector2(0.162, 0.082),
            new THREE.Vector2(0.138, 0.105),
            new THREE.Vector2(0.04, 0.11),
            new THREE.Vector2(0.0, 0.11),
          ])
        : new THREE.SplineCurve([
            new THREE.Vector2(0.0, -0.08),
            new THREE.Vector2(0.15, -0.08),
            new THREE.Vector2(0.18, -0.055),
            new THREE.Vector2(0.182, 0.045),
            new THREE.Vector2(0.16, 0.075),
            new THREE.Vector2(0.07, 0.088),
            new THREE.Vector2(0.0, 0.09),
          ]);
      const capGeo = trackGeo(new THREE.LatheGeometry(pusherCapSpline.getPoints(18), 36));

      [
        { angle: Math.PI / 6, action: 'chrono-toggle' },
        { angle: -Math.PI / 6, action: 'chrono-reset' },
      ].forEach(({ angle, action }) => {
        const pusherGroup = new THREE.Group();
        const baseAnchorR = getCaseShapeRadius(angle, caseR, caseShape) + 0.12;
        const px = Math.cos(angle) * baseAnchorR;
        const py = Math.sin(angle) * baseAnchorR;
        pusherGroup.position.set(px, py, -0.015 * zStackScale);
        pusherGroup.rotation.z = angle - Math.PI / 2;
        pusherGroup.scale.setScalar(crownScale);

        const collar = new THREE.Mesh(collarGeo, isPumpPusher ? mats.brushedMetal : mats.bezelMetal);
        const cap = new THREE.Mesh(capGeo, mats.bezelMetal);
        cap.position.y = 0.15;
        cap.castShadow = true;
        cap.userData.interactive = action;
        interactiveMeshes.push(cap);
        chronoPushers.push(cap);
        pusherGroup.add(collar, cap);
        caseGroup.add(pusherGroup);
      });
    }
  }

  // --- 2. SHAPE-CONFORMING SOLID END LINKS + ENCLOSED SPRING-BAR BOLSTERS + INSTANCED BRACELET / CLOSED-LOOP STRAP ---
  const braceletGroup = new THREE.Group();

  const attachY = lugAttachR * 1.09;
  const attachZ = -Math.max(0.09, halfT * 0.34);
  const wristApexY = Math.max(lugAttachR * 1.12, 2.25);
  const wristCenterZ = -1.52;
  const claspSpanY = 0.7;
  const claspEdgeZ = -3.08;
  const claspCenterZ = -3.2;

  const isLeather = beltId === 'leather';
  const isCasioResinStrap = watch.brand === 'CASIO' && beltId === 'oysterflex';
  const useTangBuckle = isLeather || isCasioResinStrap;
  const hasFullHood =
    lugStyle === 'integrated-shoulder' ||
    lugStyle === 'cushion-hood' ||
    lugStyle === 'casio-shroud';
  const showSel = !isLeather && !isCasioResinStrap && !hasFullHood && caseShape !== 'crash';

  if (showSel) {
    // Shape-conforming full-depth Solid End Links (zero crescent gaps on shaped cases or underside)
    const selFullGeo = trackGeo(
      createCaseHuggingEndLinkGeometry(
        -lugSpanWidth * 0.495,
        lugSpanWidth * 0.495,
        caseR,
        caseShape,
        attachY,
        attachZ,
        linkThickness * 1.05,
        halfT
      )
    );
    const selOuterGeo = trackGeo(
      createCaseHuggingEndLinkGeometry(
        lugSpanWidth * 0.18,
        lugSpanWidth * 0.495,
        caseR,
        caseShape,
        attachY,
        attachZ,
        linkThickness * 1.05,
        halfT
      )
    );
    const selOuterLeftGeo = trackGeo(
      createCaseHuggingEndLinkGeometry(
        -lugSpanWidth * 0.495,
        -lugSpanWidth * 0.18,
        caseR,
        caseShape,
        attachY,
        attachZ,
        linkThickness * 1.05,
        halfT
      )
    );
    const selCenterGeo = trackGeo(
      createCaseHuggingEndLinkGeometry(
        -lugSpanWidth * 0.182,
        lugSpanWidth * 0.182,
        caseR,
        caseShape,
        attachY,
        attachZ,
        linkThickness * 1.14,
        halfT
      )
    );

    ([1, -1] as const).forEach((signY) => {
      const selHolder = new THREE.Group();
      if (signY < 0) selHolder.rotation.z = Math.PI;

      if (beltId === 'bracelet') {
        const selL = new THREE.Mesh(selOuterLeftGeo, mats.brushedMetal);
        const selR = new THREE.Mesh(selOuterGeo, mats.brushedMetal);
        const selC = new THREE.Mesh(selCenterGeo, mats.centerLinkMetal);
        [selL, selR, selC].forEach((m) => {
          m.castShadow = true;
          m.receiveShadow = true;
          selHolder.add(m);
        });
      } else {
        const selSolid = new THREE.Mesh(selFullGeo, mats.brushedMetal);
        selSolid.castShadow = true;
        selSolid.receiveShadow = true;
        selHolder.add(selSolid);
      }
      braceletGroup.add(selHolder);
    });
  }

  // Spring bar pivot pins + enclosed strap bolster rolls locking cleanly between lug cheeks
  const springBarGeo = trackGeo(
    new THREE.CylinderGeometry(0.036, 0.036, lugSpanWidth * 1.03, 14)
  );
  springBarGeo.rotateZ(Math.PI / 2);
  const bolsterGeo = trackGeo(
    new THREE.CylinderGeometry(
      strapThickness * 0.54,
      strapThickness * 0.54,
      lugSpanWidth * 0.985,
      18
    )
  );
  bolsterGeo.rotateZ(Math.PI / 2);

  const strapAnchorZ = -Math.max(0.06, halfT * 0.28);
  ([1, -1] as const).forEach((signY) => {
    const endBaseR =
      caseShape === 'crash'
        ? signY > 0
          ? crashTopY
          : crashBotY
        : lugAttachR;
    const sbY = signY * (useTangBuckle ? endBaseR * 1.015 : attachY);
    const sbZ = useTangBuckle ? strapAnchorZ : attachZ;
    const sb = new THREE.Mesh(springBarGeo, mats.polishedMetal);
    sb.position.set(0, sbY, sbZ);
    braceletGroup.add(sb);

    // Wrapped leather/resin bolster sleeve enclosing the spring bar cleanly so metal never pokes out
    if (useTangBuckle) {
      const bolster = new THREE.Mesh(
        bolsterGeo,
        isLeather ? mats.leatherBelt : mats.oysterflexBelt
      );
      bolster.position.set(0, sbY, sbZ);
      bolster.castShadow = true;
      bolster.receiveShadow = true;
      braceletGroup.add(bolster);
    }
  });

  // Closed-loop tang-buckle curve math:
  // - 12h strap wraps directly into the buckle rear hinge bar (y = +0.34, z = -3.19)
  // - 6h strap runs all the way THROUGH the buckle frame (y = 0, z = -3.20) and tucks under the keepers up to y = +1.05
  const buckleFrameH = 0.72;
  const buckleRearBarY = buckleFrameH * 0.44;
  const buildWristCurve = (signY: 1 | -1) => {
    const endBaseR =
      caseShape === 'crash'
        ? signY > 0
          ? crashTopY
          : crashBotY
        : lugAttachR;

    if (useTangBuckle) {
      if (signY > 0) {
        // 12 o'clock buckle-side strap ending cleanly at the buckle rear hinge bar
        return new THREE.CatmullRomCurve3(
          [
            new THREE.Vector3(0, endBaseR * 1.015, strapAnchorZ),
            new THREE.Vector3(0, endBaseR * 1.14, strapAnchorZ - 0.4),
            new THREE.Vector3(0, wristApexY, wristCenterZ),
            new THREE.Vector3(0, wristApexY * 0.74, claspEdgeZ + 0.52),
            new THREE.Vector3(0, buckleRearBarY, claspCenterZ + 0.02),
          ],
          false,
          'catmullrom',
          0.5
        );
      }
      // 6 o'clock tongue strap curving through the tang buckle & tucking inside the keepers on the 12h side
      return new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(0, -endBaseR * 1.015, strapAnchorZ),
          new THREE.Vector3(0, -endBaseR * 1.14, strapAnchorZ - 0.4),
          new THREE.Vector3(0, -wristApexY, wristCenterZ),
          new THREE.Vector3(0, -wristApexY * 0.74, claspEdgeZ + 0.52),
          new THREE.Vector3(0, -buckleRearBarY, claspCenterZ + 0.04),
          new THREE.Vector3(0, 0.0, claspCenterZ - 0.03),
          new THREE.Vector3(0, buckleRearBarY + 0.48, claspCenterZ + 0.07),
          new THREE.Vector3(0, buckleRearBarY + 0.92, claspCenterZ + 0.28),
        ],
        false,
        'catmullrom',
        0.5
      );
    }

    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, signY * attachY, attachZ),
        new THREE.Vector3(0, signY * (attachY + 0.11), attachZ - 0.36),
        new THREE.Vector3(0, signY * wristApexY, wristCenterZ),
        new THREE.Vector3(0, signY * (wristApexY * 0.78), claspEdgeZ + 0.65),
        new THREE.Vector3(0, signY * claspSpanY, claspEdgeZ),
      ],
      false,
      'catmullrom',
      0.5
    );
  };

  const topCurve = buildWristCurve(1);
  const botCurve = buildWristCurve(-1);

  if (beltId === 'bracelet') {
    const isOyster =
      watch.braceletType === 'oyster' || watch.braceletType === 'santos';
    const isOverseas = watch.braceletType === 'overseas';
    const isIntegrated =
      watch.braceletType === 'royal-oak' ||
      watch.braceletType === 'nautilus' ||
      isOverseas;
    const isPresident = watch.braceletType === 'president';
    const linkStyle =
      isOyster || isIntegrated
        ? 'oyster'
        : isPresident
          ? 'president'
          : 'jubilee';
    const linkCountPerSide =
      isIntegrated || isOyster ? 8 : isPresident ? 10 : 12;
    const arcLen = topCurve.getLength();
    const pitch = arcLen / linkCountPerSide;
    const linkLen = pitch * 1.09;

    const outerGeo = isOverseas
      ? trackGeo(
          createOverseasHalfMalteseLinkGeometry(
            lugSpanWidth * 0.35,
            linkLen,
            linkThickness * 0.94,
            false
          )
        )
      : isIntegrated
        ? trackGeo(createSculptedLinkGeometry(lugSpanWidth * 0.36, linkLen, linkThickness * 0.92, 'oyster'))
        : isOyster
          ? trackGeo(createSculptedLinkGeometry(lugSpanWidth * 0.32, linkLen, linkThickness, 'oyster'))
          : isPresident
            ? trackGeo(createSculptedLinkGeometry(lugSpanWidth * 0.31, linkLen, linkThickness * 1.14, 'president'))
            : trackGeo(createSculptedLinkGeometry(lugSpanWidth * 0.23, linkLen, linkThickness * 0.96, 'jubilee'));
    const centerGeo = isOverseas
      ? trackGeo(
          createOverseasHalfMalteseLinkGeometry(
            lugSpanWidth * 0.3,
            linkLen * 0.98,
            linkThickness * 1.06,
            true
          )
        )
      : isIntegrated
        ? trackGeo(createSculptedLinkGeometry(lugSpanWidth * 0.26, linkLen * 0.96, linkThickness * 1.02, 'oyster'))
        : isOyster
          ? trackGeo(createSculptedLinkGeometry(lugSpanWidth * 0.37, linkLen, linkThickness * 1.08, 'oyster'))
          : isPresident
            ? trackGeo(createSculptedLinkGeometry(lugSpanWidth * 0.38, linkLen, linkThickness * 1.2, 'president'))
            : trackGeo(createSculptedLinkGeometry(lugSpanWidth * 0.175, linkLen, linkThickness * 1.04, 'jubilee'));
    const pinGeo = trackGeo(
      new THREE.CylinderGeometry(0.032, 0.032, lugSpanWidth * 0.99, 12)
    );
    pinGeo.rotateZ(Math.PI / 2);

    // InstancedMesh bracelet links & pins: collapses ~120 individual draw calls down to 3!
    const isFiveRow = linkStyle === 'jubilee';
    const outerPerSeg = 2;
    const centerPerSeg = isFiveRow ? 3 : 1;
    const totalSegs = linkCountPerSide * 2;
    const outerInst = new THREE.InstancedMesh(outerGeo, mats.brushedMetal, totalSegs * outerPerSeg);
    const centerInst = new THREE.InstancedMesh(centerGeo, mats.centerLinkMetal, totalSegs * centerPerSeg);
    const pinInst = new THREE.InstancedMesh(pinGeo, mats.polishedMetal, (linkCountPerSide + 1) * 2);
    outerInst.castShadow = true;
    outerInst.receiveShadow = true;
    centerInst.castShadow = true;
    centerInst.receiveShadow = true;

    const segParent = new THREE.Object3D();
    const childLocal = new THREE.Object3D();
    segParent.add(childLocal);
    const pinDummy = new THREE.Object3D();

    let outerIdx = 0;
    let centerIdx = 0;
    let pinIdx = 0;

    const placeLinksOnCurve = (curve: THREE.CatmullRomCurve3, signY: 1 | -1) => {
      for (let i = 0; i < linkCountPerSide; i++) {
        const u = (i + 0.5) / linkCountPerSide;
        const pos = curve.getPointAt(u);
        const tan = curve.getTangentAt(u);
        const taper = THREE.MathUtils.lerp(1.0, claspWidth / lugSpanWidth, u);
        const rotX =
          signY > 0
            ? Math.atan2(tan.z, tan.y)
            : Math.atan2(-tan.z, -tan.y);

        segParent.position.copy(pos);
        segParent.rotation.set(rotX, 0, 0);
        segParent.scale.set(taper, 1, 1);
        segParent.updateMatrixWorld(true);

        const outerOffsets = isFiveRow
          ? [-lugSpanWidth * 0.38, lugSpanWidth * 0.38]
          : [-lugSpanWidth * 0.34, lugSpanWidth * 0.34];
        for (let k = 0; k < outerOffsets.length; k++) {
          childLocal.position.set(outerOffsets[k], 0, 0);
          childLocal.updateMatrixWorld(true);
          outerInst.setMatrixAt(outerIdx++, childLocal.matrixWorld);
        }

        const centerOffsets = isFiveRow
          ? [-lugSpanWidth * 0.175, 0, lugSpanWidth * 0.175]
          : [0];
        for (let k = 0; k < centerOffsets.length; k++) {
          childLocal.position.set(centerOffsets[k], 0, 0);
          childLocal.updateMatrixWorld(true);
          centerInst.setMatrixAt(centerIdx++, childLocal.matrixWorld);
        }

        const jointU = i / linkCountPerSide;
        const jPos = curve.getPointAt(jointU);
        const jTaper = THREE.MathUtils.lerp(1.0, claspWidth / lugSpanWidth, jointU);
        pinDummy.position.copy(jPos);
        pinDummy.rotation.set(0, 0, 0);
        pinDummy.scale.set(jTaper, 1, 1);
        pinDummy.updateMatrix();
        pinInst.setMatrixAt(pinIdx++, pinDummy.matrix);
      }

      const endPos = curve.getPointAt(1);
      pinDummy.position.copy(endPos);
      pinDummy.rotation.set(0, 0, 0);
      pinDummy.scale.set(claspWidth / lugSpanWidth, 1, 1);
      pinDummy.updateMatrix();
      pinInst.setMatrixAt(pinIdx++, pinDummy.matrix);
    };

    placeLinksOnCurve(topCurve, 1);
    placeLinksOnCurve(botCurve, -1);

    outerInst.instanceMatrix.needsUpdate = true;
    centerInst.instanceMatrix.needsUpdate = true;
    pinInst.instanceMatrix.needsUpdate = true;
    outerInst.computeBoundingSphere();
    centerInst.computeBoundingSphere();
    pinInst.computeBoundingSphere();
    braceletGroup.add(outerInst, centerInst, pinInst);
  } else {
    const strapMaterials =
      beltId === 'leather'
        ? [mats.leatherBelt, mats.leatherLining]
        : [mats.oysterflexBelt, mats.oysterflexBelt];
    const strapSingleMat =
      beltId === 'leather' ? mats.leatherBelt : mats.oysterflexBelt;
    const isOysterflex = beltId === 'oysterflex';
    const roundHugR = isLeather && caseShape === 'round' ? lugAttachR : 0;

    (
      [
        { curve: topCurve, signY: 1 as const, pointed: false },
        { curve: botCurve, signY: -1 as const, pointed: useTangBuckle },
      ] as const
    ).forEach(({ curve, signY, pointed }) => {
      const strapGeo = trackGeo(
        createCurveSweptStrapGeometry(
          curve,
          signY,
          lugSpanWidth * 0.985,
          claspWidth * 0.94,
          strapThickness,
          isOysterflex,
          roundHugR,
          pointed
        )
      );
      const strapMesh = new THREE.Mesh(strapGeo, strapMaterials);
      strapMesh.castShadow = true;
      strapMesh.receiveShadow = true;
      braceletGroup.add(strapMesh);

      if (isOysterflex && !isCasioResinStrap) {
        const finU = 0.45;
        const finPos = curve.getPointAt(finU);
        const finTan = curve.getTangentAt(finU);
        const finRotX =
          signY > 0
            ? Math.atan2(finTan.z, finTan.y)
            : Math.atan2(-finTan.z, -finTan.y);
        let ny = signY > 0 ? -finTan.z : finTan.z;
        let nz = signY > 0 ? finTan.y : -finTan.y;
        const nLen = Math.hypot(ny, nz) || 1;
        ny /= nLen;
        nz /= nLen;

        const finGeo = trackGeo(
          createSculptedLinkGeometry(lugSpanWidth * 0.2, 1.32, 0.08, 'keeper')
        );
        [-lugSpanWidth * 0.21, lugSpanWidth * 0.21].forEach((fx) => {
          const fin = new THREE.Mesh(finGeo, mats.oysterflexBelt);
          fin.position.set(fx, finPos.y - ny * (strapThickness * 0.48), finPos.z - nz * (strapThickness * 0.48));
          fin.rotation.x = finRotX;
          braceletGroup.add(fin);
        });
      }

      if (isLeather) {
        // 3D Instanced Cream Contrast Saddle Stitching seated flush on the actual strap outer profile
        const stitchSteps = pointed ? 20 : 16;
        const stitchGeo = trackGeo(new THREE.CapsuleGeometry(0.014, 0.088, 4, 8));
        const stitchInst = new THREE.InstancedMesh(
          stitchGeo,
          mats.leatherStitch,
          stitchSteps * 2
        );
        const stDummy = new THREE.Object3D();
        let idx = 0;
        const surfaceOffset = strapThickness * 0.39;
        for (let i = 1; i <= stitchSteps; i++) {
          const u = THREE.MathUtils.lerp(0.11, pointed ? 0.86 : 0.92, i / (stitchSteps + 1));
          const pt = curve.getPointAt(u);
          const tan = curve.getTangentAt(u);
          const width = THREE.MathUtils.lerp(
            lugSpanWidth * 0.985,
            claspWidth * 0.94,
            u
          );
          let ny = signY > 0 ? -tan.z : tan.z;
          let nz = signY > 0 ? tan.y : -tan.y;
          const nLen = Math.hypot(ny, nz) || 1;
          ny /= nLen;
          nz /= nLen;
          const rotX =
            signY > 0
              ? Math.atan2(tan.z, tan.y)
              : Math.atan2(-tan.z, -tan.y);

          [-width * 0.42, width * 0.42].forEach((sx) => {
            stDummy.position.set(sx, pt.y + ny * surfaceOffset, pt.z + nz * surfaceOffset);
            stDummy.rotation.set(rotX, 0, 0);
            stDummy.updateMatrix();
            stitchInst.setMatrixAt(idx++, stDummy.matrix);
          });
        }
        stitchInst.instanceMatrix.needsUpdate = true;
        stitchInst.computeBoundingSphere();
        braceletGroup.add(stitchInst);

        // 5 Punched Leather Sizing Holes along the lower 6h tongue approaching the buckle
        if (signY < 0) {
          const holeMat = trackMat(
            new THREE.MeshStandardMaterial({
              color: 0x0b0705,
              roughness: 0.9,
              metalness: 0.0,
            })
          );
          const holeGeo = trackGeo(
            new THREE.CylinderGeometry(0.034, 0.034, strapThickness * 1.06, 14)
          );
          [0.44, 0.51, 0.58, 0.65, 0.72].forEach((hu) => {
            const hPos = curve.getPointAt(hu);
            const hTan = curve.getTangentAt(hu);
            const hole = new THREE.Mesh(holeGeo, holeMat);
            hole.position.copy(hPos);
            hole.rotation.x = Math.atan2(-hTan.z, -hTan.y) + Math.PI / 2;
            braceletGroup.add(hole);
          });
        }
      }
    });

    // Properly proportioned twin keepers (fixed: NO double-tapering shrink!) enclosing both overlapped strap layers
    const keeperWidth = claspWidth * 1.11;
    const keeperDepth = useTangBuckle ? strapThickness * 2.08 : strapThickness * 1.35;
    const keeperGeo = trackGeo(
      createSculptedLinkGeometry(keeperWidth, 0.23, keeperDepth, 'keeper')
    );
    [0.84, 0.93].forEach((ku) => {
      const kPos = topCurve.getPointAt(ku);
      const kTan = topCurve.getTangentAt(ku);
      let ny = -kTan.z;
      let nz = kTan.y;
      const nLen = Math.hypot(ny, nz) || 1;
      ny /= nLen;
      nz /= nLen;
      const keeper = new THREE.Mesh(keeperGeo, strapSingleMat);
      keeper.position.set(
        kPos.x,
        kPos.y + ny * (useTangBuckle ? strapThickness * 0.25 : 0),
        kPos.z + nz * (useTangBuckle ? strapThickness * 0.25 : 0)
      );
      keeper.rotation.x = Math.atan2(kTan.z, kTan.y);
      keeper.castShadow = true;
      braceletGroup.add(keeper);
    });
  }

  // Sculpted Clasp / Tang Buckle Assembly
  const claspGroup = new THREE.Group();
  claspGroup.position.set(0, 0, claspCenterZ);

  const topHingeZ = claspEdgeZ - claspCenterZ;
  const claspSwing = new THREE.Group();
  claspSwing.position.set(0, useTangBuckle ? buckleRearBarY : claspSpanY, useTangBuckle ? 0.02 : topHingeZ);
  claspGroup.add(claspSwing);

  let flipLock: THREE.Object3D;
  let glidelockGroup: THREE.Group | null = null;

  if (useTangBuckle) {
    // Classic Polished/Brushed Tang Pin Buckle Frame seated directly around the closed strap junction (ZERO air gaps!)
    const buckleFrame = new THREE.Group();
    buckleFrame.position.set(0, -buckleRearBarY, -0.02);
    const buckleMat = isCasioResinStrap ? mats.brushedMetal : mats.bezelMetal;
    const tangMat = isCasioResinStrap ? mats.handMetal : mats.polishedMetal;

    const frameW = claspWidth * 1.12;
    const frameH = buckleFrameH;
    const sideRailGeo = trackGeo(createRoundedLinkGeometry(0.105, frameH, 0.14, 0.024));
    const crossBarGeo = trackGeo(
      new THREE.CylinderGeometry(0.052, 0.052, frameW, 18)
    );
    crossBarGeo.rotateZ(Math.PI / 2);

    const leftRail = new THREE.Mesh(sideRailGeo, buckleMat);
    leftRail.position.set(-frameW * 0.46, 0, -0.02);
    leftRail.castShadow = true;
    leftRail.userData.interactive = 'clasp';
    interactiveMeshes.push(leftRail);

    const rightRail = new THREE.Mesh(sideRailGeo, buckleMat);
    rightRail.position.set(frameW * 0.46, 0, -0.02);
    rightRail.castShadow = true;
    rightRail.userData.interactive = 'clasp';
    interactiveMeshes.push(rightRail);

    const frontBar = new THREE.Mesh(crossBarGeo, tangMat);
    frontBar.position.set(0, -frameH * 0.44, -0.02);
    frontBar.userData.interactive = 'clasp';
    interactiveMeshes.push(frontBar);

    const rearBar = new THREE.Mesh(crossBarGeo, tangMat);
    rearBar.position.set(0, frameH * 0.44, 0.01);
    rearBar.userData.interactive = 'clasp';
    interactiveMeshes.push(rearBar);

    // Folded strap wrap sleeve around the rear hinge bar locking the 12h strap solidly to the buckle
    const buckleWrap = new THREE.Mesh(
      trackGeo(
        new THREE.CylinderGeometry(
          strapThickness * 0.56,
          strapThickness * 0.56,
          claspWidth * 0.96,
          16
        )
      ),
      isLeather ? mats.leatherBelt : mats.oysterflexBelt
    );
    buckleWrap.rotation.z = Math.PI / 2;
    buckleWrap.position.set(0, frameH * 0.44, 0.01);

    buckleFrame.add(leftRail, rightRail, frontBar, rearBar, buckleWrap);
    claspSwing.add(buckleFrame);

    // Sculpted Pivoting Tang Tongue resting cleanly in center notch
    const tangPin = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.072, frameH * 0.92, 0.048, 0.012)),
      tangMat
    );
    tangPin.position.set(0, -buckleRearBarY + 0.02, -0.11);
    tangPin.userData.interactive = 'clasp';
    interactiveMeshes.push(tangPin);
    claspSwing.add(tangPin);
    flipLock = tangPin;
  } else {
    // Sculpted Curved Multi-Part Folding Clasp + Glidelock Micro-Extension + Flip-Lock
    const claspBladeGeo = trackGeo(
      createCurvedClaspGeometry(
        claspWidth * 1.05,
        claspSpanY,
        claspEdgeZ,
        claspCenterZ,
        Math.max(0.19, linkThickness * 1.15)
      )
    );
    const claspBlade = new THREE.Mesh(claspBladeGeo, mats.brushedMetal);
    claspBlade.position.set(0, -claspSpanY, -topHingeZ);
    claspBlade.castShadow = true;
    claspBlade.receiveShadow = true;
    claspBlade.userData.interactive = 'clasp';
    interactiveMeshes.push(claspBlade);
    claspSwing.add(claspBlade);

    // Glidelock / Easylink Telescoping Micro-Adjust Rail inside clasp
    glidelockGroup = new THREE.Group();
    const glideRailGeo = trackGeo(createRoundedLinkGeometry(claspWidth * 0.84, 0.56, 0.1, 0.024));
    const glideRail = new THREE.Mesh(glideRailGeo, mats.polishedMetal);
    glideRail.position.set(0, -claspSpanY * 1.15, -topHingeZ + 0.06);
    const glideNotchGeo = trackGeo(new THREE.BoxGeometry(claspWidth * 0.72, 0.035, 0.035));
    for (let n = -2; n <= 2; n++) {
      const notch = new THREE.Mesh(glideNotchGeo, mats.movementPlate);
      notch.position.set(0, -claspSpanY * 1.15 + n * 0.09, -topHingeZ + 0.11);
      glidelockGroup.add(notch);
    }
    glidelockGroup.add(glideRail);
    claspSwing.add(glidelockGroup);

    const claspCenterStripe = new THREE.Mesh(
      trackGeo(
        createCurvedClaspGeometry(
          claspWidth * 0.4,
          claspSpanY * 0.96,
          claspEdgeZ,
          claspCenterZ - 0.015,
          Math.max(0.2, linkThickness * 1.2)
        )
      ),
      mats.centerLinkMetal
    );
    claspCenterStripe.position.set(0, -claspSpanY, -topHingeZ);
    claspSwing.add(claspCenterStripe);

    const flipLockMesh = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(claspWidth * 0.8, 0.44, 0.1, 0.03)),
      mats.polishedMetal
    );
    flipLockMesh.position.set(0, -claspSpanY * 0.35, -topHingeZ - 0.1);
    flipLockMesh.rotation.x = -0.14;
    flipLockMesh.userData.interactive = 'clasp';
    interactiveMeshes.push(flipLockMesh);
    claspSwing.add(flipLockMesh);
    flipLock = flipLockMesh;

    const claspCrest = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.115, 0.115, 0.048, 28)),
      mats.goldAccent
    );
    claspCrest.rotation.x = Math.PI / 2;
    claspCrest.position.set(0, -claspSpanY + 0.04, -topHingeZ - 0.155);
    claspCrest.userData.interactive = 'clasp';
    interactiveMeshes.push(claspCrest);
    claspSwing.add(claspCrest);

    const claspBarrelGeo = trackGeo(
      new THREE.CylinderGeometry(0.078, 0.078, claspWidth * 1.06, 18)
    );
    claspBarrelGeo.rotateZ(Math.PI / 2);
    [claspSpanY, -claspSpanY].forEach((by) => {
      const barrel = new THREE.Mesh(claspBarrelGeo, mats.polishedMetal);
      barrel.position.set(0, by, topHingeZ);
      claspGroup.add(barrel);
    });
  }

  braceletGroup.add(claspGroup);
  lugParent.add(braceletGroup);

  // --- 3. DIAL & CHAMFERED 18CT GOLD APPLIED HOUR MARKERS ---
  let activeDialTex = createDialTexture(
    watch,
    dialOption,
    maxAnisotropy,
    options?.dateOverride
  );
  const dialMat = trackMat(mats.dialSurface.clone());
  dialMat.map = activeDialTex;
  if (options?.xrayDial) {
    dialMat.transparent = true;
    dialMat.opacity = 0.22;
    dialMat.roughness = 0.08;
  }
  dialGroup.position.z = baseLayerZ.dial;
  const dialDisc = new THREE.Mesh(
    trackGeo(
      hasRoundDialOnShapedCase
        ? new THREE.CircleGeometry(dialR, 96)
        : createShapedDiscGeometry(dialR, 96, caseShape)
    ),
    dialMat
  );
  dialDisc.position.z = 0.16;
  dialDisc.receiveShadow = true;
  dialGroup.add(dialDisc);

  // AVI-8 Spitfire Lock 3D Physical Bronze Bi-Compax Subdial Bezels + 6h Recessed Tunnel Date Frame
  if (watch.id === 'avi8-spitfire') {
    const subBezelGeo = trackGeo(new THREE.TorusGeometry(dialR * 0.255, 0.022, 12, 48));
    [-dialR * 0.35, dialR * 0.35].forEach((sx) => {
      const subRim = new THREE.Mesh(subBezelGeo, mats.bezelMetal);
      subRim.position.set(sx, 0, 0.172);
      dialGroup.add(subRim);
    });
    const dateTunnelGeo = trackGeo(new THREE.TorusGeometry(dialR * 0.13, 0.024, 12, 32));
    const dateTunnel = new THREE.Mesh(dateTunnelGeo, mats.bezelMetal);
    dateTunnel.position.set(0, -dialR * 0.46, 0.174);
    dateTunnel.scale.set(1.25, 0.72, 0.8);
    dialGroup.add(dateTunnel);
  }

  let skyDisc: THREE.Mesh | null = null;
  if (watch.hasSkyDwellerDisc) {
    const skyTex = createSkyDwellerDiscTexture(maxAnisotropy);
    const skyMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: skyTex,
        metalness: 0.25,
        roughness: 0.3,
      })
    );
    skyDisc = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(dialR * 0.23, 64)),
      skyMat
    );
    skyDisc.position.set(0, -dialR * 0.19, 0.167);
    dialGroup.add(skyDisc);
  }

  // Rotating Astronomical Moonphase Disc + Mask Aperture (Lange 1)
  let moonphaseDisc: THREE.Mesh | null = null;
  if (watch.hasMoonphase) {
    const moonTex = createMoonphaseDiscTexture(maxAnisotropy);
    const moonMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: moonTex,
        metalness: 0.28,
        roughness: 0.24,
      })
    );
    moonphaseDisc = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(dialR * 0.185, 48)),
      moonMat
    );
    moonphaseDisc.position.set(dialR * 0.31, -dialR * 0.38, 0.167);
    dialGroup.add(moonphaseDisc);

    const moonMaskGeo = trackGeo(new THREE.RingGeometry(dialR * 0.185, dialR * 0.215, 48));
    const moonRim = new THREE.Mesh(moonMaskGeo, mats.goldAccent);
    moonRim.position.set(dialR * 0.31, -dialR * 0.38, 0.17);
    dialGroup.add(moonRim);
  }

  // Dial-side Suspended Floating Balance Wheel & Twin Arched Bridges (MB&F Legacy Machine LM101)
  let dialBalanceWheel: THREE.Group | null = null;
  if (watch.hasFloatingBalance) {
    const balX = -dialR * 0.1;
    const balY = dialR * 0.14;
    const balZ = 0.36;

    // Monumental twin mirror-polished arches rising beneath the hemispherical bubble sapphire
    const archCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(balX - 0.62, balY - 0.34, 0.17),
      new THREE.Vector3(balX - 0.32, balY - 0.14, 0.45),
      new THREE.Vector3(balX, balY, 0.5),
      new THREE.Vector3(balX + 0.32, balY + 0.14, 0.45),
      new THREE.Vector3(balX + 0.56, balY + 0.36, 0.17),
    ]);
    const archGeo = trackGeo(new THREE.TubeGeometry(archCurve, 40, 0.036, 12, false));
    const archMesh = new THREE.Mesh(archGeo, mats.polishedMetal);
    archMesh.castShadow = true;
    dialGroup.add(archMesh);

    // Central ruby chaton cap jewel atop the suspension arch
    const jewelCap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.068, 0.072, 0.04, 20)),
      mats.goldAccent
    );
    jewelCap.rotation.x = Math.PI / 2;
    jewelCap.position.set(balX, balY, 0.5);
    const jewelRuby = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.048, 16)),
      mats.movementRuby
    );
    jewelRuby.rotation.x = Math.PI / 2;
    jewelRuby.position.set(balX, balY, 0.505);
    dialGroup.add(jewelCap, jewelRuby);

    // Oscillating 14mm golden regulating balance wheel suspended beneath the arch
    dialBalanceWheel = new THREE.Group();
    dialBalanceWheel.position.set(balX, balY, balZ);
    const fRim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.37, 0.034, 14, 48)),
      mats.goldAccent
    );
    const fCross = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.7, 0.036, 0.024)),
      mats.goldAccent
    );
    const fHub = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.045, 0.045, 0.28, 16)),
      mats.polishedMetal
    );
    fHub.rotation.x = Math.PI / 2;
    dialBalanceWheel.add(fRim, fCross, fHub);
    // Timing poising screws around balance rim
    const screwGeo = trackGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.048, 8));
    for (let s = 0; s < 8; s++) {
      const sa = (s / 8) * Math.PI * 2;
      const sc = new THREE.Mesh(screwGeo, mats.polishedMetal);
      sc.position.set(Math.cos(sa) * 0.4, Math.sin(sa) * 0.4, 0);
      sc.rotation.z = sa - Math.PI / 2;
      dialBalanceWheel.add(sc);
    }
    dialGroup.add(dialBalanceWheel);
  }

  // Reverso Reverse Duoface Dial + Home-Time Hands mounted facing -Z inside swivel carriage
  if (watch.hasReversoFlip) {
    const backDialTex = createReversoBackDialTexture(maxAnisotropy);
    const backDialMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: backDialTex,
        metalness: 0.22,
        roughness: 0.32,
      })
    );
    const backDialDisc = new THREE.Mesh(
      trackGeo(createShapedDiscGeometry(dialR, 96, caseShape)),
      backDialMat
    );
    backDialDisc.rotation.y = Math.PI;
    backDialDisc.position.z = -0.06;
    casebackGroup.add(backDialDisc);

    const backHandsRoot = new THREE.Group();
    backHandsRoot.rotation.y = Math.PI;
    backHandsRoot.position.set(0, dialR * 0.28, -0.088);

    const rbHour = new THREE.Group();
    rbHour.add(
      new THREE.Mesh(
        trackGeo(createFacetedHandGeometry(dialR * 0.32, 0.036, 0.01, 0.012)),
        mats.bluedHands
      )
    );
    const rbMin = new THREE.Group();
    rbMin.position.z = 0.016;
    rbMin.add(
      new THREE.Mesh(
        trackGeo(createFacetedHandGeometry(dialR * 0.48, 0.028, 0.008, 0.01)),
        mats.bluedHands
      )
    );
    backHandsRoot.add(rbHour, rbMin);
    casebackGroup.add(backHandsRoot);
    reversoBackHands = { hour: rbHour, minute: rbMin };
  }

  const markerR = dialR * 0.775;
  const surroundGeoRound = trackGeo(new THREE.TorusGeometry(0.095, 0.018, 12, 32));
  const lumeGeoRound = trackGeo(new THREE.SphereGeometry(0.082, 24, 16));
  lumeGeoRound.scale(1, 1, 0.28);

  const batonSurroundGeo = trackGeo(
    createRoundedLinkGeometry(0.108, 0.27, 0.04, 0.014)
  );
  const batonLumeGeo = trackGeo(
    createRoundedLinkGeometry(0.068, 0.215, 0.048, 0.016)
  );

  const triShape = new THREE.Shape();
  triShape.moveTo(0, -0.145);
  triShape.lineTo(0.125, 0.125);
  triShape.lineTo(-0.125, 0.125);
  triShape.closePath();
  const triGeo = trackGeo(
    new THREE.ExtrudeGeometry(triShape, {
      depth: 0.032,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 4,
    })
  );

  // Iconic Maison 3D Dial Architectural Bridges & Frames
  if (watch.id === 'lange-1') {
    // 3D stepped 18k gold Outsize Date twin-aperture frame at 1:30
    const odDiv = trackGeo(createRoundedLinkGeometry(0.026, 0.22, 0.032, 0.006));
    const odFrameGroup = new THREE.Group();
    odFrameGroup.position.set(dialR * 0.31, dialR * 0.34, 0.174);
    const topBar = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.46, 0.028, 0.028, 0.006)),
      mats.goldAccent
    );
    topBar.position.y = 0.115;
    const botBar = topBar.clone();
    botBar.position.y = -0.115;
    const leftBar = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.028, 0.25, 0.028, 0.006)),
      mats.goldAccent
    );
    leftBar.position.x = -0.22;
    const rightBar = leftBar.clone();
    rightBar.position.x = 0.22;
    const centerBar = new THREE.Mesh(odDiv, mats.goldAccent);
    odFrameGroup.add(topBar, botBar, leftBar, rightBar, centerBar);
    dialGroup.add(odFrameGroup);
  } else if (watch.id === 'lange-zeitwerk') {
    // A. Lange & Söhne Zeitwerk: Sculptural 3D brushed German-silver Time Bridge spanning horizontally across the dial
    const tbShape = new THREE.Shape();
    tbShape.moveTo(-dialR * 0.78, -0.14);
    tbShape.lineTo(-dialR * 0.22, -0.14);
    tbShape.quadraticCurveTo(0, -dialR * 0.56, dialR * 0.22, -0.14);
    tbShape.lineTo(dialR * 0.78, -0.14);
    tbShape.lineTo(dialR * 0.78, 0.16);
    tbShape.lineTo(-dialR * 0.78, 0.16);
    tbShape.closePath();

    // Left jumping hour window hole
    const hHole = new THREE.Path();
    hHole.moveTo(-dialR * 0.66, -0.09);
    hHole.lineTo(-dialR * 0.26, -0.09);
    hHole.lineTo(-dialR * 0.26, 0.11);
    hHole.lineTo(-dialR * 0.66, 0.11);
    hHole.closePath();
    tbShape.holes.push(hHole);

    // Right jumping minute window hole
    const mHole = new THREE.Path();
    mHole.moveTo(dialR * 0.26, -0.09);
    mHole.lineTo(dialR * 0.66, -0.09);
    mHole.lineTo(dialR * 0.66, 0.11);
    mHole.lineTo(dialR * 0.26, 0.11);
    mHole.closePath();
    tbShape.holes.push(mHole);

    const tbGeo = trackGeo(
      new THREE.ExtrudeGeometry(tbShape, {
        depth: 0.026,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 3,
      })
    );
    const tbMesh = new THREE.Mesh(tbGeo, mats.brushedMetal);
    tbMesh.position.z = 0.168;
    const ssRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(dialR * 0.22, 0.018, 10, 36)),
      mats.polishedMetal
    );
    ssRing.position.set(0, -dialR * 0.46, 0.184);
    dialGroup.add(tbMesh, ssRing);
  } else if (watch.id === 'vc-overseas') {
    // Vacheron Constantin Overseas: Sculpted 3D applied faceted Maltese Cross emblem beneath 12 o'clock
    const malteseMesh = new THREE.Mesh(
      trackGeo(createMalteseCrossGeometry(0.118, 0.022, 0.005)),
      mats.polishedMetal
    );
    malteseMesh.position.set(0, dialR * 0.46, 0.18);
    malteseMesh.castShadow = true;
    dialGroup.add(malteseMesh);
  }

  if (watch.brand === 'AVI-8') {
    const pilotPipGeo = trackGeo(
      createRoundedLinkGeometry(0.036, 0.095, 0.025, 0.008)
    );
    for (let h = 0; h < 12; h++) {
      if (h === 0 || h === 6) continue;
      const angle = Math.PI / 2 - (h / 12) * Math.PI * 2;
      const hx = Math.cos(angle) * (dialR * 0.905);
      const hy = Math.sin(angle) * (dialR * 0.905);
      const pip = new THREE.Mesh(pilotPipGeo, mats.chromalightLume);
      pip.position.set(hx, hy, 0.174);
      pip.rotation.z = angle - Math.PI / 2;
      dialGroup.add(pip);
    }
  } else if (watch.id === 'tag-monaco') {
    // TAG Heuer Monaco: Iconic horizontally-oriented faceted steel baton markers + outer luminous dots
    const monacoBarGeo = trackGeo(createRoundedLinkGeometry(0.24, 0.056, 0.032, 0.009));
    const monacoDotGeo = trackGeo(new THREE.SphereGeometry(0.032, 12, 10));
    for (let h = 0; h < 12; h++) {
      if (h === 3 || h === 6 || h === 9) continue;
      const angle = Math.PI / 2 - (h / 12) * Math.PI * 2;
      const radScale = getCaseShapeRadius(angle, 1, caseShape);
      const hx = Math.cos(angle) * dialR * 0.72 * radScale;
      const hy = Math.sin(angle) * dialR * 0.72 * radScale;
      const bar = new THREE.Mesh(monacoBarGeo, mats.polishedMetal);
      bar.position.set(hx, hy, 0.178);
      if (h === 0) bar.rotation.z = Math.PI / 2;
      const dot = new THREE.Mesh(monacoDotGeo, h % 3 === 0 ? mats.crimsonAccent : mats.chromalightLume);
      dot.position.set(
        Math.cos(angle) * dialR * 0.86 * radScale,
        Math.sin(angle) * dialR * 0.86 * radScale,
        0.178
      );
      dot.scale.z = 0.4;
      dialGroup.add(bar, dot);
    }
  } else if (watch.id === 'panerai-luminor') {
    // Panerai Luminor Marina: Bold Florentine recessed luminous sandwich baton bars
    const panBarGeo = trackGeo(createRoundedLinkGeometry(0.078, 0.25, 0.022, 0.006));
    for (let h = 0; h < 12; h++) {
      if (h === 0 || h === 3 || h === 6 || h === 9) continue;
      const angle = Math.PI / 2 - (h / 12) * Math.PI * 2;
      const radScale = getCaseShapeRadius(angle, 1, caseShape);
      const bar = new THREE.Mesh(panBarGeo, mats.chromalightLume);
      bar.position.set(
        Math.cos(angle) * dialR * 0.77 * radScale,
        Math.sin(angle) * dialR * 0.77 * radScale,
        0.172
      );
      bar.rotation.z = angle - Math.PI / 2;
      dialGroup.add(bar);
    }
  } else if (watch.id === 'blancpain-fifty-fathoms') {
    // Blancpain Fifty Fathoms: Iconic 3D beveled diamond-shaped luminous markers at non-cardinal hours
    const diaShape = new THREE.Shape();
    diaShape.moveTo(0, 0.13);
    diaShape.lineTo(0.068, 0);
    diaShape.lineTo(0, -0.13);
    diaShape.lineTo(-0.068, 0);
    diaShape.closePath();
    const diaSurGeo = trackGeo(
      new THREE.ExtrudeGeometry(diaShape, {
        depth: 0.026,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      })
    );
    const diaLumeGeo = trackGeo(
      new THREE.ExtrudeGeometry(diaShape, { depth: 0.032, bevelEnabled: false })
    );
    for (let h = 0; h < 12; h++) {
      if (h === 0 || h === 3 || h === 6 || h === 9) continue;
      const angle = Math.PI / 2 - (h / 12) * Math.PI * 2;
      const holder = new THREE.Group();
      holder.position.set(Math.cos(angle) * markerR, Math.sin(angle) * markerR, 0.175);
      holder.rotation.z = angle - Math.PI / 2;
      const sur = new THREE.Mesh(diaSurGeo, mats.polishedMetal);
      const lum = new THREE.Mesh(diaLumeGeo, mats.chromalightLume);
      lum.scale.set(0.7, 0.72, 1);
      holder.add(sur, lum);
      dialGroup.add(holder);
    }
  } else if (watch.id === 'doxa-sub300') {
    // DOXA SUB 300: Iconic matte black-framed luminous rectangular dive indices (twin bar at 12h)
    const doxaFrameGeo = trackGeo(createRoundedLinkGeometry(0.115, 0.25, 0.028, 0.006));
    const doxaLumeGeo = trackGeo(createRoundedLinkGeometry(0.066, 0.19, 0.034, 0.006));
    for (let h = 0; h < 12; h++) {
      if (h === 3) continue;
      const angle = Math.PI / 2 - (h / 12) * Math.PI * 2;
      const holder = new THREE.Group();
      holder.position.set(Math.cos(angle) * dialR * 0.76, Math.sin(angle) * dialR * 0.76, 0.176);
      holder.rotation.z = angle - Math.PI / 2;
      if (h === 0) {
        [-0.062, 0.062].forEach((ox) => {
          const f = new THREE.Mesh(doxaFrameGeo, mats.matteBlackHands);
          f.scale.set(0.72, 1.05, 1);
          f.position.x = ox;
          const l = new THREE.Mesh(doxaLumeGeo, mats.chromalightLume);
          l.scale.set(0.72, 1.02, 1);
          l.position.x = ox;
          holder.add(f, l);
        });
      } else {
        holder.add(
          new THREE.Mesh(doxaFrameGeo, mats.matteBlackHands),
          new THREE.Mesh(doxaLumeGeo, mats.chromalightLume)
        );
      }
      dialGroup.add(holder);
    }
  } else if (watch.id === 'longines-zulu-time') {
    // Longines Spirit Zulu Time: 3D applied diamond luminous outer pips + 5 miniature applied gold stars above 6h
    const pipShape = new THREE.Shape();
    pipShape.moveTo(0, 0.055);
    pipShape.lineTo(0.044, 0);
    pipShape.lineTo(0, -0.055);
    pipShape.lineTo(-0.044, 0);
    pipShape.closePath();
    const pipGeo = trackGeo(new THREE.ExtrudeGeometry(pipShape, { depth: 0.022, bevelEnabled: false }));
    for (let h = 0; h < 12; h++) {
      if (h === 6) continue;
      const angle = Math.PI / 2 - (h / 12) * Math.PI * 2;
      const pip = new THREE.Mesh(pipGeo, mats.chromalightLume);
      pip.position.set(Math.cos(angle) * dialR * 0.87, Math.sin(angle) * dialR * 0.87, 0.174);
      pip.rotation.z = angle - Math.PI / 2;
      dialGroup.add(pip);
    }
    const starGeo = trackGeo(new THREE.OctahedronGeometry(0.024, 0));
    for (let s = -2; s <= 2; s++) {
      const star = new THREE.Mesh(starGeo, mats.goldAccent);
      star.position.set(s * 0.072, -dialR * 0.34, 0.18);
      star.scale.set(1, 1, 0.38);
      dialGroup.add(star);
    }
  } else if (watch.id === 'bulgari-octo-finissimo') {
    // Bulgari Octo Finissimo: Ultra-slim architectural matte-black 3D applied bar indices
    const octoBarGeo = trackGeo(createRoundedLinkGeometry(0.038, 0.21, 0.02, 0.005));
    for (let h = 0; h < 12; h++) {
      if (h === 0 || h === 6 || h === 7 || h === 8) continue;
      const angle = Math.PI / 2 - (h / 12) * Math.PI * 2;
      const bar = new THREE.Mesh(octoBarGeo, mats.matteBlackHands);
      bar.position.set(Math.cos(angle) * dialR * 0.78, Math.sin(angle) * dialR * 0.78, 0.175);
      bar.rotation.z = angle - Math.PI / 2;
      dialGroup.add(bar);
    }
  } else if (watch.id === 'jlc-reverso') {
    // Jaeger-LeCoultre Reverso Tribute: Slim 3D faceted diamond-cut metallic wedge indices (zero lume)
    const revWedgeGeo = trackGeo(createRoundedLinkGeometry(0.042, 0.19, 0.024, 0.006));
    for (let h = 0; h < 12; h++) {
      if (h === 6) continue;
      const angle = Math.PI / 2 - (h / 12) * Math.PI * 2;
      const radScale = getCaseShapeRadius(angle, 1, caseShape);
      const bar = new THREE.Mesh(revWedgeGeo, mats.polishedMetal);
      bar.position.set(
        Math.cos(angle) * dialR * 0.76 * radScale,
        Math.sin(angle) * dialR * 0.76 * radScale,
        0.176
      );
      bar.rotation.z = angle - Math.PI / 2;
      if (h === 0) bar.scale.set(1.5, 1.12, 1);
      dialGroup.add(bar);
    }
  } else if (watch.id === 'casio-casioak-ga2100') {
    // G-Shock CasiOak GA-2100: 3D angled architectural resin chapter-ring hour markers + 9h day pointer
    const oakIdxGeo = trackGeo(createRoundedLinkGeometry(0.068, 0.22, 0.036, 0.008));
    for (let h = 0; h < 12; h++) {
      if (h === 4 || h === 5) continue;
      const angle = Math.PI / 2 - (h / 12) * Math.PI * 2;
      const bar = new THREE.Mesh(oakIdxGeo, mats.brushedMetal);
      bar.position.set(Math.cos(angle) * dialR * 0.81, Math.sin(angle) * dialR * 0.81, 0.184);
      bar.rotation.z = angle - Math.PI / 2;
      if (h === 0) bar.scale.set(1.45, 1.12, 1);
      dialGroup.add(bar);
    }
    // 9 o'clock retrograde Day-of-Week sub-hand (pointing to current day)
    const dayIdx = new Date().getDay();
    const dayAngle = Math.PI * 0.42 - (dayIdx / 6) * Math.PI * 0.84;
    const dayPointer = new THREE.Group();
    dayPointer.position.set(-dialR * 0.42, 0.02, 0.186);
    dayPointer.rotation.z = dayAngle;
    const dpBlade = new THREE.Mesh(
      trackGeo(createFacetedHandGeometry(0.24, 0.022, 0.005, 0.01)),
      mats.chromalightLume
    );
    const dpHub = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.02, 16)),
      mats.matteBlackHands
    );
    dpHub.rotation.x = Math.PI / 2;
    dayPointer.add(dpBlade, dpHub);
    dialGroup.add(dayPointer);
  } else if (
    watch.brand !== 'CARTIER' &&
    watch.brand !== 'A. LANGE & SÖHNE' &&
    watch.brand !== 'RICHARD MILLE' &&
    watch.brand !== 'IWC SCHAFFHAUSEN' &&
    watch.brand !== 'BREGUET' &&
    watch.brand !== 'F.P. JOURNE' &&
    watch.brand !== 'MB&F' &&
    watch.brand !== 'HAMILTON' &&
    watch.brand !== 'NOMOS GLASHÜTTE' &&
    watch.brand !== 'PIAGET' &&
    watch.brand !== 'CASIO' &&
    watch.id !== 'pp-worldtime'
  ) {
    const isTriCompax = watch.hasChronoSubdials === 3;
    for (let h = 0; h < 12; h++) {
      // Zero subdial or aperture collisions!
      if (isTriCompax && (h === 3 || h === 6 || h === 9)) continue;
      if (watch.id === 'skydweller' && h === 6) continue;
      if (h === 3 && (watch.hasCyclops || watch.hasDateWindow) && watch.id !== 'omega-seamaster') continue;
      if (h === 6 && watch.id === 'omega-seamaster') continue;
      if (h === 0 && watch.hasDayWindow) continue;

      const angle = Math.PI / 2 - (h / 12) * Math.PI * 2;
      const radScale =
        caseShape === 'round' ? 1 : getCaseShapeRadius(angle, 1, caseShape);
      const markerDist =
        watch.id === 'breitling-navitimer' ? dialR * 0.65 : markerR;
      const hx = Math.cos(angle) * markerDist * radScale;
      const hy = Math.sin(angle) * markerDist * radScale;
      const markerHolder = new THREE.Group();
      markerHolder.position.set(hx, hy, 0.178);

      const useGiltSurround = watch.brand === 'ROLEX' || watch.id === 'tudor-bb58';
      const surMat = useGiltSurround ? mats.goldAccent : mats.polishedMetal;

      if (h === 0 && watch.id === 'datejust') {
        // Rolex Datejust iconic 3D applied 5-point gold Coronet at 12 o'clock
        const base = new THREE.Mesh(
          trackGeo(createRoundedLinkGeometry(0.14, 0.036, 0.026, 0.008)),
          mats.goldAccent
        );
        base.position.y = -0.075;
        markerHolder.add(base);
        [-0.06, -0.03, 0, 0.03, 0.06].forEach((cx, idx) => {
          const sh = idx === 2 ? 0.135 : idx === 1 || idx === 3 ? 0.115 : 0.092;
          const sp = new THREE.Mesh(
            trackGeo(new THREE.CapsuleGeometry(0.009, sh, 4, 8)),
            mats.goldAccent
          );
          sp.position.set(cx, -0.06 + sh * 0.48, 0.005);
          sp.rotation.z = -(idx - 2) * 0.18;
          markerHolder.add(sp);
        });
      } else if (
        h === 0 &&
        (watch.id === 'submariner' ||
          watch.id === 'yachtmaster' ||
          watch.id === 'gmt' ||
          watch.id === 'explorer2' ||
          watch.id === 'tudor-bb58')
      ) {
        const triSurround = new THREE.Mesh(triGeo, surMat);
        const triLume = new THREE.Mesh(triGeo, mats.chromalightLume);
        triLume.scale.set(0.75, 0.75, 1.12);
        markerHolder.add(triSurround, triLume);
      } else if (
        h === 0 &&
        (watch.id === 'ap-royal-oak' ||
          watch.id === 'pp-nautilus' ||
          watch.id === 'vc-overseas')
      ) {
        // Royal Oak & Nautilus iconic twin slim rounded-tip 12 o'clock white-gold batons
        [-0.048, 0.048].forEach((ox) => {
          const s = new THREE.Mesh(batonSurroundGeo, mats.polishedMetal);
          s.scale.set(0.58, 0.92, 1);
          s.position.x = ox;
          const l = new THREE.Mesh(batonLumeGeo, mats.chromalightLume);
          l.scale.set(0.56, 0.86, 1);
          l.position.x = ox;
          markerHolder.add(s, l);
        });
      } else if (
        watch.id === 'gs-snowflake' ||
        watch.id === 'gs-white-birch' ||
        watch.id === 'moser-streamliner'
      ) {
        // Diamond-cut Zaratsu (Snowflake & White Birch) / Moser faceted metallic indices (ZERO lume pills!)
        markerHolder.rotation.z = angle - Math.PI / 2;
        const facetGeo = trackGeo(
          createRoundedLinkGeometry(h === 0 ? 0.118 : 0.064, h === 0 ? 0.28 : 0.22, 0.034, 0.008)
        );
        const facetBar = new THREE.Mesh(facetGeo, mats.polishedMetal);
        markerHolder.add(facetBar);
      } else if (
        watch.id === 'datejust' ||
        watch.id === 'daytona' ||
        watch.id === 'daydate' ||
        watch.id === 'milgauss' ||
        watch.id === 'skydweller' ||
        watch.id === 'omega-speedmaster' ||
        watch.id === 'ap-royal-oak' ||
        watch.id === 'pp-nautilus' ||
        watch.id === 'vc-overseas' ||
        watch.id === 'breitling-navitimer' ||
        watch.id === 'zenith-el-primero' ||
        watch.id === 'gp-laureato' ||
        (watch.id === 'omega-seamaster' && h === 0) ||
        h === 6 ||
        h === 9
      ) {
        markerHolder.rotation.z = angle - Math.PI / 2;
        const sur = new THREE.Mesh(batonSurroundGeo, surMat);
        const lum = new THREE.Mesh(batonLumeGeo, mats.chromalightLume);
        if (
          watch.id === 'ap-royal-oak' ||
          watch.id === 'pp-nautilus' ||
          watch.id === 'omega-speedmaster' ||
          watch.id === 'vc-overseas' ||
          watch.id === 'breitling-navitimer' ||
          watch.id === 'zenith-el-primero' ||
          watch.id === 'gp-laureato'
        ) {
          markerHolder.scale.set(0.74, h === 0 ? 1.02 : 0.8, 1);
        }
        markerHolder.add(sur, lum);
        // Speedmaster Moonwatch iconic twin 12 o'clock luminous dots flanking the 12h baton
        if (watch.id === 'omega-speedmaster' && h === 0) {
          const spDotGeo = trackGeo(new THREE.SphereGeometry(0.036, 12, 10));
          [-0.095, 0.095].forEach((dx) => {
            const dot = new THREE.Mesh(spDotGeo, mats.chromalightLume);
            dot.position.set(dx, 0.04, 0.012);
            dot.scale.z = 0.4;
            markerHolder.add(dot);
          });
        }
      } else {
        const sur = new THREE.Mesh(surroundGeoRound, surMat);
        sur.position.z = 0.008;
        const lum = new THREE.Mesh(lumeGeoRound, mats.chromalightLume);
        lum.position.z = 0.01;
        markerHolder.add(sur, lum);
      }
      dialGroup.add(markerHolder);
    }
  }

  // --- 4. FACETED 3D DIHEDRAL HANDS ASSEMBLY (SUPPORTS LANGE 1 & MB&F ASYMMETRIC PIVOTS) ---
  const mainPivotX =
    watch.id === 'lange-1'
      ? -dialR * 0.24
      : watch.id === 'mbf-lm101'
        ? dialR * 0.34
        : 0;
  const mainPivotY =
    watch.id === 'lange-1'
      ? -dialR * 0.045
      : watch.id === 'mbf-lm101'
        ? dialR * 0.16
        : 0;
  handsGroup.position.z = baseLayerZ.hands;
  const mainHandsGroup = new THREE.Group();
  mainHandsGroup.position.set(mainPivotX, mainPivotY, 0);
  if (watch.isDigitalDisplay || watch.isJumpingDigital) {
    mainHandsGroup.visible = false;
  }
  handsGroup.add(mainHandsGroup);

  const handLenScale =
    watch.id === 'lange-1'
      ? 0.56
      : watch.id === 'mbf-lm101'
        ? 0.4
        : watch.id === 'pp-worldtime'
          ? 0.62
          : watch.id === 'cartier-tank-louis'
            ? 0.78
            : watch.id === 'cartier-crash'
              ? 0.68
              : 1.0;
  const activeHandMat =
    watch.brand === 'CARTIER' ||
    watch.handStyle === 'breguet-pomme' ||
    watch.id === 'nomos-tangente'
      ? mats.bluedHands
      : watch.id === 'bulgari-octo-finissimo' ||
          watch.id === 'doxa-sub300' ||
          watch.id === 'casio-casioak-ga2100'
        ? mats.matteBlackHands
        : watch.id === 'fpj-chronometre-bleu'
          ? mats.ivoryCreamHands
          : watch.brand === 'A. LANGE & SÖHNE' ||
              watch.id === 'tudor-bb58' ||
              watch.id === 'piaget-polo-79' ||
              watch.id === 'longines-zulu-time'
            ? mats.goldAccent
            : mats.handMetal;

  const pinionCap = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.082, 0.086, 0.09, 32)),
    activeHandMat
  );
  pinionCap.rotation.x = Math.PI / 2;
  mainHandsGroup.add(pinionCap);

  const hourHand = new THREE.Group();
  const hLen = dialR * (watch.id === 'doxa-sub300' ? 0.44 : 0.56) * handLenScale;
  const isSlimStem =
    watch.handStyle === 'breguet-pomme' ||
    watch.handStyle === 'syringe' ||
    watch.handStyle === 'octo-skeleton';
  const hStemMesh = new THREE.Mesh(
    trackGeo(
      createFacetedHandGeometry(
        hLen,
        isSlimStem
          ? 0.02
          : watch.handStyle === 'dauphine'
            ? 0.072
            : 0.056,
        isSlimStem ? 0.008 : watch.handStyle === 'dauphine' ? 0.006 : 0.016,
        0.018
      )
    ),
    activeHandMat
  );
  const hBoss = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.072, 0.072, 0.022, 24)),
    activeHandMat
  );
  hBoss.rotation.x = Math.PI / 2;
  hourHand.add(hStemMesh, hBoss);

  if (watch.handStyle === 'snowflake') {
    // Tudor Black Bay 58 iconic Snowflake diamond-square hour hand
    const snowShape = new THREE.Shape();
    snowShape.moveTo(0, hLen * 0.52);
    snowShape.lineTo(0.095, hLen * 0.72);
    snowShape.lineTo(0, hLen * 0.94);
    snowShape.lineTo(-0.095, hLen * 0.72);
    snowShape.closePath();
    const snowRim = new THREE.Mesh(
      trackGeo(new THREE.ExtrudeGeometry(snowShape, { depth: 0.016, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 })),
      activeHandMat
    );
    const snowLume = new THREE.Mesh(
      trackGeo(new THREE.ExtrudeGeometry(snowShape, { depth: 0.02, bevelEnabled: false })),
      mats.chromalightLume
    );
    snowLume.scale.set(0.68, 0.68, 1);
    snowLume.position.set(0, hLen * 0.23, -0.002);
    const hBaseLume = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.036, hLen * 0.44, 0.02, 0.006)),
      mats.chromalightLume
    );
    hBaseLume.position.set(0, hLen * 0.32, 0.008);
    hourHand.add(snowRim, snowLume, hBaseLume);
  } else if (watch.handStyle === 'skeleton-sword') {
    // Omega Seamaster 300M openworked skeleton broadsword hour hand + luminous arrow tip
    const skelL = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.018, hLen * 0.68, 0.018, 0.004)),
      activeHandMat
    );
    skelL.position.set(-0.036, hLen * 0.44, 0.006);
    const skelR = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.018, hLen * 0.68, 0.018, 0.004)),
      activeHandMat
    );
    skelR.position.set(0.036, hLen * 0.44, 0.006);
    const tipShape = new THREE.Shape();
    tipShape.moveTo(0, hLen * 0.98);
    tipShape.lineTo(0.056, hLen * 0.76);
    tipShape.lineTo(-0.056, hLen * 0.76);
    tipShape.closePath();
    const tipLume = new THREE.Mesh(
      trackGeo(new THREE.ExtrudeGeometry(tipShape, { depth: 0.02, bevelEnabled: false })),
      mats.chromalightLume
    );
    hourHand.add(skelL, skelR, tipLume);
  } else if (watch.handStyle === 'octo-skeleton') {
    // Bulgari Octo Finissimo architectural matte-black openworked skeletonized baton hour hand (zero lume)
    hStemMesh.visible = false;
    const oLeft = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.016, hLen * 0.86, 0.014, 0.003)),
      activeHandMat
    );
    oLeft.position.set(-0.032, hLen * 0.48, 0.006);
    oLeft.rotation.z = -0.028;
    const oRight = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.016, hLen * 0.86, 0.014, 0.003)),
      activeHandMat
    );
    oRight.position.set(0.032, hLen * 0.48, 0.006);
    oRight.rotation.z = 0.028;
    const oTip = new THREE.Mesh(
      trackGeo(createFacetedHandGeometry(hLen * 0.18, 0.032, 0.005, 0.014)),
      activeHandMat
    );
    oTip.position.set(0, hLen * 0.86, 0.005);
    hourHand.add(oLeft, oRight, oTip);
  } else if (watch.handStyle === 'worldtime-ring') {
    // Patek Philippe Ref. 5230 iconic pierced ring-tip World Time hour hand (zero lume)
    const wtRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.088, 0.018, 12, 32)),
      activeHandMat
    );
    wtRing.position.set(0, hLen * 0.74, 0.008);
    const wtPoint = new THREE.Mesh(
      trackGeo(createFacetedHandGeometry(hLen * 0.22, 0.028, 0.006, 0.014)),
      activeHandMat
    );
    wtPoint.position.set(0, hLen * 0.86, 0.006);
    hourHand.add(wtRing, wtPoint);
  } else if (watch.handStyle === 'dauphine') {
    // Grand Seiko Evolution 9 diamond-cut Zaratsu faceted dauphine hour hand (zero lume)
    const dRidge = new THREE.Mesh(
      trackGeo(createFacetedHandGeometry(hLen * 0.98, 0.068, 0.005, 0.024)),
      activeHandMat
    );
    hourHand.add(dRidge);
  } else if (watch.handStyle === 'leaf') {
    // H. Moser Streamliner sculpted curved leaf hour hand with subtle Globolight tip
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.quadraticCurveTo(0.072, hLen * 0.42, 0, hLen * 0.98);
    leafShape.quadraticCurveTo(-0.072, hLen * 0.42, 0, 0);
    const leafMesh = new THREE.Mesh(
      trackGeo(
        new THREE.ExtrudeGeometry(leafShape, {
          depth: 0.015,
          bevelEnabled: true,
          bevelThickness: 0.004,
          bevelSize: 0.004,
          bevelSegments: 2,
        })
      ),
      activeHandMat
    );
    const globTip = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.026, hLen * 0.24, 0.018, 0.005)),
      mats.chromalightLume
    );
    globTip.position.set(0, hLen * 0.72, 0.008);
    hourHand.add(leafMesh, globTip);
  } else if (watch.handStyle === 'breguet-pomme') {
    // Classic heat-blued Breguet open moon-tip (pomme evidee)
    const moonRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.068, 0.016, 12, 28)),
      activeHandMat
    );
    moonRing.position.set(0, hLen * 0.76, 0.008);
    hourHand.add(moonRing);
  } else if (watch.handStyle === 'cathedral') {
    // Hamilton Khaki Murph cathedral-arched luminous hour hand
    const cathOuter = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.078, 0.016, 12, 24)),
      activeHandMat
    );
    cathOuter.scale.set(1, 1.35, 1);
    cathOuter.position.set(0, hLen * 0.62, 0.008);
    const cathLume = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.064, 16, 12)),
      mats.chromalightLume
    );
    cathLume.scale.set(0.95, 1.28, 0.22);
    cathLume.position.set(0, hLen * 0.62, 0.008);
    hourHand.add(cathOuter, cathLume);
  } else if (watch.handStyle === 'syringe') {
    // Slender syringe / teardrop needle tip (F.P. Journe / Nomos Bauhaus)
    if (watch.id === 'fpj-chronometre-bleu') {
      const tear = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.048, 16, 12)),
        activeHandMat
      );
      tear.scale.set(0.85, 1.8, 0.35);
      tear.position.set(0, hLen * 0.56, 0.006);
      hourHand.add(tear);
    }
    const syrTip = new THREE.Mesh(
      trackGeo(createFacetedHandGeometry(hLen * 0.3, 0.012, 0.004, 0.01)),
      activeHandMat
    );
    syrTip.position.set(0, hLen * 0.72, 0.005);
    hourHand.add(syrTip);
  } else if (
    watch.id === 'avi8-spitfire' ||
    watch.brand === 'CARTIER' ||
    watch.handStyle === 'pilot-sword'
  ) {
    const swordShape = new THREE.Shape();
    swordShape.moveTo(0, hLen * 0.18);
    swordShape.lineTo(0.076, hLen * 0.28);
    swordShape.lineTo(0.072, hLen * 0.72);
    swordShape.lineTo(0, hLen * 0.96);
    swordShape.lineTo(-0.072, hLen * 0.72);
    swordShape.lineTo(-0.076, hLen * 0.28);
    swordShape.closePath();
    const hSwordFrame = new THREE.Mesh(
      trackGeo(
        new THREE.ExtrudeGeometry(swordShape, {
          depth: 0.016,
          bevelEnabled: true,
          bevelThickness: 0.004,
          bevelSize: 0.004,
          bevelSegments: 2,
        })
      ),
      activeHandMat
    );
    hourHand.add(hSwordFrame);
    if (watch.id === 'avi8-spitfire' || watch.handStyle === 'pilot-sword') {
      const hSwordLume = new THREE.Mesh(
        trackGeo(
          new THREE.ExtrudeGeometry(swordShape, {
            depth: 0.02,
            bevelEnabled: false,
          })
        ),
        mats.chromalightLume
      );
      hSwordLume.scale.set(0.66, 0.88, 1);
      hSwordLume.position.set(0, hLen * 0.05, -0.002);
      hourHand.add(hSwordLume);
    }
  } else if (
    watch.id === 'submariner' ||
    watch.id === 'yachtmaster' ||
    watch.id === 'gmt' ||
    watch.id === 'explorer2'
  ) {
    const mercRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.11, 0.022, 12, 32)),
      activeHandMat
    );
    mercRing.position.set(0, hLen * 0.64, 0.006);
    const mercLume = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.095, 24, 14)),
      mats.chromalightLume
    );
    mercLume.scale.set(1, 1, 0.22);
    mercLume.position.set(0, hLen * 0.64, 0.004);
    [Math.PI / 2, Math.PI / 2 + (Math.PI * 2) / 3, Math.PI / 2 + (Math.PI * 4) / 3].forEach(
      (ang) => {
        const spoke = new THREE.Mesh(
          trackGeo(new THREE.CapsuleGeometry(0.009, 0.09, 4, 8)),
          activeHandMat
        );
        spoke.position.set(
          Math.cos(ang) * 0.048,
          hLen * 0.64 + Math.sin(ang) * 0.048,
          0.012
        );
        spoke.rotation.z = ang - Math.PI / 2;
        hourHand.add(spoke);
      }
    );
    hourHand.add(mercRing, mercLume);
  } else if (watch.id !== 'piaget-polo-79') {
    const hLume = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.036, hLen * 0.56, 0.02, 0.006)),
      mats.chromalightLume
    );
    hLume.position.set(0, hLen * 0.54, 0.008);
    hourHand.add(hLume);
  }
  mainHandsGroup.add(hourHand);

  const minuteHand = new THREE.Group();
  minuteHand.position.z = 0.026;
  const mLen = dialR * (watch.id === 'doxa-sub300' ? 0.88 : 0.85) * handLenScale;
  const minuteHandMat = watch.id === 'doxa-sub300' ? mats.orangeAccent : activeHandMat;
  const mStemMesh = new THREE.Mesh(
    trackGeo(
      createFacetedHandGeometry(
        mLen,
        watch.id === 'doxa-sub300'
          ? 0.082
          : isSlimStem
            ? 0.017
            : watch.handStyle === 'dauphine' || watch.handStyle === 'worldtime-ring'
              ? 0.052
              : 0.044,
        watch.id === 'doxa-sub300'
          ? 0.032
          : isSlimStem
            ? 0.006
            : watch.handStyle === 'dauphine' || watch.handStyle === 'worldtime-ring'
              ? 0.005
              : 0.012,
        0.016
      )
    ),
    minuteHandMat
  );
  const mBoss = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24)),
    minuteHandMat
  );
  mBoss.rotation.x = Math.PI / 2;
  if (watch.handStyle === 'skeleton-sword') {
    const mSkelL = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.016, mLen * 0.72, 0.016, 0.004)),
      activeHandMat
    );
    mSkelL.position.set(-0.028, mLen * 0.44, 0.006);
    const mSkelR = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.016, mLen * 0.72, 0.016, 0.004)),
      activeHandMat
    );
    mSkelR.position.set(0.028, mLen * 0.44, 0.006);
    const mTipShape = new THREE.Shape();
    mTipShape.moveTo(0, mLen * 0.99);
    mTipShape.lineTo(0.044, mLen * 0.8);
    mTipShape.lineTo(-0.044, mLen * 0.8);
    mTipShape.closePath();
    const mTipLume = new THREE.Mesh(
      trackGeo(new THREE.ExtrudeGeometry(mTipShape, { depth: 0.018, bevelEnabled: false })),
      watch.id === 'omega-seamaster' ? mats.secondaryLume : mats.chromalightLume
    );
    minuteHand.add(mStemMesh, mBoss, mSkelL, mSkelR, mTipLume);
  } else if (watch.handStyle === 'octo-skeleton') {
    const moL = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.014, mLen * 0.86, 0.013, 0.003)),
      activeHandMat
    );
    moL.position.set(-0.024, mLen * 0.48, 0.006);
    moL.rotation.z = -0.02;
    const moR = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.014, mLen * 0.86, 0.013, 0.003)),
      activeHandMat
    );
    moR.position.set(0.024, mLen * 0.48, 0.006);
    moR.rotation.z = 0.02;
    const moTip = new THREE.Mesh(
      trackGeo(createFacetedHandGeometry(mLen * 0.16, 0.026, 0.004, 0.012)),
      activeHandMat
    );
    moTip.position.set(0, mLen * 0.86, 0.005);
    minuteHand.add(mBoss, moL, moR, moTip);
  } else if (
    watch.handStyle === 'dauphine' ||
    watch.handStyle === 'worldtime-ring' ||
    watch.handStyle === 'syringe' ||
    watch.id === 'piaget-polo-79'
  ) {
    // Pure diamond-cut dauphine, World Time, syringe, or gold dress minute hand (zero lume)
    minuteHand.add(mStemMesh, mBoss);
  } else if (watch.handStyle === 'leaf') {
    const mLeafShape = new THREE.Shape();
    mLeafShape.moveTo(0, 0);
    mLeafShape.quadraticCurveTo(0.052, mLen * 0.45, 0, mLen * 0.99);
    mLeafShape.quadraticCurveTo(-0.052, mLen * 0.45, 0, 0);
    const mLeafMesh = new THREE.Mesh(
      trackGeo(
        new THREE.ExtrudeGeometry(mLeafShape, {
          depth: 0.013,
          bevelEnabled: true,
          bevelThickness: 0.003,
          bevelSize: 0.003,
          bevelSegments: 2,
        })
      ),
      activeHandMat
    );
    const mGlob = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.022, mLen * 0.24, 0.016, 0.004)),
      mats.chromalightLume
    );
    mGlob.position.set(0, mLen * 0.74, 0.007);
    minuteHand.add(mBoss, mLeafMesh, mGlob);
  } else if (watch.handStyle === 'breguet-pomme') {
    const mMoon = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.052, 0.013, 12, 24)),
      activeHandMat
    );
    mMoon.position.set(0, mLen * 0.82, 0.007);
    minuteHand.add(mStemMesh, mBoss, mMoon);
  } else if (
    watch.id === 'avi8-spitfire' ||
    watch.brand === 'CARTIER' ||
    watch.handStyle === 'pilot-sword'
  ) {
    const mSwordShape = new THREE.Shape();
    mSwordShape.moveTo(0, mLen * 0.14);
    mSwordShape.lineTo(0.056, mLen * 0.24);
    mSwordShape.lineTo(0.05, mLen * 0.78);
    mSwordShape.lineTo(0, mLen * 0.96);
    mSwordShape.lineTo(-0.05, mLen * 0.78);
    mSwordShape.lineTo(-0.056, mLen * 0.24);
    mSwordShape.closePath();
    const mFrame = new THREE.Mesh(
      trackGeo(
        new THREE.ExtrudeGeometry(mSwordShape, {
          depth: 0.014,
          bevelEnabled: true,
          bevelThickness: 0.003,
          bevelSize: 0.003,
          bevelSegments: 2,
        })
      ),
      activeHandMat
    );
    minuteHand.add(mStemMesh, mBoss, mFrame);
    if (watch.id === 'avi8-spitfire' || watch.handStyle === 'pilot-sword') {
      const mSwordLume = new THREE.Mesh(
        trackGeo(
          new THREE.ExtrudeGeometry(mSwordShape, {
            depth: 0.018,
            bevelEnabled: false,
          })
        ),
        mats.chromalightLume
      );
      mSwordLume.scale.set(0.62, 0.9, 1);
      mSwordLume.position.set(0, mLen * 0.04, -0.002);
      minuteHand.add(mSwordLume);
    }
  } else {
    const mLume = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.028, mLen * 0.62, 0.018, 0.005)),
      mats.chromalightLume
    );
    mLume.position.set(0, mLen * 0.56, 0.007);
    minuteHand.add(mStemMesh, mBoss, mLume);
  }
  mainHandsGroup.add(minuteHand);

  let gmtHand: THREE.Group | null = null;
  if (watch.hasGmtHand) {
    const gmtMat = watch.gmtHandColorHex
      ? trackMat(
          new THREE.MeshPhysicalMaterial({
            color: watch.gmtHandColorHex,
            metalness: 0.85,
            roughness: 0.14,
            clearcoat: 0.45,
            envMapIntensity: 1.5,
          })
        )
      : watch.id === 'explorer2'
        ? mats.orangeAccent
        : mats.crimsonAccent;
    gmtHand = new THREE.Group();
    gmtHand.position.z = 0.012;
    const gLen = dialR * 0.86;
    const gStem = new THREE.Mesh(
      trackGeo(createFacetedHandGeometry(gLen * 0.78, 0.018, 0.011, 0.012)),
      gmtMat
    );
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 0.17);
    arrowShape.lineTo(0.088, 0);
    arrowShape.lineTo(-0.088, 0);
    arrowShape.closePath();
    const gTip = new THREE.Mesh(
      trackGeo(
        new THREE.ExtrudeGeometry(arrowShape, {
          depth: 0.016,
          bevelEnabled: true,
          bevelThickness: 0.005,
          bevelSize: 0.005,
          bevelSegments: 3,
        })
      ),
      gmtMat
    );
    gTip.position.set(0, gLen * 0.78, -0.006);
    const gLume = new THREE.Mesh(
      trackGeo(new THREE.ExtrudeGeometry(arrowShape, { depth: 0.02, bevelEnabled: false })),
      mats.chromalightLume
    );
    gLume.scale.set(0.62, 0.62, 1);
    gLume.position.set(0, gLen * 0.805, -0.006);
    gmtHand.add(gStem, gTip, gLume);
    handsGroup.add(gmtHand);
  }

  const secondHand = new THREE.Group();
  secondHand.position.z = 0.052;
  const sLen = dialR * 0.91;
  if (watch.hasLightningSecond) {
    const bolt = new THREE.Shape();
    bolt.moveTo(-0.014, -sLen * 0.22);
    bolt.lineTo(0.014, -sLen * 0.22);
    bolt.lineTo(0.016, sLen * 0.14);
    bolt.lineTo(0.075, sLen * 0.28);
    bolt.lineTo(-0.045, sLen * 0.48);
    bolt.lineTo(0.068, sLen * 0.66);
    bolt.lineTo(-0.032, sLen * 0.82);
    bolt.lineTo(0.0, sLen * 0.96);
    bolt.lineTo(-0.058, sLen * 0.78);
    bolt.lineTo(0.028, sLen * 0.63);
    bolt.lineTo(-0.08, sLen * 0.46);
    bolt.lineTo(0.032, sLen * 0.28);
    bolt.lineTo(-0.016, sLen * 0.16);
    bolt.closePath();

    const boltGeo = trackGeo(
      new THREE.ExtrudeGeometry(bolt, {
        depth: 0.012,
        bevelEnabled: true,
        bevelThickness: 0.004,
        bevelSize: 0.003,
        bevelSegments: 2,
      })
    );
    const boltMesh = new THREE.Mesh(boltGeo, mats.orangeAccent);
    secondHand.add(boltMesh);
  } else {
    const sMat =
      watch.id === 'daytona' ||
      watch.id === 'avi8-spitfire' ||
      watch.id === 'rm-tonneau' ||
      watch.id === 'tag-monaco' ||
      watch.id === 'zenith-el-primero' ||
      watch.id === 'breitling-navitimer'
        ? mats.crimsonAccent
        : watch.id === 'gs-snowflake' || watch.id === 'gs-white-birch'
          ? mats.bluedHands
          : watch.id === 'doxa-sub300'
            ? mats.matteBlackHands
            : activeHandMat;
    const sNeedle = new THREE.Mesh(
      trackGeo(createFacetedHandGeometry(sLen, 0.015, 0.004, 0.01)),
      sMat
    );
    const sTailCounter = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.026, 0.018, sLen * 0.24, 16)),
      sMat
    );
    sTailCounter.position.y = -sLen * 0.12;
    const sBoss = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.042, 0.042, 0.02, 20)),
      sMat
    );
    sBoss.rotation.x = Math.PI / 2;
    secondHand.add(sNeedle, sTailCounter, sBoss);
    if (watch.handStyle === 'snowflake') {
      const sSnow = new THREE.Mesh(
        trackGeo(createRoundedLinkGeometry(0.075, 0.075, 0.016, 0.004)),
        mats.chromalightLume
      );
      sSnow.position.y = sLen * 0.72;
      sSnow.rotation.z = Math.PI / 4;
      secondHand.add(sSnow);
    } else if (watch.id === 'doxa-sub300') {
      // Iconic DOXA SUB 300 square luminous paddle seconds marker
      const doxaPad = new THREE.Mesh(
        trackGeo(createRoundedLinkGeometry(0.072, 0.072, 0.016, 0.004)),
        mats.chromalightLume
      );
      doxaPad.position.y = sLen * 0.68;
      secondHand.add(doxaPad);
    } else if (watch.id === 'blancpain-fifty-fathoms') {
      // Iconic Blancpain red-tipped lance seconds hand
      const bpRedTip = new THREE.Mesh(
        trackGeo(createFacetedHandGeometry(sLen * 0.18, 0.018, 0.005, 0.012)),
        mats.crimsonAccent
      );
      bpRedTip.position.y = sLen * 0.82;
      secondHand.add(bpRedTip);
    } else if (watch.id === 'zenith-el-primero') {
      // Iconic Zenith El Primero crimson sweep hand with luminous rectangular paddle tip
      const zPad = new THREE.Mesh(
        trackGeo(createRoundedLinkGeometry(0.058, 0.088, 0.016, 0.004)),
        mats.chromalightLume
      );
      zPad.position.y = sLen * 0.72;
      secondHand.add(zPad);
    } else if (watch.id === 'hamilton-murph') {
      // Iconic Interstellar "EUREKA" Morse-code gold-lacquer dots along the Murph seconds hand
      const morseDotGeo = trackGeo(new THREE.SphereGeometry(0.011, 8, 8));
      const morseDashGeo = trackGeo(new THREE.CapsuleGeometry(0.008, 0.028, 4, 6));
      [0.24, 0.31, 0.36, 0.41, 0.48, 0.54, 0.61, 0.68, 0.75, 0.81].forEach((frac, idx) => {
        const isDash = idx === 2 || idx === 4 || idx === 7 || idx === 9;
        const m = new THREE.Mesh(isDash ? morseDashGeo : morseDotGeo, mats.goldAccent);
        m.position.set(0, sLen * frac, 0.008);
        secondHand.add(m);
      });
    } else if (
      watch.id === 'submariner' ||
      watch.id === 'gmt' ||
      watch.id === 'explorer2' ||
      watch.id === 'yachtmaster' ||
      watch.id === 'omega-seamaster' ||
      watch.id === 'avi8-spitfire'
    ) {
      // Authentic diver / GMT / Spitfire lollipop seconds hand
      const sLollipopRim = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.05, 0.011, 10, 24)),
        sMat
      );
      sLollipopRim.position.y =
        watch.id === 'avi8-spitfire' ? -sLen * 0.22 : sLen * 0.7;
      const sLollipop = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.045, 18, 12)),
        mats.chromalightLume
      );
      sLollipop.scale.set(1, 1, 0.25);
      sLollipop.position.y =
        watch.id === 'avi8-spitfire' ? -sLen * 0.22 : sLen * 0.7;
      secondHand.add(sLollipopRim, sLollipop);
      if (watch.id === 'omega-seamaster') {
        const smRedTip = new THREE.Mesh(
          trackGeo(createFacetedHandGeometry(sLen * 0.16, 0.014, 0.004, 0.011)),
          mats.crimsonAccent
        );
        smRedTip.position.y = sLen * 0.84;
        secondHand.add(smRedTip);
      }
    }
  }
  if (watch.id === 'lange-1') {
    // Small-seconds subdial at 4:30 moonphase center
    secondHand.position.set(dialR * 0.31, -dialR * 0.38, 0.032);
    secondHand.scale.setScalar(0.24);
  } else if (watch.id === 'jlc-reverso') {
    secondHand.position.set(0, -dialR * 0.62, 0.032);
    secondHand.scale.setScalar(0.24);
  } else if (watch.hasSmallSeconds === 6) {
    secondHand.position.set(0, -dialR * 0.46, 0.032);
    secondHand.scale.setScalar(0.22);
  } else if (watch.hasSmallSeconds === 7.5) {
    secondHand.position.set(
      watch.id === 'fpj-chronometre-bleu' ? -dialR * 0.36 : -dialR * 0.34,
      watch.id === 'fpj-chronometre-bleu' ? -dialR * 0.28 : -dialR * 0.25,
      0.032
    );
    secondHand.scale.setScalar(0.21);
  } else if (watch.hasSmallSeconds === 9) {
    secondHand.position.set(-dialR * 0.44, 0, 0.032);
    secondHand.scale.setScalar(0.24);
  }
  if (
    watch.isDigitalDisplay ||
    watch.id === 'ap-royal-oak' ||
    watch.id === 'mbf-lm101' ||
    watch.id === 'pp-worldtime' ||
    watch.id === 'cartier-tank-louis' ||
    watch.id === 'cartier-crash' ||
    watch.id === 'piaget-polo-79' ||
    watch.id === 'casio-casioak-ga2100'
  ) {
    secondHand.visible = false;
  }
  handsGroup.add(secondHand);

  // Rattrapante Split-Seconds Hand mounted coaxially under chrono seconds on chronographs
  let chronoSplitHand: THREE.Group | null = null;
  if (watch.hasChronoPushers) {
    chronoSplitHand = new THREE.Group();
    chronoSplitHand.position.z = 0.044;
    const splitNeedle = new THREE.Mesh(
      trackGeo(createFacetedHandGeometry(sLen * 0.96, 0.013, 0.004, 0.009)),
      mats.goldAccent
    );
    chronoSplitHand.add(splitNeedle);
    handsGroup.add(chronoSplitHand);
  }

  // Working Power-Reserve Indicator Hand (Grand Seiko Snowflake, Lange 1, IWC Big Pilot, MB&F LM101, Zeitwerk)
  let powerReserveHand: THREE.Group | null = null;
  if (watch.hasPowerReserveHand) {
    powerReserveHand = new THREE.Group();
    if (watch.id === 'gs-snowflake') {
      powerReserveHand.position.set(-dialR * 0.3, -dialR * 0.25, 0.012);
    } else if (watch.id === 'iwc-big-pilot') {
      powerReserveHand.position.set(dialR * 0.54, 0, 0.012);
    } else if (watch.id === 'mbf-lm101') {
      powerReserveHand.position.set(0, -dialR * 0.44, 0.012);
    } else if (watch.id === 'lange-zeitwerk') {
      powerReserveHand.position.set(0, dialR * 0.42, 0.012);
    } else {
      // Lange 1 3 o'clock AUF / AB gauge
      powerReserveHand.position.set(dialR * 0.51, -dialR * 0.025, 0.012);
    }
    const prNeedle = new THREE.Mesh(
      trackGeo(createFacetedHandGeometry(dialR * 0.16, 0.016, 0.005, 0.008)),
      watch.id === 'gs-snowflake' || watch.id === 'mbf-lm101'
        ? mats.bluedHands
        : watch.id === 'iwc-big-pilot'
          ? mats.crimsonAccent
          : mats.goldAccent
    );
    const prCap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.028, 0.028, 0.018, 16)),
      mats.polishedMetal
    );
    prCap.rotation.x = Math.PI / 2;
    powerReserveHand.add(prNeedle, prCap);
    handsGroup.add(powerReserveHand);
  }

  const chronoSubHands: THREE.Group[] = [];
  if (watch.hasChronoSubdials === 3) {
    const isLightSubHand =
      watch.id === 'omega-speedmaster' || watch.id === 'zenith-el-primero';
    const isDarkSubHand = watch.id === 'breitling-navitimer';
    const subNeedleGeo = trackGeo(createFacetedHandGeometry(0.175, 0.016, 0.004, 0.008));
    const subCoords = [
      { x: dialR * 0.34, y: -dialR * 0.02 },
      { x: -dialR * 0.34, y: -dialR * 0.02 },
      { x: 0, y: -dialR * 0.36 },
    ];
    subCoords.forEach((coord) => {
      const sh = new THREE.Group();
      sh.position.set(coord.x, coord.y, -0.02);
      const subMat = isLightSubHand
        ? mats.handMetal
        : isDarkSubHand
          ? mats.movementPlate
          : mats.goldAccent;
      const needle = new THREE.Mesh(subNeedleGeo, subMat);
      const cap = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.028, 0.028, 0.018, 16)),
        subMat
      );
      cap.rotation.x = Math.PI / 2;
      sh.add(needle, cap);
      handsGroup.add(sh);
      chronoSubHands.push(sh);
    });
  } else if (watch.hasChronoSubdials === 2) {
    // Bi-Compax Chrono Sub-Dial Hands: 9 o'clock & 3 o'clock
    const lockSubNeedleGeo = trackGeo(createFacetedHandGeometry(0.215, 0.018, 0.005, 0.008));
    const lockSubCoords = [
      { x: -dialR * 0.35, y: 0 },
      { x: dialR * 0.35, y: 0 },
    ];
    lockSubCoords.forEach((coord) => {
      const sh = new THREE.Group();
      sh.position.set(coord.x, coord.y, -0.02);
      const needle = new THREE.Mesh(lockSubNeedleGeo, mats.crimsonAccent);
      const cap = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 16)),
        mats.goldAccent
      );
      cap.rotation.x = Math.PI / 2;
      sh.add(needle, cap);
      handsGroup.add(sh);
      chronoSubHands.push(sh);
    });
  }

  // --- 5. CONTOURED SLOPED BEZEL, NON-ROUND ARCHITECTURAL BEZELS & FLUTED RING ---
  bezelGroup.position.z = baseLayerZ.bezel;
  bezelGroup.scale.z = zStackScale;

  let activeBezelTex: THREE.CanvasTexture | null = null;
  let activeInsertMat: THREE.MeshPhysicalMaterial | null = null;

  if (caseShape !== 'round' && !hasRoundBezelOnShapedCase) {
    if (watch.id === 'gp-laureato') {
      // Girard-Perregaux Laureato 1975 signature: circular mirror-polished plinth beneath a brushed octagonal bezel
      const plinthProfile = new THREE.SplineCurve([
        new THREE.Vector2(bezelInnerR, -0.05),
        new THREE.Vector2(bezelOuterR * 0.99, -0.05),
        new THREE.Vector2(bezelOuterR * 0.985, 0.042),
        new THREE.Vector2(bezelOuterR * 0.95, 0.072),
        new THREE.Vector2(bezelInnerR, 0.072),
      ]);
      const plinthGeo = trackGeo(new THREE.LatheGeometry(plinthProfile.getPoints(16), 96));
      plinthGeo.rotateX(Math.PI / 2);
      const plinthMesh = new THREE.Mesh(plinthGeo, mats.polishedMetal);
      plinthMesh.castShadow = true;
      bezelGroup.add(plinthMesh);

      const laureatoOctGeo = trackGeo(
        createShapedBezelRingGeometry(bezelInnerR, bezelOuterR * 0.92, 'octagonal')
      );
      const laureatoOctMesh = new THREE.Mesh(laureatoOctGeo, mats.brushedMetal);
      laureatoOctMesh.position.z = 0.032;
      laureatoOctMesh.castShadow = true;
      bezelGroup.add(laureatoOctMesh);
    } else {
      const shapedBezelOuterR =
        watch.id === 'cartier-tank-louis' ? bezelOuterR * 0.94 : bezelOuterR;
      const shapedBezelGeo = trackGeo(
        createShapedBezelRingGeometry(bezelInnerR, shapedBezelOuterR, caseShape)
      );
      const shapedBezelMesh = new THREE.Mesh(
        shapedBezelGeo,
        watch.id === 'cartier-tank-louis' || watch.id === 'cartier-crash'
          ? mats.polishedMetal
          : mats.brushedMetal
      );
      shapedBezelMesh.castShadow = true;
      bezelGroup.add(shapedBezelMesh);

      if (watch.id === 'ap-royal-oak') {
        // 8 Iconic Hexagonal White-Gold Bezel Screws at octagon corners
        const hexScrewGeo = trackGeo(new THREE.CylinderGeometry(0.068, 0.068, 0.035, 6));
        hexScrewGeo.rotateX(Math.PI / 2);
        const slotGeo = trackGeo(new THREE.BoxGeometry(0.092, 0.016, 0.042));
        const screwR = (bezelInnerR + bezelOuterR) * 0.52;
        for (let i = 0; i < 8; i++) {
          const a = (i + 0.5) * (Math.PI / 4);
          const rHere = getCaseShapeRadius(a, screwR, 'octagonal');
          const screwGrp = new THREE.Group();
          screwGrp.position.set(Math.cos(a) * rHere, Math.sin(a) * rHere, 0.126);
          screwGrp.rotation.z = a;
          const head = new THREE.Mesh(hexScrewGeo, mats.polishedMetal);
          const slot = new THREE.Mesh(slotGeo, mats.movementPlate);
          screwGrp.add(head, slot);
          bezelGroup.add(screwGrp);
        }
      } else if (watch.id === 'cartier-santos') {
        // 8 Santos Polished Bezel Screws symmetrically framed around the square bezel
        const sScrewGeo = trackGeo(new THREE.CylinderGeometry(0.056, 0.056, 0.03, 18));
        sScrewGeo.rotateX(Math.PI / 2);
        const slotGeo = trackGeo(new THREE.BoxGeometry(0.078, 0.014, 0.036));
        const rEdge = (bezelInnerR + bezelOuterR) * 0.49;
        const rSide = dialR * 0.56;
        const coords = [
          [-rSide, rEdge],
          [rSide, rEdge],
          [-rSide, -rEdge],
          [rSide, -rEdge],
          [-rEdge, -rSide],
          [-rEdge, rSide],
          [rEdge, -rSide],
          [rEdge, rSide],
        ];
        coords.forEach(([sx, sy], idx) => {
          const sGrp = new THREE.Group();
          sGrp.position.set(sx, sy, 0.122);
          sGrp.rotation.z = idx * 0.65;
          sGrp.add(
            new THREE.Mesh(sScrewGeo, mats.polishedMetal),
            new THREE.Mesh(slotGeo, mats.movementPlate)
          );
          bezelGroup.add(sGrp);
        });
      } else if (watch.id === 'rm-tonneau') {
        // 12 Richard Mille Spline Titanium Screws around curved tonneau bezel
        const rmScrewGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.032, 14));
        rmScrewGeo.rotateX(Math.PI / 2);
        const splineSlotGeo = trackGeo(new THREE.BoxGeometry(0.075, 0.014, 0.038));
        const screwR = (bezelInnerR + bezelOuterR) * 0.5;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
          const rHere = getCaseShapeRadius(a, screwR, 'tonneau');
          const sg = new THREE.Group();
          sg.position.set(Math.cos(a) * rHere, Math.sin(a) * rHere, 0.124);
          sg.rotation.z = a;
          const slot2 = new THREE.Mesh(splineSlotGeo, mats.movementPlate);
          slot2.rotation.z = Math.PI / 2.5;
          sg.add(
            new THREE.Mesh(rmScrewGeo, mats.goldAccent),
            new THREE.Mesh(splineSlotGeo, mats.movementPlate),
            slot2
          );
          bezelGroup.add(sg);
        }
      } else if (watch.id === 'jlc-reverso') {
        // Top & bottom triple Art Deco Reverso gadroon grooves
        const gadroonGeo = trackGeo(new THREE.CapsuleGeometry(0.022, dialR * 1.48, 4, 8));
        gadroonGeo.rotateZ(Math.PI / 2);
        [-1, 1].forEach((side) => {
          [0, 1, 2].forEach((g) => {
            const gad = new THREE.Mesh(gadroonGeo, mats.polishedMetal);
            gad.position.set(0, side * (bezelOuterR * 1.32 + g * 0.065), 0.125);
            bezelGroup.add(gad);
          });
        });
        shapedBezelMesh.userData.interactive = 'reverso';
        interactiveMeshes.push(shapedBezelMesh);
      } else if (
        watch.id === 'casio-gshock-dw5600' ||
        watch.id === 'casio-casioak-ga2100'
      ) {
        // Iconic raised 3D G-Shock shock-absorbing bumper shroud ridges at 12, 6, 9, 3
        const isSquareShock = watch.id === 'casio-gshock-dw5600';
        const topBotBump = trackGeo(
          createRoundedLinkGeometry(
            isSquareShock ? caseR * 1.18 : caseR * 0.86,
            0.26,
            0.14,
            0.045
          )
        );
        const sideBump = trackGeo(
          createRoundedLinkGeometry(0.22, isSquareShock ? caseR * 0.88 : caseR * 0.68, 0.12, 0.04)
        );
        const rBumpY = getCaseShapeRadius(Math.PI / 2, bezelOuterR * 0.9, caseShape);
        const rBumpX = getCaseShapeRadius(0, bezelOuterR * 0.91, caseShape);
        [-rBumpY, rBumpY].forEach((by) => {
          const bump = new THREE.Mesh(topBotBump, mats.bezelMetal);
          bump.position.set(0, by, 0.14);
          bump.castShadow = true;
          bezelGroup.add(bump);
        });
        [-rBumpX, rBumpX].forEach((bx) => {
          const bump = new THREE.Mesh(sideBump, mats.bezelMetal);
          bump.position.set(bx, 0, 0.13);
          bump.castShadow = true;
          bezelGroup.add(bump);
        });
      }
    }
  } else {
    const carrierSpline = new THREE.SplineCurve([
      new THREE.Vector2(bezelInnerR, -0.06),
      new THREE.Vector2(bezelOuterR, -0.06),
      new THREE.Vector2(bezelOuterR * 1.002, 0.02),
      new THREE.Vector2(bezelOuterR * 0.985, 0.088),
      new THREE.Vector2(bezelOuterR * 0.96, 0.114),
      new THREE.Vector2(bezelInnerR, 0.105),
      new THREE.Vector2(bezelInnerR, -0.06),
    ]);
    const carrierGeo = trackGeo(new THREE.LatheGeometry(carrierSpline.getPoints(18), 96));
    carrierGeo.rotateX(Math.PI / 2);
    const carrierMesh = new THREE.Mesh(carrierGeo, mats.bezelMetal);
    carrierMesh.castShadow = true;
    bezelGroup.add(carrierMesh);

    if (watch.bezelType === 'fluted') {
      const flutedGeo = trackGeo(createFlutedBezelRingGeometry(bezelInnerR, bezelOuterR, 72));
      const flutedMesh = new THREE.Mesh(flutedGeo, mats.bezelMetal);
      flutedMesh.castShadow = true;
      bezelGroup.add(flutedMesh);
    } else if (watch.bezelType === 'overseas') {
      // Vacheron Constantin Overseas 4520V: stepped circular satin-brushed under-bezel
      // crowned by a continuous mirror-polished 6-notched Maltese Cross bezel ring
      const underProfile = new THREE.SplineCurve([
        new THREE.Vector2(bezelInnerR, -0.02),
        new THREE.Vector2(bezelInnerR + 0.02, 0.088),
        new THREE.Vector2(bezelOuterR * 0.94, 0.086),
        new THREE.Vector2(bezelOuterR * 0.985, 0.052),
        new THREE.Vector2(bezelOuterR, -0.04),
      ]);
      const underGeo = trackGeo(new THREE.LatheGeometry(underProfile.getPoints(18), 96));
      underGeo.rotateX(Math.PI / 2);
      const underBezel = new THREE.Mesh(underGeo, mats.brushedMetal);
      underBezel.castShadow = true;
      underBezel.receiveShadow = true;
      bezelGroup.add(underBezel);

      const malteseRingGeo = trackGeo(
        createOverseasBezelRingGeometry(bezelInnerR, bezelOuterR, 0.064)
      );
      const malteseRing = new THREE.Mesh(malteseRingGeo, mats.polishedMetal);
      malteseRing.position.z = 0.068;
      malteseRing.castShadow = true;
      malteseRing.receiveShadow = true;
      bezelGroup.add(malteseRing);
    } else if (watch.bezelType === 'smooth' || watch.id === 'bulgari-octo-finissimo') {
      const smoothProfile =
        watch.id === 'avi8-spitfire' || watch.id === 'bulgari-octo-finissimo'
          ? new THREE.SplineCurve([
              new THREE.Vector2(bezelInnerR, -0.02),
              new THREE.Vector2(bezelInnerR + 0.018, 0.132),
              new THREE.Vector2(bezelOuterR * 0.95, 0.125),
              new THREE.Vector2(bezelOuterR * 0.985, 0.085),
              new THREE.Vector2(bezelOuterR, -0.04),
            ])
          : new THREE.SplineCurve([
              new THREE.Vector2(bezelInnerR, -0.02),
              new THREE.Vector2(bezelInnerR + 0.015, 0.125),
              new THREE.Vector2((bezelInnerR + bezelOuterR) * 0.5, 0.148),
              new THREE.Vector2(bezelOuterR * 0.96, 0.095),
              new THREE.Vector2(bezelOuterR, -0.04),
            ]);
      const smoothGeo = trackGeo(new THREE.LatheGeometry(smoothProfile.getPoints(18), 96));
      smoothGeo.rotateX(Math.PI / 2);
      const smoothDome = new THREE.Mesh(
        smoothGeo,
        watch.id === 'avi8-spitfire' || watch.id === 'bulgari-octo-finissimo'
          ? mats.brushedMetal
          : mats.bezelMetal
      );
      smoothDome.castShadow = true;
      bezelGroup.add(smoothDome);

      // Piaget Polo 79 signature 3D horizontal mirror-polished gadroon ribs across the 18k gold bezel
      if (watch.id === 'piaget-polo-79') {
        const ribYCoords = [-1.62, -1.44, 1.44, 1.62];
        ribYCoords.forEach((ry) => {
          const halfChord = Math.sqrt(Math.max(0.04, bezelOuterR * bezelOuterR * 0.92 - ry * ry));
          const ribGeo = trackGeo(new THREE.CapsuleGeometry(0.028, halfChord * 1.72, 4, 10));
          ribGeo.rotateZ(Math.PI / 2);
          const rib = new THREE.Mesh(ribGeo, mats.polishedMetal);
          rib.position.set(0, ry, 0.128);
          bezelGroup.add(rib);
        });
      }
    } else {
      const isRotBezel =
        watch.bezelType === 'dive-cerachrom' ||
        watch.bezelType === 'yacht-cerachrom' ||
        watch.bezelType === 'gmt-cerachrom' ||
        watch.bezelType === 'seamaster' ||
        watch.bezelType === 'navitimer';
      if (watch.bezelType === 'seamaster') {
        // 12-lobe scalloped Seamaster diver grip bezel
        const lobeCount = 12;
        const lobeGeo = trackGeo(new THREE.CapsuleGeometry(0.055, 0.11, 6, 12));
        lobeGeo.rotateX(Math.PI / 2);
        const lobeInst = new THREE.InstancedMesh(lobeGeo, mats.bezelMetal, lobeCount);
        const lDummy = new THREE.Object3D();
        for (let i = 0; i < lobeCount; i++) {
          const a = (i / lobeCount) * Math.PI * 2;
          lDummy.position.set(Math.cos(a) * (bezelOuterR * 0.98), Math.sin(a) * (bezelOuterR * 0.98), 0.02);
          lDummy.rotation.set(0, 0, a);
          lDummy.updateMatrix();
          lobeInst.setMatrixAt(i, lDummy.matrix);
        }
        lobeInst.instanceMatrix.needsUpdate = true;
        lobeInst.computeBoundingSphere();
        bezelGroup.add(lobeInst);
      } else if (watch.bezelType === 'navitimer') {
        // 72 metallic spherical Navitimer slide-rule perimeter beads
        const beadCount = 72;
        const beadGeo = trackGeo(new THREE.SphereGeometry(0.034, 12, 10));
        const beadInst = new THREE.InstancedMesh(beadGeo, mats.polishedMetal, beadCount);
        const bDummy = new THREE.Object3D();
        for (let i = 0; i < beadCount; i++) {
          const a = (i / beadCount) * Math.PI * 2;
          bDummy.position.set(Math.cos(a) * bezelOuterR, Math.sin(a) * bezelOuterR, 0.035);
          bDummy.updateMatrix();
          beadInst.setMatrixAt(i, bDummy.matrix);
        }
        beadInst.instanceMatrix.needsUpdate = true;
        beadInst.computeBoundingSphere();
        bezelGroup.add(beadInst);
      } else if (isRotBezel) {
        const notchCount = 120;
        const notchGeo = trackGeo(new THREE.CapsuleGeometry(0.012, 0.09, 4, 8));
        notchGeo.rotateX(Math.PI / 2);
        const notchInst = new THREE.InstancedMesh(notchGeo, mats.bezelMetal, notchCount);
        const nDummy = new THREE.Object3D();
        for (let i = 0; i < notchCount; i++) {
          const a = (i / notchCount) * Math.PI * 2;
          nDummy.position.set(Math.cos(a) * bezelOuterR, Math.sin(a) * bezelOuterR, 0.0);
          nDummy.rotation.set(0, 0, a);
          nDummy.updateMatrix();
          notchInst.setMatrixAt(i, nDummy.matrix);
        }
        notchInst.instanceMatrix.needsUpdate = true;
        notchInst.computeBoundingSphere();
        bezelGroup.add(notchInst);
      }

      activeBezelTex = createBezelInsertTexture(watch, bezelOption, maxAnisotropy);
      activeInsertMat = trackMat(mats.cerachromBezel.clone());
      activeInsertMat.map = activeBezelTex;
      if (watch.bezelType === 'steel-24h' || (watch.id === 'doxa-sub300' && bezelOption.id === 'default')) {
        activeInsertMat.metalness = 0.88;
        activeInsertMat.roughness = 0.27;
        activeInsertMat.clearcoat = 0.14;
      } else if (watch.bezelType === 'yacht-cerachrom') {
        activeInsertMat.roughness = 0.36;
        activeInsertMat.clearcoat = 0.24;
      }
      activeInsertMat.polygonOffset = true;
      activeInsertMat.polygonOffsetFactor = -1;
      activeInsertMat.polygonOffsetUnits = -1;

      const insertRing = new THREE.Mesh(
        trackGeo(
          createSlopedBezelInsertGeometry(
            bezelInnerR + 0.004,
            bezelOuterR * 0.96,
            0.118,
            0.106,
            96
          )
        ),
        activeInsertMat
      );
      if (isRotBezel) {
        insertRing.userData.interactive = 'bezel';
        interactiveMeshes.push(insertRing);
      }
      bezelGroup.add(insertRing);

      // Blancpain Fifty Fathoms signature curved convex sapphire lens crowning the luminous bezel
      if (watch.id === 'blancpain-fifty-fathoms') {
        const bpDomeProfile = new THREE.SplineCurve([
          new THREE.Vector2(bezelInnerR + 0.006, 0.12),
          new THREE.Vector2(THREE.MathUtils.lerp(bezelInnerR, bezelOuterR, 0.35), 0.156),
          new THREE.Vector2(THREE.MathUtils.lerp(bezelInnerR, bezelOuterR, 0.68), 0.154),
          new THREE.Vector2(bezelOuterR * 0.96, 0.108),
        ]);
        const bpSapphireGeo = trackGeo(new THREE.LatheGeometry(bpDomeProfile.getPoints(16), 96));
        bpSapphireGeo.rotateX(Math.PI / 2);
        const bpSapphireMat = trackMat(mats.sapphireCrystal.clone());
        bpSapphireMat.opacity = 0.22;
        bpSapphireMat.clearcoat = 1.0;
        bpSapphireMat.roughness = 0.01;
        const bpSapphireRing = new THREE.Mesh(bpSapphireGeo, bpSapphireMat);
        bpSapphireRing.renderOrder = 4;
        bezelGroup.add(bpSapphireRing);
      }

      if (
        (watch.bezelType === 'dive-cerachrom' || watch.bezelType === 'seamaster') &&
        watch.id !== 'blancpain-fifty-fathoms'
      ) {
        const pipRing = new THREE.Mesh(
          trackGeo(new THREE.TorusGeometry(0.058, 0.014, 12, 24)),
          watch.id === 'tudor-bb58' ? mats.goldAccent : mats.polishedMetal
        );
        pipRing.position.set(0, (bezelInnerR + bezelOuterR) * 0.49, 0.124);
        const pipLume = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.048, 18, 14)),
          watch.id === 'omega-seamaster' ? mats.secondaryLume : mats.chromalightLume
        );
        pipLume.position.set(0, (bezelInnerR + bezelOuterR) * 0.49, 0.124);
        pipLume.scale.z = 0.55;
        bezelGroup.add(pipRing, pipLume);
      }
    }
  }

  // --- 6. MENISCUS DOMED / BEVELED SAPPHIRE CRYSTAL, CORONET, CYCLOPS & WATER DROPLETS ---
  crystalGroup.position.z = baseLayerZ.crystal;
  const usesRoundCrystal = caseShape === 'round' || hasRoundDialOnShapedCase;
  const crystalMesh = new THREE.Mesh(
    trackGeo(
      usesRoundCrystal
        ? createDomedSapphireGeometry(
            dialR + 0.026,
            Boolean(watch.greenSapphire || watch.highDomeSapphire),
            Boolean(watch.hasFloatingBalance)
          )
        : createShapedDiscGeometry(dialR + 0.024, 96, caseShape)
    ),
    mats.sapphireCrystal
  );
  if (!usesRoundCrystal) {
    crystalMesh.position.z = 0.012;
  }
  crystalMesh.renderOrder = 5;
  crystalGroup.add(crystalMesh);

  if (watch.brand === 'ROLEX') {
    const coronetTex = createSapphireCoronetTexture(maxAnisotropy);
    const coronetMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: coronetTex,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      })
    );
    const coronetOverlay = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(dialR + 0.02, 64)),
      coronetMat
    );
    coronetOverlay.position.z = 0.014;
    coronetOverlay.renderOrder = 6;
    crystalGroup.add(coronetOverlay);
  }

  const crystalEdgeMat = trackMat(mats.sapphireCrystal.clone());
  crystalEdgeMat.opacity = watch.greenSapphire ? 0.45 : 0.22;
  if (watch.greenSapphire) {
    crystalEdgeMat.color.setHex(0x10b981);
    crystalEdgeMat.emissive.setHex(0x064e3b);
    crystalEdgeMat.emissiveIntensity = 0.45;
  }
  if (caseShape === 'round') {
    const crystalEdgeRim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(dialR + 0.015, 0.018, 14, 96)),
      crystalEdgeMat
    );
    crystalEdgeRim.renderOrder = 5;
    crystalGroup.add(crystalEdgeRim);
  }

  if (watch.hasCyclops) {
    const cyclopsGeo = trackGeo(
      new THREE.SphereGeometry(0.23, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.42)
    );
    cyclopsGeo.rotateX(Math.PI / 2);
    const cyclopsMat = trackMat(mats.sapphireCrystal.clone());
    cyclopsMat.opacity = 0.12;
    const cyclops = new THREE.Mesh(cyclopsGeo, cyclopsMat);
    cyclops.position.set(dialR * 0.65, 0, 0.018);
    cyclops.scale.set(0.86, 1.15, 0.42);
    cyclops.renderOrder = 6;
    crystalGroup.add(cyclops);
  }

  // --- 7. INTERNAL PERPETUAL CALIBER / MECA-QUARTZ / CASIO QUARTZ PCB MODULE ---
  caliberGroup.position.z = baseLayerZ.caliber;
  caliberGroup.scale.z = THREE.MathUtils.clamp(caseDepth / 1.1, 0.48, 1.0);

  const isCasioQuartz = watch.brand === 'CASIO';
  const isMecaQuartz = watch.id === 'avi8-spitfire';
  const isElectronicModule = isCasioQuartz || isMecaQuartz;
  const perlageTex = createPerlageTexture(maxAnisotropy);
  const plateMat = trackMat(mats.movementPlate.clone());

  if (isElectronicModule) {
    const pcbLabel = isMecaQuartz
      ? 'SEIKO VK64 MECA-QUARTZ'
      : watch.id === 'casio-gshock-dw5600'
        ? 'CASIO 3229 SHOCK'
        : watch.id === 'casio-casioak-ga2100'
          ? 'CASIO 5611 CARBON'
          : 'CASIO 593 QUARTZ';
    const pcbTex = createQuartzPcbTexture(pcbLabel, maxAnisotropy);
    plateMat.map = pcbTex;
    plateMat.color.setHex(0xffffff);
    plateMat.metalness = 0.22;
    plateMat.roughness = 0.48;
  } else {
    plateMat.map = perlageTex;
    if (watch.id === 'fpj-chronometre-bleu') {
      // Solid 18k rose-gold Calibre 1304 movement baseplate
      plateMat.color.setHex(0xdba487);
    } else if (watch.brand === 'A. LANGE & SÖHNE') {
      // Untreated warm Glashütte German silver (Neusilber) baseplate
      plateMat.color.setHex(0xe2dcc8);
    } else if (watch.id === 'rm-tonneau') {
      plateMat.color.setHex(0x2a2f36);
      plateMat.roughness = 0.44;
    }
  }

  const mainPlate = new THREE.Mesh(
    trackGeo(createShapedMainPlateGeometry(dialR * 0.91, 0.11, caseShape)),
    plateMat
  );
  if (options?.xrayDial) {
    mainPlate.visible = false;
  }
  caliberGroup.add(mainPlate);

  const gearWheels: THREE.Mesh[] = [];
  if (isElectronicModule) {
    // High-Fidelity Quartz / Hybrid Meca-Quartz Module:
    // Lithium coin cell, retention strap, ASIC chip with micro-legs, quartz tuning-fork cylinder, copper stepper coil & stator
    const batteryCell = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(dialR * 0.39, dialR * 0.39, 0.062, 36)),
      mats.polishedMetal
    );
    batteryCell.rotation.x = Math.PI / 2;
    batteryCell.position.set(0.22, -0.06, -0.095);

    const batteryLip = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(dialR * 0.36, 0.012, 8, 32)),
      mats.brushedMetal
    );
    batteryLip.position.set(0.22, -0.06, -0.125);

    const batteryClip = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(dialR * 0.88, 0.13, 0.02, 0.004)),
      mats.goldAccent
    );
    batteryClip.position.set(0.22, -0.06, -0.136);
    batteryClip.rotation.z = 0.32;

    const icChip = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.42, 0.34, 0.052)),
      mats.oysterflexBelt
    );
    icChip.position.set(-0.44, 0.24, -0.098);

    // Metallic IC gull-wing pins along top & bottom edges
    const icPinGeo = trackGeo(new THREE.BoxGeometry(0.022, 0.065, 0.014));
    for (let p = 0; p < 6; p++) {
      const px = -0.60 + p * 0.064;
      const pinTop = new THREE.Mesh(icPinGeo, mats.polishedMetal);
      pinTop.position.set(px, 0.425, -0.092);
      const pinBot = new THREE.Mesh(icPinGeo, mats.polishedMetal);
      pinBot.position.set(px, 0.055, -0.092);
      caliberGroup.add(pinTop, pinBot);
    }

    // 32,768 Hz quartz crystal oscillator canister
    const quartzCan = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.052, 0.052, 0.34, 16)),
      mats.polishedMetal
    );
    quartzCan.position.set(-0.52, -0.34, -0.098);

    // Copper electromagnetic stepper motor coil & permalloy stator yoke
    const copperCoil = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.09, 0.09, 0.32, 18)),
      mats.goldAccent
    );
    copperCoil.rotation.z = Math.PI / 2;
    copperCoil.position.set(0.06, 0.48, -0.102);

    const statorYoke = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.56, 0.08, 0.022, 0.004)),
      mats.brushedMetal
    );
    statorYoke.position.set(0.06, 0.48, -0.075);

    // SMD Ceramic Capacitors
    const capGeo = trackGeo(new THREE.BoxGeometry(0.085, 0.048, 0.032));
    [
      { x: -0.12, y: -0.44 },
      { x: -0.26, y: -0.44 },
      { x: -0.16, y: 0.22 },
    ].forEach((cp) => {
      const smd = new THREE.Mesh(capGeo, mats.goldAccent);
      smd.position.set(cp.x, cp.y, -0.085);
      caliberGroup.add(smd);
    });

    caliberGroup.add(batteryCell, batteryLip, batteryClip, icChip, quartzCan, copperCoil, statorYoke);

    // Hybrid Meca-Quartz VK64 (AVI-8 Spitfire): mechanical chronograph heart-cam reset hammer & gear train
    if (isMecaQuartz) {
      const resetHammer = new THREE.Mesh(
        trackGeo(createRoundedLinkGeometry(0.62, 0.072, 0.024, 0.005)),
        mats.polishedMetal
      );
      resetHammer.position.set(-0.1, -0.22, -0.142);
      resetHammer.rotation.z = -0.48;
      const chronoWheel = new THREE.Mesh(
        trackGeo(createToothedGearGeometry(0.24, 24, 0.028)),
        mats.movementBrass
      );
      chronoWheel.position.set(0, 0, -0.115);
      gearWheels.push(chronoWheel);
      const heartCam = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.075, 0.075, 0.038, 16)),
        mats.polishedMetal
      );
      heartCam.rotation.x = Math.PI / 2;
      heartCam.position.set(0, 0, -0.132);
      caliberGroup.add(resetHammer, chronoWheel, heartCam);
    }
  } else {
    // Museum-Grade Mechanical Horological Architecture
    const ratchetTex = createRatchetSunburstTexture(maxAnisotropy);
    const ratchetMat = trackMat(mats.polishedMetal.clone());
    ratchetMat.map = ratchetTex;
    ratchetMat.roughness = 0.22;

    // 1. Mainspring Barrel + Sunburst Ratchet Wheel + Crown Wheel + Click Spring
    const barrelX = -dialR * 0.36;
    const barrelY = dialR * 0.26;
    const barrelDrum = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(dialR * 0.31, dialR * 0.31, 0.072, 36)),
      mats.movementBrass
    );
    barrelDrum.rotation.x = Math.PI / 2;
    barrelDrum.position.set(barrelX, barrelY, -0.095);
    const ratchetWheel = new THREE.Mesh(
      trackGeo(createToothedGearGeometry(dialR * 0.28, 34, 0.028)),
      ratchetMat
    );
    ratchetWheel.position.set(barrelX, barrelY, -0.165);
    gearWheels.push(ratchetWheel);

    const crownWheelX = dialR * 0.14;
    const crownWheelY = dialR * 0.44;
    const crownWheel = new THREE.Mesh(
      trackGeo(createToothedGearGeometry(dialR * 0.19, 26, 0.026)),
      ratchetMat
    );
    crownWheel.position.set(crownWheelX, crownWheelY, -0.165);
    gearWheels.push(crownWheel);

    const crownWheelCore = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(dialR * 0.07, dialR * 0.07, 0.036, 18)),
      mats.polishedMetal
    );
    crownWheelCore.rotation.x = Math.PI / 2;
    crownWheelCore.position.set(crownWheelX, crownWheelY, -0.168);

    // Steel click & click spring engaging the ratchet wheel teeth
    const clickPawl = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.24, 0.044, 0.022, 0.005)),
      mats.polishedMetal
    );
    clickPawl.position.set(barrelX + dialR * 0.28, barrelY + dialR * 0.18, -0.165);
    clickPawl.rotation.z = -0.68;
    caliberGroup.add(barrelDrum, ratchetWheel, crownWheel, crownWheelCore, clickPawl);

    // 2. Multi-plane Spoked Going Train (Dial-side keyless works + Rear going train + 15-tooth Escape Wheel)
    const trainSpecs = [
      // Dial-side keyless/calendar train (kept at z=+0.075 so even 5.15mm ultra-thin watches clear the dial)
      { x: -0.32, y: 0.26, r: 0.34, teeth: 26, z: 0.075, brass: true },
      { x: 0.34, y: 0.22, r: 0.28, teeth: 22, z: 0.075, brass: true },
      { x: 0.0, y: -0.24, r: 0.35, teeth: 28, z: 0.075, brass: true },
      // Rear going train: center wheel, third wheel, fourth wheel
      { x: 0.0, y: 0.0, r: 0.34, teeth: 28, z: -0.095, brass: true },
      { x: -0.38, y: -0.28, r: 0.26, teeth: 22, z: -0.095, brass: true },
      { x: -0.06, y: -0.44, r: 0.22, teeth: 20, z: -0.105, brass: false },
    ];
    trainSpecs.forEach((gs) => {
      const wheel = new THREE.Mesh(
        trackGeo(createToothedGearGeometry(gs.r, gs.teeth, 0.028)),
        gs.brass ? mats.movementBrass : mats.polishedMetal
      );
      wheel.position.set(gs.x, gs.y, gs.z);
      gearWheels.push(wheel);
      const ruby = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.046, 0.046, 0.046, 18)),
        mats.movementRuby
      );
      ruby.rotation.x = Math.PI / 2;
      ruby.position.set(gs.x, gs.y, gs.z + (gs.z > 0 ? 0.008 : -0.01));
      caliberGroup.add(wheel, ruby);
    });

    // Dedicated 15-Tooth Club-Tooth Swiss Lever Escape Wheel meshing with the Pallet Fork
    const escapeWheel = new THREE.Mesh(
      trackGeo(createToothedGearGeometry(0.155, 15, 0.024)),
      mats.goldAccent
    );
    escapeWheel.position.set(-0.04, -0.24, -0.112);
    gearWheels.push(escapeWheel);
    const escapeRuby = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.042, 16)),
      mats.movementRuby
    );
    escapeRuby.rotation.x = Math.PI / 2;
    escapeRuby.position.set(-0.04, -0.24, -0.12);
    caliberGroup.add(escapeWheel, escapeRuby);

    // 3. Multi-Bridge Architecture with Côtes de Genève / Glashütte Ribbing & Anglage Bevels
    const geneveTex = createCotesDeGeneveTexture(maxAnisotropy);
    const bridgeMat = trackMat(mats.movementBridge.clone());
    bridgeMat.map = geneveTex;
    if (watch.brand === 'A. LANGE & SÖHNE') {
      bridgeMat.color.setHex(0xe5decb);
    } else if (watch.id === 'fpj-chronometre-bleu') {
      bridgeMat.color.setHex(0xdba487);
    } else if (watch.id === 'rm-tonneau') {
      bridgeMat.color.setHex(0x282d33);
      bridgeMat.roughness = 0.42;
    }

    const bR = dialR * 0.86;
    const bridgeShape = new THREE.Shape();
    if (watch.brand === 'A. LANGE & SÖHNE') {
      // Iconic Glashütte 3/4 plate covering 75% of the movement
      bridgeShape.absarc(0, 0, bR, Math.PI * 0.04, Math.PI * 1.46, false);
      bridgeShape.lineTo(0.04, -0.04);
      bridgeShape.closePath();
    } else {
      // Upper Barrel & Automatic Bridge
      bridgeShape.absarc(0, 0, bR, Math.PI * 0.14, Math.PI * 0.92, false);
      bridgeShape.quadraticCurveTo(-0.18, 0.12, 0.52, 0.16);
      bridgeShape.closePath();
    }
    const mainBridgeGeo = trackGeo(
      new THREE.ExtrudeGeometry(bridgeShape, {
        depth: 0.042,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.01,
        bevelSegments: 3,
      })
    );
    const mainBridge = new THREE.Mesh(mainBridgeGeo, bridgeMat);
    mainBridge.position.z = -0.155;
    caliberGroup.add(mainBridge);

    // Secondary Train-Wheel Bridge (for non-3/4-plate Swiss & Japanese calibers)
    if (watch.brand !== 'A. LANGE & SÖHNE') {
      const trainBridgeShape = new THREE.Shape();
      trainBridgeShape.absarc(0, 0, bR * 0.94, Math.PI * 1.02, Math.PI * 1.48, false);
      trainBridgeShape.quadraticCurveTo(-0.12, -0.22, -bR * 0.92, 0.02);
      trainBridgeShape.closePath();
      const trainBridgeGeo = trackGeo(
        new THREE.ExtrudeGeometry(trainBridgeShape, {
          depth: 0.038,
          bevelEnabled: true,
          bevelThickness: 0.009,
          bevelSize: 0.009,
          bevelSegments: 3,
        })
      );
      const trainBridge = new THREE.Mesh(trainBridgeGeo, bridgeMat);
      trainBridge.position.z = -0.152;
      caliberGroup.add(trainBridge);
    }

    // 4. Sculpted Balance Cock Bridge (Hand-Engraved on Haute Horlogerie Houses + Swan-Neck on Lange/Nomos)
    const hasEngravedCock =
      watch.brand === 'A. LANGE & SÖHNE' ||
      watch.brand === 'PATEK PHILIPPE' ||
      watch.brand === 'VACHERON CONSTANTIN' ||
      watch.brand === 'BREGUET' ||
      watch.id === 'fpj-chronometre-bleu' ||
      watch.id === 'mbf-lm101';
    const cockMat = hasEngravedCock
      ? trackMat(
          new THREE.MeshStandardMaterial({
            map: createHandEngravedCockTexture(maxAnisotropy),
            color:
              watch.brand === 'A. LANGE & SÖHNE'
                ? 0xe9e1cd
                : watch.id === 'fpj-chronometre-bleu'
                  ? 0xdba487
                  : 0xe2e8f0,
            metalness: 0.92,
            roughness: 0.24,
            envMapIntensity: 1.5,
          })
        )
      : bridgeMat;

    const cockBridge = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.62, 0.16, 0.036, 0.008)),
      cockMat
    );
    cockBridge.position.set(0.56, -0.37, -0.168);
    cockBridge.rotation.z = -0.14;
    caliberGroup.add(cockBridge);

    // Swan-neck micrometric whiplash regulator spring (A. Lange & Söhne / Nomos Glashütte)
    if (watch.brand === 'A. LANGE & SÖHNE' || watch.brand === 'NOMOS GLASHÜTTE') {
      const swanCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.76, -0.34, -0.192),
        new THREE.Vector3(0.64, -0.25, -0.195),
        new THREE.Vector3(0.49, -0.28, -0.195),
        new THREE.Vector3(0.45, -0.36, -0.192),
      ]);
      const swanNeck = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(swanCurve, 24, 0.011, 8, false)),
        mats.polishedMetal
      );
      caliberGroup.add(swanNeck);
    }

    // 5. Chronograph 8-Pillar Column Wheel + Horizontal Clutch Yoke & Reset Levers
    if (watch.hasChronoPushers) {
      const colWheel = new THREE.Mesh(
        trackGeo(createToothedGearGeometry(0.145, 8, 0.044)),
        mats.bluedScrew
      );
      colWheel.position.set(-0.24, 0.5, -0.168);
      const colCap = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.068, 0.068, 0.052, 16)),
        mats.polishedMetal
      );
      colCap.rotation.x = Math.PI / 2;
      colCap.position.set(-0.24, 0.5, -0.168);
      const clutchLever = new THREE.Mesh(
        trackGeo(createRoundedLinkGeometry(0.58, 0.044, 0.024, 0.005)),
        mats.polishedMetal
      );
      clutchLever.position.set(-0.06, 0.24, -0.158);
      clutchLever.rotation.z = -0.76;
      const brakeLever = new THREE.Mesh(
        trackGeo(createRoundedLinkGeometry(0.44, 0.036, 0.022, 0.005)),
        mats.polishedMetal
      );
      brakeLever.position.set(-0.42, 0.14, -0.158);
      brakeLever.rotation.z = 0.52;
      caliberGroup.add(colWheel, colCap, clutchLever, brakeLever);
    }

    // 6. Screwed 18k Gold Chatons cradling Pigeon-Blood Rubies
    const chatonCollarGeo = trackGeo(new THREE.TorusGeometry(0.06, 0.015, 10, 20));
    const chatonRubyGeo = trackGeo(new THREE.CylinderGeometry(0.042, 0.042, 0.032, 16));
    chatonRubyGeo.rotateX(Math.PI / 2);
    const chatonCoords =
      watch.brand === 'A. LANGE & SÖHNE'
        ? [
            { x: -0.45, y: 0.36 },
            { x: -0.1, y: 0.54 },
            { x: -0.52, y: -0.22 },
            { x: -0.18, y: -0.42 },
          ]
        : [
            { x: -0.46, y: 0.34 },
            { x: -0.36, y: -0.26 },
          ];
    chatonCoords.forEach((pos) => {
      const collar = new THREE.Mesh(
        chatonCollarGeo,
        watch.brand === 'A. LANGE & SÖHNE' ? mats.goldAccent : mats.polishedMetal
      );
      collar.position.set(pos.x, pos.y, -0.165);
      const jewel = new THREE.Mesh(chatonRubyGeo, mats.movementRuby);
      jewel.position.set(pos.x, pos.y, -0.166);
      caliberGroup.add(collar, jewel);
    });
  }

  // Instanced Slotted Heat-Blued / Gold Movement Screws (Head + Recessed Slot)
  const screwCoords = isElectronicModule
    ? [
        { x: -0.56, y: 0.52 },
        { x: 0.54, y: 0.44 },
        { x: -0.24, y: -0.56 },
        { x: 0.54, y: -0.46 },
      ]
    : [
        { x: -0.58, y: 0.52 },
        { x: 0.02, y: 0.76 },
        { x: 0.54, y: 0.5 },
        { x: -0.18, y: 0.36 },
        { x: -0.62, y: -0.12 },
        { x: -0.32, y: -0.56 },
        { x: 0.78, y: -0.34 },
        { x: 0.32, y: 0.14 },
      ];
  const screwHeadGeo = trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.026, 16));
  screwHeadGeo.rotateX(Math.PI / 2);
  const screwSlotGeo = trackGeo(new THREE.BoxGeometry(0.068, 0.011, 0.008));
  const screwMat =
    watch.id === 'rm-tonneau'
      ? mats.goldAccent
      : isElectronicModule
        ? mats.polishedMetal
        : mats.bluedScrew;
  const screwHeadInst = new THREE.InstancedMesh(screwHeadGeo, screwMat, screwCoords.length);
  const screwSlotInst = new THREE.InstancedMesh(screwSlotGeo, mats.oysterflexBelt, screwCoords.length);
  const scDummy = new THREE.Object3D();
  screwCoords.forEach((sc, idx) => {
    scDummy.position.set(sc.x, sc.y, isElectronicModule ? -0.115 : -0.165);
    scDummy.rotation.set(0, 0, idx * 0.75 + 0.3);
    scDummy.scale.setScalar(1);
    scDummy.updateMatrix();
    screwHeadInst.setMatrixAt(idx, scDummy.matrix);
    scDummy.position.z -= 0.013;
    scDummy.updateMatrix();
    screwSlotInst.setMatrixAt(idx, scDummy.matrix);
  });
  screwHeadInst.instanceMatrix.needsUpdate = true;
  screwSlotInst.instanceMatrix.needsUpdate = true;
  caliberGroup.add(screwHeadInst, screwSlotInst);

  // Free-Sprung Balance Wheel with Microstella Regulating Screws, Incabloc Shock Spring & Breguet Overcoil
  const balanceWheel = new THREE.Group();
  balanceWheel.position.set(0.42, -0.37, -0.12);
  const balRim = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.27, 0.024, 12, 36)),
    mats.goldAccent
  );
  const balBar = new THREE.Mesh(
    trackGeo(createRoundedLinkGeometry(0.52, 0.03, 0.02, 0.005)),
    mats.goldAccent
  );
  const balRuby = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.048, 0.048, 0.065, 20)),
    mats.movementRuby
  );
  balRuby.rotation.x = Math.PI / 2;

  // 4 Microstella / Gyromax Gold Timing Weights around Balance Rim
  const microNutGeo = trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.034, 8));
  for (let m = 0; m < 4; m++) {
    const ma = (m / 4) * Math.PI * 2 + Math.PI / 4;
    const nut = new THREE.Mesh(microNutGeo, mats.polishedMetal);
    nut.position.set(Math.cos(ma) * 0.235, Math.sin(ma) * 0.235, 0);
    nut.rotation.z = ma;
    balanceWheel.add(nut);
  }

  // Incabloc Lyre Shock-Absorber Spring cradling Balance Cap Jewel
  const incablocSetting = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.068, 0.012, 8, 20)),
    mats.goldAccent
  );
  incablocSetting.position.set(0.42, -0.37, -0.184);
  const incablocRuby = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.02, 16)),
    mats.movementRuby
  );
  incablocRuby.rotation.x = Math.PI / 2;
  incablocRuby.position.set(0.42, -0.37, -0.188);

  // Helical Breguet Overcoil Hairspring breathing inside balance wheel
  const springPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 72; i++) {
    const t = i / 72;
    const ang = t * Math.PI * 6.5;
    const r = 0.04 + t * 0.14;
    springPts.push(new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r, 0.015));
  }
  const hairspring = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPts), 64, 0.005, 6, false)),
    mats.bluedScrew
  );
  hairspring.position.set(0.42, -0.37, -0.105);

  // Oscillating Ruby-Tipped Swiss Lever Pallet Fork adjacent to balance wheel & escape wheel
  const palletFork = new THREE.Group();
  palletFork.position.set(0.14, -0.26, -0.115);
  const forkStem = new THREE.Mesh(
    trackGeo(createRoundedLinkGeometry(0.22, 0.018, 0.016, 0.004)),
    mats.polishedMetal
  );
  const forkJewelA = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.026, 0.014, 0.022)),
    mats.movementRuby
  );
  forkJewelA.position.set(-0.08, 0.035, 0);
  const forkJewelB = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.026, 0.014, 0.022)),
    mats.movementRuby
  );
  forkJewelB.position.set(-0.08, -0.035, 0);
  palletFork.add(forkStem, forkJewelA, forkJewelB);

  balanceWheel.add(balRim, balBar, balRuby);
  if (isElectronicModule) {
    balanceWheel.visible = false;
    hairspring.visible = false;
    palletFork.visible = false;
    incablocSetting.visible = false;
    incablocRuby.visible = false;
  }
  caliberGroup.add(balanceWheel, hairspring, palletFork, incablocSetting, incablocRuby);

  // Rotating 1-Minute Flying Tourbillon Cage (front 6h aperture on RM 11-03 + visible in Caliber view)
  let tourbillonCage: THREE.Group | null = null;
  if (watch.hasTourbillon) {
    tourbillonCage = new THREE.Group();
    tourbillonCage.position.set(0, -dialR * 0.44, 0.185);
    const cageBridge = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.42, 0.055, 0.024, 0.006)),
      mats.polishedMetal
    );
    const cageRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.21, 0.016, 10, 32)),
      mats.goldAccent
    );
    const cageEscWheel = new THREE.Mesh(
      trackGeo(createToothedGearGeometry(0.15, 16, 0.018)),
      mats.movementBrass
    );
    const cageRuby = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.036, 16)),
      mats.movementRuby
    );
    cageRuby.rotation.x = Math.PI / 2;
    tourbillonCage.add(cageRing, cageBridge, cageEscWheel, cageRuby);
    dialGroup.add(tourbillonCage);
  }

  const perpetualRotor = new THREE.Group();
  perpetualRotor.position.z = -0.22;

  const isManualWind =
    isElectronicModule ||
    watch.id === 'omega-speedmaster' ||
    watch.id === 'jlc-reverso' ||
    watch.id === 'lange-1' ||
    watch.id === 'lange-zeitwerk' ||
    watch.id === 'nomos-tangente' ||
    watch.id === 'fpj-chronometre-bleu' ||
    watch.id === 'mbf-lm101' ||
    watch.id === 'cartier-tank-louis' ||
    watch.id === 'cartier-crash';

  if (!isManualWind) {
    // Authentic micro-rotor calibers (BVL 138 Platinum, PP Cal. 240 22k Gold, Piaget 1200P1 Slate-Grey)
    // Note: Patek Philippe Nautilus 5711 uses Calibre 26-330 S C with a full-size 21k gold central rotor!
    const isMicroRotor =
      watch.id === 'bulgari-octo-finissimo' ||
      watch.id === 'pp-worldtime' ||
      watch.id === 'piaget-polo-79';
    const isVacheron = watch.id === 'vc-overseas';
    const isAp = watch.id === 'ap-royal-oak';
    const isZenith = watch.id === 'zenith-el-primero';
    const isTudor = watch.id === 'tudor-bb58';
    const isOmega = watch.id === 'omega-seamaster';

    if (isMicroRotor) {
      const microMat =
        watch.id === 'bulgari-octo-finissimo'
          ? mats.polishedMetal
          : watch.id === 'piaget-polo-79'
            ? mats.brushedMetal
            : mats.goldAccent;
      const microWeight = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.39, 0.39, 0.048, 32)),
        microMat
      );
      microWeight.rotation.x = Math.PI / 2;
      microWeight.position.set(dialR * 0.36, -dialR * 0.24, 0.015);
      const microRim = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.36, 0.018, 10, 32)),
        microMat
      );
      microRim.position.set(dialR * 0.36, -dialR * 0.24, -0.01);
      const microPin = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.088, 0.088, 0.062, 18)),
        mats.polishedMetal
      );
      microPin.rotation.x = Math.PI / 2;
      microPin.position.copy(microWeight.position);
      perpetualRotor.add(microWeight, microRim, microPin);
    } else {
      const rotorHub = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.21, 0.21, 0.058, 32)),
        mats.polishedMetal
      );
      rotorHub.rotation.x = Math.PI / 2;
      perpetualRotor.add(rotorHub);

      // Ceramic 7-ball bearing ring inside rotor hub
      const ballGeo = trackGeo(new THREE.SphereGeometry(0.022, 8, 8));
      for (let b = 0; b < 7; b++) {
        const ba = (b / 7) * Math.PI * 2;
        const ball = new THREE.Mesh(ballGeo, mats.brushedMetal);
        ball.position.set(Math.cos(ba) * 0.125, Math.sin(ba) * 0.125, -0.026);
        perpetualRotor.add(ball);
      }

      const rotorMat =
        isZenith || isTudor || isOmega ? mats.brushedMetal : mats.goldAccent;

      const rotorArcShape = new THREE.Shape();
      const rOut = dialR * 0.87;
      const rIn = dialR * (isVacheron || isAp ? 0.62 : 0.57);
      rotorArcShape.absarc(0, 0, rOut, -Math.PI * 0.42, Math.PI * 0.42, false);
      rotorArcShape.absarc(0, 0, rIn, Math.PI * 0.42, -Math.PI * 0.42, true);
      rotorArcShape.closePath();

      const rotorArcGeo = trackGeo(
        new THREE.ExtrudeGeometry(rotorArcShape, {
          depth: 0.046,
          bevelEnabled: true,
          bevelThickness: 0.011,
          bevelSize: 0.011,
          bevelSegments: 3,
          curveSegments: 24,
        })
      );
      rotorArcGeo.translate(0, 0, -0.023);
      const rotorArcMesh = new THREE.Mesh(rotorArcGeo, rotorMat);
      perpetualRotor.add(rotorArcMesh);

      if (isZenith) {
        // 5-pointed Zenith star cutout spokes
        for (let s = 0; s < 5; s++) {
          const sa = (s / 5) * Math.PI * 2;
          const arm = new THREE.Mesh(
            trackGeo(createRoundedLinkGeometry(rIn * 0.92, 0.036, 0.026, 0.005)),
            mats.goldAccent
          );
          arm.position.set(Math.cos(sa) * rIn * 0.46, Math.sin(sa) * rIn * 0.46, 0);
          arm.rotation.z = sa;
          perpetualRotor.add(arm);
        }
      } else if (isVacheron) {
        // Authentic Caliber 5100 22k gold Wind Rose (Compass Rose) openworked oscillating weight
        const roseRing = new THREE.Mesh(
          trackGeo(new THREE.TorusGeometry(rIn * 0.56, 0.022, 10, 36)),
          mats.goldAccent
        );
        perpetualRotor.add(roseRing);

        // 4 long cardinal + 4 intercardinal diamond-faceted compass points
        for (let p = 0; p < 8; p++) {
          const pa = (p / 8) * Math.PI * 2;
          const isCardinal = p % 2 === 0;
          const ptLen = isCardinal ? rIn * 0.88 : rIn * 0.62;
          const ptW = isCardinal ? 0.056 : 0.036;
          const ptGeo = trackGeo(createFacetedHandGeometry(ptLen, ptW, 0.005, 0.022));
          const ptMesh = new THREE.Mesh(ptGeo, mats.goldAccent);
          ptMesh.rotation.z = pa - Math.PI / 2;
          ptMesh.position.z = 0.006;
          perpetualRotor.add(ptMesh);
        }
        // Sculpted V-spokes linking the Wind Rose cleanly to the 22k peripheral oscillating mass
        [-0.52, 0, 0.52].forEach((ang) => {
          const spoke = new THREE.Mesh(
            trackGeo(createRoundedLinkGeometry(rIn * 0.96, 0.04, 0.03, 0.006)),
            mats.goldAccent
          );
          spoke.position.set(Math.cos(ang) * rIn * 0.52, Math.sin(ang) * rIn * 0.52, 0);
          spoke.rotation.z = ang;
          perpetualRotor.add(spoke);
        });
      } else if (isAp) {
        // Twin sculpted skeletonized AP bridge arms
        [-0.58, -0.18, 0.18, 0.58].forEach((ang) => {
          const spoke = new THREE.Mesh(
            trackGeo(createRoundedLinkGeometry(rIn, 0.038, 0.032, 0.007)),
            mats.goldAccent
          );
          spoke.position.set(Math.cos(ang) * rIn * 0.52, Math.sin(ang) * rIn * 0.52, 0);
          spoke.rotation.z = ang;
          perpetualRotor.add(spoke);
        });
      } else {
        [-0.55, 0, 0.55].forEach((ang) => {
          const spoke = new THREE.Mesh(
            trackGeo(createRoundedLinkGeometry(rIn, 0.056, 0.034, 0.008)),
            rotorMat
          );
          spoke.position.set(Math.cos(ang) * rIn * 0.52, Math.sin(ang) * rIn * 0.52, 0);
          spoke.rotation.z = ang;
          perpetualRotor.add(spoke);
        });
      }
    }
  } else {
    perpetualRotor.visible = false;
  }

  caliberGroup.add(perpetualRotor);

  // --- 8. SMOOTHED FLUTED OYSTER CASEBACK (SOLID ENGRAVED OR SAPPHIRE EXHIBITION) ---
  let activeCbEngraveTex: THREE.CanvasTexture | null = null;
  let activeCbEngraveMat: THREE.MeshStandardMaterial | null = null;

  casebackGroup.position.z = baseLayerZ.caseback;
  casebackGroup.scale.z = zStackScale;
  const isOpenCaseback = exhibitionBack || Boolean(watch.hasReversoFlip);
  const cbInnerR = watch.hasReversoFlip ? dialR * 0.88 : dialR * 0.78;
  const cbOuterR = dialR * 0.96;

  if (isOpenCaseback) {
    let openCbGeo: THREE.BufferGeometry;
    if (caseShape === 'round') {
      const openRingSpline = new THREE.SplineCurve([
        new THREE.Vector2(cbInnerR, -0.13),
        new THREE.Vector2(dialR * 0.86, -0.1),
        new THREE.Vector2(cbOuterR, -0.03),
        new THREE.Vector2(cbOuterR, 0.06),
        new THREE.Vector2(cbInnerR, 0.06),
        new THREE.Vector2(cbInnerR, -0.13),
      ]);
      const lathe = new THREE.LatheGeometry(openRingSpline.getPoints(16), 96);
      lathe.rotateX(Math.PI / 2);
      openCbGeo = lathe;
    } else {
      openCbGeo = createShapedCasebackGeometry(cbInnerR, cbOuterR, true, caseShape);
    }
    trackGeo(openCbGeo);
    const openCbMesh = new THREE.Mesh(openCbGeo, mats.brushedMetal);
    openCbMesh.castShadow = true;
    casebackGroup.add(openCbMesh);

    const rearCrystal = new THREE.Mesh(
      trackGeo(createShapedDiscGeometry(cbInnerR, 96, caseShape)),
      mats.sapphireCrystal
    );
    rearCrystal.position.z = watch.hasReversoFlip ? -0.115 : -0.06;
    rearCrystal.renderOrder = 5;
    casebackGroup.add(rearCrystal);
  } else {
    let cbGeo: THREE.BufferGeometry;
    if (caseShape === 'round') {
      const cbSpline = new THREE.SplineCurve([
        new THREE.Vector2(0, -0.15),
        new THREE.Vector2(dialR * 0.72, -0.15),
        new THREE.Vector2(dialR * 0.85, -0.11),
        new THREE.Vector2(cbOuterR, -0.03),
        new THREE.Vector2(cbOuterR, 0.06),
        new THREE.Vector2(0, 0.06),
      ]);
      const lathe = new THREE.LatheGeometry(cbSpline.getPoints(16), 96);
      lathe.rotateX(Math.PI / 2);
      cbGeo = lathe;
    } else {
      cbGeo = createShapedCasebackGeometry(cbInnerR, cbOuterR, false, caseShape);
    }
    trackGeo(cbGeo);
    const cbMesh = new THREE.Mesh(cbGeo, mats.brushedMetal);
    cbMesh.castShadow = true;
    casebackGroup.add(cbMesh);

    activeCbEngraveTex = createCasebackEngravingTexture(
      watch,
      maxAnisotropy,
      options?.customEngraving
    );
    activeCbEngraveMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: activeCbEngraveTex,
        metalness: 0.92,
        roughness: 0.22,
        envMapIntensity: 1.4,
      })
    );
    const cbMedallion = new THREE.Mesh(
      trackGeo(createShapedDiscGeometry(dialR * 0.71, 96, caseShape)),
      activeCbEngraveMat
    );
    cbMedallion.rotation.y = Math.PI;
    cbMedallion.position.z = -0.152;
    casebackGroup.add(cbMedallion);
  }

  if (caseShape === 'round') {
    const cbFluteCount = 96;
    const cbFluteGeo = trackGeo(new THREE.CapsuleGeometry(0.014, 0.04, 4, 8));
    const cbFluteInst = new THREE.InstancedMesh(cbFluteGeo, mats.polishedMetal, cbFluteCount);
    const cbDummy = new THREE.Object3D();
    const cbFluteR = dialR * 0.86;
    for (let i = 0; i < cbFluteCount; i++) {
      const a = (i / cbFluteCount) * Math.PI * 2;
      cbDummy.position.set(Math.cos(a) * cbFluteR, Math.sin(a) * cbFluteR, -0.068);
      cbDummy.rotation.set(0, 0, a + Math.PI / 2);
      cbDummy.updateMatrix();
      cbFluteInst.setMatrixAt(i, cbDummy.matrix);
    }
    cbFluteInst.instanceMatrix.needsUpdate = true;
    cbFluteInst.computeBoundingSphere();
    casebackGroup.add(cbFluteInst);
  } else {
    const screwCount = watch.hasReversoFlip ? 4 : 8;
    const cbScrewGeo = trackGeo(new THREE.CylinderGeometry(0.042, 0.042, 0.024, 14));
    cbScrewGeo.rotateX(Math.PI / 2);
    const cbScrewR = watch.hasReversoFlip ? dialR * 0.92 : dialR * 0.86;
    const cbScrewZ = watch.hasReversoFlip ? -0.108 : isOpenCaseback ? -0.095 : -0.112;
    for (let i = 0; i < screwCount; i++) {
      const a = (i / screwCount) * Math.PI * 2 + Math.PI / screwCount;
      const rHere = getCaseShapeRadius(a, cbScrewR, caseShape);
      const screw = new THREE.Mesh(cbScrewGeo, mats.polishedMetal);
      screw.position.set(Math.cos(a) * rHere, Math.sin(a) * rHere, cbScrewZ);
      casebackGroup.add(screw);
    }
  }

  // Instanced Crystal & Bezel Water Droplets (Wet Stage)
  const dropCount = 46;
  const dropGeo = trackGeo(new THREE.SphereGeometry(0.042, 12, 10));
  const dropletsMesh = new THREE.InstancedMesh(dropGeo, mats.waterDroplet, dropCount);
  dropletsMesh.renderOrder = 7;
  const dDummy = new THREE.Object3D();
  for (let i = 0; i < dropCount; i++) {
    const goldenAngle = i * 2.39996;
    const normR = Math.sqrt((i + 0.6) / dropCount);
    const rr = normR * (bezelOuterR * 0.94);
    const sx = 0.42 + ((i * 19) % 10) * 0.075;
    const isCrystal = rr < dialR;
    dDummy.position.set(
      Math.cos(goldenAngle) * rr,
      Math.sin(goldenAngle) * rr,
      isCrystal ? 0.016 : -0.008
    );
    dDummy.scale.set(sx, sx * (0.9 + (i % 3) * 0.12), sx * 0.45);
    dDummy.rotation.set(0, 0, goldenAngle);
    dDummy.updateMatrix();
    dropletsMesh.setMatrixAt(i, dDummy.matrix);
  }
  dropletsMesh.instanceMatrix.needsUpdate = true;
  dropletsMesh.computeBoundingSphere();
  dropletsMesh.visible = false;
  crystalGroup.add(dropletsMesh);

  // --- 9. WRIST TRY-ON ARCHITECTURAL MANNEQUIN & TAILORED CUFF ---
  const wristGroup = new THREE.Group();
  wristGroup.position.set(0, 0, -1.62);
  wristGroup.visible = false;

  const wristCore = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.18, 1.44, 6.2, 48)),
    mats.wristMannequin
  );
  wristCore.rotation.z = Math.PI / 2;
  wristCore.position.x = -0.35;
  wristCore.castShadow = true;
  wristCore.receiveShadow = true;

  const cuffMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.48, 1.56, 2.35, 48)),
    mats.wristCuff
  );
  cuffMesh.rotation.z = Math.PI / 2;
  cuffMesh.position.x = -2.45;
  cuffMesh.castShadow = true;

  wristGroup.add(wristCore, cuffMesh);
  watchTiltGroup.add(wristGroup);

  return {
    root,
    watchTiltGroup,
    shadowMesh,
    interactiveMeshes,
    updateDialTexture: (nextWatch, nextDial, aniso, dateOverride) => {
      const nextTex = createDialTexture(
        nextWatch,
        nextDial,
        aniso,
        dateOverride,
        activeDialTex
      );
      if (nextTex !== activeDialTex) {
        dialMat.map = nextTex;
        dialMat.needsUpdate = true;
        activeDialTex.dispose();
        activeDialTex = nextTex;
      }
    },
    updateBezelTexture: (nextWatch, nextBezel, aniso) => {
      if (!activeInsertMat) return;
      const nextTex = createBezelInsertTexture(nextWatch, nextBezel, aniso);
      activeInsertMat.map = nextTex;
      activeInsertMat.needsUpdate = true;
      activeBezelTex?.dispose();
      activeBezelTex = nextTex;
    },
    updateCasebackEngraving: (nextWatch, customText, aniso) => {
      if (!activeCbEngraveMat) return;
      const nextTex = createCasebackEngravingTexture(nextWatch, aniso, customText);
      activeCbEngraveMat.map = nextTex;
      activeCbEngraveMat.needsUpdate = true;
      activeCbEngraveTex?.dispose();
      activeCbEngraveTex = nextTex;
    },
    updateXrayDial: (enabled) => {
      dialMat.transparent = enabled;
      dialMat.opacity = enabled ? 0.22 : 1.0;
      dialMat.roughness = enabled ? 0.08 : mats.dialSurface.roughness;
      dialMat.needsUpdate = true;
      mainPlate.visible = !enabled;
    },
    setWetStage: (enabled) => {
      dropletsMesh.visible = enabled;
    },
    setWristPreview: (enabled, wristMm) => {
      wristGroup.visible = enabled;
      if (enabled) {
        const s = THREE.MathUtils.clamp(wristMm / 175, 0.86, 1.14);
        wristGroup.scale.set(1, s * 0.92, s * 1.05);
      }
    },
    layers: {
      crystalGroup,
      bezelGroup,
      handsGroup,
      dialGroup,
      caseGroup,
      caliberGroup,
      casebackGroup,
    },
    baseLayerZ,
    kinematics: {
      hourHand,
      minuteHand,
      secondHand,
      chronoSplitHand,
      gmtHand,
      skyDisc,
      powerReserveHand,
      moonphaseDisc,
      chronoSubHands,
      chronoPushers,
      gearWheels,
      perpetualRotor,
      balanceWheel,
      dialBalanceWheel,
      palletFork,
      hairspring,
      tourbillonCage,
      windingCrown,
      claspSwing,
      flipLock,
      glidelockGroup,
      reversoSwivel,
      reversoBackHands,
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      textures.forEach((t) => t.dispose());
      activeDialTex.dispose();
      activeBezelTex?.dispose();
      activeCbEngraveTex?.dispose();
      localMaterials.forEach((m) => m.dispose());
    },
  };
}
