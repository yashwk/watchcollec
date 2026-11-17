import * as THREE from 'three';
import { BeltId, BezelOption, DialOption, WatchSpec } from '@/lib/watches';
import { WatchMaterialSet } from './materials';
import {
  DialDateOverride,
  createBezelInsertTexture,
  createCasebackEngravingTexture,
  createContactShadowTexture,
  createCotesDeGeneveTexture,
  createDialTexture,
  createMoonphaseDiscTexture,
  createPerlageTexture,
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
  | 'cushion'
  | 'square'
  | 'rectangular'
  | 'tonneau';

function getCaseShapeRadius(
  angle: number,
  baseR: number,
  shape: CaseShapeType
): number {
  if (shape === 'round') return baseR;
  if (shape === 'octagonal') {
    const sector = Math.PI / 4;
    const rel = (((angle % sector) + sector) % sector) - sector * 0.5;
    const apothem = baseR * 0.94;
    const cosSmoothed = THREE.MathUtils.lerp(Math.cos(rel), 1, 0.09);
    return apothem / Math.max(0.75, cosSmoothed);
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
  // 'square' (Cartier Santos ergonomic rounded square)
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
      : shape === 'rectangular'
        ? radius * 1.54
        : shape === 'tonneau'
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
 * Case-hugging Solid End Link (SEL) whose inner face matches caseR and whose body
 * curves smoothly in Z down to the exact bracelet entry hinge (attachY, attachZ).
 */
function createCaseHuggingEndLinkGeometry(
  xMin: number,
  xMax: number,
  caseR: number,
  attachY: number,
  attachZ: number,
  depth: number
): THREE.ExtrudeGeometry {
  const arcR = caseR * 0.955;
  const bevel = 0.022;
  const shape = new THREE.Shape();

  const startA = Math.acos(THREE.MathUtils.clamp(xMax / arcR, -0.99, 0.99));
  const endA = Math.acos(THREE.MathUtils.clamp(xMin / arcR, -0.99, 0.99));

  const yEdgeOut = attachY + 0.015;
  shape.moveTo(xMin, yEdgeOut);
  shape.lineTo(xMax, yEdgeOut);
  const arcSteps = 14;
  for (let i = 0; i <= arcSteps; i++) {
    const a = THREE.MathUtils.lerp(startA, endA, i / arcSteps);
    shape.lineTo(Math.cos(a) * arcR, Math.sin(a) * arcR);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.04, depth - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.65,
    bevelSegments: 4,
    curveSegments: 14,
  });
  geo.translate(0, 0, -(Math.max(0.04, depth - bevel * 2)) * 0.5);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const yInner = Math.sqrt(Math.max(0.04, arcR * arcR - vx * vx));
    const t = THREE.MathUtils.clamp((vy - yInner) / Math.max(0.05, yEdgeOut - yInner), 0, 1);
    const smoothT = t * t * (0.45 + 0.55 * t);
    const zShift = THREE.MathUtils.lerp(0.06, attachZ, smoothT);
    const archCrown = 0.018 * (1 - Math.min(1, Math.pow(vx / (caseR * 0.58), 2)));
    pos.setZ(i, vz + zShift + archCrown);
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
 * High-resolution Oyster lug with rounded elliptical cross-section, gentle satin chamfer,
 * flush inner cheek to seal against end-links/straps, and smooth spherical bullnose tip.
 */
function createOysterLugGeometry(
  side: 1 | -1,
  caseR: number,
  lugSpanWidth: number,
  halfT: number
): THREE.BufferGeometry {
  const segs = 28;
  const yRoot = caseR * 0.62;
  const yTip = caseR * 1.225;
  const xInnerBase = lugSpanWidth * 0.5 - 0.008;
  const xOuterRoot = caseR * 0.785;
  const xOuterTip = lugSpanWidth * 0.5 + caseR * 0.125;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const ringCount = 13;

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const easeT = t * t * (0.44 + 0.56 * t);
    const tipRound = t > 0.85 ? (t - 0.85) / 0.15 : 0;
    const noseFactor = Math.sqrt(Math.max(0.09, 1 - tipRound * tipRound * 0.76));

    const y = THREE.MathUtils.lerp(yRoot, yTip, t);
    const xIn = side * (xInnerBase + tipRound * 0.008);
    const xOut =
      side * THREE.MathUtils.lerp(xOuterRoot, xOuterTip, Math.pow(t, 0.82)) -
      side * tipRound * 0.022;
    const cx = (xIn + xOut) * 0.5;
    const hw = Math.max(0.03, Math.abs(xOut - xIn) * 0.5);

    const zTop = halfT * 0.86 - easeT * (halfT * 0.86 + 0.04);
    const zBot = -halfT * 0.94 - easeT * 0.155;
    const cz = (zTop + zBot) * 0.5;
    const hh = Math.max(0.05, (zTop - zBot) * 0.5) * noseFactor;

    const ringPts: [number, number][] = [];
    for (let j = 0; j < ringCount; j++) {
      // Negative angle ensures CW perimeter in (X, Z) so (a, d, b) yields strictly outward normals
      const a = -(j / (ringCount - 1)) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const px = cx + Math.sign(ca) * Math.pow(Math.abs(ca), 0.52) * hw * side;
      const pz = cz + Math.sign(sa) * Math.pow(Math.abs(sa), 0.56) * hh;
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

  const tipStart = segs * ringCount;
  const cxTip = side * ((xInnerBase + xOuterTip) * 0.5);
  const zTopTip = halfT * 0.86 - (halfT * 0.86 + 0.04);
  const zBotTip = -halfT * 0.94 - 0.155;
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
  highDome: boolean
): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  if (highDome) {
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
  caseR = 0
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
    const width = THREE.MathUtils.lerp(widthStart, widthEnd, t);

    let ny = signY > 0 ? -tan.z : tan.z;
    let nz = signY > 0 ? tan.y : -tan.y;
    const len = Math.hypot(ny, nz) || 1;
    ny /= len;
    nz /= len;

    // Fitted curved-end bolster profile when anchoring straight to the round case (leather)
    const hugBlend = caseR > 0 && t < 0.14 ? Math.pow(1 - t / 0.14, 1.6) : 0;
    const thickFactor = t < 0.06 ? THREE.MathUtils.lerp(0.84, 1.0, t / 0.06) : 1.0;

    for (let j = 0; j < ringCount; j++) {
      const p = profile[j];
      const px = p.xFrac * width;
      let py = pt.y + ny * (p.nOff * thickness * thickFactor);
      const pz = pt.z + nz * (p.nOff * thickness * thickFactor);

      if (hugBlend > 0) {
        const arcY = Math.sqrt(Math.max(0.1, Math.pow(caseR * 0.96, 2) - px * px));
        const targetHugY = signY * (arcY + 0.025) + ny * (p.nOff * thickness * 0.84);
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

  // Authentic horological proportions (1 unit = 10mm)
  const caseShape: CaseShapeType = watch.caseShape ?? 'round';
  const caseR =
    watch.id === 'jlc-reverso'
      ? 1.55
      : (watch.caseDiameterMm / 10) * 0.5;
  const lugAttachR =
    caseShape === 'rectangular'
      ? caseR * 1.48
      : caseShape === 'tonneau'
        ? caseR * 1.15
        : caseR;
  const caseDepth = watch.caseThicknessMm / 10;
  const halfT = caseDepth * 0.43;
  const dialR =
    watch.id === 'ap-royal-oak'
      ? caseR * 0.72
      : watch.id === 'cartier-santos'
        ? caseR * 0.71
        : watch.id === 'jlc-reverso'
          ? caseR * 0.78
          : watch.id === 'rm-tonneau'
            ? caseR * 0.72
            : caseR * 0.745;
  const bezelInnerR = dialR + 0.015;
  const bezelOuterR = caseR * 0.992;

  const lugSpanWidth =
    watch.id === 'avi8-spitfire' || watch.id === 'omega-speedmaster' || watch.id === 'rm-tonneau'
      ? 2.12
      : watch.id === 'ap-royal-oak' || watch.id === 'pp-nautilus'
        ? 2.28
        : watch.id === 'cartier-santos' || watch.id === 'jlc-reverso'
          ? 1.88
          : watch.caseDiameterMm === 36
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
    carrierPlate.position.z = -halfT - 0.18;
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
    caseShape === 'round'
      ? (() => {
          const g = new THREE.CylinderGeometry(dialR + 0.022, dialR + 0.004, 0.36, 96, 1, true);
          g.rotateX(Math.PI / 2);
          return g;
        })()
      : createShapedRehautGeometry(dialR, 0.36, caseShape);
  trackGeo(rehautGeo);
  const rehautMesh = new THREE.Mesh(rehautGeo, rehautMat);
  rehautMesh.position.z = 0.34;
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

  // 4 Sculpted Curved Lugs (mounted on stationary cradle for Reverso so lugs stay put during swivel)
  const lugParent = watch.hasReversoFlip ? cradleGroup : caseGroup;
  const rightLugGeo = trackGeo(createOysterLugGeometry(1, lugAttachR, lugSpanWidth, halfT));
  const leftLugGeo = trackGeo(createOysterLugGeometry(-1, lugAttachR, lugSpanWidth, halfT));

  const topLugPair = new THREE.Group();
  const topRightLug = new THREE.Mesh(rightLugGeo, mats.brushedMetal);
  const topLeftLug = new THREE.Mesh(leftLugGeo, mats.brushedMetal);
  [topRightLug, topLeftLug].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    topLugPair.add(m);
  });
  lugParent.add(topLugPair);

  const botLugPair = new THREE.Group();
  botLugPair.rotation.z = Math.PI;
  const botRightLug = new THREE.Mesh(rightLugGeo, mats.brushedMetal);
  const botLeftLug = new THREE.Mesh(leftLugGeo, mats.brushedMetal);
  [botRightLug, botLeftLug].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    botLugPair.add(m);
  });
  lugParent.add(botLugPair);

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
    watch.id === 'avi8-spitfire' ||
    watch.id === 'pp-nautilus' ||
    watch.id === 'ap-royal-oak' ||
    watch.id === 'cartier-santos' ||
    watch.id === 'jlc-reverso' ||
    watch.id === 'lange-1';

  if (watch.hasCrownBridge) {
    const bridgeShape = new THREE.Shape();
    bridgeShape.absarc(0, 0, 0.56, -Math.PI * 0.48, Math.PI * 0.48, false);
    bridgeShape.absarc(0, 0, 0.34, Math.PI * 0.48, -Math.PI * 0.48, true);
    bridgeShape.closePath();
    const bridgeGeo = trackGeo(
      new THREE.ExtrudeGeometry(bridgeShape, {
        depth: 0.36,
        bevelEnabled: true,
        bevelThickness: 0.032,
        bevelSize: 0.026,
        bevelSegments: 4,
        curveSegments: 24,
      })
    );
    bridgeGeo.translate(0, 0, -0.18);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, mats.brushedMetal);
    bridgeMesh.position.set(caseR * 0.96, 0, -0.02);
    bridgeMesh.castShadow = true;

    const leverArm = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.14, 0.54, 0.24, 0.035)),
      mats.polishedMetal
    );
    leverArm.position.set(caseR + 0.44, -0.16, -0.02);
    leverArm.rotation.z = 0.14;
    leverArm.castShadow = true;
    caseGroup.add(bridgeMesh, leverArm);
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
        depth: 0.32,
        bevelEnabled: true,
        bevelThickness: 0.065,
        bevelSize: 0.048,
        bevelSegments: 5,
        curveSegments: 24,
      })
    );
    guardGeo.center();

    [-0.35, 0.35].forEach((yPos, idx) => {
      const guard = new THREE.Mesh(guardGeo, mats.polishedMetal);
      guard.position.set(caseR * 0.96, yPos, -0.02);
      guard.rotation.z = idx === 0 ? 0.14 : -0.14;
      guard.castShadow = true;
      caseGroup.add(guard);
    });
  }

  // CNC-Lathed Winding Crown (Supports Left-Hand 9h Crown, Conical Pilot Crown, Cartier Cabochon, Triplock)
  const crownGroup = new THREE.Group();
  const crownBaseX =
    watch.id === 'pp-nautilus'
      ? caseR + 0.25
      : watch.id === 'cartier-santos' || watch.id === 'tag-monaco'
        ? caseR * 0.94 + 0.14
        : caseR + 0.14;
  crownGroup.position.set(watch.leftCrown ? -crownBaseX : crownBaseX, 0, -0.02);
  crownGroup.rotation.z = watch.leftCrown ? Math.PI / 2 : -Math.PI / 2;

  const crownTube = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.14, 0.14, 0.36, 32)),
    mats.bezelMetal
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

  const windingCrown = new THREE.Group();
  crownGroup.add(windingCrown);

  if (watch.id === 'cartier-santos') {
    // 7-sided faceted steel crown tipped with a blue sapphire cabochon
    const heptCrown = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.21, 0.19, 0.22, 7)),
      mats.polishedMetal
    );
    heptCrown.position.y = 0.08;
    heptCrown.castShadow = true;
    heptCrown.userData.interactive = 'crown';
    interactiveMeshes.push(heptCrown);

    const cabochon = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.115, 24, 16)),
      mats.sapphireCabochon
    );
    cabochon.position.y = 0.21;
    cabochon.scale.set(1, 0.72, 1);
    cabochon.userData.interactive = 'crown';
    interactiveMeshes.push(cabochon);
    windingCrown.add(heptCrown, cabochon);
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

    if (watch.brand === 'ROLEX') {
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

  caseGroup.add(crownGroup);

  // Chronograph Pushers (Classic Piston/Pump vs. Screw-Down Oyster)
  const chronoPushers: THREE.Mesh[] = [];
  if (watch.hasChronoPushers) {
    const isAvi8 =
      watch.brand === 'AVI-8' ||
      watch.brand === 'OMEGA' ||
      watch.brand === 'ZENITH' ||
      watch.brand === 'TAG HEUER' ||
      watch.brand === 'BREITLING';
    const pusherCollarSpline = isAvi8
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

    const pusherCapSpline = isAvi8
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
      pusherGroup.position.set(px, py, -0.02);
      pusherGroup.rotation.z = angle - Math.PI / 2;

      const collar = new THREE.Mesh(collarGeo, isAvi8 ? mats.brushedMetal : mats.bezelMetal);
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

  // --- 2. CASE-HUGGING SOLID END LINKS + SPRING BAR ANCHORS + SMOOTH TANGENTIAL BELT ---
  const braceletGroup = new THREE.Group();

  const attachY = lugAttachR * 1.1;
  const attachZ = -0.14;
  const wristApexY = Math.max(lugAttachR * 1.12, 2.25);
  const wristCenterZ = -1.52;
  const claspSpanY = 0.7;
  const claspEdgeZ = -3.08;
  const claspCenterZ = -3.2;

  const isLeather = beltId === 'leather';
  const showSel = !isLeather;

  if (showSel) {
    // Concave curved Solid End Links (SEL) locking flush to the round case perimeter & curving smoothly into belt exit tangent
    const selFullGeo = trackGeo(
      createCaseHuggingEndLinkGeometry(
        -lugSpanWidth * 0.495,
        lugSpanWidth * 0.495,
        lugAttachR,
        attachY,
        attachZ,
        0.26
      )
    );
    const selOuterGeo = trackGeo(
      createCaseHuggingEndLinkGeometry(
        lugSpanWidth * 0.18,
        lugSpanWidth * 0.495,
        lugAttachR,
        attachY,
        attachZ,
        0.26
      )
    );
    const selOuterLeftGeo = trackGeo(
      createCaseHuggingEndLinkGeometry(
        -lugSpanWidth * 0.495,
        -lugSpanWidth * 0.18,
        lugAttachR,
        attachY,
        attachZ,
        0.26
      )
    );
    const selCenterGeo = trackGeo(
      createCaseHuggingEndLinkGeometry(
        -lugSpanWidth * 0.182,
        lugSpanWidth * 0.182,
        lugAttachR,
        attachY,
        attachZ,
        0.285
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

  // Visible brushed-steel spring bar hinge barrels locking straps/bracelets cleanly between lug cheeks
  const springBarGeo = trackGeo(
    new THREE.CylinderGeometry(0.042, 0.042, lugSpanWidth * 1.02, 16)
  );
  springBarGeo.rotateZ(Math.PI / 2);
  ([1, -1] as const).forEach((signY) => {
    const sb = new THREE.Mesh(springBarGeo, mats.polishedMetal);
    sb.position.set(
      0,
      signY * (isLeather ? lugAttachR * 1.035 : attachY),
      isLeather ? -0.07 : attachZ
    );
    braceletGroup.add(sb);
  });

  const buildWristCurve = (signY: 1 | -1) =>
    new THREE.CatmullRomCurve3(
      isLeather
        ? [
            new THREE.Vector3(0, signY * (lugAttachR * 1.015), -0.05),
            new THREE.Vector3(0, signY * (lugAttachR * 1.13), -0.44),
            new THREE.Vector3(0, signY * wristApexY, wristCenterZ),
            new THREE.Vector3(0, signY * (wristApexY * 0.78), claspEdgeZ + 0.65),
            new THREE.Vector3(0, signY * claspSpanY, claspEdgeZ),
          ]
        : [
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

  const topCurve = buildWristCurve(1);
  const botCurve = buildWristCurve(-1);

  if (beltId === 'bracelet') {
    const isOyster =
      watch.braceletType === 'oyster' || watch.braceletType === 'santos';
    const isIntegrated =
      watch.braceletType === 'royal-oak' || watch.braceletType === 'nautilus';
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
    const linkLen = pitch * 1.08;

    const outerGeo = isIntegrated
      ? trackGeo(createSculptedLinkGeometry(lugSpanWidth * 0.36, linkLen, 0.22, 'oyster'))
      : isOyster
        ? trackGeo(createSculptedLinkGeometry(lugSpanWidth * 0.32, linkLen, 0.25, 'oyster'))
        : isPresident
          ? trackGeo(createSculptedLinkGeometry(lugSpanWidth * 0.31, linkLen, 0.29, 'president'))
          : trackGeo(createSculptedLinkGeometry(lugSpanWidth * 0.23, linkLen, 0.24, 'jubilee'));
    const centerGeo = isIntegrated
      ? trackGeo(createSculptedLinkGeometry(lugSpanWidth * 0.26, linkLen * 0.96, 0.245, 'oyster'))
      : isOyster
        ? trackGeo(createSculptedLinkGeometry(lugSpanWidth * 0.37, linkLen, 0.27, 'oyster'))
        : isPresident
          ? trackGeo(createSculptedLinkGeometry(lugSpanWidth * 0.38, linkLen, 0.31, 'president'))
          : trackGeo(createSculptedLinkGeometry(lugSpanWidth * 0.175, linkLen, 0.26, 'jubilee'));
    const pinGeo = trackGeo(
      new THREE.CylinderGeometry(0.036, 0.036, lugSpanWidth * 0.99, 14)
    );
    pinGeo.rotateZ(Math.PI / 2);

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

        const linkSeg = new THREE.Group();
        linkSeg.position.copy(pos);
        linkSeg.rotation.x = rotX;
        linkSeg.scale.set(taper, 1, 1);

        if (linkStyle === 'oyster' || linkStyle === 'president') {
          const leftL = new THREE.Mesh(outerGeo, mats.brushedMetal);
          leftL.position.x = -lugSpanWidth * 0.34;
          const rightL = new THREE.Mesh(outerGeo, mats.brushedMetal);
          rightL.position.x = lugSpanWidth * 0.34;
          const centerL = new THREE.Mesh(centerGeo, mats.centerLinkMetal);

          [leftL, rightL, centerL].forEach((m) => {
            m.castShadow = true;
            m.receiveShadow = true;
            linkSeg.add(m);
          });
        } else {
          const outerX = lugSpanWidth * 0.38;
          const innerX = lugSpanWidth * 0.175;
          const l1 = new THREE.Mesh(outerGeo, mats.brushedMetal);
          l1.position.x = -outerX;
          const l5 = new THREE.Mesh(outerGeo, mats.brushedMetal);
          l5.position.x = outerX;
          const c2 = new THREE.Mesh(centerGeo, mats.centerLinkMetal);
          c2.position.x = -innerX;
          const c3 = new THREE.Mesh(centerGeo, mats.centerLinkMetal);
          c3.position.x = 0;
          const c4 = new THREE.Mesh(centerGeo, mats.centerLinkMetal);
          c4.position.x = innerX;

          [l1, l5, c2, c3, c4].forEach((m) => {
            m.castShadow = true;
            m.receiveShadow = true;
            linkSeg.add(m);
          });
        }
        braceletGroup.add(linkSeg);

        const jointU = i / linkCountPerSide;
        const jPos = curve.getPointAt(jointU);
        const jTaper = THREE.MathUtils.lerp(1.0, claspWidth / lugSpanWidth, jointU);
        const pin = new THREE.Mesh(pinGeo, mats.polishedMetal);
        pin.position.copy(jPos);
        pin.scale.set(jTaper, 1, 1);
        braceletGroup.add(pin);
      }

      const endPos = curve.getPointAt(1);
      const endPin = new THREE.Mesh(pinGeo, mats.polishedMetal);
      endPin.position.copy(endPos);
      endPin.scale.set(claspWidth / lugSpanWidth, 1, 1);
      braceletGroup.add(endPin);
    };

    placeLinksOnCurve(topCurve, 1);
    placeLinksOnCurve(botCurve, -1);
  } else {
    const strapMaterials =
      beltId === 'leather'
        ? [mats.leatherBelt, mats.leatherLining]
        : [mats.oysterflexBelt, mats.oysterflexBelt];
    const strapSingleMat =
      beltId === 'leather' ? mats.leatherBelt : mats.oysterflexBelt;
    const isOysterflex = beltId === 'oysterflex';

    (
      [
        { curve: topCurve, signY: 1 as const },
        { curve: botCurve, signY: -1 as const },
      ] as const
    ).forEach(({ curve, signY }) => {
      const strapGeo = trackGeo(
        createCurveSweptStrapGeometry(
          curve,
          signY,
          lugSpanWidth * 0.985,
          claspWidth * 0.95,
          isOysterflex ? 0.25 : 0.24,
          isOysterflex,
          isLeather ? lugAttachR : 0
        )
      );
      const strapMesh = new THREE.Mesh(strapGeo, strapMaterials);
      strapMesh.castShadow = true;
      strapMesh.receiveShadow = true;
      braceletGroup.add(strapMesh);

      if (isOysterflex) {
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
          createSculptedLinkGeometry(lugSpanWidth * 0.2, 1.32, 0.085, 'keeper')
        );
        [-lugSpanWidth * 0.21, lugSpanWidth * 0.21].forEach((fx) => {
          const fin = new THREE.Mesh(finGeo, mats.oysterflexBelt);
          fin.position.set(fx, finPos.y - ny * 0.115, finPos.z - nz * 0.115);
          fin.rotation.x = finRotX;
          braceletGroup.add(fin);
        });
      }

      if (isLeather) {
        // 3D Instanced Cream Contrast Saddle Stitching along left & right edges
        const stitchSteps = 18;
        const stitchGeo = trackGeo(new THREE.CapsuleGeometry(0.016, 0.095, 4, 8));
        const stitchInst = new THREE.InstancedMesh(
          stitchGeo,
          mats.leatherStitch,
          stitchSteps * 2
        );
        const stDummy = new THREE.Object3D();
        let idx = 0;
        for (let i = 1; i <= stitchSteps; i++) {
          const u = THREE.MathUtils.lerp(0.06, 0.94, i / (stitchSteps + 1));
          const pt = curve.getPointAt(u);
          const tan = curve.getTangentAt(u);
          const width = THREE.MathUtils.lerp(
            lugSpanWidth * 0.985,
            claspWidth * 0.95,
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

          [-width * 0.425, width * 0.425].forEach((sx) => {
            stDummy.position.set(sx, pt.y + ny * 0.088, pt.z + nz * 0.088);
            stDummy.rotation.set(rotX, 0, 0);
            stDummy.updateMatrix();
            stitchInst.setMatrixAt(idx++, stDummy.matrix);
          });
        }
        stitchInst.instanceMatrix.needsUpdate = true;
        stitchInst.computeBoundingSphere();
        braceletGroup.add(stitchInst);

        // 5 Punched Leather Sizing Holes along the lower 6h strap
        if (signY < 0) {
          const holeMat = trackMat(
            new THREE.MeshStandardMaterial({
              color: 0x0b0705,
              roughness: 0.9,
              metalness: 0.0,
            })
          );
          const holeGeo = trackGeo(new THREE.CylinderGeometry(0.038, 0.038, 0.255, 14));
          [0.54, 0.63, 0.72, 0.81, 0.9].forEach((hu) => {
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

    const keeperGeo = trackGeo(
      createSculptedLinkGeometry(claspWidth * 1.05, 0.24, 0.3, 'keeper')
    );
    [0.82, 0.91].forEach((ku) => {
      const kPos = topCurve.getPointAt(ku);
      const kTan = topCurve.getTangentAt(ku);
      const kTaper = THREE.MathUtils.lerp(1.0, claspWidth / lugSpanWidth, ku);
      const keeper = new THREE.Mesh(keeperGeo, strapSingleMat);
      keeper.position.copy(kPos);
      keeper.rotation.x = Math.atan2(kTan.z, kTan.y);
      keeper.scale.set(kTaper * 1.02, 1, 1);
      keeper.castShadow = true;
      braceletGroup.add(keeper);
    });
  }

  // Sculpted Clasp / Tang Buckle Assembly
  const claspGroup = new THREE.Group();
  claspGroup.position.set(0, 0, claspCenterZ);

  const topHingeZ = claspEdgeZ - claspCenterZ;
  const claspSwing = new THREE.Group();
  claspSwing.position.set(0, claspSpanY, topHingeZ);
  claspGroup.add(claspSwing);

  let flipLock: THREE.Object3D;
  let glidelockGroup: THREE.Group | null = null;

  if (isLeather) {
    // Classic Polished/Brushed Tang Pin Buckle Frame + Pivoting Tang Tongue Pin
    const buckleFrame = new THREE.Group();
    buckleFrame.position.set(0, -claspSpanY, -topHingeZ);

    const frameW = claspWidth * 1.12;
    const frameH = 0.74;
    const sideRailGeo = trackGeo(createRoundedLinkGeometry(0.11, frameH, 0.14, 0.025));
    const crossBarGeo = trackGeo(
      new THREE.CylinderGeometry(0.052, 0.052, frameW, 18)
    );
    crossBarGeo.rotateZ(Math.PI / 2);

    const leftRail = new THREE.Mesh(sideRailGeo, mats.bezelMetal);
    leftRail.position.set(-frameW * 0.45, 0, -0.04);
    leftRail.castShadow = true;
    leftRail.userData.interactive = 'clasp';
    interactiveMeshes.push(leftRail);

    const rightRail = new THREE.Mesh(sideRailGeo, mats.bezelMetal);
    rightRail.position.set(frameW * 0.45, 0, -0.04);
    rightRail.castShadow = true;
    rightRail.userData.interactive = 'clasp';
    interactiveMeshes.push(rightRail);

    const frontBar = new THREE.Mesh(crossBarGeo, mats.polishedMetal);
    frontBar.position.set(0, -frameH * 0.44, -0.04);
    frontBar.userData.interactive = 'clasp';
    interactiveMeshes.push(frontBar);

    const rearBar = new THREE.Mesh(crossBarGeo, mats.polishedMetal);
    rearBar.position.set(0, frameH * 0.44, -0.04);
    rearBar.userData.interactive = 'clasp';
    interactiveMeshes.push(rearBar);

    buckleFrame.add(leftRail, rightRail, frontBar, rearBar);
    claspSwing.add(buckleFrame);

    // Sculpted Pivoting Tang Tongue resting in center notch
    const tangPin = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.075, frameH * 0.92, 0.048, 0.012)),
      mats.polishedMetal
    );
    tangPin.position.set(0, -claspSpanY + 0.04, -topHingeZ - 0.12);
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
        0.27
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
    const glideRailGeo = trackGeo(createRoundedLinkGeometry(claspWidth * 0.84, 0.56, 0.11, 0.025));
    const glideRail = new THREE.Mesh(glideRailGeo, mats.polishedMetal);
    glideRail.position.set(0, -claspSpanY * 1.15, -topHingeZ + 0.06);
    const glideNotchGeo = trackGeo(new THREE.BoxGeometry(claspWidth * 0.72, 0.035, 0.035));
    for (let n = -2; n <= 2; n++) {
      const notch = new THREE.Mesh(glideNotchGeo, mats.movementPlate);
      notch.position.set(0, -claspSpanY * 1.15 + n * 0.09, -topHingeZ + 0.115);
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
          0.28
        )
      ),
      mats.centerLinkMetal
    );
    claspCenterStripe.position.set(0, -claspSpanY, -topHingeZ);
    claspSwing.add(claspCenterStripe);

    const flipLockMesh = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(claspWidth * 0.8, 0.44, 0.11, 0.032)),
      mats.polishedMetal
    );
    flipLockMesh.position.set(0, -claspSpanY * 0.35, -topHingeZ - 0.11);
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
    claspCrest.position.set(0, -claspSpanY + 0.04, -topHingeZ - 0.165);
    claspCrest.userData.interactive = 'clasp';
    interactiveMeshes.push(claspCrest);
    claspSwing.add(claspCrest);
  }

  const claspBarrelGeo = trackGeo(
    new THREE.CylinderGeometry(0.085, 0.085, claspWidth * 1.06, 20)
  );
  claspBarrelGeo.rotateZ(Math.PI / 2);
  [claspSpanY, -claspSpanY].forEach((by) => {
    const barrel = new THREE.Mesh(claspBarrelGeo, mats.polishedMetal);
    barrel.position.set(0, by, topHingeZ);
    claspGroup.add(barrel);
  });

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
  const dialDisc = new THREE.Mesh(
    trackGeo(createShapedDiscGeometry(dialR, 96, caseShape)),
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
  } else if (
    watch.brand !== 'CARTIER' &&
    watch.brand !== 'JAEGER-LECOULTRE' &&
    watch.brand !== 'A. LANGE & SÖHNE' &&
    watch.brand !== 'RICHARD MILLE' &&
    watch.brand !== 'PANERAI' &&
    watch.brand !== 'TAG HEUER' &&
    watch.brand !== 'IWC SCHAFFHAUSEN' &&
    watch.brand !== 'BREGUET'
  ) {
    for (let h = 0; h < 12; h++) {
      if (h === 3 && (watch.hasCyclops || watch.hasDateWindow) && watch.id !== 'omega-seamaster' && watch.id !== 'breitling-navitimer' && watch.id !== 'zenith-el-primero') continue;
      if (h === 6 && (watch.id === 'omega-seamaster' || watch.id === 'breitling-navitimer')) continue;
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

      if (
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
        watch.id === 'gs-snowflake' ||
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
          watch.id === 'zenith-el-primero'
        ) {
          markerHolder.scale.set(0.78, h === 0 ? 1.08 : 0.85, 1);
        }
        markerHolder.add(sur, lum);
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

  // --- 4. FACETED 3D DIHEDRAL HANDS ASSEMBLY (SUPPORTS LANGE 1 ASYMMETRIC PIVOT) ---
  const mainPivotX = watch.id === 'lange-1' ? -dialR * 0.24 : 0;
  const mainPivotY = watch.id === 'lange-1' ? -dialR * 0.045 : 0;
  handsGroup.position.z = 0.24;
  const mainHandsGroup = new THREE.Group();
  mainHandsGroup.position.set(mainPivotX, mainPivotY, 0);
  handsGroup.add(mainHandsGroup);

  const handLenScale = watch.id === 'lange-1' ? 0.56 : 1.0;
  const activeHandMat =
    watch.brand === 'CARTIER' || watch.handStyle === 'breguet-pomme'
      ? mats.bluedHands
      : watch.brand === 'A. LANGE & SÖHNE' || watch.id === 'tudor-bb58'
        ? mats.goldAccent
        : mats.handMetal;

  const pinionCap = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.082, 0.086, 0.09, 32)),
    activeHandMat
  );
  pinionCap.rotation.x = Math.PI / 2;
  mainHandsGroup.add(pinionCap);

  const hourHand = new THREE.Group();
  const hLen = dialR * 0.56 * handLenScale;
  const hStemMesh = new THREE.Mesh(
    trackGeo(
      createFacetedHandGeometry(
        hLen,
        watch.handStyle === 'breguet-pomme' ? 0.022 : 0.056,
        watch.handStyle === 'breguet-pomme' ? 0.009 : 0.016,
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
  } else if (watch.handStyle === 'breguet-pomme') {
    // Classic heat-blued Breguet open moon-tip (pomme evidee)
    const moonRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.068, 0.016, 12, 28)),
      activeHandMat
    );
    moonRing.position.set(0, hLen * 0.76, 0.008);
    hourHand.add(moonRing);
  } else if (watch.id === 'avi8-spitfire' || watch.id === 'cartier-santos' || watch.handStyle === 'pilot-sword') {
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
  } else {
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
  const mLen = dialR * 0.85 * handLenScale;
  const mStemMesh = new THREE.Mesh(
    trackGeo(
      createFacetedHandGeometry(
        mLen,
        watch.handStyle === 'breguet-pomme' ? 0.018 : 0.044,
        watch.handStyle === 'breguet-pomme' ? 0.007 : 0.012,
        0.016
      )
    ),
    activeHandMat
  );
  const mBoss = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24)),
    activeHandMat
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
  } else if (watch.handStyle === 'breguet-pomme') {
    const mMoon = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.052, 0.013, 12, 24)),
      activeHandMat
    );
    mMoon.position.set(0, mLen * 0.82, 0.007);
    minuteHand.add(mStemMesh, mBoss, mMoon);
  } else if (watch.id === 'avi8-spitfire' || watch.id === 'cartier-santos' || watch.handStyle === 'pilot-sword') {
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
    const gmtMat = watch.id === 'explorer2' ? mats.orangeAccent : mats.crimsonAccent;
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
        : watch.id === 'gs-snowflake'
          ? mats.bluedHands
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
    } else if (
      watch.brand !== 'CARTIER' &&
      watch.brand !== 'GRAND SEIKO' &&
      watch.brand !== 'A. LANGE & SÖHNE' &&
      watch.brand !== 'JAEGER-LECOULTRE' &&
      watch.brand !== 'BREGUET'
    ) {
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
    }
  }
  if (watch.id === 'lange-1') {
    // Small-seconds subdial at 4:30 moonphase center
    secondHand.position.set(dialR * 0.31, -dialR * 0.38, 0.032);
    secondHand.scale.setScalar(0.24);
  } else if (watch.id === 'jlc-reverso') {
    secondHand.position.set(0, -dialR * 0.62, 0.032);
    secondHand.scale.setScalar(0.24);
  } else if (watch.hasSmallSeconds === 9) {
    secondHand.position.set(-dialR * 0.44, 0, 0.032);
    secondHand.scale.setScalar(0.24);
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

  // Working Power-Reserve Indicator Hand (Grand Seiko Snowflake, Lange 1 AUF/AB, IWC Big Pilot)
  let powerReserveHand: THREE.Group | null = null;
  if (watch.hasPowerReserveHand) {
    powerReserveHand = new THREE.Group();
    if (watch.id === 'gs-snowflake') {
      powerReserveHand.position.set(-dialR * 0.3, -dialR * 0.25, 0.012);
    } else if (watch.id === 'iwc-big-pilot') {
      powerReserveHand.position.set(dialR * 0.54, 0, 0.012);
    } else {
      // Lange 1 3 o'clock AUF / AB gauge
      powerReserveHand.position.set(dialR * 0.51, -dialR * 0.025, 0.012);
    }
    const prNeedle = new THREE.Mesh(
      trackGeo(createFacetedHandGeometry(dialR * 0.16, 0.016, 0.005, 0.008)),
      watch.id === 'gs-snowflake'
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
  bezelGroup.position.z = 0.4;

  let activeBezelTex: THREE.CanvasTexture | null = null;
  let activeInsertMat: THREE.MeshPhysicalMaterial | null = null;

  if (caseShape !== 'round') {
    const shapedBezelGeo = trackGeo(
      createShapedBezelRingGeometry(bezelInnerR, bezelOuterR, caseShape)
    );
    const shapedBezelMesh = new THREE.Mesh(shapedBezelGeo, mats.brushedMetal);
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
      // Vacheron Constantin Overseas: smooth satin ring + 6 chamfered Maltese-cross notched bosses
      const smoothProfile = new THREE.SplineCurve([
        new THREE.Vector2(bezelInnerR, -0.02),
        new THREE.Vector2(bezelInnerR + 0.02, 0.128),
        new THREE.Vector2((bezelInnerR + bezelOuterR) * 0.52, 0.14),
        new THREE.Vector2(bezelOuterR * 0.96, 0.088),
        new THREE.Vector2(bezelOuterR, -0.04),
      ]);
      const ovGeo = trackGeo(new THREE.LatheGeometry(smoothProfile.getPoints(18), 96));
      ovGeo.rotateX(Math.PI / 2);
      const ovBase = new THREE.Mesh(ovGeo, mats.brushedMetal);
      ovBase.castShadow = true;
      bezelGroup.add(ovBase);

      const wingGeo = trackGeo(
        createRoundedLinkGeometry(0.32, (bezelOuterR - bezelInnerR) * 0.78, 0.052, 0.015)
      );
      const wingR = (bezelInnerR + bezelOuterR) * 0.51;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const wing = new THREE.Mesh(wingGeo, mats.polishedMetal);
        wing.position.set(Math.cos(a) * wingR, Math.sin(a) * wingR, 0.135);
        wing.rotation.z = a - Math.PI / 2;
        wing.castShadow = true;
        bezelGroup.add(wing);
      }
    } else if (watch.bezelType === 'smooth') {
      const smoothProfile =
        watch.id === 'avi8-spitfire'
          ? new THREE.SplineCurve([
              new THREE.Vector2(bezelInnerR, -0.02),
              new THREE.Vector2(bezelInnerR + 0.018, 0.135),
              new THREE.Vector2(bezelInnerR + 0.16, 0.135),
              new THREE.Vector2(bezelOuterR * 0.94, 0.088),
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
        watch.id === 'avi8-spitfire' ? mats.brushedMetal : mats.bezelMetal
      );
      smoothDome.castShadow = true;
      bezelGroup.add(smoothDome);
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
      if (watch.bezelType === 'steel-24h') {
        activeInsertMat.metalness = 0.92;
        activeInsertMat.roughness = 0.28;
        activeInsertMat.clearcoat = 0.12;
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

      if (watch.bezelType === 'dive-cerachrom' || watch.bezelType === 'seamaster') {
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
  crystalGroup.position.z = 0.525;
  const crystalMesh = new THREE.Mesh(
    trackGeo(
      caseShape === 'round'
        ? createDomedSapphireGeometry(dialR + 0.026, Boolean(watch.greenSapphire || watch.highDomeSapphire))
        : createShapedDiscGeometry(dialR + 0.024, 96, caseShape)
    ),
    mats.sapphireCrystal
  );
  if (caseShape !== 'round') {
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

  // --- 7. INTERNAL PERPETUAL CALIBER (TOOTHED GEARS + GENEVA BRIDGES + BLUED SCREWS) ---
  caliberGroup.position.z = -0.14;

  const perlageTex = createPerlageTexture(maxAnisotropy);
  const plateMat = trackMat(mats.movementPlate.clone());
  plateMat.map = perlageTex;

  const mainPlate = new THREE.Mesh(
    trackGeo(createShapedMainPlateGeometry(dialR * 0.91, 0.12, caseShape)),
    plateMat
  );
  if (options?.xrayDial) {
    mainPlate.visible = false;
  }
  caliberGroup.add(mainPlate);

  const gearWheels: THREE.Mesh[] = [];
  const frontSpecs = [
    { x: -0.34, y: 0.28, r: 0.36, teeth: 26, z: 0.18 },
    { x: 0.36, y: 0.24, r: 0.3, teeth: 22, z: 0.18 },
    { x: 0.0, y: -0.26, r: 0.38, teeth: 28, z: 0.18 },
    { x: -0.4, y: 0.34, r: 0.39, teeth: 28, z: -0.09 },
    { x: 0.31, y: 0.42, r: 0.31, teeth: 22, z: -0.09 },
    { x: 0.04, y: -0.05, r: 0.36, teeth: 26, z: -0.1 },
    { x: -0.43, y: -0.34, r: 0.27, teeth: 20, z: -0.09 },
  ];
  frontSpecs.forEach((gs) => {
    const wheel = new THREE.Mesh(
      trackGeo(createToothedGearGeometry(gs.r, gs.teeth, 0.032)),
      mats.movementBrass
    );
    wheel.position.set(gs.x, gs.y, gs.z);
    gearWheels.push(wheel);
    const ruby = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.05, 0.05, 0.048, 20)),
      mats.movementRuby
    );
    ruby.rotation.x = Math.PI / 2;
    ruby.position.set(gs.x, gs.y, gs.z + (gs.z > 0 ? 0.008 : -0.01));
    caliberGroup.add(wheel, ruby);
  });

  const geneveTex = createCotesDeGeneveTexture(maxAnisotropy);
  const bridgeMat = trackMat(mats.movementBridge.clone());
  bridgeMat.map = geneveTex;
  if (watch.id === 'lange-1') {
    // Untreated Glashütte German silver (maillechort) warm champagne-silver tone
    bridgeMat.color.setHex(0xe5decb);
  } else if (watch.id === 'rm-tonneau') {
    // Micro-blasted PVD Grade 5 titanium racing bridges
    bridgeMat.color.setHex(0x282d33);
    bridgeMat.roughness = 0.42;
  }

  const bridgeShape = new THREE.Shape();
  const bR = dialR * 0.86;
  if (watch.id === 'lange-1') {
    // Iconic Glashütte 3/4 plate covering 75% of the movement
    bridgeShape.absarc(0, 0, bR, Math.PI * 0.05, Math.PI * 1.45, false);
    bridgeShape.lineTo(0.04, -0.04);
    bridgeShape.closePath();
  } else {
    bridgeShape.absarc(0, 0, bR, Math.PI * 0.15, Math.PI * 0.88, false);
    bridgeShape.quadraticCurveTo(-0.2, 0.15, 0.55, 0.18);
    bridgeShape.closePath();
  }
  const mainBridgeGeo = trackGeo(
    new THREE.ExtrudeGeometry(bridgeShape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 3,
    })
  );
  const mainBridge = new THREE.Mesh(mainBridgeGeo, bridgeMat);
  mainBridge.position.z = -0.155;
  caliberGroup.add(mainBridge);

  // Caliber-specific horological details underneath rotor:
  // 1. Chronographs: 8-pillar Column-Wheel + Horizontal Clutch Coupling Yoke
  if (watch.hasChronoPushers) {
    const colWheel = new THREE.Mesh(
      trackGeo(createToothedGearGeometry(0.145, 8, 0.044)),
      mats.bluedScrew
    );
    colWheel.position.set(-0.26, 0.52, -0.155);
    const colCap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.068, 0.068, 0.052, 16)),
      mats.polishedMetal
    );
    colCap.rotation.x = Math.PI / 2;
    colCap.position.set(-0.26, 0.52, -0.155);
    const clutchLever = new THREE.Mesh(
      trackGeo(createRoundedLinkGeometry(0.56, 0.042, 0.024, 0.005)),
      mats.polishedMetal
    );
    clutchLever.position.set(-0.08, 0.25, -0.145);
    clutchLever.rotation.z = -0.78;
    caliberGroup.add(colWheel, colCap, clutchLever);
  }

  // 2. Lange 1: Screwed 18k Gold Chatons cradling Pigeon-Blood Rubies on 3/4 plate
  if (watch.id === 'lange-1') {
    const chatonCollarGeo = trackGeo(new THREE.TorusGeometry(0.064, 0.016, 10, 20));
    const chatonRubyGeo = trackGeo(new THREE.CylinderGeometry(0.044, 0.044, 0.03, 16));
    chatonRubyGeo.rotateX(Math.PI / 2);
    [
      { x: -0.45, y: 0.38 },
      { x: -0.12, y: 0.56 },
      { x: -0.52, y: -0.22 },
    ].forEach((pos) => {
      const collar = new THREE.Mesh(chatonCollarGeo, mats.goldAccent);
      collar.position.set(pos.x, pos.y, -0.16);
      const jewel = new THREE.Mesh(chatonRubyGeo, mats.movementRuby);
      jewel.position.set(pos.x, pos.y, -0.16);
      caliberGroup.add(collar, jewel);
    });
  }

  const screwGeo = trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.025, 16));
  screwGeo.rotateX(Math.PI / 2);
  [
    { x: -0.58, y: 0.55 },
    { x: 0.02, y: 0.78 },
    { x: 0.52, y: 0.52 },
    { x: -0.18, y: 0.38 },
  ].forEach((sc) => {
    const screw = new THREE.Mesh(
      screwGeo,
      watch.id === 'rm-tonneau' ? mats.goldAccent : mats.bluedScrew
    );
    screw.position.set(sc.x, sc.y, -0.16);
    caliberGroup.add(screw);
  });

  const balanceWheel = new THREE.Group();
  balanceWheel.position.set(0.42, -0.37, -0.12);
  const balRim = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.27, 0.024, 12, 36)),
    mats.goldAccent
  );
  const balBar = new THREE.Mesh(
    trackGeo(createRoundedLinkGeometry(0.52, 0.032, 0.02, 0.005)),
    mats.goldAccent
  );
  const balRuby = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.048, 0.048, 0.06, 20)),
    mats.movementRuby
  );
  balRuby.rotation.x = Math.PI / 2;

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

  // Oscillating Ruby-Tipped Swiss Lever Pallet Fork adjacent to balance wheel
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
  caliberGroup.add(balanceWheel, hairspring, palletFork);

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
    watch.id === 'omega-speedmaster' ||
    watch.id === 'jlc-reverso' ||
    watch.id === 'lange-1';

  if (!isManualWind) {
    const isMicroRotor = watch.id === 'pp-nautilus';
    const isVacheron = watch.id === 'vc-overseas';
    const isAp = watch.id === 'ap-royal-oak';
    const isZenith = watch.id === 'zenith-el-primero';
    const isTudor = watch.id === 'tudor-bb58';
    const isOmega = watch.id === 'omega-seamaster';

    if (isMicroRotor) {
      // Patek-inspired off-center 22k gold micro-rotor exposing Geneva stripes
      const microWeight = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.38, 0.38, 0.052, 28)),
        mats.goldAccent
      );
      microWeight.rotation.x = Math.PI / 2;
      microWeight.position.set(dialR * 0.36, -dialR * 0.24, 0.01);
      const microPin = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.09, 0.09, 0.065, 16)),
        mats.polishedMetal
      );
      microPin.rotation.x = Math.PI / 2;
      microPin.position.copy(microWeight.position);
      perpetualRotor.add(microWeight, microPin);
    } else {
      const rotorHub = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.21, 0.21, 0.06, 32)),
        mats.polishedMetal
      );
      rotorHub.rotation.x = Math.PI / 2;
      perpetualRotor.add(rotorHub);

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
          depth: 0.048,
          bevelEnabled: true,
          bevelThickness: 0.012,
          bevelSize: 0.012,
          bevelSegments: 3,
          curveSegments: 24,
        })
      );
      rotorArcGeo.translate(0, 0, -0.024);
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
        // Openworked Maltese Cross central arms + V-arms
        for (let m = 0; m < 4; m++) {
          const ma = (m / 4) * Math.PI * 2;
          const crossArm = new THREE.Mesh(
            trackGeo(createRoundedLinkGeometry(0.18, 0.058, 0.03, 0.006)),
            mats.goldAccent
          );
          crossArm.position.set(Math.cos(ma) * 0.14, Math.sin(ma) * 0.14, 0.01);
          crossArm.rotation.z = ma;
          perpetualRotor.add(crossArm);
        }
        [-0.48, 0.48].forEach((ang) => {
          const spoke = new THREE.Mesh(
            trackGeo(createRoundedLinkGeometry(rIn, 0.042, 0.03, 0.006)),
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
            trackGeo(createRoundedLinkGeometry(rIn, 0.056, 0.035, 0.008)),
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

  casebackGroup.position.z = -caseDepth * 0.4;
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
      const nextTex = createDialTexture(nextWatch, nextDial, aniso, dateOverride);
      dialMat.map = nextTex;
      dialMat.needsUpdate = true;
      activeDialTex.dispose();
      activeDialTex = nextTex;
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
