import * as THREE from 'three';
import {
  AlloyOption,
  BeltShadeOption,
  LightingModeId,
  LumePalette,
  WristStyleId,
} from '@/lib/watches';
import {
  createAlligatorLeatherTextures,
  createBrushedMetalBumpTexture,
  createCalfskinLiningTexture,
  createOysterflexBumpTexture,
} from './textures';

export interface WatchMaterialSet {
  brushedMetal: THREE.MeshPhysicalMaterial;
  polishedMetal: THREE.MeshPhysicalMaterial;
  centerLinkMetal: THREE.MeshPhysicalMaterial;
  bezelMetal: THREE.MeshPhysicalMaterial;
  goldAccent: THREE.MeshPhysicalMaterial;
  cerachromBezel: THREE.MeshPhysicalMaterial;
  dialSurface: THREE.MeshStandardMaterial;
  sapphireCrystal: THREE.MeshPhysicalMaterial;
  chromalightLume: THREE.MeshStandardMaterial;
  secondaryLume: THREE.MeshStandardMaterial;
  handMetal: THREE.MeshPhysicalMaterial;
  bluedHands: THREE.MeshPhysicalMaterial;
  matteBlackHands: THREE.MeshPhysicalMaterial;
  ivoryCreamHands: THREE.MeshPhysicalMaterial;
  crimsonAccent: THREE.MeshPhysicalMaterial;
  orangeAccent: THREE.MeshPhysicalMaterial;
  sapphireCabochon: THREE.MeshPhysicalMaterial;
  waterDroplet: THREE.MeshPhysicalMaterial;
  wristMannequin: THREE.MeshPhysicalMaterial;
  wristCuff: THREE.MeshPhysicalMaterial;
  movementPlate: THREE.MeshStandardMaterial;
  movementBridge: THREE.MeshPhysicalMaterial;
  movementBrass: THREE.MeshPhysicalMaterial;
  movementRuby: THREE.MeshPhysicalMaterial;
  bluedScrew: THREE.MeshPhysicalMaterial;
  leatherBelt: THREE.MeshPhysicalMaterial;
  leatherLining: THREE.MeshPhysicalMaterial;
  leatherStitch: THREE.MeshStandardMaterial;
  oysterflexBelt: THREE.MeshPhysicalMaterial;
  disposables: (THREE.Material | THREE.Texture)[];
}

const _baseCol = new THREE.Color();
const _patinaUmber = new THREE.Color(0x4b3522);
const _patinaVerdigris = new THREE.Color(0x3a5d4b);

export type CaseSurfaceFinish = 'standard' | 'resin' | 'sandblasted';

export function applyAlloyToMaterialSet(
  mats: WatchMaterialSet,
  alloy: AlloyOption,
  patina = 0,
  caseFinish: CaseSurfaceFinish = 'standard'
) {
  const p = THREE.MathUtils.clamp(patina, 0, 1);

  const blendPatina = (hex: number, target: THREE.Color) => {
    _baseCol.setHex(hex);
    if (p > 0.005) {
      _baseCol.lerp(_patinaUmber, Math.min(1, p * 1.15));
      if (p > 0.52) {
        _baseCol.lerp(_patinaVerdigris, (p - 0.52) * 0.68);
      }
    }
    target.copy(_baseCol);
  };

  blendPatina(alloy.primaryColor, mats.brushedMetal.color);
  blendPatina(alloy.primaryColor, mats.polishedMetal.color);
  blendPatina(alloy.centerColor, mats.centerLinkMetal.color);
  blendPatina(alloy.bezelMetalColor, mats.bezelMetal.color);

  if (caseFinish === 'resin') {
    // Matte shock-absorbing polymer resin (G-Shock / F-91W default finish)
    mats.brushedMetal.metalness = 0.08;
    mats.brushedMetal.roughness = Math.min(0.88, 0.68 + p * 0.16);
    mats.brushedMetal.anisotropy = 0;
    mats.brushedMetal.bumpScale = 0.003;
    mats.brushedMetal.envMapIntensity = 0.55;

    mats.polishedMetal.metalness = 0.1;
    mats.polishedMetal.roughness = Math.min(0.84, 0.58 + p * 0.18);
    mats.polishedMetal.clearcoat = 0.08;
    mats.polishedMetal.envMapIntensity = 0.65;

    mats.centerLinkMetal.metalness = 0.08;
    mats.centerLinkMetal.roughness = 0.66;
    mats.centerLinkMetal.clearcoat = 0.06;
    mats.centerLinkMetal.envMapIntensity = 0.55;

    mats.bezelMetal.metalness = 0.08;
    mats.bezelMetal.roughness = Math.min(0.86, 0.64 + p * 0.16);
    mats.bezelMetal.clearcoat = 0.08;
    mats.bezelMetal.envMapIntensity = 0.6;
  } else if (caseFinish === 'sandblasted') {
    // Micro-blasted monochrome matte Grade 5 Titanium (Bulgari Octo Finissimo)
    mats.brushedMetal.metalness = 0.86;
    mats.brushedMetal.roughness = Math.min(0.66, 0.46 + p * 0.16);
    mats.brushedMetal.anisotropy = 0.08;
    mats.brushedMetal.bumpScale = 0.002;
    mats.brushedMetal.envMapIntensity = 0.92;

    mats.polishedMetal.metalness = 0.86;
    mats.polishedMetal.roughness = Math.min(0.62, 0.42 + p * 0.16);
    mats.polishedMetal.clearcoat = 0.04;
    mats.polishedMetal.envMapIntensity = 0.95;

    mats.centerLinkMetal.metalness = 0.86;
    mats.centerLinkMetal.roughness = 0.44;
    mats.centerLinkMetal.clearcoat = 0.04;
    mats.centerLinkMetal.envMapIntensity = 0.92;

    mats.bezelMetal.metalness = 0.86;
    mats.bezelMetal.roughness = Math.min(0.64, 0.44 + p * 0.16);
    mats.bezelMetal.clearcoat = 0.05;
    mats.bezelMetal.envMapIntensity = 0.96;
  } else {
    mats.brushedMetal.metalness = 0.96;
    mats.brushedMetal.roughness = 0.24 + p * 0.34;
    mats.brushedMetal.anisotropy = 0.9;
    mats.brushedMetal.bumpScale = 0.007;
    mats.brushedMetal.envMapIntensity = 1.48;

    mats.polishedMetal.metalness = 1.0;
    mats.polishedMetal.roughness = 0.045 + p * 0.28;
    mats.polishedMetal.clearcoat = Math.max(0.08, 0.45 * (1 - p * 0.78));
    mats.polishedMetal.envMapIntensity = 1.78;

    mats.centerLinkMetal.metalness = 1.0;
    mats.centerLinkMetal.roughness = 0.055;
    mats.centerLinkMetal.clearcoat = 0.45;
    mats.centerLinkMetal.envMapIntensity = 1.75;

    mats.bezelMetal.metalness = 1.0;
    mats.bezelMetal.roughness = 0.048 + p * 0.26;
    mats.bezelMetal.clearcoat = Math.max(0.08, 0.5 * (1 - p * 0.78));
    mats.bezelMetal.envMapIntensity = 1.85;
  }

  mats.handMetal.color.setHex(
    alloy.id === 'yellow-gold' || alloy.id === 'rolesor'
      ? 0xe7c66d
      : alloy.bezelMetalColor === 0xa6784b
        ? 0xdcc08e
        : 0xf0f3f5
  );
}

export function applyBeltShadeToMaterialSet(
  mats: WatchMaterialSet,
  shade: BeltShadeOption
) {
  mats.leatherBelt.color.setHex(shade.leatherHex);
  if (mats.leatherBelt.sheenColor) {
    mats.leatherBelt.sheenColor.setHex(shade.sheenHex);
  }
  mats.leatherStitch.color.setHex(shade.stitchHex);
  mats.oysterflexBelt.color.setHex(shade.rubberHex);
}

export function applyLumePaletteToMaterialSet(
  mats: WatchMaterialSet,
  lume: LumePalette | undefined,
  nocturne: boolean,
  charge = 0
) {
  const intensity = nocturne ? 0.72 + charge * 0.62 : 0.06;
  const pLit = lume?.primaryLitHex ?? 0x7dd3fc;
  const pEm = lume?.primaryEmissiveHex ?? 0x0ea5e9;
  const sLit = lume?.secondaryLitHex ?? pLit;
  const sEm = lume?.secondaryEmissiveHex ?? pEm;

  mats.chromalightLume.color.setHex(nocturne ? pLit : 0xf2f6f9);
  mats.chromalightLume.emissive.setHex(pEm);
  mats.chromalightLume.emissiveIntensity = intensity;

  mats.secondaryLume.color.setHex(nocturne ? sLit : 0xf2f6f9);
  mats.secondaryLume.emissive.setHex(sEm);
  mats.secondaryLume.emissiveIntensity = intensity;
}

export function applyWristStyleToMaterialSet(
  mats: WatchMaterialSet,
  styleId: WristStyleId
) {
  if (styleId === 'navy-tailor') {
    mats.wristMannequin.color.setHex(0xc89d7c);
    mats.wristMannequin.roughness = 0.62;
    mats.wristMannequin.sheenColor?.setHex(0xdeb89a);
    mats.wristCuff.color.setHex(0x16243d);
    mats.wristCuff.roughness = 0.82;
    mats.wristCuff.sheenColor?.setHex(0x2c446e);
  } else if (styleId === 'espresso-suede') {
    mats.wristMannequin.color.setHex(0x8c674e);
    mats.wristMannequin.roughness = 0.65;
    mats.wristMannequin.sheenColor?.setHex(0xa98266);
    mats.wristCuff.color.setHex(0x3b2618);
    mats.wristCuff.roughness = 0.9;
    mats.wristCuff.sheenColor?.setHex(0x5c3c27);
  } else {
    mats.wristMannequin.color.setHex(0x22262b);
    mats.wristMannequin.roughness = 0.68;
    mats.wristMannequin.sheenColor?.setHex(0x3a4048);
    mats.wristCuff.color.setHex(0x13171b);
    mats.wristCuff.roughness = 0.85;
    mats.wristCuff.sheenColor?.setHex(0x283038);
  }
}

export function createWatchMaterialSet(
  alloy: AlloyOption,
  isSoftwareGl: boolean,
  lightingMode: LightingModeId,
  maxAnisotropy = 4,
  patina = 0,
  beltShade?: BeltShadeOption,
  lumePalette?: LumePalette,
  wristStyle?: WristStyleId,
  caseFinish: CaseSurfaceFinish = 'standard'
): WatchMaterialSet {
  const brushedBump = createBrushedMetalBumpTexture();
  const leatherTex = createAlligatorLeatherTextures(maxAnisotropy);
  const calfskinTex = createCalfskinLiningTexture(maxAnisotropy);
  const oysterflexBump = createOysterflexBumpTexture();

  const brushedMetal = new THREE.MeshPhysicalMaterial({
    color: alloy.primaryColor,
    metalness: 0.96,
    roughness: 0.24,
    anisotropy: 0.9,
    anisotropyRotation: Math.PI / 2,
    bumpMap: brushedBump,
    bumpScale: 0.007,
    envMapIntensity: 1.48,
  });

  const polishedMetal = new THREE.MeshPhysicalMaterial({
    color: alloy.primaryColor,
    metalness: 1.0,
    roughness: 0.045,
    clearcoat: 0.45,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.78,
  });

  const centerLinkMetal = new THREE.MeshPhysicalMaterial({
    color: alloy.centerColor,
    metalness: 1.0,
    roughness: 0.055,
    clearcoat: 0.45,
    clearcoatRoughness: 0.045,
    envMapIntensity: 1.75,
  });

  const bezelMetal = new THREE.MeshPhysicalMaterial({
    color: alloy.bezelMetalColor,
    metalness: 1.0,
    roughness: 0.048,
    clearcoat: 0.5,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.85,
  });

  const goldAccent = new THREE.MeshPhysicalMaterial({
    color: 0xe6c36a,
    metalness: 1.0,
    roughness: 0.075,
    clearcoat: 0.35,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.65,
  });

  const cerachromBezel = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.16,
    roughness: 0.06,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.65,
  });

  const dialSurface = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.42,
    roughness: 0.25,
    envMapIntensity: 1.15,
  });

  const sapphireCrystal = new THREE.MeshPhysicalMaterial({
    color: lumePalette?.arCrystalTintHex ?? 0xf4f8ff,
    metalness: 0.0,
    roughness: 0.012,
    transmission: 0,
    transparent: true,
    opacity: 0.072,
    ior: 1.77,
    reflectivity: 1.0,
    iridescence: isSoftwareGl ? 0 : 0.42,
    iridescenceIOR: 1.38,
    iridescenceThicknessRange: [180, 420],
    clearcoat: 1.0,
    clearcoatRoughness: 0.012,
    envMapIntensity: isSoftwareGl ? 1.2 : 2.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const isNocturne = lightingMode === 'nocturne';
  const chromalightLume = new THREE.MeshStandardMaterial({
    color: isNocturne ? (lumePalette?.primaryLitHex ?? 0x7dd3fc) : 0xf2f6f9,
    emissive: lumePalette?.primaryEmissiveHex ?? 0x0ea5e9,
    emissiveIntensity: isNocturne ? 0.78 : 0.06,
    roughness: 0.38,
    metalness: 0.04,
  });

  const secondaryLume = new THREE.MeshStandardMaterial({
    color: isNocturne ? (lumePalette?.secondaryLitHex ?? 0x7dd3fc) : 0xf2f6f9,
    emissive: lumePalette?.secondaryEmissiveHex ?? 0x0ea5e9,
    emissiveIntensity: isNocturne ? 0.78 : 0.06,
    roughness: 0.38,
    metalness: 0.04,
  });

  const handMetal = new THREE.MeshPhysicalMaterial({
    color:
      alloy.id === 'yellow-gold' || alloy.id === 'rolesor'
        ? 0xe7c66d
        : alloy.bezelMetalColor === 0xa6784b
          ? 0xdcc08e
          : 0xf0f3f5,
    metalness: 1.0,
    roughness: 0.055,
    clearcoat: 0.35,
    envMapIntensity: 1.75,
  });

  const bluedHands = new THREE.MeshPhysicalMaterial({
    color: 0x163b84,
    metalness: 0.96,
    roughness: 0.075,
    clearcoat: 0.65,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.85,
  });

  const matteBlackHands = new THREE.MeshPhysicalMaterial({
    color: 0x181b20,
    metalness: 0.38,
    roughness: 0.42,
    clearcoat: 0.08,
    envMapIntensity: 0.85,
  });

  const ivoryCreamHands = new THREE.MeshPhysicalMaterial({
    color: 0xf7f1df,
    metalness: 0.14,
    roughness: 0.24,
    clearcoat: 0.4,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.15,
  });

  const crimsonAccent = new THREE.MeshPhysicalMaterial({
    color: 0xb91c1c,
    metalness: 0.2,
    roughness: 0.2,
    clearcoat: 0.75,
    envMapIntensity: 1.2,
  });

  const orangeAccent = new THREE.MeshPhysicalMaterial({
    color: 0xea580c,
    metalness: 0.2,
    roughness: 0.22,
    clearcoat: 0.75,
    envMapIntensity: 1.25,
  });

  const sapphireCabochon = new THREE.MeshPhysicalMaterial({
    color: 0x143c96,
    metalness: 0.08,
    roughness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    ior: 1.77,
    envMapIntensity: 2.0,
  });

  const waterDroplet = new THREE.MeshPhysicalMaterial({
    color: 0xeaf6ff,
    metalness: 0.0,
    roughness: 0.015,
    transparent: true,
    opacity: 0.44,
    ior: 1.333,
    reflectivity: 0.98,
    clearcoat: 1.0,
    clearcoatRoughness: 0.01,
    envMapIntensity: isSoftwareGl ? 1.4 : 2.6,
    depthWrite: false,
  });

  const wristMannequin = new THREE.MeshPhysicalMaterial({
    color: 0x22262b,
    metalness: 0.05,
    roughness: 0.68,
    sheen: 0.35,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color(0x3a4048),
    envMapIntensity: 0.65,
  });

  const wristCuff = new THREE.MeshPhysicalMaterial({
    color: 0x13171b,
    metalness: 0.02,
    roughness: 0.85,
    sheen: 0.4,
    sheenRoughness: 0.78,
    sheenColor: new THREE.Color(0x283038),
    envMapIntensity: 0.45,
  });

  const movementPlate = new THREE.MeshStandardMaterial({
    color: 0xd2d6dc,
    metalness: 0.9,
    roughness: 0.24,
    envMapIntensity: 1.35,
  });

  const movementBridge = new THREE.MeshPhysicalMaterial({
    color: 0xe3e7ec,
    metalness: 0.94,
    roughness: 0.19,
    anisotropy: 0.75,
    envMapIntensity: 1.55,
  });

  const movementBrass = new THREE.MeshPhysicalMaterial({
    color: 0xd9ae4c,
    metalness: 0.98,
    roughness: 0.15,
    envMapIntensity: 1.55,
  });

  const movementRuby = new THREE.MeshPhysicalMaterial({
    color: 0xd91b42,
    metalness: 0.05,
    roughness: 0.06,
    clearcoat: 1.0,
    emissive: 0x3b0712,
    emissiveIntensity: 0.35,
    envMapIntensity: 1.5,
  });

  const bluedScrew = new THREE.MeshPhysicalMaterial({
    color: 0x1e4d92,
    metalness: 0.95,
    roughness: 0.08,
    clearcoat: 0.6,
    envMapIntensity: 1.7,
  });

  const leatherBelt = new THREE.MeshPhysicalMaterial({
    map: leatherTex.map,
    bumpMap: leatherTex.bumpMap,
    bumpScale: 0.035,
    roughness: 0.46,
    metalness: 0.03,
    clearcoat: 0.16,
    clearcoatRoughness: 0.42,
    sheen: 0.45,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color(0x5c3e2b),
    envMapIntensity: 1.05,
    side: THREE.FrontSide,
  });

  const leatherLining = new THREE.MeshPhysicalMaterial({
    map: calfskinTex,
    roughness: 0.68,
    metalness: 0.0,
    sheen: 0.5,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color(0xb08354),
    envMapIntensity: 0.65,
    side: THREE.FrontSide,
  });

  const leatherStitch = new THREE.MeshStandardMaterial({
    color: 0xdfd0a8,
    roughness: 0.62,
    metalness: 0.02,
  });

  const oysterflexBelt = new THREE.MeshPhysicalMaterial({
    color: 0x1c1f22,
    bumpMap: oysterflexBump,
    bumpScale: 0.022,
    roughness: 0.56,
    metalness: 0.04,
    clearcoat: 0.14,
    clearcoatRoughness: 0.48,
    sheen: 0.25,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color(0x2d3238),
    envMapIntensity: 0.95,
    side: THREE.FrontSide,
  });

  const set: WatchMaterialSet = {
    brushedMetal,
    polishedMetal,
    centerLinkMetal,
    bezelMetal,
    goldAccent,
    cerachromBezel,
    dialSurface,
    sapphireCrystal,
    chromalightLume,
    secondaryLume,
    handMetal,
    bluedHands,
    matteBlackHands,
    ivoryCreamHands,
    crimsonAccent,
    orangeAccent,
    sapphireCabochon,
    waterDroplet,
    wristMannequin,
    wristCuff,
    movementPlate,
    movementBridge,
    movementBrass,
    movementRuby,
    bluedScrew,
    leatherBelt,
    leatherLining,
    leatherStitch,
    oysterflexBelt,
    disposables: [
      brushedMetal,
      polishedMetal,
      centerLinkMetal,
      bezelMetal,
      goldAccent,
      cerachromBezel,
      dialSurface,
      sapphireCrystal,
      chromalightLume,
      secondaryLume,
      handMetal,
      bluedHands,
      matteBlackHands,
      ivoryCreamHands,
      crimsonAccent,
      orangeAccent,
      sapphireCabochon,
      waterDroplet,
      wristMannequin,
      wristCuff,
      movementPlate,
      movementBridge,
      movementBrass,
      movementRuby,
      bluedScrew,
      leatherBelt,
      leatherLining,
      leatherStitch,
      oysterflexBelt,
    ],
  };

  if (patina > 0 || caseFinish !== 'standard') {
    applyAlloyToMaterialSet(set, alloy, patina, caseFinish);
  }
  if (beltShade) {
    applyBeltShadeToMaterialSet(set, beltShade);
  }
  if (wristStyle) {
    applyWristStyleToMaterialSet(set, wristStyle);
  }
  return set;
}
