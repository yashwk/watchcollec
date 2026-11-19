import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import {
  AlloyId,
  BeltId,
  BeltShadeId,
  BezelId,
  CaliberBeatProfile,
  CameraPresetId,
  CrownPosition,
  DialId,
  LightingModeId,
  WatchModelId,
  WatchSpec,
  WristStyleId,
  getWatchById,
  resolveAlloy,
  resolveBeltShade,
  resolveBezel,
  resolveCaliberBeatProfile,
  resolveDial,
  resolveLumePalette,
  resolveWatchCapabilities,
} from '@/lib/watches';
import {
  WatchMaterialSet,
  applyAlloyToMaterialSet,
  applyBeltShadeToMaterialSet,
  applyLumePaletteToMaterialSet,
  applyWristStyleToMaterialSet,
  createWatchMaterialSet,
} from './materials';
import { horologyAudio } from './soundEngine';
import {
  DialDateOverride,
  createCausticsFloorTexture,
  createMoteTexture,
  releaseStaticTextures,
  retainStaticTextures,
} from './textures';
import { WatchRig, buildWatchAssembly } from './watchBuilder';

export interface StudioState {
  modelId: WatchModelId;
  alloyId: AlloyId;
  dialId: DialId;
  bezelId: BezelId;
  beltId: BeltId;
  beltShadeId?: BeltShadeId;
  exhibitionBack: boolean;
  explodeTarget: number;
  lightingMode: LightingModeId;
  autoRotate: boolean;
  liveTime: boolean;
  gmtTimezoneOffset: number;
  flipped: boolean;
  gallerySweep: boolean;
  loupeActive: boolean;
  cinemaMode: boolean;
  crownPosition: CrownPosition;
  claspOpen: boolean;
  soundEnabled: boolean;
  xrayDial: boolean;
  compareModelId: WatchModelId | null;
  customEngraving: string;
  patina: number;
  wetStage: boolean;
  wristMode: boolean;
  wristMm: number;
  wristStyle: WristStyleId;
  timegrapherMode?: boolean;
  uvTorch: boolean;
  reversoFlipped: boolean;
  caliperMode: boolean;
  glidelockMm: number;
  stageShiftX?: number;
}

export interface TimegrapherTelemetry {
  positionLabel: string;
  vph: number;
  beatHz: number;
  isSpringDrive: boolean;
  isQuartz: boolean;
  isHacked: boolean;
  amplitudeDeg: number;
  beatErrorMs: number;
  rateSecPerDay: number;
  liftAngleDeg: number;
  tickIndex: number;
}

export interface ChronoTelemetry {
  elapsedSec: number;
  running: boolean;
  splitSec: number | null;
  unitsPerHour: number | null;
}

export interface ExplodeCallout {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface CaliperCallout {
  id: string;
  label: string;
  value: string;
  x: number;
  y: number;
}

const WEEKDAY_NAMES = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  hero: { pos: [3.45, 4.45, 7.85], target: [0, 3.35, -0.3] },
  dial: { pos: [0, 4.65, 5.15], target: [0, 3.55, 0.25] },
  profile: { pos: [7.4, 3.85, 1.85], target: [0, 3.45, -0.6] },
  caliber: { pos: [-2.4, 3.65, -7.0], target: [0, 3.45, -0.5] },
};

const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();
const _rayMouse = new THREE.Vector2();
const _projVec = new THREE.Vector3();
const TZ_OFFSET_MS = new Date().getTimezoneOffset() * 60000;

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createStudioEnvironmentTexture(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const studioScene = new RoomEnvironment();
  const tempGeos: THREE.BufferGeometry[] = [];
  const tempMats: THREE.Material[] = [];

  const addLightPanel = (
    w: number,
    h: number,
    color: number,
    intensity: number,
    pos: [number, number, number],
    lookAt: [number, number, number]
  ) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.lookAt(...lookAt);
    studioScene.add(mesh);
    tempGeos.push(geo);
    tempMats.push(mat);
  };

  addLightPanel(12, 3.2, 0xfff8eb, 3.8, [0, 10.2, 2.5], [0, 3.55, 0]);
  addLightPanel(2.6, 10, 0xdbeafe, 2.8, [-9.5, 4.8, 3.5], [0, 3.55, 0]);
  addLightPanel(2.4, 9, 0xfef3c7, 2.6, [9.5, 5.2, -2.5], [0, 3.55, 0]);
  addLightPanel(6, 1.4, 0xffffff, 3.4, [2.0, 7.4, 9.0], [0, 3.55, 0]);

  const envTex = pmrem.fromScene(studioScene, 0.03).texture;
  tempGeos.forEach((g) => g.dispose());
  tempMats.forEach((m) => m.dispose());
  studioScene.dispose();
  pmrem.dispose();
  return envTex;
}

function createRadialFloorVeilAlphaTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const grad = ctx.createRadialGradient(cx, cx, 10, cx, cx, size * 0.5);
  grad.addColorStop(0.0, 'rgb(212, 212, 212)');
  grad.addColorStop(0.45, 'rgb(228, 228, 228)');
  grad.addColorStop(0.82, 'rgb(250, 250, 250)');
  grad.addColorStop(1.0, 'rgb(255, 255, 255)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export class WatchStudioEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private envTex: THREE.Texture;
  private isSoftwareGl: boolean;
  private maxAnisotropy: number;

  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;

  private floorReflector: Reflector | null = null;
  private floorReflectorGeo: THREE.BufferGeometry | null = null;
  private floorVeilMesh: THREE.Mesh | null = null;
  private floorVeilGeo: THREE.BufferGeometry | null = null;
  private floorVeilMat: THREE.MeshBasicMaterial | null = null;
  private floorVeilAlpha: THREE.Texture | null = null;

  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private rectLights: THREE.RectAreaLight[] = [];
  private uvSpotLight: THREE.SpotLight;
  private uvSpotTarget: THREE.Object3D;

  private motesPoints: THREE.Points | null = null;
  private moteGeo: THREE.BufferGeometry | null = null;
  private moteMat: THREE.PointsMaterial | null = null;
  private moteTex: THREE.Texture | null = null;

  private causticsMesh: THREE.Mesh | null = null;
  private causticsGeo: THREE.BufferGeometry | null = null;
  private causticsMat: THREE.MeshBasicMaterial | null = null;
  private causticsTex: THREE.CanvasTexture | null = null;

  private currentRig: WatchRig | null = null;
  private currentMats: WatchMaterialSet | null = null;
  private compareRig: WatchRig | null = null;
  private compareMats: WatchMaterialSet | null = null;
  private state: StudioState;

  private primaryOffsetX = 0;
  private studioAnchorMs: number;
  private lastDayBucket = -1;
  private lastDigitalSecBucket = -1;
  private lastDigitalMinBucket = -1;
  private currentDateOverride: DialDateOverride | undefined = undefined;

  private currentExplode = 0;
  private bezelTargetAngle = 0;
  private bezelCurrentAngle = 0;
  private flipCurrentY = 0;
  private entrySpinY = 0;
  private reversoCurrentProgress = 0;
  private glidelockCurrentMm = 0;
  private lumeCharge = 0;
  private powerReservePct = 74;
  private lastPowerEmit = 0;
  private crownSpinVel = 0;
  private crownAngle = 0;
  private crownPullPos = 0;
  private manualTimeOffsetSec = 0;
  private manualTimeTargetSec = 0;
  private quickSetDayOffset = 0;
  private quickSetMoonDays = 0;
  private hackedSecondValue: number | null = null;
  private claspCurrentAngle = 0;
  private claspFlipAngle = -0.14;
  private pusherTravel: [number, number] = [0, 0];

  // Physical Perpetual rotor pendulum inertia
  private rotorAngle = 0.25;
  private rotorAngularVel = 0;
  private prevCamAzimuth = 0;
  private prevFlipY = 0;

  // Cursor magnetic parallax tilt
  private pointerNormX = 0;
  private pointerNormY = 0;
  private pointerInside = false;
  private cursorTiltX = 0;
  private cursorTiltY = 0;

  private sweepPhase = 0;
  private cinemaPhase = 0;
  private wristRollRemainingSec = 0;
  private chronoRunning = true;
  private chronoElapsed = 0;
  private chronoDisplayElapsed = 0;
  private chronoSplitSec: number | null = null;
  private chronoResetting = false;
  private lastTickStep = -1;
  private lastTelemetryEmit = 0;
  private lastTimegrapherEmit = 0;

  private isTransitioningCam = false;
  private raycaster = new THREE.Raycaster();
  private pointerDownPos = { x: 0, y: 0 };
  private isDraggingOrbit = false;
  private isCrownDragging = false;
  private crownDragLastY = 0;
  private crownDragAccumPx = 0;
  private isBezelDragging = false;
  private bezelDragLastX = 0;
  private bezelDragAccumPx = 0;
  private bezelDragMoved = false;
  private lastHoverCheck = 0;

  // Loupe & synchronous screenshot / turntable capture
  private loupeCanvas: HTMLCanvasElement | null = null;
  private loupeNx = -1;
  private loupeNy = -1;
  private pendingSnapshotCb: ((dataUrl: string) => void) | null = null;
  private turntableRemainingSec = 0;

  // Callbacks to React UI
  private onExplodeCalloutsCb?: (callouts: ExplodeCallout[]) => void;
  private onCaliperCalloutsCb?: (callouts: CaliperCallout[]) => void;
  private onCrownPositionChangeCb?: (pos: CrownPosition) => void;
  private onClaspOpenChangeCb?: (open: boolean) => void;
  private onReversoFlipChangeCb?: (flipped: boolean) => void;
  private onPowerReserveChangeCb?: (pct: number) => void;
  private onCinemaStopCb?: () => void;
  private onMidnightDateJumpCb?: (dayNum: number) => void;
  private onChronoTelemetryCb?: (telemetry: ChronoTelemetry) => void;
  private onBezelAngleChangeCb?: (angleDeg: number) => void;
  private onTimegrapherTelemetryCb?: (telemetry: TimegrapherTelemetry) => void;
  private lastCalloutsVisible = false;
  private lastCaliperVisible = false;
  private lastExplodeCalloutEmit = 0;
  private lastCaliperCalloutEmit = 0;

  private frameId = 0;
  private disposed = false;
  private paused = false;
  private clock = new THREE.Clock();
  private onContextLostCb?: () => void;
  private onContextRestoredCb?: () => void;

  constructor(
    container: HTMLElement,
    initialState: StudioState,
    callbacks?: {
      onContextLost?: () => void;
      onContextRestored?: () => void;
      onExplodeCallouts?: (callouts: ExplodeCallout[]) => void;
      onCaliperCallouts?: (callouts: CaliperCallout[]) => void;
      onCrownPositionChange?: (pos: CrownPosition) => void;
      onClaspOpenChange?: (open: boolean) => void;
      onReversoFlipChange?: (flipped: boolean) => void;
      onPowerReserveChange?: (pct: number) => void;
      onCinemaStop?: () => void;
      onMidnightDateJump?: (dayNum: number) => void;
      onChronoTelemetry?: (telemetry: ChronoTelemetry) => void;
      onBezelAngleChange?: (angleDeg: number) => void;
      onTimegrapherTelemetry?: (telemetry: TimegrapherTelemetry) => void;
    }
  ) {
    this.container = container;
    this.state = { ...initialState };
    retainStaticTextures();
    this.onContextLostCb = callbacks?.onContextLost;
    this.onContextRestoredCb = callbacks?.onContextRestored;
    this.onExplodeCalloutsCb = callbacks?.onExplodeCallouts;
    this.onCaliperCalloutsCb = callbacks?.onCaliperCallouts;
    this.onCrownPositionChangeCb = callbacks?.onCrownPositionChange;
    this.onClaspOpenChangeCb = callbacks?.onClaspOpenChange;
    this.onReversoFlipChangeCb = callbacks?.onReversoFlipChange;
    this.onPowerReserveChangeCb = callbacks?.onPowerReserveChange;
    this.onCinemaStopCb = callbacks?.onCinemaStop;
    this.onMidnightDateJumpCb = callbacks?.onMidnightDateJump;
    this.onChronoTelemetryCb = callbacks?.onChronoTelemetry;
    this.onBezelAngleChangeCb = callbacks?.onBezelAngleChange;
    this.onTimegrapherTelemetryCb = callbacks?.onTimegrapherTelemetry;
    this.isSoftwareGl = detectSoftwareGl();

    const anchorDate = new Date();
    anchorDate.setHours(10, 10, 0, 0);
    this.studioAnchorMs = anchorDate.getTime();

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);
    const pixelRatio = this.isSoftwareGl
      ? 1
      : Math.min(window.devicePixelRatio || 1, 2);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.maxAnisotropy = Math.min(
      this.renderer.capabilities.getMaxAnisotropy(),
      16
    );

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const bgHex = 0x0a0d0c;
    this.scene.background = new THREE.Color(bgHex);
    this.scene.fog = new THREE.FogExp2(bgHex, 0.028);

    this.envTex = createStudioEnvironmentTexture(this.renderer);
    this.scene.environment = this.envTex;

    this.camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 60);
    this.camera.position.set(...CAMERA_PRESETS.hero.pos);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(...CAMERA_PRESETS.hero.target);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minDistance = 3.6;
    this.controls.maxDistance = 14.5;
    this.controls.minPolarAngle = 0.16;
    this.controls.maxPolarAngle = Math.PI * 0.88;
    this.controls.autoRotate = !this.isSoftwareGl && this.state.autoRotate;
    this.controls.autoRotateSpeed = 0.56;
    this.controls.addEventListener('start', () => {
      this.isTransitioningCam = false;
      this.isDraggingOrbit = true;
      if (this.state.cinemaMode) {
        this.state.cinemaMode = false;
        this.onCinemaStopCb?.();
      }
    });
    this.controls.addEventListener('end', () => {
      this.isDraggingOrbit = false;
    });
    this.prevCamAzimuth = this.controls.getAzimuthalAngle();

    // Three-Point Studio Lighting + RectArea Softboxes
    this.keyLight = new THREE.DirectionalLight(0xfff4e0, 2.35);
    this.keyLight.position.set(5.5, 8.5, 6.0);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 22;
    this.keyLight.shadow.camera.left = -5.5;
    this.keyLight.shadow.camera.right = 5.5;
    this.keyLight.shadow.camera.top = 6.5;
    this.keyLight.shadow.camera.bottom = -2.2;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1a1e1c, 0.72);
    this.scene.add(this.hemiLight);

    this.rimLight = new THREE.DirectionalLight(0x93c5fd, 1.35);
    this.rimLight.position.set(-5.5, 5.6, -5.5);
    this.scene.add(this.rimLight);

    // Cursor-tracked UV Torch spotlight for Lume charging
    this.uvSpotTarget = new THREE.Object3D();
    this.uvSpotTarget.position.set(0, 3.55, 0.5);
    this.scene.add(this.uvSpotTarget);
    this.uvSpotLight = new THREE.SpotLight(0x8b5cf6, 0, 14, 0.34, 0.72, 1.4);
    this.uvSpotLight.position.set(0, 4.2, 5.2);
    this.uvSpotLight.target = this.uvSpotTarget;
    this.scene.add(this.uvSpotLight);

    if (!this.isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softboxTop = new THREE.RectAreaLight(0xfff8eb, 3.6, 6.5, 3.2);
      softboxTop.position.set(0, 7.8, 3.4);
      softboxTop.lookAt(0, 3.55, 0);
      this.scene.add(softboxTop);

      const softboxSide = new THREE.RectAreaLight(0xe0f2fe, 2.1, 3.2, 5.5);
      softboxSide.position.set(-6.0, 4.2, 2.5);
      softboxSide.lookAt(0, 3.55, 0);
      this.scene.add(softboxSide);

      this.rectLights.push(softboxTop, softboxSide);

      // Post-processing selective bloom calibrated cleanly for Lume mode
      this.composer = new EffectComposer(this.renderer);
      this.composer.setPixelRatio(pixelRatio);
      this.composer.setSize(width, height);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.16,
        0.2,
        0.94
      );
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(new OutputPass());

      // Subtle Studio Mirror Floor
      this.initStudioReflectiveFloor(bgHex);
    }

    this.syncMidnightDateOverride(false);
    this.initAmbientMotes();
    this.initCausticsFloor();
    this.rebuildWatch();
    if (this.state.compareModelId) {
      this.primaryOffsetX = -2.15;
      this.rebuildCompareWatch();
    }
    this.applyLightingMode();
    horologyAudio.setEnabled(this.state.soundEnabled);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerleave', this.handlePointerLeave);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener(
      'webglcontextrestored',
      this.handleContextRestored
    );

    this.tick();
  }

  private getEffectiveNowMs(): number {
    return this.state.liveTime
      ? Date.now() + this.manualTimeOffsetSec * 1000
      : this.studioAnchorMs + this.manualTimeOffsetSec * 1000;
  }

  private isSecondDigitalModel(id: WatchModelId | null | undefined): boolean {
    return id === 'casio-gshock-dw5600' || id === 'casio-f91w';
  }

  private isMinuteDigitalModel(id: WatchModelId | null | undefined): boolean {
    return id === 'casio-casioak-ga2100' || id === 'lange-zeitwerk';
  }

  private syncMidnightDateOverride(refreshTextures: boolean) {
    const effectiveNowMs =
      this.getEffectiveNowMs() + this.quickSetDayOffset * 86400000;
    const dayBucket = Math.floor((effectiveNowMs - TZ_OFFSET_MS) / 86400000);
    const hasSecondDigital =
      this.isSecondDigitalModel(this.state.modelId) ||
      this.isSecondDigitalModel(this.state.compareModelId);
    const hasMinuteDigital =
      this.isMinuteDigitalModel(this.state.modelId) ||
      this.isMinuteDigitalModel(this.state.compareModelId);
    const secBucket = Math.floor(effectiveNowMs / 1000);
    const minBucket = Math.floor(effectiveNowMs / 60000);

    const dayChanged = dayBucket !== this.lastDayBucket;
    const secChanged = hasSecondDigital && secBucket !== this.lastDigitalSecBucket;
    const minChanged = hasMinuteDigital && minBucket !== this.lastDigitalMinBucket;

    if (!dayChanged && !secChanged && !minChanged) return;

    const isJump = dayChanged && this.lastDayBucket !== -1 && refreshTextures;
    this.lastDayBucket = dayBucket;
    if (hasSecondDigital) this.lastDigitalSecBucket = secBucket;
    if (hasMinuteDigital) this.lastDigitalMinBucket = minBucket;
    const d = new Date(effectiveNowMs);
    this.currentDateOverride = {
      dayNum: d.getDate(),
      weekday: WEEKDAY_NAMES[d.getDay()],
      monthIdx: d.getMonth(),
      hours24: d.getHours(),
      minutes: d.getMinutes(),
      seconds: d.getSeconds(),
    };

    if (!refreshTextures) return;

    if (isJump) {
      horologyAudio.playBezelClick();
      this.onMidnightDateJumpCb?.(this.currentDateOverride.dayNum);
    }

    const primaryNeedsRedraw =
      dayChanged ||
      (secChanged && this.isSecondDigitalModel(this.state.modelId)) ||
      (minChanged && this.isMinuteDigitalModel(this.state.modelId));
    if (this.currentRig && primaryNeedsRedraw) {
      const watch = getWatchById(this.state.modelId);
      this.currentRig.updateDialTexture(
        watch,
        resolveDial(watch, this.state.dialId),
        this.maxAnisotropy,
        this.currentDateOverride
      );
    }

    const compareNeedsRedraw =
      dayChanged ||
      (secChanged && this.isSecondDigitalModel(this.state.compareModelId)) ||
      (minChanged && this.isMinuteDigitalModel(this.state.compareModelId));
    if (this.compareRig && this.state.compareModelId && compareNeedsRedraw) {
      const cw = getWatchById(this.state.compareModelId);
      this.compareRig.updateDialTexture(
        cw,
        resolveDial(cw, 'default'),
        this.maxAnisotropy,
        this.currentDateOverride
      );
    }
  }

  private initStudioReflectiveFloor(bgHex: number) {
    this.floorReflectorGeo = new THREE.CircleGeometry(7.2, 64);
    this.floorReflector = new Reflector(this.floorReflectorGeo, {
      clipBias: 0.003,
      textureWidth: 384,
      textureHeight: 384,
      color: 0x3a4440,
    });
    this.floorReflector.rotation.x = -Math.PI / 2;
    this.floorReflector.position.y = 0.0;
    this.scene.add(this.floorReflector);

    this.floorVeilAlpha = createRadialFloorVeilAlphaTexture();
    this.floorVeilGeo = new THREE.PlaneGeometry(15.5, 15.5);
    this.floorVeilMat = new THREE.MeshBasicMaterial({
      color: bgHex,
      alphaMap: this.floorVeilAlpha,
      transparent: true,
      depthWrite: false,
    });
    this.floorVeilMesh = new THREE.Mesh(this.floorVeilGeo, this.floorVeilMat);
    this.floorVeilMesh.rotation.x = -Math.PI / 2;
    this.floorVeilMesh.position.y = 0.003;
    this.scene.add(this.floorVeilMesh);
  }

  private initAmbientMotes() {
    const count = 48;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = 0.6 + Math.random() * 5.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 1;
    }
    this.moteGeo = new THREE.BufferGeometry();
    this.moteGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.moteTex = createMoteTexture();
    this.moteMat = new THREE.PointsMaterial({
      size: 0.08,
      map: this.moteTex,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.motesPoints = new THREE.Points(this.moteGeo, this.moteMat);
    this.scene.add(this.motesPoints);
  }

  private initCausticsFloor() {
    this.causticsTex = createCausticsFloorTexture();
    this.causticsGeo = new THREE.PlaneGeometry(13.5, 13.5);
    this.causticsMat = new THREE.MeshBasicMaterial({
      map: this.causticsTex,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.causticsMesh = new THREE.Mesh(this.causticsGeo, this.causticsMat);
    this.causticsMesh.rotation.x = -Math.PI / 2;
    this.causticsMesh.position.y = 0.008;
    this.causticsMesh.visible = this.state.wetStage;
    this.scene.add(this.causticsMesh);
  }

  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.paused = true;
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
    } else if (this.paused && !this.disposed) {
      this.paused = false;
      this.clock.getDelta();
      this.tick();
    }
  };

  private handlePointerDown = (e: PointerEvent) => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };

    if (this.currentRig && this.currentRig.interactiveMeshes.length > 0) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(_rayMouse, this.camera);
      const hits = this.raycaster.intersectObjects(
        this.currentRig.interactiveMeshes,
        false
      );
      const hitAction = hits[0]?.object.userData.interactive;
      const caps = resolveWatchCapabilities(getWatchById(this.state.modelId));
      if (caps.crownMode !== 'none' && this.state.crownPosition > 0 && hitAction === 'crown') {
        this.isCrownDragging = true;
        this.crownDragLastY = e.clientY;
        this.crownDragAccumPx = 0;
        this.controls.enabled = false;
        this.renderer.domElement.style.cursor = 'ns-resize';
      } else if (caps.bezelDirection !== 'none' && hitAction === 'bezel') {
        this.isBezelDragging = true;
        this.bezelDragLastX = e.clientX;
        this.bezelDragAccumPx = 0;
        this.bezelDragMoved = false;
        this.controls.enabled = false;
        this.renderer.domElement.style.cursor = 'ew-resize';
      }
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.pointerNormX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNormY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      this.pointerInside = true;
    }

    if (this.isCrownDragging) {
      const dy = this.crownDragLastY - e.clientY;
      this.crownDragLastY = e.clientY;
      if (Math.abs(dy) > 0) {
        const caps = resolveWatchCapabilities(getWatchById(this.state.modelId));
        if (this.state.crownPosition === 1 && caps.supportsManualWind) {
          this.crownSpinVel += dy * 0.65;
          this.powerReservePct = THREE.MathUtils.clamp(
            this.powerReservePct + Math.abs(dy) * 0.35,
            0,
            100
          );
          this.onPowerReserveChangeCb?.(Math.round(this.powerReservePct));
        } else if (this.state.crownPosition === 2 && caps.supportsQuickSetDate) {
          this.crownSpinVel += dy * 0.5;
          this.crownDragAccumPx += dy;
          const stepThreshold = 22;
          if (Math.abs(this.crownDragAccumPx) >= stepThreshold) {
            const steps = Math.trunc(this.crownDragAccumPx / stepThreshold);
            this.crownDragAccumPx -= steps * stepThreshold;
            if (steps !== 0) {
              this.quickSetDateDays(steps);
            }
          }
        } else if (this.state.crownPosition === 3) {
          this.manualTimeTargetSec += dy * 90;
          this.crownSpinVel += dy * 0.45;
          if (caps.supportsManualWind) {
            this.powerReservePct = THREE.MathUtils.clamp(
              this.powerReservePct + Math.abs(dy) * 0.25,
              0,
              100
            );
          }
        }
      }
      return;
    }

    if (this.isBezelDragging) {
      const dx = e.clientX - this.bezelDragLastX;
      this.bezelDragLastX = e.clientX;
      this.bezelDragAccumPx += dx;
      if (Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y) > 5) {
        this.bezelDragMoved = true;
      }
      const clickThreshold = 16;
      if (Math.abs(this.bezelDragAccumPx) >= clickThreshold) {
        const steps = Math.trunc(this.bezelDragAccumPx / clickThreshold);
        this.bezelDragAccumPx -= steps * clickThreshold;
        if (steps !== 0) {
          this.rotateBezelStep(steps);
        }
      }
      return;
    }

    if (
      this.isDraggingOrbit ||
      !this.currentRig ||
      this.currentRig.interactiveMeshes.length === 0
    ) {
      return;
    }
    const now = performance.now();
    if (now - this.lastHoverCheck < 50) return;
    this.lastHoverCheck = now;

    _rayMouse.x = this.pointerNormX;
    _rayMouse.y = -this.pointerNormY;

    this.raycaster.setFromCamera(_rayMouse, this.camera);
    const hits = this.raycaster.intersectObjects(
      this.currentRig.interactiveMeshes,
      false
    );
    if (hits.length > 0) {
      const act = hits[0].object.userData.interactive;
      this.renderer.domElement.style.cursor =
        this.state.crownPosition > 0 && act === 'crown'
          ? 'ns-resize'
          : act === 'bezel'
            ? 'ew-resize'
            : 'pointer';
    } else {
      this.renderer.domElement.style.cursor = '';
    }
  };

  private handlePointerLeave = () => {
    this.pointerInside = false;
    if (this.isCrownDragging || this.isBezelDragging) {
      this.isCrownDragging = false;
      this.isBezelDragging = false;
      this.bezelDragAccumPx = 0;
      this.crownDragAccumPx = 0;
      this.controls.enabled = true;
      this.renderer.domElement.style.cursor = '';
    }
  };

  private handlePointerUp = (e: PointerEvent) => {
    const wasCrownDrag = this.isCrownDragging;
    const wasBezelDragMoved = this.isBezelDragging && this.bezelDragMoved;
    if (wasCrownDrag || this.isBezelDragging) {
      this.isCrownDragging = false;
      this.isBezelDragging = false;
      this.bezelDragAccumPx = 0;
      this.crownDragAccumPx = 0;
      this.controls.enabled = true;
      this.renderer.domElement.style.cursor = '';
    }
    if (wasBezelDragMoved) return;

    if (!this.currentRig) return;
    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    if (Math.hypot(dx, dy) > 6) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(_rayMouse, this.camera);
    const hits = this.raycaster.intersectObjects(
      this.currentRig.interactiveMeshes,
      false
    );
    if (hits.length === 0) return;

    const action = hits[0].object.userData.interactive;
    const caps = resolveWatchCapabilities(getWatchById(this.state.modelId));
    if (action === 'bezel') {
      if (caps.bezelDirection !== 'none') {
        this.rotateBezelStep(1);
      }
    } else if (action === 'crown') {
      if (caps.crownMode === 'none') return;
      const cycle: CrownPosition[] = [0, ...caps.crownStops.map((s) => s.pos)];
      const curIdx = cycle.indexOf(this.state.crownPosition);
      const nextPos = cycle[(curIdx + 1) % cycle.length];
      this.state.crownPosition = nextPos;
      if (nextPos !== 3) {
        this.hackedSecondValue = null;
      }
      this.onCrownPositionChangeCb?.(nextPos);
      if (nextPos === 1 && caps.supportsManualWind) {
        this.windCrownImpulse();
      } else {
        horologyAudio.playBezelClick();
      }
    } else if (action === 'clasp') {
      const nextOpen = !this.state.claspOpen;
      this.state.claspOpen = nextOpen;
      this.onClaspOpenChangeCb?.(nextOpen);
      horologyAudio.playPusherClick();
    } else if (action === 'reverso') {
      const nextRev = !this.state.reversoFlipped;
      this.state.reversoFlipped = nextRev;
      this.onReversoFlipChangeCb?.(nextRev);
      horologyAudio.playBezelClick();
    } else if (action === 'chrono-toggle') {
      this.toggleChronoRunning();
    } else if (action === 'chrono-reset') {
      this.resetChrono();
    }
  };

  public toggleChronoRunning() {
    this.pusherTravel[0] = 0.085;
    this.chronoRunning = !this.chronoRunning;
    if (this.chronoRunning) this.chronoResetting = false;
    horologyAudio.playPusherClick();
    this.emitChronoTelemetry(true);
  }

  public toggleChronoSplit() {
    this.pusherTravel[1] = 0.065;
    this.chronoSplitSec =
      this.chronoSplitSec === null ? this.chronoDisplayElapsed : null;
    horologyAudio.playPusherClick();
    this.emitChronoTelemetry(true);
  }

  public resetChrono() {
    this.pusherTravel[1] = 0.085;
    this.chronoElapsed = 0;
    this.chronoSplitSec = null;
    this.chronoResetting = true;
    horologyAudio.playPusherClick();
    this.emitChronoTelemetry(true);
  }

  private emitChronoTelemetry(force = false) {
    if (!this.onChronoTelemetryCb) return;
    const now = performance.now();
    if (!force && now - this.lastTelemetryEmit < 95) return;
    this.lastTelemetryEmit = now;
    const elapsedSec = Math.max(0, this.chronoDisplayElapsed);
    const activeSec = this.chronoSplitSec ?? elapsedSec;
    const unitsPerHour = activeSec >= 1 ? Math.round(3600 / activeSec) : null;
    this.onChronoTelemetryCb({
      elapsedSec,
      running: this.chronoRunning,
      splitSec: this.chronoSplitSec,
      unitsPerHour,
    });
  }

  private emitBezelAngle() {
    const rawDeg = ((-this.bezelTargetAngle * 180) / Math.PI) % 360;
    const deg = ((rawDeg % 360) + 360) % 360;
    this.onBezelAngleChangeCb?.(Math.round(deg) % 360);
  }

  public rotateBezelStep(steps = 1) {
    const watch = getWatchById(this.state.modelId);
    const caps = resolveWatchCapabilities(watch);
    if (caps.bezelDirection === 'none') return;
    // ISO 6425 unidirectional dive bezels only ratchet counter-clockwise (forward elapsed time)
    if (caps.bezelDirection === 'unidirectional' && steps < 0) return;
    const stepAngle =
      watch.bezelType === 'gmt-cerachrom'
        ? Math.PI / 12
        : watch.bezelType === 'navitimer' || watch.bezelType === 'yacht-cerachrom'
          ? Math.PI / 30
          : Math.PI / 15;
    this.bezelTargetAngle -= stepAngle * steps;
    this.emitBezelAngle();
    horologyAudio.playBezelClick();
  }

  public resetBezel() {
    this.bezelTargetAngle = 0;
    this.emitBezelAngle();
    horologyAudio.playBezelClick();
  }

  public windCrownImpulse() {
    const caps = resolveWatchCapabilities(getWatchById(this.state.modelId));
    if (!caps.supportsManualWind) return;
    this.crownSpinVel += 18;
    this.rotorAngularVel += 4.2;
    this.powerReservePct = Math.min(100, this.powerReservePct + 14);
    this.onPowerReserveChangeCb?.(Math.round(this.powerReservePct));
    horologyAudio.playBezelClick();
  }

  public triggerWristFlick() {
    this.rotorAngularVel += 17.5;
    this.cursorTiltX = 0.095;
    this.powerReservePct = Math.min(100, this.powerReservePct + 11);
    this.onPowerReserveChangeCb?.(Math.round(this.powerReservePct));
    horologyAudio.playPusherClick();
  }

  public triggerWristRoll() {
    this.wristRollRemainingSec = 2.8;
    this.rotorAngularVel += 14.5;
    this.powerReservePct = Math.min(100, this.powerReservePct + 10);
    this.onPowerReserveChangeCb?.(Math.round(this.powerReservePct));
    horologyAudio.playPusherClick();
  }

  public quickSetDateDays(delta: number) {
    this.quickSetDayOffset += delta;
    this.crownSpinVel += delta >= 0 ? 12 : -12;
    this.syncMidnightDateOverride(true);
    horologyAudio.playBezelClick();
  }

  public quickSetMoonphaseDays(delta: number) {
    this.quickSetMoonDays += delta;
    this.crownSpinVel += delta >= 0 ? 10 : -10;
    horologyAudio.playBezelClick();
  }

  public advanceManualTime(minutesDelta: number) {
    this.manualTimeTargetSec += minutesDelta * 60;
    this.crownSpinVel += minutesDelta > 0 ? 15 : -15;
    horologyAudio.playBezelClick();
  }

  public setManualTimeOffsetMinutes(minutes: number) {
    const prev = this.manualTimeTargetSec;
    this.manualTimeTargetSec = minutes * 60;
    const diff = this.manualTimeTargetSec - prev;
    if (Math.abs(diff) > 10) {
      this.crownSpinVel += Math.sign(diff) * 10;
    }
  }

  public resetManualTime() {
    this.manualTimeTargetSec = 0;
    this.quickSetDayOffset = 0;
    this.quickSetMoonDays = 0;
    this.crownSpinVel -= 10;
    this.syncMidnightDateOverride(true);
  }

  public setLoupeTarget(canvas: HTMLCanvasElement | null, nx: number, ny: number) {
    this.loupeCanvas = canvas;
    this.loupeNx = nx;
    this.loupeNy = ny;
  }

  public captureSnapshot(cb: (dataUrl: string) => void) {
    this.pendingSnapshotCb = cb;
  }

  public startTurntableCapture(
    onComplete: (blobUrl: string | null) => void,
    durationMs = 4600
  ) {
    const canvas = this.renderer.domElement;
    if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
      onComplete(null);
      return;
    }
    try {
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        onComplete(URL.createObjectURL(blob));
      };
      this.turntableRemainingSec = durationMs / 1000;
      recorder.start();
      window.setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, durationMs);
    } catch {
      onComplete(null);
    }
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.onContextLostCb?.();
  };

  private handleContextRestored = () => {
    this.onContextRestoredCb?.();
    this.tick();
  };

  private handleResize = () => {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth, 320);
    const height = Math.max(this.container.clientHeight, 320);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.composer && this.bloomPass) {
      this.composer.setSize(width, height);
      this.bloomPass.resolution.set(width, height);
    }
  };

  private syncWristAndWetOverlays() {
    const showWrist =
      this.state.wristMode && !this.state.flipped && this.state.explodeTarget < 0.05;
    this.currentRig?.setWristPreview(showWrist, this.state.wristMm);
    this.currentRig?.setWetStage(this.state.wetStage);
    this.compareRig?.setWetStage(this.state.wetStage);
    if (this.causticsMesh) {
      this.causticsMesh.visible = this.state.wetStage;
    }
  }

  private rebuildWatch() {
    if (this.currentRig) {
      this.scene.remove(this.currentRig.root);
      this.currentRig.dispose();
      this.currentRig = null;
    }
    if (this.currentMats) {
      this.currentMats.disposables.forEach((d) => d.dispose());
      this.currentMats = null;
    }

    const watch = getWatchById(this.state.modelId);
    const alloy = resolveAlloy(watch, this.state.alloyId);
    const dial = resolveDial(watch, this.state.dialId);
    const bezel = resolveBezel(watch, this.state.bezelId);

    const beltShade = resolveBeltShade(watch, this.state.beltShadeId ?? 'default');
    const lumePalette = resolveLumePalette(watch);
    const caseFinish =
      watch.brand === 'CASIO' && alloy.id === 'default'
        ? 'resin'
        : watch.id === 'bulgari-octo-finissimo' && alloy.id === 'default'
          ? 'sandblasted'
          : 'standard';
    this.currentMats = createWatchMaterialSet(
      alloy,
      this.isSoftwareGl,
      this.state.lightingMode,
      this.maxAnisotropy,
      this.state.patina,
      beltShade,
      lumePalette,
      this.state.wristStyle,
      caseFinish
    );
    this.currentRig = buildWatchAssembly(
      watch,
      dial,
      bezel,
      this.state.beltId,
      this.state.exhibitionBack,
      this.currentMats,
      this.maxAnisotropy,
      {
        dateOverride: this.currentDateOverride,
        customEngraving: this.state.customEngraving,
        xrayDial: this.state.xrayDial,
      }
    );
    this.bezelCurrentAngle = 0;
    this.bezelTargetAngle = 0;
    this.emitBezelAngle();
    this.currentRig.root.position.x = this.primaryOffsetX;
    this.currentRig.watchTiltGroup.rotation.y = this.flipCurrentY;
    this.syncWristAndWetOverlays();
    this.scene.add(this.currentRig.root);
    this.applyExplodeToRig(this.currentRig, watch, this.currentExplode);
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private rebuildCompareWatch() {
    if (this.compareRig) {
      this.scene.remove(this.compareRig.root);
      this.compareRig.dispose();
      this.compareRig = null;
    }
    if (this.compareMats) {
      this.compareMats.disposables.forEach((d) => d.dispose());
      this.compareMats = null;
    }

    if (!this.state.compareModelId) return;

    const watch = getWatchById(this.state.compareModelId);
    const alloy = resolveAlloy(watch, 'default');
    const dial = resolveDial(watch, 'default');
    const bezel = resolveBezel(watch, 'default');

    const compareBeltShade = resolveBeltShade(watch, this.state.beltShadeId ?? 'default');
    const compareLumePalette = resolveLumePalette(watch);
    const compareCaseFinish =
      watch.brand === 'CASIO'
        ? 'resin'
        : watch.id === 'bulgari-octo-finissimo'
          ? 'sandblasted'
          : 'standard';
    this.compareMats = createWatchMaterialSet(
      alloy,
      this.isSoftwareGl,
      this.state.lightingMode,
      this.maxAnisotropy,
      0,
      compareBeltShade,
      compareLumePalette,
      undefined,
      compareCaseFinish
    );
    this.compareRig = buildWatchAssembly(
      watch,
      dial,
      bezel,
      this.state.beltId,
      this.state.exhibitionBack,
      this.compareMats,
      this.maxAnisotropy,
      {
        dateOverride: this.currentDateOverride,
        customEngraving: this.state.customEngraving,
        xrayDial: this.state.xrayDial,
      }
    );
    this.compareRig.root.position.x = -this.primaryOffsetX;
    this.compareRig.watchTiltGroup.rotation.y = this.flipCurrentY;
    this.compareRig.setWetStage(this.state.wetStage);
    this.scene.add(this.compareRig.root);
    this.applyExplodeToRig(this.compareRig, watch, this.currentExplode);
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private applyLightingMode() {
    const mode = this.state.lightingMode;
    const bgHex =
      mode === 'nocturne'
        ? 0x04070a
        : mode === 'vault'
          ? 0x020305
          : mode === 'alpine'
            ? 0xe8ecea
            : mode === 'bronze'
              ? 0x16100c
              : 0x161310;

    (this.scene.background as THREE.Color).setHex(bgHex);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(bgHex);
      this.scene.fog.density = mode === 'alpine' ? 0.016 : mode === 'vault' ? 0.036 : 0.024;
    }
    if (this.floorVeilMat) {
      this.floorVeilMat.color.setHex(bgHex);
    }
    if (this.floorReflector) {
      this.floorReflector.visible = mode !== 'alpine';
    }

    if (mode === 'nocturne') {
      // Lume mode: subdued silhouettes + crisp Chromalight phosphor glow (no blown-out glare)
      this.keyLight.color.setHex(0xdbeafe);
      this.keyLight.intensity = 0.36;
      this.hemiLight.color.setHex(0x93c5fd);
      this.hemiLight.groundColor.setHex(0x0b1016);
      this.hemiLight.intensity = 0.18;
      this.rimLight.color.setHex(0x60a5fa);
      this.rimLight.intensity = 0.62;
      this.rectLights.forEach((rl, i) => {
        rl.color.setHex(0xbfdbfe);
        rl.intensity = i === 0 ? 0.35 : 0.55;
      });
      this.renderer.toneMappingExposure = 1.05;
      if (this.bloomPass) {
        this.bloomPass.strength = 0.16;
        this.bloomPass.radius = 0.2;
        this.bloomPass.threshold = 0.94;
      }
    } else if (mode === 'vault') {
      // Vault: cold obsidian safe-room, dramatic narrow overhead spotlight + high-contrast dark shadows
      this.keyLight.color.setHex(0xeef6ff);
      this.keyLight.intensity = 3.45;
      this.hemiLight.color.setHex(0x38bdf8);
      this.hemiLight.groundColor.setHex(0x030508);
      this.hemiLight.intensity = 0.16;
      this.rimLight.color.setHex(0x93c5fd);
      this.rimLight.intensity = 2.55;
      this.rectLights.forEach((rl, i) => {
        rl.color.setHex(i === 0 ? 0xf0f9ff : 0xbae6fd);
        rl.intensity = i === 0 ? 1.35 : 0.7;
      });
      this.renderer.toneMappingExposure = 1.08;
    } else if (mode === 'alpine') {
      this.keyLight.color.setHex(0xffffff);
      this.keyLight.intensity = 2.15;
      this.hemiLight.color.setHex(0xffffff);
      this.hemiLight.groundColor.setHex(0xcbd5cf);
      this.hemiLight.intensity = 1.25;
      this.rimLight.color.setHex(0xffffff);
      this.rimLight.intensity = 1.15;
      this.rectLights.forEach((rl, i) => {
        rl.color.setHex(0xffffff);
        rl.intensity = i === 0 ? 3.2 : 2.3;
      });
      this.renderer.toneMappingExposure = 1.12;
    } else if (mode === 'bronze') {
      this.keyLight.color.setHex(0xffebd2);
      this.keyLight.intensity = 2.55;
      this.hemiLight.color.setHex(0xfde68a);
      this.hemiLight.groundColor.setHex(0x23160f);
      this.hemiLight.intensity = 0.62;
      this.rimLight.color.setHex(0xf59e0b);
      this.rimLight.intensity = 1.65;
      this.rectLights.forEach((rl, i) => {
        rl.color.setHex(0xfef3c7);
        rl.intensity = i === 0 ? 3.4 : 1.9;
      });
      this.renderer.toneMappingExposure = 1.16;
    } else {
      // Atelier: warm Geneva watchmaker bench with softboxes & balanced fill
      this.keyLight.color.setHex(0xfff1d6);
      this.keyLight.intensity = 2.35;
      this.hemiLight.color.setHex(0xfef3c7);
      this.hemiLight.groundColor.setHex(0x2a2118);
      this.hemiLight.intensity = 0.92;
      this.rimLight.color.setHex(0xfde68a);
      this.rimLight.intensity = 1.15;
      this.rectLights.forEach((rl, i) => {
        rl.color.setHex(i === 0 ? 0xfff5e4 : 0xfef3c7);
        rl.intensity = i === 0 ? 4.2 : 2.5;
      });
      this.renderer.toneMappingExposure = 1.18;
    }

    if (this.moteMat) {
      this.moteMat.opacity = mode === 'alpine' ? 0.0 : mode === 'bronze' ? 0.32 : 0.36;
    }

    const nocturne = mode === 'nocturne';
    if (this.currentMats) {
      applyLumePaletteToMaterialSet(
        this.currentMats,
        resolveLumePalette(getWatchById(this.state.modelId)),
        nocturne,
        this.lumeCharge
      );
    }
    if (this.compareMats && this.state.compareModelId) {
      applyLumePaletteToMaterialSet(
        this.compareMats,
        resolveLumePalette(getWatchById(this.state.compareModelId)),
        nocturne,
        this.lumeCharge
      );
    }
  }

  private applyExplodeToRig(rig: WatchRig, _watch: WatchSpec, e: number) {
    const { layers, baseLayerZ } = rig;

    layers.crystalGroup.position.z = baseLayerZ.crystal + e * 1.95;
    layers.bezelGroup.position.z = baseLayerZ.bezel + e * 1.25;
    layers.handsGroup.position.z = baseLayerZ.hands + e * 0.76;
    layers.dialGroup.position.z = baseLayerZ.dial + e * 0.36;
    layers.caliberGroup.position.z = baseLayerZ.caliber - e * 0.74;
    layers.casebackGroup.position.z = baseLayerZ.caseback - e * 1.45;
  }

  private applyExplodePositions(e: number) {
    if (this.currentRig) {
      this.applyExplodeToRig(this.currentRig, getWatchById(this.state.modelId), e);
    }
    if (this.compareRig && this.state.compareModelId) {
      this.applyExplodeToRig(
        this.compareRig,
        getWatchById(this.state.compareModelId),
        e
      );
    }
  }

  public updateState(next: Partial<StudioState>) {
    const prevExplode = this.state.explodeTarget;
    const prevCompareModelId = this.state.compareModelId;
    const modelChanged =
      next.modelId !== undefined && next.modelId !== this.state.modelId;
    const needsGeometryRebuild =
      modelChanged ||
      (next.beltId !== undefined && next.beltId !== this.state.beltId) ||
      (next.exhibitionBack !== undefined &&
        next.exhibitionBack !== this.state.exhibitionBack);

    const compareChanged =
      next.compareModelId !== undefined &&
      next.compareModelId !== this.state.compareModelId;
    const alloyChanged =
      (next.alloyId !== undefined && next.alloyId !== this.state.alloyId) ||
      (next.patina !== undefined && next.patina !== this.state.patina);
    const beltShadeChanged =
      next.beltShadeId !== undefined && next.beltShadeId !== this.state.beltShadeId;
    const wristStyleChanged =
      next.wristStyle !== undefined && next.wristStyle !== this.state.wristStyle;
    const dialChanged =
      next.dialId !== undefined && next.dialId !== this.state.dialId;
    const bezelChanged =
      next.bezelId !== undefined && next.bezelId !== this.state.bezelId;
    const lightingChanged =
      next.lightingMode !== undefined &&
      next.lightingMode !== this.state.lightingMode;
    const xrayChanged =
      next.xrayDial !== undefined && next.xrayDial !== this.state.xrayDial;
    const engravingChanged =
      next.customEngraving !== undefined &&
      next.customEngraving !== this.state.customEngraving;
    const liveTimeChanged =
      next.liveTime !== undefined && next.liveTime !== this.state.liveTime;
    const crownChanged =
      next.crownPosition !== undefined &&
      next.crownPosition !== this.state.crownPosition;
    const overlayChanged =
      (next.wetStage !== undefined && next.wetStage !== this.state.wetStage) ||
      (next.wristMode !== undefined && next.wristMode !== this.state.wristMode) ||
      (next.wristMm !== undefined && next.wristMm !== this.state.wristMm) ||
      (next.flipped !== undefined && next.flipped !== this.state.flipped) ||
      (next.explodeTarget !== undefined &&
        next.explodeTarget !== this.state.explodeTarget);

    if (next.soundEnabled !== undefined && next.soundEnabled !== this.state.soundEnabled) {
      horologyAudio.setEnabled(next.soundEnabled);
    }

    Object.assign(this.state, next);

    if (crownChanged && this.state.crownPosition !== 3) {
      this.hackedSecondValue = null;
    }

    if (modelChanged) {
      this.chronoSplitSec = null;
      this.quickSetDayOffset = 0;
      this.quickSetMoonDays = 0;
      this.hackedSecondValue = null;
      this.entrySpinY = -0.72;
      this.rotorAngularVel += 6.2;
      horologyAudio.playBezelClick();
      this.emitChronoTelemetry(true);
      this.syncMidnightDateOverride(false);
    }

    if (liveTimeChanged) {
      this.syncMidnightDateOverride(true);
    }

    if (needsGeometryRebuild) {
      this.rebuildWatch();
      if (this.state.compareModelId) {
        this.rebuildCompareWatch();
      }
    } else {
      const watch = getWatchById(this.state.modelId);
      if (alloyChanged && this.currentMats) {
        const nextAlloy = resolveAlloy(watch, this.state.alloyId);
        const nextCaseFinish =
          watch.brand === 'CASIO' && nextAlloy.id === 'default'
            ? 'resin'
            : watch.id === 'bulgari-octo-finissimo' && nextAlloy.id === 'default'
              ? 'sandblasted'
              : 'standard';
        applyAlloyToMaterialSet(
          this.currentMats,
          nextAlloy,
          this.state.patina,
          nextCaseFinish
        );
      }
      if (beltShadeChanged && this.currentMats) {
        applyBeltShadeToMaterialSet(
          this.currentMats,
          resolveBeltShade(watch, this.state.beltShadeId ?? 'default')
        );
      }
      if (wristStyleChanged && this.currentMats) {
        applyWristStyleToMaterialSet(this.currentMats, this.state.wristStyle);
      }
      if (dialChanged && this.currentRig) {
        this.currentRig.updateDialTexture(
          watch,
          resolveDial(watch, this.state.dialId),
          this.maxAnisotropy,
          this.currentDateOverride
        );
      }
      if (bezelChanged && this.currentRig) {
        this.currentRig.updateBezelTexture(
          watch,
          resolveBezel(watch, this.state.bezelId),
          this.maxAnisotropy
        );
      }
      if (compareChanged) {
        this.syncMidnightDateOverride(false);
        this.rebuildCompareWatch();
      }
      if (xrayChanged) {
        this.currentRig?.updateXrayDial(this.state.xrayDial);
        this.compareRig?.updateXrayDial(this.state.xrayDial);
      }
      if (engravingChanged) {
        this.currentRig?.updateCasebackEngraving(
          watch,
          this.state.customEngraving,
          this.maxAnisotropy
        );
        if (this.compareRig && this.state.compareModelId) {
          this.compareRig.updateCasebackEngraving(
            getWatchById(this.state.compareModelId),
            this.state.customEngraving,
            this.maxAnisotropy
          );
        }
      }
      if (overlayChanged) {
        this.syncWristAndWetOverlays();
      }
    }

    if (lightingChanged) {
      this.applyLightingMode();
    }

    if (prevCompareModelId === null && this.state.compareModelId !== null) {
      this.focusCameraTarget([2.4, 4.8, 10.4], [0, 3.45, -0.25]);
    } else if (prevCompareModelId !== null && this.state.compareModelId === null) {
      this.focusCameraTarget(CAMERA_PRESETS.hero.pos, CAMERA_PRESETS.hero.target);
    } else if (
      prevExplode <= 0.02 &&
      this.state.explodeTarget > 0.05 &&
      Math.abs(this.camera.position.x) < 1.3 &&
      this.camera.position.z > 3.2
    ) {
      this.focusCameraTarget([4.3, 4.4, 6.6], [0, 3.45, -0.25]);
    }

    this.controls.autoRotate = !this.isSoftwareGl && this.state.autoRotate;
  }

  public setCameraPreset(preset: CameraPresetId) {
    const p = CAMERA_PRESETS[preset];
    this.focusCameraTarget(p.pos, p.target);
  }

  public focusCameraTarget(
    pos: [number, number, number],
    target: [number, number, number]
  ) {
    _camGoalPos.set(...pos);
    _camGoalTarget.set(...target);
    this.isTransitioningCam = true;
  }

  private emitExplodeCallouts(now: number) {
    if (!this.onExplodeCalloutsCb || !this.currentRig) return;

    if (this.currentExplode <= 0.18) {
      if (this.lastCalloutsVisible) {
        this.lastCalloutsVisible = false;
        this.onExplodeCalloutsCb([]);
      }
      return;
    }

    if (now - this.lastExplodeCalloutEmit < 32) return;
    this.lastExplodeCalloutEmit = now;
    this.lastCalloutsVisible = true;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const { layers } = this.currentRig;
    const watch = getWatchById(this.state.modelId);
    const defs: { id: string; label: string; group: THREE.Group; offsetY: number }[] = [
      { id: 'crystal', label: 'Sapphire', group: layers.crystalGroup, offsetY: 1.32 },
      { id: 'bezel', label: 'Bezel', group: layers.bezelGroup, offsetY: 1.55 },
      { id: 'hands', label: 'Hands', group: layers.handsGroup, offsetY: -1.18 },
      { id: 'dial', label: 'Dial', group: layers.dialGroup, offsetY: -1.42 },
      { id: 'case', label: watch.hasReversoFlip ? 'Swivel Case' : 'Middle Case', group: layers.caseGroup, offsetY: 1.65 },
      { id: 'caliber', label: 'Caliber', group: layers.caliberGroup, offsetY: -1.32 },
      { id: 'caseback', label: 'Caseback', group: layers.casebackGroup, offsetY: 1.38 },
    ];

    const callouts: ExplodeCallout[] = [];
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      _projVec.set(0, def.offsetY, 0);
      def.group.localToWorld(_projVec);
      _projVec.project(this.camera);
      if (_projVec.z >= -1 && _projVec.z <= 1) {
        const sx = (_projVec.x * 0.5 + 0.5) * width;
        const sy = (-_projVec.y * 0.5 + 0.5) * height;
        if (sx > 48 && sx < width - 48 && sy > 60 && sy < height - 90) {
          callouts.push({ id: def.id, label: def.label, x: sx, y: sy });
        }
      }
    }
    this.onExplodeCalloutsCb(callouts);
  }

  private emitCaliperCallouts(now: number) {
    if (!this.onCaliperCalloutsCb || !this.currentRig) return;

    if (!this.state.caliperMode || this.currentExplode > 0.2) {
      if (this.lastCaliperVisible) {
        this.lastCaliperVisible = false;
        this.onCaliperCalloutsCb([]);
      }
      return;
    }

    if (now - this.lastCaliperCalloutEmit < 32) return;
    this.lastCaliperCalloutEmit = now;
    this.lastCaliperVisible = true;

    const watch = getWatchById(this.state.modelId);
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const lugToLug =
      watch.lugToLugMm ?? Number((watch.caseDiameterMm + 7.2).toFixed(1));
    const caseR =
      watch.id === 'jlc-reverso'
        ? 1.55
        : watch.id === 'cartier-tank-louis'
          ? 1.32
          : (watch.caseDiameterMm / 10) * 0.5;
    const lugR =
      watch.caseShape === 'rectangular'
        ? caseR * 1.48
        : watch.caseShape === 'tonneau'
          ? caseR * 1.15
          : watch.caseShape === 'compact-octagon'
            ? caseR * 1.04
            : caseR;

    const specs: {
      id: string;
      label: string;
      value: string;
      local: [number, number, number];
    }[] = [
      {
        id: 'diameter',
        label: 'Case Width',
        value: `${watch.caseDiameterMm} mm`,
        local: [caseR + 0.55, 0, 0.15],
      },
      {
        id: 'lug-to-lug',
        label: 'Lug-to-Lug',
        value: `${lugToLug} mm`,
        local: [0, lugR * 1.25 + 0.45, 0.05],
      },
      {
        id: 'thickness',
        label: 'Profile',
        value: `${watch.caseThicknessMm} mm`,
        local: [-caseR - 0.52, -0.5, 0.25],
      },
    ];

    const out: CaliperCallout[] = [];
    for (let i = 0; i < specs.length; i++) {
      const sp = specs[i];
      _projVec.set(...sp.local);
      this.currentRig.watchTiltGroup.localToWorld(_projVec);
      _projVec.project(this.camera);
      if (_projVec.z >= -1 && _projVec.z <= 1) {
        const sx = (_projVec.x * 0.5 + 0.5) * width;
        const sy = (-_projVec.y * 0.5 + 0.5) * height;
        if (sx > 40 && sx < width - 40 && sy > 60 && sy < height - 90) {
          out.push({ id: sp.id, label: sp.label, value: sp.value, x: sx, y: sy });
        }
      }
    }
    this.onCaliperCalloutsCb(out);
  }

  private renderLoupePass() {
    if (
      !this.state.loupeActive ||
      !this.loupeCanvas ||
      this.loupeNx < 0 ||
      this.loupeNy < 0
    ) {
      return;
    }

    const src = this.renderer.domElement;
    const dst = this.loupeCanvas;
    const ctx = dst.getContext('2d');
    if (!ctx || src.width === 0 || src.height === 0) return;

    const zoom = 2.5;
    const dW = dst.width;
    const dH = dst.height;
    const srcCenterX = this.loupeNx * src.width;
    const srcCenterY = this.loupeNy * src.height;
    const cropW = dW / zoom;
    const cropH = dH / zoom;
    const sx = THREE.MathUtils.clamp(srcCenterX - cropW * 0.5, 0, Math.max(0, src.width - cropW));
    const sy = THREE.MathUtils.clamp(srcCenterY - cropH * 0.5, 0, Math.max(0, src.height - cropH));

    ctx.clearRect(0, 0, dW, dH);
    ctx.drawImage(src, sx, sy, cropW, cropH, 0, 0, dW, dH);

    // Subtle watchmaker reticle crosshair
    const cx = dW * 0.5;
    const cy = dH * 0.5;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy);
    ctx.lineTo(cx - 6, cy);
    ctx.moveTo(cx + 6, cy);
    ctx.lineTo(cx + 18, cy);
    ctx.moveTo(cx, cy - 18);
    ctx.lineTo(cx, cy - 6);
    ctx.moveTo(cx, cy + 6);
    ctx.lineTo(cx, cy + 18);
    ctx.stroke();
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed || this.paused) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (status === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private animateRigKinematics(
    rig: WatchRig,
    elapsed: number,
    effectiveNowMs: number,
    floatWave: number,
    shadowScale: number,
    isPrimary: boolean,
    watchSpec: WatchSpec
  ) {
    const {
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
    } = rig.kinematics;

    let hr24 = 10 + 10 / 60;
    let hr12Val = 10 + 10 / 60;
    let minVal = 10;

    const beatProfile = resolveCaliberBeatProfile(watchSpec);
    const rigCaps = resolveWatchCapabilities(watchSpec);
    const isHacked =
      isPrimary &&
      this.state.crownPosition === 3 &&
      rigCaps.supportsHacking &&
      !beatProfile.isSpringDrive &&
      !beatProfile.isQuartz;

    if (this.state.liveTime) {
      const localMs = effectiveNowMs - TZ_OFFSET_MS;
      const totalWholeSec = Math.floor(localMs / 1000);
      const subMs = localMs - totalWholeSec * 1000;
      const beatsPerSec = beatProfile.beatHz * 2;
      const fracSec = beatProfile.isSpringDrive
        ? subMs / 1000
        : beatsPerSec > 0
          ? Math.floor((subMs / 1000) * beatsPerSec) / beatsPerSec
          : 0;

      const secWhole = ((totalWholeSec % 60) + 60) % 60;
      let sec = secWhole + fracSec;
      if (isHacked) {
        if (this.hackedSecondValue === null) {
          this.hackedSecondValue = sec;
        }
        sec = this.hackedSecondValue;
      }

      const minWhole = ((Math.floor(totalWholeSec / 60) % 60) + 60) % 60;
      minVal = minWhole + sec / 60;
      const hrWhole = ((Math.floor(totalWholeSec / 3600) % 24) + 24) % 24;
      hr12Val = (hrWhole % 12) + minVal / 60;
      hr24 = hrWhole + minVal / 60;

      secondHand.rotation.z = -(sec / 60) * Math.PI * 2;
      minuteHand.rotation.z = -(minVal / 60) * Math.PI * 2;
      hourHand.rotation.z = -(hr12Val / 12) * Math.PI * 2;

      const utcWholeSec = Math.floor(effectiveNowMs / 1000);
      const utcMin =
        (((Math.floor(utcWholeSec / 60) % 60) + 60) % 60) +
        ((((utcWholeSec % 60) + 60) % 60) + fracSec) / 60;
      const utcHrWhole = ((Math.floor(utcWholeSec / 3600) % 24) + 24) % 24;
      const gmtHr =
        (((utcHrWhole + this.state.gmtTimezoneOffset + utcMin / 60) % 24) + 24) % 24;

      if (gmtHand) {
        gmtHand.rotation.z = -(gmtHr / 24) * Math.PI * 2;
      }
      if (skyDisc) {
        skyDisc.rotation.z = (gmtHr / 24) * Math.PI * 2;
      }
    } else {
      const beatsPerSec = beatProfile.beatHz * 2;
      const rawSec = this.chronoDisplayElapsed % 60;
      const fracSec = beatProfile.isSpringDrive
        ? rawSec
        : beatsPerSec > 0
          ? Math.floor(rawSec * beatsPerSec) / beatsPerSec
          : rawSec;
      let studioSec = 36 + fracSec;
      if (isHacked) {
        if (this.hackedSecondValue === null) {
          this.hackedSecondValue = studioSec;
        }
        studioSec = this.hackedSecondValue;
      }

      const studioOffsetMin = this.manualTimeOffsetSec / 60;
      const studioTotalMin = 10 * 60 + 10 + studioOffsetMin;
      minVal = ((studioTotalMin % 60) + 60) % 60;
      hr12Val = (((studioTotalMin / 60) % 12) + 12) % 12;
      hr24 = (((studioTotalMin / 60) % 24) + 24) % 24;

      hourHand.rotation.z = -(hr12Val / 12) * Math.PI * 2;
      minuteHand.rotation.z = -(minVal / 60) * Math.PI * 2;
      secondHand.rotation.z = -(studioSec / 60) * Math.PI * 2;

      const studioGmtHr =
        (((9 + 10 / 60 + studioOffsetMin / 60 + this.state.gmtTimezoneOffset) % 24) +
          24) %
        24;
      if (gmtHand) {
        gmtHand.rotation.z = -(studioGmtHr / 24) * Math.PI * 2;
      }
      if (skyDisc) {
        skyDisc.rotation.z = (studioGmtHr / 24) * Math.PI * 2;
      }
    }

    if (reversoBackHands) {
      const revHr = (((hr24 + this.state.gmtTimezoneOffset) % 12) + 12) % 12;
      reversoBackHands.hour.rotation.z = -(revHr / 12) * Math.PI * 2;
      reversoBackHands.minute.rotation.z = -(minVal / 60) * Math.PI * 2;
    }

    if (chronoSplitHand) {
      const splitTarget = this.chronoSplitSec ?? this.chronoDisplayElapsed;
      chronoSplitHand.rotation.z = -((36 + splitTarget) / 60) * Math.PI * 2;
    }

    if (powerReserveHand) {
      const pct = THREE.MathUtils.clamp(this.powerReservePct / 100, 0, 1);
      powerReserveHand.rotation.z =
        watchSpec.id === 'gs-snowflake'
          ? THREE.MathUtils.lerp(Math.PI * 0.65, -Math.PI * 0.05, pct)
          : watchSpec.id === 'iwc-big-pilot'
            ? THREE.MathUtils.lerp(-Math.PI * 0.84, -Math.PI * 0.16, pct)
            : watchSpec.id === 'mbf-lm101'
              ? THREE.MathUtils.lerp(Math.PI * 0.72, -Math.PI * 0.72, pct)
              : THREE.MathUtils.lerp(-Math.PI * 0.35, Math.PI * 0.35, pct);
    }

    if (moonphaseDisc) {
      const moonNowMs =
        effectiveNowMs +
        (this.quickSetDayOffset + this.quickSetMoonDays) * 86400000;
      const lunarPhase = (moonNowMs / (29.530588 * 86400000)) * Math.PI * 2;
      moonphaseDisc.rotation.z = -lunarPhase;
    }

    if (chronoSubHands.length === 3) {
      chronoSubHands[0].rotation.z = -(this.chronoDisplayElapsed * 0.25);
      chronoSubHands[1].rotation.z = -(this.chronoDisplayElapsed * 0.04);
      chronoSubHands[2].rotation.z =
        -((this.chronoDisplayElapsed % 60) / 60) * Math.PI * 2;
    } else if (chronoSubHands.length === 2) {
      chronoSubHands[0].rotation.z =
        -((this.chronoDisplayElapsed / 60 / 60) * Math.PI * 2);
      chronoSubHands[1].rotation.z = -(hr24 / 24) * Math.PI * 2;
    }

    if (isPrimary) {
      for (let p = 0; p < chronoPushers.length; p++) {
        chronoPushers[p].position.y = 0.15 - this.pusherTravel[p];
      }
    }

    windingCrown.position.y = this.crownPullPos;
    windingCrown.rotation.y = this.crownAngle;

    claspSwing.rotation.x = this.claspCurrentAngle;
    flipLock.rotation.x = this.claspFlipAngle;
    if (glidelockGroup) {
      glidelockGroup.position.y = -(this.glidelockCurrentMm / 20) * 0.42;
    }

    if (reversoSwivel) {
      reversoSwivel.rotation.y = this.reversoCurrentProgress * Math.PI;
      reversoSwivel.position.x = Math.sin(this.reversoCurrentProgress * Math.PI) * 0.62;
    }

    for (let g = 0; g < gearWheels.length; g++) {
      gearWheels[g].rotation.z = elapsed * (g % 2 === 0 ? 0.44 : -0.58);
    }

    if (isHacked || beatProfile.isQuartz) {
      balanceWheel.rotation.z = 0;
      if (dialBalanceWheel) dialBalanceWheel.rotation.z = 0;
      hairspring.scale.setScalar(1);
      palletFork.rotation.z = 0;
    } else if (beatProfile.isSpringDrive) {
      balanceWheel.rotation.z = elapsed * Math.PI * 10;
      if (dialBalanceWheel) dialBalanceWheel.rotation.z = elapsed * Math.PI * 10;
      hairspring.scale.setScalar(1);
      palletFork.rotation.z = 0;
    } else {
      const beatOmega = Math.PI * (beatProfile.beatHz * 2);
      const osc = Math.sin(elapsed * beatOmega) * 0.45;
      balanceWheel.rotation.z = osc;
      if (dialBalanceWheel) dialBalanceWheel.rotation.z = osc;
      hairspring.scale.setScalar(1 + Math.sin(elapsed * beatOmega) * 0.065);
      palletFork.rotation.z = Math.sin(elapsed * beatOmega + 0.35) * 0.19;
    }
    if (tourbillonCage && !isHacked) {
      tourbillonCage.rotation.z = -elapsed * ((Math.PI * 2) / 60);
    }
    perpetualRotor.rotation.z = this.rotorAngle + Math.sin(elapsed * 0.65) * 0.08;

    let wristRollX = 0;
    let wristRollY = 0;
    let wristRollZ = 0;
    if (isPrimary && this.wristRollRemainingSec > 0) {
      const p = 1 - this.wristRollRemainingSec / 2.8;
      const env = Math.sin(p * Math.PI);
      wristRollX = Math.sin(p * Math.PI * 2) * 0.34 * env;
      wristRollY = Math.sin(p * Math.PI * 1.5) * 0.58 * env;
      wristRollZ = Math.sin(p * Math.PI * 2) * 0.24 * env;
    }

    rig.watchTiltGroup.position.y = 3.55 + floatWave * 0.11;
    rig.watchTiltGroup.rotation.x =
      -0.3 + this.cursorTiltY * (this.state.flipped ? -1 : 1) + wristRollX;
    rig.watchTiltGroup.rotation.y =
      this.flipCurrentY + (isPrimary ? this.entrySpinY : 0) + wristRollY;
    rig.watchTiltGroup.rotation.z =
      Math.sin(elapsed * 0.78) * 0.024 - this.cursorTiltX + wristRollZ;
    rig.shadowMesh.scale.set(shadowScale, shadowScale, 1);
  }

  private tick = () => {
    if (this.disposed || this.paused) return;

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    if (this.chronoRunning) {
      this.chronoElapsed += delta;
      if (!this.chronoResetting) {
        this.chronoDisplayElapsed = this.chronoElapsed;
      }
    }

    if (this.chronoResetting) {
      this.chronoDisplayElapsed = THREE.MathUtils.damp(
        this.chronoDisplayElapsed,
        0,
        14,
        delta
      );
      if (this.chronoDisplayElapsed < 0.01) {
        this.chronoDisplayElapsed = 0;
        this.chronoResetting = false;
      }
    }

    // Cinema Showcase Choreography: fluid camera orbit + breathing exploded assembly
    let effectiveExplodeTarget = this.state.explodeTarget;
    if (this.state.cinemaMode) {
      this.cinemaPhase += delta;
      const wave = 0.5 - 0.5 * Math.cos(this.cinemaPhase * 0.55);
      effectiveExplodeTarget = Math.max(
        this.state.explodeTarget,
        Math.max(0, (wave - 0.25) / 0.75) * 0.85
      );
      const orbitA = this.cinemaPhase * 0.42;
      const baseR = this.state.compareModelId ? 8.8 : 6.9;
      const r = baseR + Math.sin(this.cinemaPhase * 0.35) * 0.9;
      _camGoalTarget.set(0, 3.45, -0.25);
      _camGoalPos.set(
        Math.sin(orbitA) * r,
        4.1 + Math.sin(this.cinemaPhase * 0.55) * 1.0,
        Math.cos(orbitA) * r - 0.2
      );
      this.camera.position.lerp(_camGoalPos, 1 - Math.exp(-3.2 * delta));
      this.controls.target.lerp(_camGoalTarget, 1 - Math.exp(-3.5 * delta));
    }

    if (Math.abs(this.currentExplode - effectiveExplodeTarget) > 0.0005) {
      this.currentExplode = THREE.MathUtils.damp(
        this.currentExplode,
        effectiveExplodeTarget,
        6.8,
        delta
      );
      this.applyExplodePositions(this.currentExplode);
    } else if (this.currentExplode !== effectiveExplodeTarget) {
      this.currentExplode = effectiveExplodeTarget;
      this.applyExplodePositions(this.currentExplode);
    }

    if (
      this.currentRig &&
      Math.abs(this.bezelCurrentAngle - this.bezelTargetAngle) > 0.0005
    ) {
      this.bezelCurrentAngle = THREE.MathUtils.damp(
        this.bezelCurrentAngle,
        this.bezelTargetAngle,
        12,
        delta
      );
      this.currentRig.layers.bezelGroup.rotation.z = this.bezelCurrentAngle;
    }

    // Smooth 180-degree watch flip & damped entry presentation spin
    const targetFlipY = this.state.flipped ? Math.PI : 0;
    if (Math.abs(this.flipCurrentY - targetFlipY) > 0.0005) {
      this.flipCurrentY = THREE.MathUtils.damp(this.flipCurrentY, targetFlipY, 6.5, delta);
    } else {
      this.flipCurrentY = targetFlipY;
    }

    if (Math.abs(this.entrySpinY) > 0.0008) {
      this.entrySpinY = THREE.MathUtils.damp(this.entrySpinY, 0, 5.8, delta);
    } else {
      this.entrySpinY = 0;
    }

    // Manual crown time offset smooth interpolation
    if (Math.abs(this.manualTimeOffsetSec - this.manualTimeTargetSec) > 0.05) {
      this.manualTimeOffsetSec = THREE.MathUtils.damp(
        this.manualTimeOffsetSec,
        this.manualTimeTargetSec,
        8.5,
        delta
      );
    } else {
      this.manualTimeOffsetSec = this.manualTimeTargetSec;
    }

    // Synchronized Split Compare & side-nav horizontal framing interpolation
    const goalOffsetX = this.state.compareModelId ? -2.15 : (this.state.stageShiftX ?? 0);
    if (Math.abs(this.primaryOffsetX - goalOffsetX) > 0.002) {
      this.primaryOffsetX = THREE.MathUtils.damp(
        this.primaryOffsetX,
        goalOffsetX,
        7.5,
        delta
      );
    } else {
      this.primaryOffsetX = goalOffsetX;
    }
    if (this.currentRig) {
      this.currentRig.root.position.x = this.primaryOffsetX;
    }
    if (this.compareRig) {
      this.compareRig.root.position.x = -this.primaryOffsetX;
    }

    // Midnight date-jump check (allocates zero objects unless day changes)
    this.syncMidnightDateOverride(true);

    // Gallery sweeping key light motion
    if (this.state.gallerySweep || this.state.cinemaMode) {
      this.sweepPhase += delta * 0.9;
      this.keyLight.position.set(
        Math.sin(this.sweepPhase) * 6.8,
        7.8 + Math.cos(this.sweepPhase * 0.65) * 1.4,
        4.2 + Math.cos(this.sweepPhase) * 3.8
      );
    } else {
      this.keyLight.position.x = THREE.MathUtils.damp(this.keyLight.position.x, 5.5, 4, delta);
      this.keyLight.position.y = THREE.MathUtils.damp(this.keyLight.position.y, 8.5, 4, delta);
      this.keyLight.position.z = THREE.MathUtils.damp(this.keyLight.position.z, 6.0, 4, delta);
    }

    if (!this.state.cinemaMode && this.isTransitioningCam) {
      const alpha = 1 - Math.exp(-5.5 * delta);
      this.camera.position.lerp(_camGoalPos, alpha);
      this.controls.target.lerp(_camGoalTarget, alpha);

      if (
        this.camera.position.distanceTo(_camGoalPos) < 0.025 &&
        this.controls.target.distanceTo(_camGoalTarget) < 0.025
      ) {
        this.camera.position.copy(_camGoalPos);
        this.controls.target.copy(_camGoalTarget);
        this.isTransitioningCam = false;
      }
    }

    // Cursor magnetic parallax tilt
    const goalTiltX =
      this.pointerInside && !this.isDraggingOrbit && !this.state.loupeActive
        ? this.pointerNormX * 0.075
        : 0;
    const goalTiltY =
      this.pointerInside && !this.isDraggingOrbit && !this.state.loupeActive
        ? this.pointerNormY * 0.065
        : 0;
    this.cursorTiltX = THREE.MathUtils.damp(this.cursorTiltX, goalTiltX, 6.0, delta);
    this.cursorTiltY = THREE.MathUtils.damp(this.cursorTiltY, goalTiltY, 6.0, delta);

    if (this.motesPoints) {
      this.motesPoints.rotation.y = elapsed * 0.02;
    }
    if (this.causticsMesh && this.causticsMesh.visible && this.causticsTex) {
      this.causticsTex.offset.x = (elapsed * 0.028) % 1;
      this.causticsTex.offset.y = (elapsed * 0.019) % 1;
    }

    // Smoothly orbit 360 during video turntable capture
    if (this.turntableRemainingSec > 0) {
      this.turntableRemainingSec = Math.max(0, this.turntableRemainingSec - delta);
      this.controls.autoRotate = true;
      this.controls.autoRotateSpeed = 13.0;
    } else {
      this.controls.autoRotate = !this.isSoftwareGl && this.state.autoRotate;
      this.controls.autoRotateSpeed = 0.56;
    }

    this.controls.update();

    // Feed OrbitControls & watch flip velocity into Physical Perpetual Rotor Pendulum
    const curAzimuth = this.controls.getAzimuthalAngle();
    let dAzimuth = curAzimuth - this.prevCamAzimuth;
    if (dAzimuth > Math.PI) dAzimuth -= Math.PI * 2;
    if (dAzimuth < -Math.PI) dAzimuth += Math.PI * 2;
    this.prevCamAzimuth = curAzimuth;

    const dFlip = this.flipCurrentY - this.prevFlipY;
    this.prevFlipY = this.flipCurrentY;

    this.rotorAngularVel += dAzimuth * 3.8 + dFlip * 4.5;
    this.rotorAngularVel -= Math.sin(this.rotorAngle) * 4.2 * delta;
    this.rotorAngularVel *= Math.exp(-1.9 * delta);
    this.rotorAngle += this.rotorAngularVel * delta;

    if (this.wristRollRemainingSec > 0) {
      this.wristRollRemainingSec = Math.max(0, this.wristRollRemainingSec - delta);
    }

    // Shared mechanical transitions updated once per frame
    const crownOffsets = [0, 0.048, 0.09, 0.138];
    const targetCrownPull = crownOffsets[this.state.crownPosition] ?? 0;
    this.crownPullPos = THREE.MathUtils.damp(this.crownPullPos, targetCrownPull, 12, delta);
    if (Math.abs(this.crownSpinVel) > 0.01) {
      this.crownAngle += this.crownSpinVel * delta;
      this.crownSpinVel *= Math.exp(-5.0 * delta);
    }
    this.pusherTravel[0] = THREE.MathUtils.damp(this.pusherTravel[0], 0, 18, delta);
    this.pusherTravel[1] = THREE.MathUtils.damp(this.pusherTravel[1], 0, 18, delta);

    const targetClaspAngle = this.state.claspOpen ? 0.52 : 0;
    const targetFlipAngle = this.state.claspOpen ? 0.28 : -0.14;
    this.claspCurrentAngle = THREE.MathUtils.damp(
      this.claspCurrentAngle,
      targetClaspAngle,
      9.5,
      delta
    );
    this.claspFlipAngle = THREE.MathUtils.damp(
      this.claspFlipAngle,
      targetFlipAngle,
      12,
      delta
    );

    const targetRev = this.state.reversoFlipped ? 1 : 0;
    this.reversoCurrentProgress = THREE.MathUtils.damp(
      this.reversoCurrentProgress,
      targetRev,
      5.8,
      delta
    );
    this.glidelockCurrentMm = THREE.MathUtils.damp(
      this.glidelockCurrentMm,
      this.state.glidelockMm,
      10,
      delta
    );

    // UV Torch Lume Charging + Natural Phosphor Decay
    const uvActive =
      this.state.lightingMode === 'nocturne' &&
      this.state.uvTorch &&
      this.pointerInside;
    if (uvActive) {
      this.uvSpotLight.intensity = THREE.MathUtils.damp(this.uvSpotLight.intensity, 15.0, 12, delta);
      this.uvSpotTarget.position.set(
        this.pointerNormX * 3.4,
        3.55 - this.pointerNormY * 3.1,
        0.5
      );
      if (Math.hypot(this.pointerNormX, this.pointerNormY) < 0.48) {
        this.lumeCharge = Math.min(1, this.lumeCharge + delta * 1.45);
      } else {
        this.lumeCharge *= Math.exp(-0.18 * delta);
      }
    } else {
      this.uvSpotLight.intensity = THREE.MathUtils.damp(this.uvSpotLight.intensity, 0, 10, delta);
      this.lumeCharge *= Math.exp(-0.16 * delta);
    }

    if (this.state.lightingMode === 'nocturne') {
      const targetIntensity = 0.72 + this.lumeCharge * 0.62;
      if (this.currentMats) {
        this.currentMats.chromalightLume.emissiveIntensity = targetIntensity;
        this.currentMats.secondaryLume.emissiveIntensity = targetIntensity;
      }
      if (this.compareMats) {
        this.compareMats.chromalightLume.emissiveIntensity = targetIntensity;
        this.compareMats.secondaryLume.emissiveIntensity = targetIntensity;
      }
    }

    // Gentle live Power Reserve bleed + rotor recharge telemetry
    const rotorEnergy = Math.abs(this.rotorAngularVel) * delta * 0.9;
    this.powerReservePct = THREE.MathUtils.clamp(
      this.powerReservePct - delta * 0.08 + rotorEnergy,
      4,
      100
    );
    if (elapsed - this.lastPowerEmit > 0.35) {
      this.lastPowerEmit = elapsed;
      this.onPowerReserveChangeCb?.(Math.round(this.powerReservePct));
    }

    const activeWatchSpec = getWatchById(this.state.modelId);
    const activeBeatProfile = resolveCaliberBeatProfile(activeWatchSpec);
    const activeCaps = resolveWatchCapabilities(activeWatchSpec);
    const isActiveHacked =
      this.state.crownPosition === 3 &&
      activeCaps.supportsHacking &&
      !activeBeatProfile.isSpringDrive &&
      !activeBeatProfile.isQuartz;
    const beatsPerSec = activeBeatProfile.isSpringDrive
      ? 0
      : activeBeatProfile.beatHz * 2;
    const currentBeat = beatsPerSec > 0 ? Math.floor(elapsed * beatsPerSec) : 0;
    if (!activeBeatProfile.isSpringDrive && !isActiveHacked && currentBeat !== this.lastTickStep) {
      this.lastTickStep = currentBeat;
      if (this.state.soundEnabled) {
        horologyAudio.playEscapementTick(
          currentBeat % 2 === 0,
          activeBeatProfile.isQuartz ? 1.22 : activeBeatProfile.beatHz / 4
        );
      }
    }

    const effectiveNowMs = this.getEffectiveNowMs();
    const floatWave = Math.sin(elapsed * 1.15);
    const shadowScale = 1 - floatWave * 0.045;

    if (this.currentRig) {
      this.animateRigKinematics(
        this.currentRig,
        elapsed,
        effectiveNowMs,
        floatWave,
        shadowScale,
        true,
        activeWatchSpec
      );
    }
    if (this.compareRig && this.state.compareModelId) {
      this.animateRigKinematics(
        this.compareRig,
        elapsed,
        effectiveNowMs,
        floatWave,
        shadowScale,
        false,
        getWatchById(this.state.compareModelId)
      );
    }

    if (
      (this.state.lightingMode === 'nocturne' || this.lumeCharge > 0.08) &&
      !this.isSoftwareGl &&
      this.composer
    ) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    this.renderLoupePass();
    if (this.pendingSnapshotCb) {
      const cb = this.pendingSnapshotCb;
      this.pendingSnapshotCb = null;
      try {
        cb(this.renderer.domElement.toDataURL('image/png'));
      } catch {
        // Ignore cross-origin security failure if ever triggered
      }
    }

    const nowMs = performance.now();
    this.emitChronoTelemetry(false);
    this.emitExplodeCallouts(nowMs);
    this.emitCaliperCallouts(nowMs);
    this.emitTimegrapherTelemetry(
      nowMs,
      activeWatchSpec,
      activeBeatProfile,
      currentBeat,
      isActiveHacked
    );

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private emitTimegrapherTelemetry(
    nowMs: number,
    watch: WatchSpec,
    profile: CaliberBeatProfile,
    tickIndex: number,
    isHacked: boolean
  ) {
    if (!this.state.timegrapherMode || !this.onTimegrapherTelemetryCb) return;
    if (nowMs - this.lastTimegrapherEmit < 130) return;
    this.lastTimegrapherEmit = nowMs;

    let positionLabel = 'Dial Up (DU)';
    let positionalBias = 0.6;
    let positionalAmpDrop = 0;

    if (this.flipCurrentY > Math.PI * 0.5) {
      positionLabel = 'Caseback Up (PD)';
      positionalBias = 1.1;
      positionalAmpDrop = 4;
    } else if (Math.abs(this.camera.position.x) > 4.6) {
      positionLabel = 'Crown Down (9H/3H)';
      positionalBias = -0.8;
      positionalAmpDrop = 22;
    } else if (this.camera.position.y < 3.7 && this.camera.position.z > 3.2) {
      positionLabel = '12h Up (Vert)';
      positionalBias = -0.3;
      positionalAmpDrop = 16;
    }

    const reserveFactor = THREE.MathUtils.clamp(this.powerReservePct / 100, 0.15, 1);
    const amplitudeDeg =
      isHacked || profile.isQuartz || profile.isSpringDrive
        ? 0
        : Math.round(215 + reserveFactor * 94 - positionalAmpDrop);
    const rateSecPerDay = profile.isSpringDrive
      ? 0.1
      : profile.isQuartz
        ? 0.0
        : Number(
            (
              positionalBias +
              (watch.brand === 'ROLEX' ? 0.1 : watch.brand === 'ZENITH' ? 0.4 : -0.2) +
              (reserveFactor < 0.35 ? -0.9 : 0)
            ).toFixed(1)
          );
    const beatErrorMs =
      isHacked || profile.isQuartz || profile.isSpringDrive
        ? 0
        : positionalAmpDrop > 10
          ? 0.2
          : 0.1;

    this.onTimegrapherTelemetryCb({
      positionLabel,
      vph: profile.vph,
      beatHz: profile.beatHz,
      isSpringDrive: profile.isSpringDrive,
      isQuartz: profile.isQuartz,
      isHacked,
      amplitudeDeg,
      beatErrorMs,
      rateSecPerDay,
      liftAngleDeg: profile.liftAngleDeg,
      tickIndex,
    });
  }

  public dispose() {
    this.disposed = true;
    horologyAudio.setEnabled(false);
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerleave', this.handlePointerLeave);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.removeEventListener(
      'webglcontextlost',
      this.handleContextLost
    );
    this.renderer.domElement.removeEventListener(
      'webglcontextrestored',
      this.handleContextRestored
    );

    this.controls.dispose();
    if (this.currentRig) this.currentRig.dispose();
    if (this.currentMats) this.currentMats.disposables.forEach((d) => d.dispose());
    if (this.compareRig) this.compareRig.dispose();
    if (this.compareMats) this.compareMats.disposables.forEach((d) => d.dispose());

    if (this.floorReflector) {
      this.floorReflector.dispose();
    }
    this.floorReflectorGeo?.dispose();
    this.floorVeilGeo?.dispose();
    this.floorVeilMat?.dispose();
    this.floorVeilAlpha?.dispose();

    this.bloomPass?.dispose();
    this.composer?.dispose();

    this.causticsGeo?.dispose();
    this.causticsMat?.dispose();
    this.moteGeo?.dispose();
    this.moteMat?.dispose();
    this.rectLights.forEach((rl) => rl.dispose());
    this.rectLights = [];
    this.keyLight.shadow.map?.dispose();
    this.keyLight.dispose();
    this.hemiLight.dispose();
    this.rimLight.dispose();
    this.uvSpotLight.dispose();
    this.envTex.dispose();
    this.scene.clear();
    releaseStaticTextures();
    this.renderer.dispose();
    this.renderer.forceContextLoss();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
