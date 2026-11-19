'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import WatchMiniDial from './navigation/WatchMiniDial';
import {
  Activity,
  Archive,
  BookOpen,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Columns2,
  Compass,
  Droplets,
  Eye,
  FileImage,
  Flag,
  Flame,
  Flashlight,
  FlipHorizontal2,
  Gauge,
  History,
  Layers,
  LayoutGrid,
  Link2,
  Minimize2,
  Moon,
  Mountain,
  Pause,
  PenTool,
  Play,
  RefreshCw,
  Repeat,
  RotateCcw,
  RotateCw,
  Ruler,
  ScanEye,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Sunrise,
  Timer,
  Trash2,
  Trophy,
  Video,
  Volume2,
  VolumeX,
  Watch,
  X,
} from 'lucide-react';
import {
  ALLOY_OPTIONS,
  AlloyId,
  AtelierTourStep,
  BELT_OPTIONS,
  BELT_SHADE_OPTIONS,
  BEZEL_OPTIONS,
  BeltId,
  BeltShadeId,
  BezelId,
  CURATED_SHOWDOWNS,
  CameraPresetId,
  CrownPosition,
  DIAL_OPTIONS,
  DialId,
  GMT_TIMEZONES,
  LightingModeId,
  WATCH_CATEGORIES,
  WATCH_HOTSPOTS,
  WATCH_MODELS,
  WRIST_STYLE_OPTIONS,
  WatchCategoryId,
  WatchModelId,
  WristStyleId,
  getAtelierTourSteps,
  getBeltLabelForWatch,
  getChronologicalWatches,
  getShortBeltTabLabel,
  getWatchById,
  resolveAlloy,
  resolveBeltShade,
  resolveBezel,
  resolveCaliberBeatProfile,
  resolveDial,
  resolveWatchCapabilities,
} from '@/lib/watches';
import type {
  CaliperCallout,
  ChronoTelemetry,
  ExplodeCallout,
  TimegrapherTelemetry,
  WatchStudioEngine,
} from '@/lib/three/WatchStudioEngine';
import TimegrapherStrip from './TimegrapherStrip';

export interface VaultSlotPreset {
  modelId: WatchModelId;
  alloyId: AlloyId;
  dialId: DialId;
  bezelId: BezelId;
  beltId: BeltId;
  beltShadeId?: BeltShadeId;
  lightingMode: LightingModeId;
  customEngraving: string;
  patina: number;
  glidelockMm: number;
  label?: string;
  savedAt: string;
}

const VAULT_SLOT_COUNT = 6;
const VAULT_STORAGE_KEY = 'chrono_studio_vault_v1';
const LEGACY_VAULT_STORAGE_KEY = 'rolex_studio_vault_v1';
const VAULT_EMPTY_SNAPSHOT: (VaultSlotPreset | null)[] = Array.from(
  { length: VAULT_SLOT_COUNT },
  () => null
);
let cachedVaultRaw: string | null | undefined = undefined;
let cachedVaultParsed: (VaultSlotPreset | null)[] = VAULT_EMPTY_SNAPSHOT;
const vaultListeners = new Set<() => void>();

function subscribeVaultStore(cb: () => void) {
  vaultListeners.add(cb);
  if (typeof window !== 'undefined') {
    const onStorage = (e: StorageEvent) => {
      if (e.key === VAULT_STORAGE_KEY || e.key === LEGACY_VAULT_STORAGE_KEY) {
        cachedVaultRaw = undefined;
        cb();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      vaultListeners.delete(cb);
      window.removeEventListener('storage', onStorage);
    };
  }
  return () => {
    vaultListeners.delete(cb);
  };
}

function getVaultSnapshot(): (VaultSlotPreset | null)[] {
  if (typeof window === 'undefined') return VAULT_EMPTY_SNAPSHOT;
  try {
    const raw =
      window.localStorage.getItem(VAULT_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_VAULT_STORAGE_KEY);
    if (raw === cachedVaultRaw) return cachedVaultParsed;
    cachedVaultRaw = raw;
    if (!raw) {
      cachedVaultParsed = VAULT_EMPTY_SNAPSHOT;
      return cachedVaultParsed;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cachedVaultParsed = Array.from(
        { length: VAULT_SLOT_COUNT },
        (_, idx) => parsed[idx] ?? null
      );
    } else {
      cachedVaultParsed = VAULT_EMPTY_SNAPSHOT;
    }
  } catch {
    cachedVaultParsed = VAULT_EMPTY_SNAPSHOT;
  }
  return cachedVaultParsed;
}

function getVaultServerSnapshot(): (VaultSlotPreset | null)[] {
  return VAULT_EMPTY_SNAPSHOT;
}

function writeVaultSlots(next: (VaultSlotPreset | null)[]) {
  try {
    const serialized = JSON.stringify(next);
    window.localStorage.setItem(VAULT_STORAGE_KEY, serialized);
    cachedVaultRaw = serialized;
    cachedVaultParsed = next;
  } catch {
    // Ignore storage quota errors
  }
  vaultListeners.forEach((cb) => cb());
}

interface WatchStudioViewportProps {
  selectedModel: WatchModelId;
  onSelectModel: (id: WatchModelId) => void;
  compareModelId: WatchModelId | null;
  onChangeCompareModelId: (id: WatchModelId | null) => void;
  onActivateShowdown?: (primaryId: WatchModelId, compareId: WatchModelId) => void;
  onOpenCatalog: () => void;
  onCycleNavStyle: () => void;
  stageShiftX: number;
  alloyId: AlloyId;
  onChangeAlloyId: (id: AlloyId) => void;
  dialId: DialId;
  onChangeDialId: (id: DialId) => void;
  bezelId: BezelId;
  onChangeBezelId: (id: BezelId) => void;
  beltId: BeltId;
  onChangeBeltId: (id: BeltId) => void;
  beltShadeId: BeltShadeId;
  onChangeBeltShadeId: (id: BeltShadeId) => void;
  exhibitionMode: boolean;
  onToggleExhibition: () => void;
  lightingMode: LightingModeId;
  onChangeLightingMode: (mode: LightingModeId) => void;
  reversoFlipped: boolean;
  onChangeReversoFlipped: (flipped: boolean) => void;
  onRestorePreset?: (preset: {
    modelId: WatchModelId;
    alloyId: AlloyId;
    dialId: DialId;
    bezelId: BezelId;
    beltId: BeltId;
    beltShadeId?: BeltShadeId;
    lightingMode: LightingModeId;
  }) => void;
}

const CAMERA_LABELS: { id: CameraPresetId; label: string }[] = [
  { id: 'hero', label: 'Hero' },
  { id: 'dial', label: 'Dial' },
  { id: 'profile', label: 'Profile' },
  { id: 'caliber', label: 'Caliber' },
];

const LIGHTING_OPTIONS: {
  id: LightingModeId;
  label: string;
}[] = [
  { id: 'atelier', label: 'Atelier' },
  { id: 'vault', label: 'Vault' },
  { id: 'nocturne', label: 'Lume' },
  { id: 'alpine', label: 'Alpine' },
  { id: 'bronze', label: 'Bronze' },
];

function formatChronoTime(sec: number): string {
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  const wholeSec = Math.floor(rem);
  const tenths = Math.floor((rem - wholeSec) * 10);
  return `${String(mins).padStart(2, '0')}:${String(wholeSec).padStart(2, '0')}.${tenths}`;
}

export default function WatchStudioViewport({
  selectedModel,
  onSelectModel,
  compareModelId,
  onChangeCompareModelId,
  onActivateShowdown,
  onOpenCatalog,
  onCycleNavStyle,
  stageShiftX,
  alloyId,
  onChangeAlloyId,
  dialId,
  onChangeDialId,
  bezelId,
  onChangeBezelId,
  beltId,
  onChangeBeltId,
  beltShadeId,
  onChangeBeltShadeId,
  exhibitionMode,
  onToggleExhibition,
  lightingMode,
  onChangeLightingMode,
  reversoFlipped,
  onChangeReversoFlipped,
  onRestorePreset,
}: WatchStudioViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<WatchStudioEngine | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const dockHoverRef = useRef<boolean>(false);

  const [exhibitionBack, setExhibitionBack] = useState<boolean>(false);
  const [explode, setExplode] = useState<number>(0);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('hero');
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [liveTime, setLiveTime] = useState<boolean>(false);
  const [gmtTimezoneOffset, setGmtTimezoneOffset] = useState<number>(1);
  const [flipped, setFlipped] = useState<boolean>(false);
  const [gallerySweep, setGallerySweep] = useState<boolean>(false);
  const [loupeActive, setLoupeActive] = useState<boolean>(false);
  const [cinemaMode, setCinemaMode] = useState<boolean>(false);
  const [crownPosition, setCrownPosition] = useState<CrownPosition>(0);
  const [claspOpen, setClaspOpen] = useState<boolean>(false);
  const [xrayDial, setXrayDial] = useState<boolean>(false);
  const [customEngraving, setCustomEngraving] = useState<string>('');
  const [engraveOpen, setEngraveOpen] = useState<boolean>(false);
  const [patina, setPatina] = useState<number>(0);
  const [wetStage, setWetStage] = useState<boolean>(false);
  const [wristMode, setWristMode] = useState<boolean>(false);
  const [wristMm, setWristMm] = useState<number>(175);
  const [wristStyle, setWristStyle] = useState<WristStyleId>('slate-mannequin');
  const [timegrapherOpen, setTimegrapherOpen] = useState<boolean>(false);
  const [timegrapherTelemetry, setTimegrapherTelemetry] =
    useState<TimegrapherTelemetry | null>(null);
  const [timelineOpen, setTimelineOpen] = useState<boolean>(false);
  const [manualTimeMin, setManualTimeMin] = useState<number>(0);
  const [uvTorch, setUvTorch] = useState<boolean>(true);
  const [caliperMode, setCaliperMode] = useState<boolean>(false);
  const [glidelockMm, setGlidelockMm] = useState<number>(0);
  const [powerReservePct, setPowerReservePct] = useState<number>(82);
  const [bezelAngleDeg, setBezelAngleDeg] = useState<number>(0);
  const [vaultOpen, setVaultOpen] = useState<boolean>(false);
  const vaultSlots = useSyncExternalStore(
    subscribeVaultStore,
    getVaultSnapshot,
    getVaultServerSnapshot
  );
  const [chronoTelemetry, setChronoTelemetry] = useState<ChronoTelemetry>({
    elapsedSec: 0,
    running: true,
    splitSec: null,
    unitsPerHour: null,
  });
  const [recording360, setRecording360] = useState<boolean>(false);
  const [loupeScreenPos, setLoupeScreenPos] = useState<{
    x: number;
    y: number;
    visible: boolean;
  }>({ x: 0, y: 0, visible: false });
  const [explodeCallouts, setExplodeCallouts] = useState<ExplodeCallout[]>([]);
  const [caliperCallouts, setCaliperCallouts] = useState<CaliperCallout[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [dockOpen, setDockOpen] = useState<boolean>(true);
  const [chromeIdle, setChromeIdle] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [webglError, setWebglError] = useState<boolean>(false);
  const [tourModelId, setTourModelId] = useState<WatchModelId | null>(null);
  const [tourStepIdx, setTourStepIdx] = useState<number>(0);
  const [tourAutoPlay, setTourAutoPlay] = useState<boolean>(false);
  const tourPrevLightingRef = useRef<LightingModeId | null>(null);
  const tourPrevReversoRef = useRef<boolean>(false);

  const isLightBackdrop = lightingMode === 'alpine';
  const activeWatch = getWatchById(selectedModel);
  const beatProfile = resolveCaliberBeatProfile(activeWatch);
  const chronologicalWatches = getChronologicalWatches();
  const activeTimelineIdx = Math.max(
    0,
    chronologicalWatches.findIndex((w) => w.id === selectedModel)
  );
  const hasReversoFlip = Boolean(activeWatch.hasReversoFlip);
  const isChronoRunning = chronoTelemetry.running;
  const brandSlug = activeWatch.brand
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const tourSteps = getAtelierTourSteps(activeWatch);
  const tourActive = tourModelId === selectedModel;
  const currentTourStep = tourActive ? tourSteps[tourStepIdx] ?? tourSteps[0] : null;
  const effectiveReversoFlipped = Boolean(hasReversoFlip && reversoFlipped);
  const lugToLugMm =
    activeWatch.lugToLugMm ?? Number((activeWatch.caseDiameterMm + 7.2).toFixed(1));
  const wristFitRatio = lugToLugMm / (wristMm * 0.34);
  const wristFitLabel =
    wristFitRatio < 0.72
      ? 'Compact Fit'
      : wristFitRatio <= 0.86
        ? 'Ideal Fit'
        : 'Bold Fit';
  const compareWatch = compareModelId ? getWatchById(compareModelId) : null;
  const capabilities = resolveWatchCapabilities(activeWatch);
  const effectiveAlloyId: AlloyId = capabilities.allowedAlloys.includes(alloyId)
    ? alloyId
    : 'default';
  const effectiveDialId: DialId = capabilities.allowedDials.includes(dialId)
    ? dialId
    : 'default';
  const effectiveBezelId: BezelId = capabilities.allowedBezels.includes(bezelId)
    ? bezelId
    : 'default';
  const effectiveBeltId: BeltId = capabilities.allowedBelts.includes(beltId)
    ? beltId
    : activeWatch.defaultBelt ?? capabilities.allowedBelts[0];
  const effectiveCrownPosition: CrownPosition =
    capabilities.crownMode === 'none'
      ? 0
      : crownPosition === 0 || capabilities.crownStops.some((s) => s.pos === crownPosition)
        ? crownPosition
        : 0;
  const effectiveExhibitionBack = capabilities.supportsExhibitionBack && exhibitionBack;
  const effectiveTimegrapherOpen = capabilities.supportsTimegrapher && timegrapherOpen;
  const effectiveUvTorch = capabilities.supportsLume && uvTorch;
  const hasMicroAdjustClasp = capabilities.hasMicroAdjustClasp(effectiveBeltId);

  const activeAlloy = resolveAlloy(activeWatch, effectiveAlloyId);
  const activeDial = resolveDial(activeWatch, effectiveDialId);
  const activeBezel = resolveBezel(activeWatch, effectiveBezelId);
  const activeBeltLabel = getBeltLabelForWatch(activeWatch, effectiveBeltId);
  const activeBeltShade = resolveBeltShade(activeWatch, beltShadeId);
  const activeHotspot =
    WATCH_HOTSPOTS.find((h) => h.id === activeHotspotId) ?? null;

  const hasCerachromBezel = capabilities.allowedBezels.length > 1;
  const hasInteractiveBezel = capabilities.hasInteractiveBezel;

  const allowedAlloyOptions = ALLOY_OPTIONS.filter((a) =>
    capabilities.allowedAlloys.includes(a.id)
  );
  const allowedDialOptions = DIAL_OPTIONS.filter((d) =>
    capabilities.allowedDials.includes(d.id)
  );
  const allowedBezelOptions = BEZEL_OPTIONS.filter((b) =>
    capabilities.allowedBezels.includes(b.id)
  );
  const allowedBeltOptions = BELT_OPTIONS.filter((b) =>
    capabilities.allowedBelts.includes(b.id)
  );

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  }, []);

  const startIdleCountdown = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = window.setTimeout(() => {
      if (!dockHoverRef.current) {
        setChromeIdle(true);
      }
    }, 4500);
  }, []);

  const scheduleIdleTimer = useCallback(() => {
    setChromeIdle(false);
    startIdleCountdown();
  }, [startIdleCountdown]);

  // Auto-dimming studio chrome timer
  useEffect(() => {
    const onActivity = () => scheduleIdleTimer();
    startIdleCountdown();
    window.addEventListener('pointerdown', onActivity);
    window.addEventListener('pointermove', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('wheel', onActivity, { passive: true });
    return () => {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('pointermove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('wheel', onActivity);
    };
  }, [scheduleIdleTimer, startIdleCountdown]);

  // Mount WebGL Engine once inside isolated container ref
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let cancelled = false;
    let engineInstance: WatchStudioEngine | null = null;

    import('@/lib/three/WatchStudioEngine')
      .then(({ WatchStudioEngine }) => {
        if (cancelled || !mountRef.current) return;
        try {
          engineInstance = new WatchStudioEngine(
            mountRef.current,
            {
              modelId: selectedModel,
              alloyId,
              dialId,
              bezelId,
              beltId,
              beltShadeId,
              exhibitionBack,
              explodeTarget: explode,
              lightingMode,
              autoRotate,
              liveTime,
              gmtTimezoneOffset,
              flipped,
              gallerySweep,
              loupeActive,
              cinemaMode,
              crownPosition,
              claspOpen,
              soundEnabled,
              xrayDial,
              compareModelId,
              customEngraving,
              patina,
              wetStage,
              wristMode,
              wristMm,
              wristStyle,
              timegrapherMode: timegrapherOpen,
              uvTorch,
              reversoFlipped: effectiveReversoFlipped,
              caliperMode,
              glidelockMm,
              stageShiftX,
            },
            {
              onContextLost: () => setWebglError(true),
              onContextRestored: () => setWebglError(false),
              onExplodeCallouts: (callouts) => setExplodeCallouts(callouts),
              onCaliperCallouts: (callouts) => setCaliperCallouts(callouts),
              onCrownPositionChange: (pos) => setCrownPosition(pos),
              onClaspOpenChange: (open) => setClaspOpen(open),
              onReversoFlipChange: (rev) => onChangeReversoFlipped(rev),
              onPowerReserveChange: (pct) => setPowerReservePct(pct),
              onCinemaStop: () => setCinemaMode(false),
              onMidnightDateJump: (dayNum) =>
                showToast(`Midnight Date Jump -> Day ${dayNum}`),
              onChronoTelemetry: (telemetry) => setChronoTelemetry(telemetry),
              onBezelAngleChange: (deg) => setBezelAngleDeg(deg),
              onTimegrapherTelemetry: (tel) => setTimegrapherTelemetry(tel),
            }
          );
          engineRef.current = engineInstance;
        } catch {
          setWebglError(true);
        }
      })
      .catch(() => setWebglError(true));

    return () => {
      cancelled = true;
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (engineInstance) {
        engineInstance.dispose();
      }
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync interactive state changes into the running 3D engine without remounting
  useEffect(() => {
    engineRef.current?.updateState({
      modelId: selectedModel,
      alloyId: effectiveAlloyId,
      dialId: effectiveDialId,
      bezelId: effectiveBezelId,
      beltId: effectiveBeltId,
      beltShadeId,
      exhibitionBack: effectiveExhibitionBack,
      explodeTarget: explode,
      lightingMode,
      autoRotate,
      liveTime,
      gmtTimezoneOffset,
      flipped,
      gallerySweep,
      loupeActive,
      cinemaMode,
      crownPosition: effectiveCrownPosition,
      claspOpen,
      soundEnabled,
      xrayDial,
      compareModelId,
      customEngraving,
      patina: activeWatch.supportsPatina ? patina : 0,
      wetStage,
      wristMode,
      wristMm,
      wristStyle,
      timegrapherMode: effectiveTimegrapherOpen,
      uvTorch: effectiveUvTorch,
      reversoFlipped: effectiveReversoFlipped,
      caliperMode,
      glidelockMm: hasMicroAdjustClasp ? glidelockMm : 0,
      stageShiftX,
    });
  }, [
    selectedModel,
    activeWatch.supportsPatina,
    effectiveAlloyId,
    effectiveDialId,
    effectiveBezelId,
    effectiveBeltId,
    beltShadeId,
    effectiveExhibitionBack,
    explode,
    lightingMode,
    autoRotate,
    liveTime,
    gmtTimezoneOffset,
    flipped,
    gallerySweep,
    loupeActive,
    cinemaMode,
    effectiveCrownPosition,
    claspOpen,
    soundEnabled,
    xrayDial,
    compareModelId,
    customEngraving,
    patina,
    wetStage,
    wristMode,
    wristMm,
    wristStyle,
    effectiveTimegrapherOpen,
    effectiveUvTorch,
    effectiveReversoFlipped,
    caliperMode,
    hasMicroAdjustClasp,
    glidelockMm,
    stageShiftX,
  ]);

  // Keyboard shortcuts: 'H' dock, 'C' navigator, 'N' cycle nav test mode, 'Esc' exit exhibition, 'Space' spin, 'L' loupe, '1-9' watch models
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setDockOpen((prev) => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        onOpenCatalog();
      } else if (e.key === 'n' || e.key === 'N') {
        onCycleNavStyle();
      } else if (e.key === 'l' || e.key === 'L') {
        setLoupeActive((prev) => {
          const next = !prev;
          if (!next) {
            engineRef.current?.setLoupeTarget(null, -1, -1);
            setLoupeScreenPos((p) => ({ ...p, visible: false }));
          }
          return next;
        });
      } else if (e.key === 'Escape' && exhibitionMode) {
        onToggleExhibition();
      } else if (e.code === 'Space') {
        e.preventDefault();
        setAutoRotate((prev) => !prev);
      } else if (e.key === '[' || e.key === ']') {
        const curIdx = WATCH_MODELS.findIndex((w) => w.id === selectedModel);
        const step = e.key === ']' ? 1 : -1;
        const nextIdx = (curIdx + step + WATCH_MODELS.length) % WATCH_MODELS.length;
        onSelectModel(WATCH_MODELS[nextIdx].id);
      } else if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        const targetModel = WATCH_MODELS[Number(e.key) - 1];
        if (targetModel) {
          onSelectModel(targetModel.id);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    exhibitionMode,
    onToggleExhibition,
    onSelectModel,
    onOpenCatalog,
    onCycleNavStyle,
    selectedModel,
  ]);

  const handleModelSwitch = (id: WatchModelId) => {
    onSelectModel(id);
  };

  const handleMobileCategorySwitch = (cat: WatchCategoryId) => {
    if (cat === activeWatch.category) return;
    const first = WATCH_MODELS.find((w) => w.category === cat);
    if (first) {
      onSelectModel(first.id);
    }
  };

  const handleSaveVaultSlot = (slotIdx: number) => {
    const next = [...vaultSlots];
    next[slotIdx] = {
      modelId: selectedModel,
      alloyId,
      dialId,
      bezelId,
      beltId,
      beltShadeId,
      lightingMode,
      customEngraving,
      patina,
      glidelockMm,
      label: `${activeWatch.shortName} · ${activeDial.label}`,
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    writeVaultSlots(next);
    showToast(`Saved ${activeWatch.name} to Watch Vault #${slotIdx + 1}`);
  };

  const handleLoadVaultSlot = (slot: VaultSlotPreset) => {
    setCustomEngraving(slot.customEngraving);
    setPatina(slot.patina);
    setGlidelockMm(slot.glidelockMm);
    if (onRestorePreset) {
      onRestorePreset({
        modelId: slot.modelId,
        alloyId: slot.alloyId,
        dialId: slot.dialId,
        bezelId: slot.bezelId,
        beltId: slot.beltId,
        beltShadeId: slot.beltShadeId,
        lightingMode: slot.lightingMode,
      });
    } else {
      onChangeReversoFlipped(false);
      onSelectModel(slot.modelId);
    }
    showToast(`Loaded ${getWatchById(slot.modelId).name}`);
  };

  const handleClearVaultSlot = (slotIdx: number) => {
    const next = [...vaultSlots];
    next[slotIdx] = null;
    writeVaultSlots(next);
  };

  const handleCopyShareUrl = async (customPreset?: VaultSlotPreset) => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
      let shareUrl = typeof window !== 'undefined' ? window.location.href : '';
      if (customPreset) {
        const spec = getWatchById(customPreset.modelId);
        const p = new URLSearchParams();
        if (customPreset.modelId !== 'submariner') p.set('watch', customPreset.modelId);
        if (customPreset.alloyId !== 'default') p.set('alloy', customPreset.alloyId);
        if (customPreset.dialId !== 'default') p.set('dial', customPreset.dialId);
        if (customPreset.bezelId !== 'default') p.set('bezel', customPreset.bezelId);
        if (customPreset.beltId !== (spec.defaultBelt ?? 'bracelet')) p.set('belt', customPreset.beltId);
        if (customPreset.beltShadeId && customPreset.beltShadeId !== 'default') {
          p.set('shade', customPreset.beltShadeId);
        }
        if (customPreset.lightingMode !== 'atelier') p.set('light', customPreset.lightingMode);
        const qs = p.toString();
        shareUrl = qs ? `${origin}?${qs}` : origin;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Shareable Build URL Copied');
      } else {
        showToast('Share URL synced in address bar');
      }
    } catch {
      showToast('Share URL synced in address bar');
    }
  };

  const applyTourStep = useCallback(
    (step: AtelierTourStep) => {
      setActiveHotspotId(null);
      setCinemaMode(false);
      setWristMode(false);

      if (step.action === 'nocturne-lume') {
        if (tourPrevLightingRef.current === null) {
          tourPrevLightingRef.current = lightingMode;
        }
        onChangeLightingMode('nocturne');
        setUvTorch(true);
      } else if (tourPrevLightingRef.current !== null) {
        onChangeLightingMode(tourPrevLightingRef.current);
        tourPrevLightingRef.current = null;
      }

      if (step.action === 'reset-hero') {
        setExplode(0);
        setFlipped(false);
        if (hasReversoFlip) {
          onChangeReversoFlipped(false);
        }
      } else if (step.action === 'reverso-flip') {
        setExplode(0);
        setFlipped(false);
        onChangeReversoFlipped(true);
      } else if (step.action === 'navitimer-bezel' || step.action === 'dive-bezel') {
        setExplode(0);
        setFlipped(false);
        engineRef.current?.rotateBezelStep(4);
      } else if (step.action === 'chrono-demo') {
        setExplode(0);
        setFlipped(false);
        if (!isChronoRunning) {
          engineRef.current?.toggleChronoRunning();
        }
      } else if (step.action === 'caliber-flip') {
        setExplode(0);
        setFlipped(false);
        setExhibitionBack(true);
      } else if (step.action === 'nocturne-lume') {
        setExplode(0);
        setFlipped(false);
      } else if (step.action === 'explode-layers') {
        setFlipped(false);
        setExplode(0.62);
      }

      setCameraPreset(step.cameraPreset);
      if (step.camPos && step.camTarget) {
        engineRef.current?.focusCameraTarget(step.camPos, step.camTarget);
      } else {
        engineRef.current?.setCameraPreset(step.cameraPreset);
      }
    },
    [
      hasReversoFlip,
      isChronoRunning,
      lightingMode,
      onChangeLightingMode,
      onChangeReversoFlipped,
    ]
  );

  const handleStartTour = () => {
    const steps = getAtelierTourSteps(activeWatch);
    tourPrevLightingRef.current = null;
    tourPrevReversoRef.current = reversoFlipped;
    setDockOpen(true);
    setEngraveOpen(false);
    setVaultOpen(false);
    setTourModelId(selectedModel);
    setTourStepIdx(0);
    setTourAutoPlay(false);
    if (steps[0]) {
      applyTourStep(steps[0]);
    }
  };

  const handleExitTour = () => {
    setTourModelId(null);
    setTourAutoPlay(false);
    setExplode(0);
    setFlipped(false);
    if (tourPrevLightingRef.current !== null) {
      onChangeLightingMode(tourPrevLightingRef.current);
      tourPrevLightingRef.current = null;
    }
    if (hasReversoFlip) {
      onChangeReversoFlipped(tourPrevReversoRef.current);
    }
    setCameraPreset('hero');
    engineRef.current?.setCameraPreset('hero');
  };

  const handleToggleTour = () => {
    if (tourActive) {
      handleExitTour();
    } else {
      handleStartTour();
    }
  };

  const handleSelectTourStep = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(tourSteps.length - 1, nextIdx));
    setTourStepIdx(clamped);
    const step = tourSteps[clamped];
    if (step) {
      applyTourStep(step);
    }
  };

  useEffect(() => {
    if (!tourActive || !tourAutoPlay || exhibitionMode) return;
    const timer = window.setTimeout(() => {
      const nextIdx = tourStepIdx + 1;
      if (nextIdx >= tourSteps.length) {
        setTourAutoPlay(false);
        return;
      }
      const nextStep = tourSteps[nextIdx];
      setTourStepIdx(nextIdx);
      if (nextStep) {
        applyTourStep(nextStep);
      }
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [tourActive, tourAutoPlay, exhibitionMode, tourStepIdx, tourSteps, applyTourStep]);

  const handleCameraSwitch = (preset: CameraPresetId) => {
    setCameraPreset(preset);
    setActiveHotspotId(null);
    if (preset === 'caliber') {
      setFlipped(false);
      setExhibitionBack(true);
    }
    engineRef.current?.setCameraPreset(preset);
  };

  const handleHotspotSelect = (id: string) => {
    if (activeHotspotId === id) {
      setActiveHotspotId(null);
      setCameraPreset('hero');
      engineRef.current?.setCameraPreset('hero');
      return;
    }
    const target = WATCH_HOTSPOTS.find((h) => h.id === id);
    if (!target) return;
    setActiveHotspotId(id);
    if (id === 'caliber') {
      setFlipped(false);
      setExhibitionBack(true);
    }
    engineRef.current?.focusCameraTarget(target.camPos, target.camTarget);
  };

  const handleToggleCompare = () => {
    if (compareModelId !== null) {
      onChangeCompareModelId(null);
      return;
    }
    onChangeCompareModelId(selectedModel === 'submariner' ? 'omega-speedmaster' : 'submariner');
  };

  const handleToggleEngrave = () => {
    setEngraveOpen((prev) => {
      const next = !prev;
      if (next) {
        setExhibitionBack(false);
        setFlipped(true);
      }
      return next;
    });
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!loupeActive || !mountRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nx = x / Math.max(rect.width, 1);
    const ny = y / Math.max(rect.height, 1);
    setLoupeScreenPos({ x, y, visible: true });
    engineRef.current?.setLoupeTarget(loupeCanvasRef.current, nx, ny);
  };

  const handleViewportPointerLeave = () => {
    if (!loupeActive) return;
    setLoupeScreenPos((p) => ({ ...p, visible: false }));
    engineRef.current?.setLoupeTarget(null, -1, -1);
  };

  const handleToggleLoupe = () => {
    setLoupeActive((prev) => {
      const next = !prev;
      if (!next) {
        engineRef.current?.setLoupeTarget(null, -1, -1);
        setLoupeScreenPos((p) => ({ ...p, visible: false }));
      }
      return next;
    });
  };

  const handleSnapshot = () => {
    engineRef.current?.captureSnapshot((dataUrl) => {
      const link = document.createElement('a');
      link.download = `${brandSlug}-${activeWatch.id}-${activeWatch.reference}.png`;
      link.href = dataUrl;
      link.click();
      showToast('Studio Still Captured (PNG)');
    });
  };

  const handleExportSpecCard = () => {
    engineRef.current?.captureSnapshot((dataUrl) => {
      const img = new window.Image();
      img.onload = () => {
        const w = 1440;
        const h = 900;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#0A0D0C';
        ctx.fillRect(0, 0, w, h);

        // Outer luxury gold hairline border
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(34, 34, w - 68, h - 68);

        // Render studio capture neatly framed on the right half
        const drawW = 860;
        const drawH = (img.height / Math.max(1, img.width)) * drawW;
        const dx = w - drawW - 60;
        const dy = (h - drawH) * 0.5;
        ctx.drawImage(img, dx, dy, drawW, drawH);

        // Left vignette blend over frame seam
        const fade = ctx.createLinearGradient(dx - 40, 0, dx + 220, 0);
        fade.addColorStop(0, '#0A0D0C');
        fade.addColorStop(1, 'rgba(10, 13, 12, 0)');
        ctx.fillStyle = fade;
        ctx.fillRect(dx - 40, 38, 280, h - 76);

        // Boutique typography & telemetry block
        ctx.fillStyle = '#D4AF37';
        ctx.font = '600 16px "JetBrains Mono", monospace';
        ctx.fillText(
          `${activeWatch.brand}  ·  REF. ${activeWatch.reference}  ·  EST. ${activeWatch.yearIntroduced}`,
          76,
          128
        );

        ctx.fillStyle = '#F4F2ED';
        let titlePx = 48;
        ctx.font = `600 ${titlePx}px Georgia, serif`;
        while (titlePx > 30 && ctx.measureText(activeWatch.name).width > 430) {
          titlePx -= 2;
          ctx.font = `600 ${titlePx}px Georgia, serif`;
        }
        ctx.fillText(activeWatch.name, 76, 186);

        ctx.fillStyle = 'rgba(244, 242, 237, 0.72)';
        ctx.font = '400 18px "Plus Jakarta Sans", Arial, sans-serif';
        ctx.fillText(activeWatch.tagline, 76, 226);

        const rows: [string, string][] = [
          ['CASE', `${activeWatch.caseDiameterMm} mm × ${activeWatch.caseThicknessMm} mm`],
          ['LUG-TO-LUG', `${lugToLugMm} mm`],
          ['CALIBER', activeWatch.caliber],
          ['FREQUENCY', activeWatch.frequency],
          ['POWER RESERVE', activeWatch.powerReserve],
          ['WATERPROOFNESS', activeWatch.waterResistance],
          ['ALLOY FINISH', activeAlloy.label],
          ['DIAL EDITION', activeDial.label],
          [
            'STRAP / BELT',
            beltId !== 'bracelet'
              ? `${activeBeltLabel} (${activeBeltShade.label})`
              : activeBeltLabel,
          ],
        ];
        if (customEngraving.trim()) {
          rows.push(['CASEBACK ENGRAVING', customEngraving.trim().toUpperCase()]);
        }

        let yCursor = 286;
        rows.forEach(([k, v]) => {
          ctx.fillStyle = 'rgba(212, 175, 55, 0.78)';
          ctx.font = '600 12px "JetBrains Mono", monospace';
          ctx.fillText(k, 76, yCursor);

          ctx.fillStyle = '#F4F2ED';
          ctx.font = '500 17px "JetBrains Mono", monospace';
          ctx.fillText(v, 76, yCursor + 22);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(76, yCursor + 33);
          ctx.lineTo(490, yCursor + 33);
          ctx.stroke();
          yCursor += 50;
        });

        const link = document.createElement('a');
        link.download = `${brandSlug}-${activeWatch.id}-spec-card.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Boutique Spec Card Exported (PNG)');
      };
      img.src = dataUrl;
    });
  };

  const handleRecord360 = () => {
    if (recording360 || !engineRef.current) return;
    setRecording360(true);
    engineRef.current.startTurntableCapture((blobUrl) => {
      setRecording360(false);
      if (!blobUrl) {
        showToast('WebM recording unavailable in this browser');
        return;
      }
      const link = document.createElement('a');
      link.download = `${brandSlug}-${activeWatch.id}-360.webm`;
      link.href = blobUrl;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      showToast('360° Turntable Clip Saved (WebM)');
    }, 4600);
  };

  const isDockVisible = dockOpen && !exhibitionMode;

  return (
    <section
      id="studio"
      className={`relative h-dvh min-h-[600px] w-full overflow-hidden transition-colors duration-300 ${
        isLightBackdrop ? 'bg-[#E8ECEA]' : 'bg-[#0A0D0C]'
      }`}
    >
      {/* Dedicated isolated WebGL canvas mount */}
      <div
        ref={mountRef}
        onPointerMove={handleViewportPointerMove}
        onPointerLeave={handleViewportPointerLeave}
        className={`absolute inset-0 h-full w-full ${
          loupeActive ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
        }`}
        aria-label="Interactive 3D Watch Viewport"
      />

      {/* Exploded Mechanical Layer Callouts */}
      {!exhibitionMode &&
        explode > 0.18 &&
        explodeCallouts.map((callout) => (
          <div
            key={callout.id}
            className="pointer-events-none absolute z-10 flex items-center gap-1.5 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${callout.x}px`, top: `${callout.y}px` }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
            <span className="h-px w-3.5 bg-[#D4AF37]/60" />
            <span className="rounded border border-[#D4AF37]/40 bg-[#0D1210]/95 px-2 py-0.5 font-mono text-[10px] tracking-wider text-[#F4E2A6] uppercase whitespace-nowrap shadow-md">
              {callout.label}
            </span>
          </div>
        ))}

      {/* 3D Caliper Dimension Callouts */}
      {!exhibitionMode &&
        caliperMode &&
        explode <= 0.2 &&
        caliperCallouts.map((c) => (
          <div
            key={c.id}
            className="pointer-events-none absolute z-10 flex items-center gap-1.5 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${c.x}px`, top: `${c.y}px` }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="h-px w-3 bg-cyan-400/70" />
            <span className="rounded border border-cyan-400/45 bg-[#0A1114]/95 px-2 py-0.5 font-mono text-[10px] tracking-wider text-cyan-100 whitespace-nowrap shadow-md">
              <span className="text-cyan-400/80 uppercase">{c.label} </span>
              <span className="font-semibold tabular-nums">{c.value}</span>
            </span>
          </div>
        ))}

      {/* 2.5x Watchmaker Macro Loupe Lens */}
      {loupeActive && (
        <div
          className={`pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150 ${
            loupeScreenPos.visible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            left: `${loupeScreenPos.x}px`,
            top: `${loupeScreenPos.y}px`,
          }}
        >
          <div className="relative h-44 w-44 overflow-hidden rounded-full border-2 border-[#D4AF37]/85 bg-[#0A0D0C] shadow-[0_18px_48px_rgba(0,0,0,0.85)] ring-4 ring-black/60">
            <canvas
              ref={loupeCanvasRef}
              width={260}
              height={260}
              className="h-full w-full"
            />
          </div>
          <div className="mt-1.5 flex justify-center">
            <span className="rounded border border-[#D4AF37]/50 bg-[#0D1210]/95 px-2 py-0.5 font-mono text-[10px] tracking-widest text-[#D4AF37]">
              2.5× MACRO
            </span>
          </div>
        </div>
      )}

      {/* Unified Studio Notice Toast */}
      {toastMessage && (
        <div className="pointer-events-none fixed top-20 right-6 z-40 rounded border border-[#D4AF37]/50 bg-[#101513]/95 px-3.5 py-2 text-xs font-medium tracking-wider text-[#F4E2A6] shadow-xl">
          {toastMessage}
        </div>
      )}

      {/* Graceful WebGL fallback */}
      {webglError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0A0D0C] p-6">
          <div className="max-w-md border border-white/10 bg-[#121614] p-6 text-center">
            <div className="relative mb-5 flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 overflow-hidden border border-white/5 bg-radial from-[#1A201D] to-[#0A0D0C]">
              <WatchMiniDial watch={activeWatch} size="lg" />
              <span className="text-[10px] tracking-[0.22em] text-[#D4AF37]/80 uppercase">
                {activeWatch.brand} · {activeWatch.reference}
              </span>
            </div>
            <h2 className="font-serif text-2xl text-[#F4F2ED]">{activeWatch.name}</h2>
            <p className="mt-2 text-sm text-[#F4F2ED]/70">
              Hardware 3D acceleration is currently unavailable in this browser session.
            </p>
          </div>
        </div>
      )}

      {/* Minimal Top-Left Specification Overlay (Auto-Dims on Idle, Inverts on Alpine Gallery) */}
      <div
        className={`pointer-events-none absolute top-20 left-6 z-10 max-w-lg transition-opacity duration-500 lg:left-10 ${
          exhibitionMode
            ? 'opacity-0'
            : chromeIdle
              ? 'opacity-30'
              : 'opacity-100'
        }`}
      >
        <div
          className={`flex flex-wrap items-center gap-2 text-xs tracking-[0.18em] uppercase ${
            isLightBackdrop ? 'text-[#7A5912]' : 'text-[#D4AF37]'
          }`}
        >
          <span>{activeWatch.brand}</span>
          <span aria-hidden="true">·</span>
          <span>{activeWatch.collection}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">Ref. {activeWatch.reference}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">Est. {activeWatch.yearIntroduced}</span>
        </div>
        <h1
          className={`mt-1.5 font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight [text-wrap:balance] ${
            isLightBackdrop ? 'text-[#111513]' : 'text-[#F4F2ED]'
          }`}
        >
          {activeWatch.name}
        </h1>
        <p
          className={`mt-2 font-mono text-xs tabular-nums ${
            isLightBackdrop ? 'text-[#111513]/80' : 'text-[#F4F2ED]/75'
          }`}
        >
          {activeWatch.caseDiameterMm} mm · {activeAlloy.label} · {activeDial.label}
          {hasCerachromBezel ? ` · ${activeBezel.label}` : ''} · {activeBeltLabel}
          {beltId !== 'bracelet' ? ` (${activeBeltShade.label})` : ''} · {activeWatch.caliber}
        </p>
        {(activeWatch.hasPowerReserveHand ||
          xrayDial ||
          exhibitionBack ||
          cameraPreset === 'caliber') && (
          <div
            className={`mt-1.5 inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[11px] tabular-nums ${
              isLightBackdrop
                ? 'border-black/15 bg-white/70 text-[#111513]'
                : 'border-[#D4AF37]/30 bg-[#101513]/85 text-[#F4E2A6]'
            }`}
          >
            <Gauge className="h-3 w-3 text-[#D4AF37]" />
            <span>Mainspring Reserve: {powerReservePct}%</span>
          </div>
        )}
        {compareWatch && (
          <p
            className={`mt-1 font-mono text-[11px] font-medium tabular-nums ${
              isLightBackdrop ? 'text-[#006039]' : 'text-[#F4E2A6]'
            }`}
          >
            Side-by-Side Split: vs. {compareWatch.brand} {compareWatch.shortName} (
            {compareWatch.caseDiameterMm} mm · {compareWatch.caliber})
          </p>
        )}
        <p
          className={`mt-1.5 hidden sm:block text-[11px] ${
            isLightBackdrop ? 'text-[#111513]/55' : 'text-[#F4F2ED]/45'
          }`}
        >
          Drag to orbit · Scroll to zoom · Click bezel, crown, pushers, or clasp
        </p>
      </div>

      {/* Exhibition Mode Minimal Exit Control */}
      {exhibitionMode && (
        <div className="fixed top-5 right-6 z-40">
          <button
            type="button"
            onClick={onToggleExhibition}
            className="cursor-pointer flex items-center gap-1.5 rounded-md border border-white/20 bg-[#111614]/95 px-3.5 py-2 text-xs font-medium tracking-wider text-[#F4F2ED] transition-colors hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            <span>Exit Exhibition (Esc)</span>
          </button>
        </div>
      )}

      {/* Centered Collapsible Bottom Control Dock (Zero backdrop-filter over WebGL) */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-3.5 z-30 flex justify-center px-3 transition-opacity duration-500 sm:px-6 ${
          chromeIdle && !exhibitionMode
            ? 'opacity-35 hover:opacity-100'
            : 'opacity-100'
        }`}
        onMouseEnter={() => {
          dockHoverRef.current = true;
          setChromeIdle(false);
        }}
        onMouseLeave={() => {
          dockHoverRef.current = false;
          scheduleIdleTimer();
        }}
      >
        <div
          className="w-full max-w-[1140px] transition-transform duration-300 ease-out"
          style={{
            transform: exhibitionMode
              ? 'translateY(140%)'
              : isDockVisible
                ? 'translateY(0)'
                : 'translateY(calc(100% - 34px))',
          }}
        >
          {/* Side-by-Side Split Compare Companion Strip + Curated Collector Showdowns */}
          {compareModelId && isDockVisible && (
            <div className="mb-2 flex justify-center">
              <div className="pointer-events-auto flex max-w-full flex-col gap-1.5 rounded-md border border-[#D4AF37]/45 bg-[#101513]/95 px-3 py-2 text-xs shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="inline-flex items-center gap-1 pr-1 font-mono text-[10px] tracking-wider text-[#D4AF37] uppercase">
                      <Trophy className="h-3 w-3" />
                      Showdowns
                    </span>
                    {CURATED_SHOWDOWNS.map((s) => {
                      const activeShowdown =
                        selectedModel === s.primaryId && compareModelId === s.compareId;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            if (onActivateShowdown) {
                              onActivateShowdown(s.primaryId, s.compareId);
                            } else {
                              onSelectModel(s.primaryId);
                              onChangeCompareModelId(s.compareId);
                            }
                          }}
                          className={`cursor-pointer rounded border px-2 py-0.5 text-[10px] font-medium transition-colors whitespace-nowrap ${
                            activeShowdown
                              ? 'border-[#D4AF37]/70 bg-[#D4AF37]/20 text-[#F4E2A6]'
                              : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:border-[#D4AF37]/40 hover:text-white'
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    aria-label="Close comparison mode"
                    onClick={() => onChangeCompareModelId(null)}
                    className="cursor-pointer rounded p-1 text-[#F4F2ED]/60 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-start gap-2">
                  <span className="pt-0.5 font-mono text-[10px] tracking-wider text-[#D4AF37] uppercase shrink-0">
                    Compare With
                  </span>
                  <div className="flex max-h-20 flex-wrap items-center gap-1 overflow-y-auto pr-1">
                    {WATCH_MODELS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        title={`${m.brand} — ${m.name}`}
                        onClick={() => onChangeCompareModelId(m.id)}
                        className={`cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                          compareModelId === m.id
                            ? 'bg-[#006039] text-white'
                            : 'bg-[#0A0D0C] text-[#F4F2ED]/70 hover:text-white'
                        }`}
                      >
                        {m.shortName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Custom Solid Caseback Engraving Input Strip */}
          {engraveOpen && isDockVisible && (
            <div className="mb-2 flex justify-center">
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-md border border-[#D4AF37]/45 bg-[#101513]/95 px-3.5 py-1.5 text-xs shadow-lg">
                <span className="font-mono text-[10px] tracking-wider text-[#D4AF37] uppercase">
                  Caseback Engraving
                </span>
                <input
                  type="text"
                  maxLength={22}
                  value={customEngraving}
                  onChange={(e) => {
                    if (exhibitionBack) setExhibitionBack(false);
                    setCustomEngraving(e.target.value);
                  }}
                  placeholder="Initials or Date (max 22)"
                  className="w-48 rounded border border-white/15 bg-[#0A0D0C] px-2.5 py-1 font-serif text-xs tracking-wider text-[#F4F2ED] placeholder:text-[#F4F2ED]/35 focus:border-[#D4AF37] focus:outline-none"
                />
                {customEngraving && (
                  <button
                    type="button"
                    onClick={() => setCustomEngraving('')}
                    className="cursor-pointer rounded border border-white/10 bg-[#0A0D0C] px-2 py-1 text-[10px] text-[#F4F2ED]/70 hover:text-white"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Close engraving editor"
                  onClick={() => setEngraveOpen(false)}
                  className="cursor-pointer rounded p-1 text-[#F4F2ED]/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* 6-Slot Collector Vault Strip ("Watch Box") */}
          {vaultOpen && isDockVisible && (
            <div className="mb-2 flex justify-center">
              <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-md border border-[#D4AF37]/45 bg-[#101513]/95 px-3 py-2 text-xs shadow-lg">
                <div className="flex items-center gap-1.5 pr-1">
                  <Archive className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span className="font-mono text-[10px] tracking-wider text-[#D4AF37] uppercase">
                    Collector Vault (6)
                  </span>
                </div>
                <div className="flex max-h-28 flex-wrap items-center justify-center gap-1.5 overflow-y-auto pr-1">
                  {vaultSlots.map((slot, idx) => {
                    const slotWatch = slot ? getWatchById(slot.modelId) : null;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 rounded border border-white/10 bg-[#0A0D0C] px-2 py-1"
                      >
                        <span className="font-mono text-[10px] text-[#D4AF37]">
                          #{idx + 1}
                        </span>
                        {slot && slotWatch ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleLoadVaultSlot(slot)}
                              className="cursor-pointer text-left text-[11px] font-medium text-[#F4F2ED] hover:text-[#F4E2A6]"
                              title={`Load ${slotWatch.brand} ${slotWatch.name} (${slot.savedAt})`}
                            >
                              {slotWatch.brand} · {slotWatch.shortName}
                            </button>
                            <button
                              type="button"
                              onClick={() => onChangeCompareModelId(slot.modelId)}
                              className="cursor-pointer rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-[#F4F2ED]/75 hover:border-[#D4AF37]/50 hover:text-white"
                              title="Compare against this saved slot"
                            >
                              Vs
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyShareUrl(slot)}
                              className="cursor-pointer rounded p-0.5 text-[#F4F2ED]/60 hover:text-[#D4AF37]"
                              title="Copy Share Link for this build"
                              aria-label={`Copy share link for slot ${idx + 1}`}
                            >
                              <Link2 className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveVaultSlot(idx)}
                              className="cursor-pointer rounded border border-[#D4AF37]/30 px-1.5 py-0.5 font-mono text-[10px] text-[#F4E2A6] hover:bg-[#D4AF37]/15"
                              title="Overwrite this slot with current spec"
                            >
                              Overwrite
                            </button>
                            <button
                              type="button"
                              aria-label={`Clear slot ${idx + 1}`}
                              onClick={() => handleClearVaultSlot(idx)}
                              className="cursor-pointer rounded p-0.5 text-[#F4F2ED]/50 hover:text-red-300"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSaveVaultSlot(idx)}
                            className="cursor-pointer rounded border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-2 py-0.5 font-mono text-[10px] text-[#F4E2A6] hover:bg-[#D4AF37]/20"
                          >
                            + Save Current
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  aria-label="Close collector vault"
                  onClick={() => setVaultOpen(false)}
                  className="cursor-pointer rounded p-1 text-[#F4F2ED]/60 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Clasp Micro-Adjustment Strip (Folding Metal/Oysterflex Clasps Only) */}
          {claspOpen && hasMicroAdjustClasp && isDockVisible && (
            <div className="mb-2 flex justify-center">
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-md border border-[#D4AF37]/45 bg-[#101513]/95 px-3.5 py-1.5 text-xs shadow-lg">
                <span className="font-mono text-[11px] tracking-wider text-[#D4AF37] uppercase">
                  {activeWatch.brand === 'ROLEX' ? 'Glidelock Extension' : 'Clasp Micro-Adjust'} · +
                  {glidelockMm} mm
                </span>
                <input
                  aria-label="Clasp micro-adjustment millimeters"
                  type="range"
                  min={0}
                  max={20}
                  step={2}
                  value={glidelockMm}
                  onChange={(e) => setGlidelockMm(parseInt(e.target.value, 10))}
                  className="horology-slider w-32"
                />
                <button
                  type="button"
                  onClick={() => setClaspOpen(false)}
                  className="cursor-pointer rounded bg-[#006039] px-2.5 py-0.5 text-[11px] font-medium text-white transition-colors hover:bg-[#007547]"
                >
                  Lock Clasp
                </button>
              </div>
            </div>
          )}

          {/* Tang Buckle Close Bar (Leather & Casio Resin Straps) */}
          {claspOpen && !hasMicroAdjustClasp && isDockVisible && (
            <div className="mb-2 flex justify-center">
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-md border border-[#D4AF37]/45 bg-[#101513]/95 px-3.5 py-1.5 text-xs shadow-lg">
                <span className="font-mono text-[11px] tracking-wider text-[#D4AF37] uppercase">
                  Tang Buckle Unfastened
                </span>
                <button
                  type="button"
                  onClick={() => setClaspOpen(false)}
                  className="cursor-pointer rounded bg-[#006039] px-2.5 py-0.5 text-[11px] font-medium text-white transition-colors hover:bg-[#007547]"
                >
                  Fasten Buckle
                </button>
              </div>
            </div>
          )}

          {/* Interactive Bezel Telemetry Strip (Navitimer E6B Flight Computer · Dive Elapsed · Yacht · GMT Zone) */}
          {hasInteractiveBezel && isDockVisible && (
            <div className="mb-2 flex justify-center">
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-md border border-white/15 bg-[#101513]/95 px-3 py-1 text-xs shadow-lg">
                <Compass className="h-3.5 w-3.5 text-[#D4AF37]" />
                {activeWatch.bezelType === 'navitimer' ? (
                  <>
                    <span className="font-mono text-[10px] tracking-wider text-[#D4AF37] uppercase">
                      E6B Slide Rule
                    </span>
                    <span className="rounded border border-[#D4AF37]/35 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[10px] tabular-nums text-[#F4E2A6]">
                      {Math.pow(10, bezelAngleDeg / 360).toFixed(2)}× ·{' '}
                      {Math.round(180 * Math.pow(10, bezelAngleDeg / 360))} km/h GS
                    </span>
                  </>
                ) : activeWatch.bezelType === 'gmt-cerachrom' ? (
                  <>
                    <span className="font-mono text-[10px] tracking-wider text-[#D4AF37] uppercase">
                      Bezel 3rd Zone
                    </span>
                    <span className="rounded border border-[#D4AF37]/35 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[10px] tabular-nums text-[#F4E2A6]">
                      {(() => {
                        const hrs = Math.round(bezelAngleDeg / 15) % 24;
                        return hrs === 0 ? 'UTC ±0h' : `+${hrs}h Offset`;
                      })()}
                    </span>
                  </>
                ) : activeWatch.bezelType === 'yacht-cerachrom' ? (
                  <>
                    <span className="font-mono text-[10px] tracking-wider text-[#D4AF37] uppercase">
                      Yacht Bezel
                    </span>
                    <span className="rounded border border-[#D4AF37]/35 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[10px] tabular-nums text-[#F4E2A6]">
                      +{Math.round((bezelAngleDeg / 360) * 60) % 60} min Regatta
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-[10px] tracking-wider text-[#D4AF37] uppercase">
                      Dive Bezel (Unidirectional)
                    </span>
                    <span className="rounded border border-[#D4AF37]/35 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[10px] tabular-nums text-[#F4E2A6]">
                      +{Math.round((bezelAngleDeg / 360) * 60) % 60} min Elapsed
                    </span>
                  </>
                )}
                {capabilities.bezelDirection === 'bidirectional' && (
                  <button
                    type="button"
                    onClick={() => engineRef.current?.rotateBezelStep(-1)}
                    className="cursor-pointer rounded border border-white/15 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[10px] text-[#F4F2ED]/80 hover:border-[#D4AF37]/50 hover:text-white"
                    title="Step Bezel Back"
                  >
                    -1 Click
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => engineRef.current?.rotateBezelStep(1)}
                  className="cursor-pointer rounded border border-white/15 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[10px] text-[#F4F2ED]/80 hover:border-[#D4AF37]/50 hover:text-white"
                  title="Advance Bezel Counter-Clockwise"
                >
                  +1 Click
                </button>
                {bezelAngleDeg !== 0 && (
                  <button
                    type="button"
                    onClick={() => engineRef.current?.resetBezel()}
                    className="cursor-pointer rounded border border-white/10 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[10px] text-[#F4E2A6] hover:border-[#D4AF37]/50"
                  >
                    Zero 12h
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Witschi-Style Watchmaker Timegrapher Oscilloscope Strip */}
          {effectiveTimegrapherOpen && isDockVisible && (
            <TimegrapherStrip
              telemetry={timegrapherTelemetry}
              fallbackProfile={beatProfile}
              onSelectOrientation={(preset, flip) => {
                setFlipped(flip);
                setCameraPreset(preset);
                if (preset === 'caliber' && capabilities.supportsExhibitionBack) {
                  setExhibitionBack(true);
                }
                engineRef.current?.setCameraPreset(preset);
              }}
              onClose={() => setTimegrapherOpen(false)}
            />
          )}

          {/* Atelier Heritage Chronological Era Timeline (1795 - 2019) */}
          {timelineOpen && isDockVisible && (
            <div className="mb-2 flex justify-center">
              <div className="pointer-events-auto flex max-w-full flex-col gap-1.5 rounded-md border border-[#D4AF37]/45 bg-[#101513]/95 px-3.5 py-2 text-xs shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span className="font-mono text-[10px] tracking-wider text-[#D4AF37] uppercase">
                      Horological Era · {activeWatch.yearIntroduced} ({activeTimelineIdx + 1}/
                      {chronologicalWatches.length})
                    </span>
                    <span className="hidden sm:inline text-[11px] text-[#F4F2ED]/80">
                      · {activeWatch.brand} {activeWatch.shortName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const prev =
                          chronologicalWatches[
                            (activeTimelineIdx - 1 + chronologicalWatches.length) %
                              chronologicalWatches.length
                          ];
                        onSelectModel(prev.id);
                      }}
                      aria-label="Previous historical era"
                      className="cursor-pointer rounded border border-white/15 bg-[#0A0D0C] p-1 text-[#F4F2ED]/80 hover:border-[#D4AF37]/50 hover:text-white"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next =
                          chronologicalWatches[
                            (activeTimelineIdx + 1) % chronologicalWatches.length
                          ];
                        onSelectModel(next.id);
                      }}
                      aria-label="Next historical era"
                      className="cursor-pointer rounded border border-white/15 bg-[#0A0D0C] p-1 text-[#F4F2ED]/80 hover:border-[#D4AF37]/50 hover:text-white"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Close heritage timeline"
                      onClick={() => setTimelineOpen(false)}
                      className="cursor-pointer ml-1 rounded p-1 text-[#F4F2ED]/60 hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-0.5">
                  {chronologicalWatches.map((w) => {
                    const active = w.id === selectedModel;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => onSelectModel(w.id)}
                        title={`${w.yearIntroduced} · ${w.brand} ${w.name}`}
                        className={`cursor-pointer shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] transition-colors whitespace-nowrap ${
                          active
                            ? 'border-[#D4AF37] bg-[#006039] text-white font-semibold'
                            : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/70 hover:border-[#D4AF37]/40 hover:text-white'
                        }`}
                      >
                        <span className={active ? 'text-[#F4E2A6]' : 'text-[#D4AF37]'}>
                          {w.yearIntroduced}
                        </span>{' '}
                        · {w.shortName}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Wrist Try-On Sizing, Cuff Style & Wrist-Roll Showcase Strip */}
          {wristMode && isDockVisible && (
            <div className="mb-2 flex justify-center">
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2.5 rounded-md border border-[#D4AF37]/45 bg-[#101513]/95 px-3.5 py-1.5 text-xs shadow-lg">
                <span className="font-mono text-[11px] tracking-wider text-[#D4AF37] uppercase">
                  Wrist Fit · {wristMm} mm
                </span>
                <input
                  aria-label="Wrist circumference millimeters"
                  type="range"
                  min={155}
                  max={195}
                  step={1}
                  value={wristMm}
                  onChange={(e) => setWristMm(parseInt(e.target.value, 10))}
                  className="horology-slider w-28"
                />
                <span className="rounded border border-white/15 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[10px] text-[#F4E2A6]">
                  {lugToLugMm} mm L2L · {wristFitLabel}
                </span>
                <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                  {WRIST_STYLE_OPTIONS.map((styleOpt) => {
                    const active = wristStyle === styleOpt.id;
                    return (
                      <button
                        key={styleOpt.id}
                        type="button"
                        onClick={() => setWristStyle(styleOpt.id)}
                        className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                          active
                            ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#F4E2A6]'
                            : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/70 hover:text-white'
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-white/25"
                          style={{ backgroundColor: styleOpt.swatchHex }}
                        />
                        <span>{styleOpt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => engineRef.current?.triggerWristRoll()}
                  className="cursor-pointer flex items-center gap-1 rounded bg-[#006039] px-2.5 py-0.5 font-mono text-[11px] font-medium text-white transition-colors hover:bg-[#007547]"
                >
                  <RotateCw className="h-3 w-3" />
                  <span>Wrist Roll</span>
                </button>
                <button
                  type="button"
                  onClick={() => engineRef.current?.triggerWristFlick()}
                  className="cursor-pointer flex items-center gap-1 rounded border border-[#D4AF37]/45 bg-[#0A0D0C] px-2.5 py-0.5 font-mono text-[11px] text-[#F4E2A6] transition-colors hover:bg-[#D4AF37]/15"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Flick Rotor</span>
                </button>
                <button
                  type="button"
                  aria-label="Close wrist try-on"
                  onClick={() => setWristMode(false)}
                  className="cursor-pointer rounded p-1 text-[#F4F2ED]/60 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Live Chronograph Stopwatch, Rattrapante Split & Tachymeter Bar */}
          {activeWatch.hasChronoPushers && isDockVisible && (
            <div className="mb-2 flex justify-center">
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2.5 rounded-md border border-white/15 bg-[#101513]/95 px-3.5 py-1.5 text-xs shadow-lg">
                <Timer className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span className="font-mono text-xs font-semibold tabular-nums text-[#F4F2ED]">
                  {formatChronoTime(chronoTelemetry.elapsedSec)}
                </span>
                {chronoTelemetry.splitSec !== null && (
                  <span className="rounded border border-amber-400/45 bg-amber-950/50 px-2 py-0.5 font-mono text-[10px] tabular-nums text-amber-200">
                    SPLIT {formatChronoTime(chronoTelemetry.splitSec)}
                  </span>
                )}
                <span className="rounded border border-[#D4AF37]/35 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[10px] tabular-nums text-[#F4E2A6]">
                  {chronoTelemetry.unitsPerHour !== null
                    ? `${chronoTelemetry.unitsPerHour} km/h`
                    : 'TACHY > 1.0s'}
                </span>
                <button
                  type="button"
                  onClick={() => engineRef.current?.toggleChronoRunning()}
                  className="cursor-pointer rounded bg-[#006039] px-2.5 py-0.5 text-[11px] font-medium text-white transition-colors hover:bg-[#007547]"
                >
                  {chronoTelemetry.running ? 'Stop' : 'Start'}
                </button>
                <button
                  type="button"
                  onClick={() => engineRef.current?.toggleChronoSplit()}
                  title="Rattrapante Split-Seconds Lap Freeze"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] transition-colors ${
                    chronoTelemetry.splitSec !== null
                      ? 'border-amber-400/60 bg-amber-950/60 text-amber-200'
                      : 'border-white/15 bg-[#0A0D0C] text-[#F4F2ED]/80 hover:text-white'
                  }`}
                >
                  <Flag className="h-3 w-3" />
                  <span>{chronoTelemetry.splitSec !== null ? 'Resume' : 'Split'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => engineRef.current?.resetChrono()}
                  className="cursor-pointer rounded border border-white/15 bg-[#0A0D0C] px-2 py-0.5 text-[11px] text-[#F4F2ED]/80 transition-colors hover:text-white"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Reference-Authentic Winding Crown Workbench */}
          {capabilities.crownMode !== 'none' && effectiveCrownPosition > 0 && isDockVisible && (
            <div className="mb-2 flex justify-center">
              <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-md border border-[#D4AF37]/45 bg-[#101513]/95 px-3.5 py-1.5 text-xs shadow-lg">
                <div className="flex items-center rounded border border-white/10 bg-[#0A0D0C] p-0.5">
                  {capabilities.crownStops.map((item) => (
                    <button
                      key={item.pos}
                      type="button"
                      onClick={() => setCrownPosition(item.pos)}
                      className={`cursor-pointer rounded px-2 py-0.5 font-mono text-[10px] uppercase transition-colors ${
                        effectiveCrownPosition === item.pos
                          ? 'bg-[#D4AF37] font-semibold text-[#0A0D0C]'
                          : 'text-[#F4F2ED]/65 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {effectiveCrownPosition === 1 && capabilities.supportsManualWind && (
                  <>
                    <span className="font-mono text-[10px] text-[#F4E2A6]">
                      Reserve {powerReservePct}% · Drag Crown or Wind
                    </span>
                    <button
                      type="button"
                      onClick={() => engineRef.current?.windCrownImpulse()}
                      className="cursor-pointer rounded border border-[#D4AF37]/40 bg-[#0A0D0C] px-2.5 py-0.5 font-mono text-[11px] text-[#F4E2A6] hover:bg-[#D4AF37]/15"
                    >
                      +1 Turn Mainspring
                    </button>
                  </>
                )}

                {effectiveCrownPosition === 2 && capabilities.supportsQuickSetDate && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] text-[#F4F2ED]/75">
                      Quick-Set Aperture:
                    </span>
                    <button
                      type="button"
                      onClick={() => engineRef.current?.quickSetDateDays(-1)}
                      className="cursor-pointer rounded border border-white/15 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[11px] text-[#F4F2ED] hover:border-[#D4AF37]/50"
                    >
                      -1 Day
                    </button>
                    <button
                      type="button"
                      onClick={() => engineRef.current?.quickSetDateDays(1)}
                      className="cursor-pointer rounded border border-white/15 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[11px] text-[#F4E2A6] hover:border-[#D4AF37]/50"
                    >
                      +1 Day
                    </button>
                    {activeWatch.hasMoonphase && (
                      <>
                        <button
                          type="button"
                          onClick={() => engineRef.current?.quickSetMoonphaseDays(-2)}
                          className="cursor-pointer rounded border border-white/15 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[11px] text-sky-200 hover:border-sky-400/50"
                        >
                          -2d Moon
                        </button>
                        <button
                          type="button"
                          onClick={() => engineRef.current?.quickSetMoonphaseDays(2)}
                          className="cursor-pointer rounded border border-white/15 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[11px] text-sky-200 hover:border-sky-400/50"
                        >
                          +2d Moon
                        </button>
                      </>
                    )}
                  </div>
                )}

                {effectiveCrownPosition === 3 && (
                  <>
                    <span className="rounded border border-amber-400/50 bg-amber-950/50 px-2 py-0.5 font-mono text-[10px] text-amber-200 uppercase">
                      {capabilities.supportsHacking ? 'Seconds Hacked' : 'Time Set'}
                    </span>
                    <input
                      aria-label="Scrub manual watch time across midnight"
                      type="range"
                      min={-720}
                      max={720}
                      step={5}
                      value={manualTimeMin}
                      onChange={(e) => {
                        const m = parseInt(e.target.value, 10);
                        setManualTimeMin(m);
                        engineRef.current?.setManualTimeOffsetMinutes(m);
                      }}
                      className="horology-slider w-28"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setManualTimeMin((m) => m - 15);
                          engineRef.current?.advanceManualTime(-15);
                        }}
                        className="cursor-pointer rounded border border-white/10 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[11px] text-[#F4F2ED] transition-colors hover:border-[#D4AF37]/50"
                      >
                        -15m
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setManualTimeMin((m) => m + 15);
                          engineRef.current?.advanceManualTime(15);
                        }}
                        className="cursor-pointer rounded border border-white/10 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[11px] text-[#F4F2ED] transition-colors hover:border-[#D4AF37]/50"
                      >
                        +15m
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setManualTimeMin((m) => m + 60);
                          engineRef.current?.advanceManualTime(60);
                        }}
                        className="cursor-pointer rounded border border-white/10 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[11px] text-[#F4F2ED] transition-colors hover:border-[#D4AF37]/50"
                      >
                        +1h
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setManualTimeMin((m) => m + 360);
                          engineRef.current?.advanceManualTime(360);
                        }}
                        title="Jump +6 hours to test midnight date-jump"
                        className="cursor-pointer rounded border border-white/10 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[11px] text-[#F4E2A6] transition-colors hover:border-[#D4AF37]/50"
                      >
                        +6h
                      </button>
                    </div>
                  </>
                )}

                <button
                  type="button"
                  title="Reset Time & Date Offset"
                  onClick={() => {
                    setManualTimeMin(0);
                    engineRef.current?.resetManualTime();
                  }}
                  className="cursor-pointer rounded border border-white/10 bg-[#0A0D0C] p-1 text-[#F4F2ED]/70 transition-colors hover:text-white"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCrownPosition(0);
                    if (capabilities.supportsManualWind) {
                      engineRef.current?.windCrownImpulse();
                    }
                  }}
                  className="cursor-pointer rounded bg-[#006039] px-2.5 py-0.5 text-[11px] font-medium text-white transition-colors hover:bg-[#007547]"
                >
                  {capabilities.isScrewDownCrown ? 'Screw Down (Pos 0)' : 'Push In (Pos 0)'}
                </button>
              </div>
            </div>
          )}

          {/* Choreographed Atelier Guided Tour Strip */}
          {tourActive && currentTourStep && isDockVisible && (
            <div className="mb-2 flex justify-center">
              <div className="pointer-events-auto flex w-full max-w-3xl flex-col gap-2 rounded-md border border-[#D4AF37]/50 bg-[#101513]/95 px-4 py-2.5 text-xs shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span className="font-mono text-[10px] tracking-[0.16em] text-[#D4AF37] uppercase">
                      {currentTourStep.chapter}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {tourSteps.map((step, idx) => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => handleSelectTourStep(idx)}
                        className={`cursor-pointer rounded border px-2 py-0.5 font-mono text-[10px] transition-colors ${
                          idx === tourStepIdx
                            ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#F4E2A6]'
                            : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/55 hover:border-[#D4AF37]/40 hover:text-white'
                        }`}
                      >
                        0{idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-serif text-sm font-medium text-[#F4F2ED]">
                      {currentTourStep.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[#F4F2ED]/75">
                      {currentTourStep.detail}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={tourStepIdx === 0}
                      onClick={() => handleSelectTourStep(tourStepIdx - 1)}
                      aria-label="Previous tour chapter"
                      className="cursor-pointer rounded border border-white/15 bg-[#0A0D0C] p-1.5 text-[#F4F2ED]/80 transition-colors hover:border-[#D4AF37]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTourAutoPlay((v) => !v)}
                      className={`cursor-pointer flex items-center gap-1 rounded border px-2.5 py-1 font-mono text-[10px] uppercase transition-colors ${
                        tourAutoPlay
                          ? 'border-[#D4AF37]/70 bg-[#D4AF37]/20 text-[#F4E2A6]'
                          : 'border-white/15 bg-[#0A0D0C] text-[#F4F2ED]/80 hover:border-[#D4AF37]/50 hover:text-white'
                      }`}
                    >
                      {tourAutoPlay ? (
                        <>
                          <Pause className="h-3 w-3" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" />
                          <span>Auto</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (tourStepIdx >= tourSteps.length - 1) {
                          handleExitTour();
                        } else {
                          handleSelectTourStep(tourStepIdx + 1);
                        }
                      }}
                      className="cursor-pointer flex items-center gap-1 rounded bg-[#006039] px-2.5 py-1 font-mono text-[10px] font-medium uppercase text-white transition-colors hover:bg-[#007547]"
                    >
                      <span>{tourStepIdx >= tourSteps.length - 1 ? 'Finish' : 'Next'}</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      aria-label="Close guided tour"
                      onClick={handleExitTour}
                      className="cursor-pointer rounded p-1.5 text-[#F4F2ED]/60 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Detail Tour Caption Strip */}
          {activeHotspot && isDockVisible && (
            <div className="mb-2 flex justify-center">
              <div className="pointer-events-auto flex max-w-2xl items-center justify-between gap-4 rounded-md border border-[#D4AF37]/35 bg-[#101513]/95 px-4 py-2 text-xs shadow-lg">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-serif text-sm font-medium text-[#D4AF37]">
                    {activeHotspot.title}
                  </span>
                  <span className="text-[#F4F2ED]/80">{activeHotspot.detail}</span>
                </div>
                <button
                  type="button"
                  aria-label="Close detail note"
                  onClick={() => {
                    setActiveHotspotId(null);
                    setCameraPreset('hero');
                    engineRef.current?.setCameraPreset('hero');
                  }}
                  className="cursor-pointer shrink-0 rounded p-1 text-[#F4F2ED]/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Collapse / Expand Handle */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setDockOpen((prev) => !prev)}
              className="pointer-events-auto cursor-pointer flex items-center gap-1.5 rounded-t-md border border-b-0 border-white/15 bg-[#111614]/95 px-4 py-1.5 text-[11px] font-medium tracking-wider text-[#F4F2ED]/80 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-[#D4AF37] whitespace-nowrap"
              aria-expanded={isDockVisible}
            >
              {isDockVisible ? (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span>Hide Controls (H)</span>
                </>
              ) : (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span>Show Controls (H)</span>
                </>
              )}
            </button>
          </div>

          {/* Main Control Surface */}
          <div
            className={`pointer-events-auto rounded-lg border bg-[#111614]/[0.95] px-3.5 py-2.5 shadow-2xl ${
              isLightBackdrop ? 'border-black/25' : 'border-white/15'
            }`}
          >
            {/* Mobile-only Collection Pillar & Model Switcher */}
            <div className="mb-2 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-white/10 pb-2 md:hidden">
              <button
                type="button"
                onClick={onOpenCatalog}
                className="cursor-pointer flex items-center gap-1 rounded border border-[#D4AF37]/40 bg-[#0A0D0C] px-2 py-1 text-[10px] font-medium uppercase text-[#F4E2A6] whitespace-nowrap shrink-0"
              >
                <LayoutGrid className="h-3 w-3" />
                <span>All</span>
              </button>
              <div className="flex items-center rounded border border-white/10 bg-[#0A0D0C] p-0.5 shrink-0">
                {WATCH_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleMobileCategorySwitch(cat.id)}
                    className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-medium uppercase whitespace-nowrap ${
                      activeWatch.category === cat.id
                        ? 'bg-[#006039] text-white'
                        : 'text-[#F4F2ED]/60'
                    }`}
                  >
                    {cat.shortLabel}
                  </button>
                ))}
              </div>
              {WATCH_MODELS.filter((w) => w.category === activeWatch.category).map((w) => {
                const isSelected = w.id === selectedModel;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleModelSwitch(w.id)}
                    className={`cursor-pointer rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-[#006039] text-white'
                        : 'text-[#F4F2ED]/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {w.shortName}
                  </button>
                );
              })}
            </div>

            {/* Row 1: Camera Presets · 5 Lighting Studios · Detail Hotspots · Studio Tools */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 border-b border-white/10 pb-2.5 xl:justify-between">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <div className="flex items-center rounded border border-white/10 bg-[#0A0D0C] p-0.5">
                  {CAMERA_LABELS.map((cam) => (
                    <button
                      key={cam.id}
                      type="button"
                      onClick={() => handleCameraSwitch(cam.id)}
                      className={`cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                        cameraPreset === cam.id && !activeHotspotId
                          ? 'bg-white/15 text-[#F4F2ED]'
                          : 'text-[#F4F2ED]/60 hover:text-white'
                      }`}
                    >
                      {cam.label}
                    </button>
                  ))}
                </div>

                {/* 5 Lighting Studio Worlds */}
                <div className="flex items-center rounded border border-white/10 bg-[#0A0D0C] p-0.5">
                  {LIGHTING_OPTIONS.map((opt) => {
                    const active = lightingMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChangeLightingMode(opt.id)}
                        className={`cursor-pointer flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? opt.id === 'nocturne'
                              ? 'bg-cyan-950/80 text-cyan-200'
                              : opt.id === 'alpine'
                                ? 'bg-[#E8ECEA] text-[#111513]'
                                : opt.id === 'bronze'
                                  ? 'bg-amber-950/80 text-amber-200'
                                  : 'bg-white/15 text-[#F4F2ED]'
                            : 'text-[#F4F2ED]/60 hover:text-white'
                        }`}
                      >
                        {opt.id === 'atelier' && <Sun className="h-3 w-3" />}
                        {opt.id === 'vault' && <Sparkles className="h-3 w-3" />}
                        {opt.id === 'nocturne' && <Moon className="h-3 w-3" />}
                        {opt.id === 'alpine' && <Mountain className="h-3 w-3" />}
                        {opt.id === 'bronze' && <Flame className="h-3 w-3" />}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detail Tour Hotspots + Mechanical & Studio Tools */}
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <div className="hidden 2xl:flex items-center gap-0.5 rounded border border-white/10 bg-[#0A0D0C] p-0.5">
                  <Compass className="ml-1.5 h-3.5 w-3.5 text-[#D4AF37]" />
                  {WATCH_HOTSPOTS.map((hotspot) => {
                    const active = activeHotspotId === hotspot.id;
                    return (
                      <button
                        key={hotspot.id}
                        type="button"
                        onClick={() => handleHotspotSelect(hotspot.id)}
                        className={`cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-[#D4AF37]/20 text-[#F4E2A6]'
                            : 'text-[#F4F2ED]/60 hover:text-white'
                        }`}
                      >
                        {hotspot.label}
                      </button>
                    );
                  })}
                </div>

                {lightingMode === 'nocturne' && capabilities.supportsLume && (
                  <button
                    type="button"
                    onClick={() => setUvTorch(!effectiveUvTorch)}
                    title="Cursor UV Torch (Hover Watch to Charge Lume)"
                    className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                      effectiveUvTorch
                        ? 'border-violet-400/60 bg-violet-950/70 text-violet-200'
                        : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                    }`}
                  >
                    <Flashlight className="h-3.5 w-3.5" />
                    <span>UV Torch</span>
                  </button>
                )}

                {activeWatch.hasReversoFlip && (
                  <button
                    type="button"
                    onClick={() => onChangeReversoFlipped(!reversoFlipped)}
                    title="Slide & Swivel Reverso Case 180° inside Cradle (Duoface)"
                    className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                      effectiveReversoFlipped
                        ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F4E2A6]'
                        : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                    }`}
                  >
                    <Repeat className="h-3.5 w-3.5" />
                    <span>{effectiveReversoFlipped ? 'Reverse Dial' : 'Swivel Case'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setCaliperMode((v) => {
                      const next = !v;
                      if (next && explode > 0.2) setExplode(0);
                      return next;
                    });
                  }}
                  title="3D Caliper Case Width, Lug-to-Lug & Profile Callouts"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    caliperMode
                      ? 'border-cyan-400/60 bg-cyan-950/60 text-cyan-200'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                  }`}
                >
                  <Ruler className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Caliper</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleTour}
                  title="Choreographed 4-Chapter Atelier Guided Tour"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    tourActive
                      ? 'border-[#D4AF37]/70 bg-[#D4AF37]/20 text-[#F4E2A6]'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/80 hover:border-[#D4AF37]/45 hover:text-[#F4E2A6]'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span className="hidden sm:inline">Tour</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVaultOpen((v) => !v)}
                  title="6-Slot Collector Vault (Save, Load & Compare Specs)"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    vaultOpen
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F4E2A6]'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                  }`}
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Watch Box</span>
                </button>

                <button
                  type="button"
                  onClick={() => setXrayDial((v) => !v)}
                  title="Smoked Sapphire Dial X-Ray Mode (Reveals Caliber Internals)"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    xrayDial
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F4E2A6]'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                  }`}
                >
                  <ScanEye className="h-3.5 w-3.5" />
                  <span>X-Ray</span>
                </button>

                {capabilities.supportsExhibitionBack && (
                  <button
                    type="button"
                    onClick={() => setExhibitionBack(!effectiveExhibitionBack)}
                    title="Toggle Sapphire Exhibition Caseback"
                    className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                      effectiveExhibitionBack
                        ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F4E2A6]'
                        : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {effectiveExhibitionBack ? 'Sapphire Back' : 'Solid Back'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleToggleEngrave}
                  title="Custom Solid Caseback Medallion Engraving"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    engraveOpen || customEngraving
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F4E2A6]'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                  }`}
                >
                  <PenTool className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Engrave</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleCompare}
                  title="Side-by-Side Synchronized Split Comparison"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    compareModelId
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F4E2A6]'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                  }`}
                >
                  <Columns2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Compare</span>
                </button>

                {capabilities.crownMode !== 'none' && (
                  <button
                    type="button"
                    onClick={() => {
                      const cycle: CrownPosition[] = [
                        0,
                        ...capabilities.crownStops.map((s) => s.pos),
                      ];
                      const idx = cycle.indexOf(effectiveCrownPosition);
                      setCrownPosition(cycle[(idx + 1) % cycle.length]);
                    }}
                    title={`Crown (${capabilities.crownStops.map((s) => s.label).join(' · ')})`}
                    className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                      effectiveCrownPosition > 0
                        ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F4E2A6]'
                        : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                    }`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">
                      {effectiveCrownPosition > 0 ? `Crown P${effectiveCrownPosition}` : 'Crown'}
                    </span>
                  </button>
                )}

                {capabilities.supportsTimegrapher && (
                  <button
                    type="button"
                    onClick={() => setTimegrapherOpen(!effectiveTimegrapherOpen)}
                    title="Live Witschi Timegrapher Oscilloscope & Beat Diagnostics"
                    className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                      effectiveTimegrapherOpen
                        ? 'border-emerald-400/60 bg-emerald-950/60 text-emerald-200'
                        : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                    }`}
                  >
                    <Activity className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Timegrapher</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setTimelineOpen((v) => !v)}
                  title="Chronological Horological Era Timeline (1795–2019)"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    timelineOpen
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F4E2A6]'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                  }`}
                >
                  <History className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">Timeline</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWristMode((v) => {
                      const next = !v;
                      if (next) {
                        setFlipped(false);
                        setExplode(0);
                      }
                      return next;
                    });
                  }}
                  title="Wrist Try-On Scale, Cuff Styles & Wrist-Roll Check"
                  aria-label="Toggle Wrist Try-On"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    wristMode
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F4E2A6]'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                  }`}
                >
                  <Watch className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">Wrist</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWetStage((v) => !v)}
                  title="Toggle Sapphire Water Droplets & Underwater Caustics Stage"
                  aria-label="Toggle Water Droplets & Caustics"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    wetStage
                      ? 'border-cyan-400/60 bg-cyan-950/60 text-cyan-200'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                  }`}
                >
                  <Droplets className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setFlipped((v) => !v)}
                  title="Flip Watch 180° to Inspect Caseback & Clasp"
                  aria-label="Flip Watch"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    flipped
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F4E2A6]'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                  }`}
                >
                  <FlipHorizontal2 className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setGallerySweep((v) => !v)}
                  title="Toggle Sweeping Studio Light Reflections"
                  aria-label="Toggle Light Sweep"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    gallerySweep
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F4E2A6]'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                  }`}
                >
                  <Sunrise className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setCinemaMode((v) => !v)}
                  title="Animated Showcase Choreography & Exploded Orbit"
                  aria-label="Toggle Cinema Choreography"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    cinemaMode
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F4E2A6]'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                  }`}
                >
                  {cinemaMode ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleToggleLoupe}
                  title="2.5× Watchmaker Macro Loupe (L)"
                  aria-label="Toggle Macro Loupe"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    loupeActive
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F4E2A6]'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                  }`}
                >
                  <Search className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setLiveTime((v) => !v)}
                  title="Toggle Real-Time Clock vs 10:10 Studio Position"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    liveTime
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F4E2A6]'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>{liveTime ? 'Live' : '10:10'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSoundEnabled((v) => !v)}
                  title={`Toggle ${beatProfile.label} Acoustics`}
                  aria-label="Toggle Escapement Sound"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    soundEnabled
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F4E2A6]'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/55 hover:text-white'
                  }`}
                >
                  {soundEnabled ? (
                    <Volume2 className="h-3.5 w-3.5" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setAutoRotate((v) => !v)}
                  title="Toggle Turntable Rotation (Space)"
                  aria-label="Toggle Auto-Rotate"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    autoRotate
                      ? 'border-white/25 bg-white/10 text-white'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/55 hover:text-white'
                  }`}
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyShareUrl()}
                  title="Copy Shareable Configuration Link"
                  aria-label="Copy Shareable Build Link"
                  className="cursor-pointer flex items-center gap-1 rounded border border-white/10 bg-[#0A0D0C] px-2 py-1.5 text-[11px] font-medium text-[#F4F2ED]/75 transition-colors hover:border-[#D4AF37]/60 hover:text-[#F4E2A6] whitespace-nowrap shrink-0"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleSnapshot}
                  title="Capture Studio Still (PNG)"
                  aria-label="Capture Studio Still"
                  className="cursor-pointer flex items-center gap-1 rounded border border-white/10 bg-[#0A0D0C] px-2 py-1.5 text-[11px] font-medium text-[#F4F2ED]/75 transition-colors hover:border-[#D4AF37]/60 hover:text-[#F4E2A6] whitespace-nowrap shrink-0"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleExportSpecCard}
                  title="Export Boutique Spec Card Composite (PNG)"
                  aria-label="Export Boutique Spec Card"
                  className="cursor-pointer flex items-center gap-1 rounded border border-white/10 bg-[#0A0D0C] px-2 py-1.5 text-[11px] font-medium text-[#F4F2ED]/75 transition-colors hover:border-[#D4AF37]/60 hover:text-[#F4E2A6] whitespace-nowrap shrink-0"
                >
                  <FileImage className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleRecord360}
                  disabled={recording360}
                  title="Record 360° Turntable Video Clip (WebM)"
                  aria-label="Record 360° Turntable Video"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    recording360
                      ? 'border-red-500/70 bg-red-950/60 text-red-200 animate-pulse'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:border-[#D4AF37]/60 hover:text-[#F4E2A6]'
                  }`}
                >
                  <Video className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Row 2: Authentic Per-Watch Alloy · Dial · Bezel · GMT/24h Zone · Belt & Shade · Explode */}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 xl:justify-between">
              {allowedAlloyOptions.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium tracking-wider text-[#F4F2ED]/55 uppercase whitespace-nowrap">
                    Alloy
                  </span>
                  <div className="flex items-center gap-1.5">
                    {allowedAlloyOptions.map((alloy) => {
                      const active = effectiveAlloyId === alloy.id;
                      const resolved = resolveAlloy(activeWatch, alloy.id);
                      const isAuthentic = alloy.id === activeWatch.defaultAlloy || alloy.id === 'default';
                      return (
                        <button
                          key={alloy.id}
                          type="button"
                          title={`${resolved.label}${isAuthentic ? ' (Maison Authentic)' : ''}`}
                          aria-label={`Alloy: ${resolved.label}`}
                          onClick={() => onChangeAlloyId(alloy.id)}
                          className={`cursor-pointer relative h-4.5 w-4.5 rounded-full border transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-[#D4AF37] ${
                            active
                              ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/40 scale-105'
                              : isAuthentic
                                ? 'border-[#D4AF37]/55'
                                : 'border-white/25'
                          }`}
                          style={{
                            background: resolved.secondaryHex
                              ? `linear-gradient(135deg, ${resolved.swatchHex} 50%, ${resolved.secondaryHex} 50%)`
                              : resolved.swatchHex,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {allowedDialOptions.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium tracking-wider text-[#F4F2ED]/55 uppercase whitespace-nowrap">
                    Dial
                  </span>
                  <div className="flex items-center gap-1.5">
                    {allowedDialOptions.map((dial) => {
                      const active = effectiveDialId === dial.id;
                      const resolved = resolveDial(activeWatch, dial.id);
                      const isAuthentic = dial.id === activeWatch.defaultDial || dial.id === 'default';
                      return (
                        <button
                          key={dial.id}
                          type="button"
                          title={`${resolved.label}${isAuthentic ? ' (Maison Authentic)' : ''}`}
                          aria-label={`Dial: ${resolved.label}`}
                          onClick={() => onChangeDialId(dial.id)}
                          className={`cursor-pointer h-4.5 w-4.5 rounded-full border transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-[#D4AF37] ${
                            active
                              ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/40 scale-105'
                              : isAuthentic
                                ? 'border-[#D4AF37]/55'
                                : 'border-white/25'
                          }`}
                          style={{ backgroundColor: resolved.swatchHex }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {hasCerachromBezel && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium tracking-wider text-[#F4F2ED]/55 uppercase whitespace-nowrap">
                    Bezel
                  </span>
                  <div className="flex items-center gap-1.5">
                    {allowedBezelOptions.map((bz) => {
                      const active = effectiveBezelId === bz.id;
                      const pHex =
                        bz.id === 'default'
                          ? activeWatch.bezelPrimaryHex
                          : bz.primaryHex;
                      const sHex =
                        bz.id === 'default'
                          ? activeWatch.bezelSecondaryHex
                          : bz.secondaryHex;
                      return (
                        <button
                          key={bz.id}
                          type="button"
                          title={`Bezel: ${bz.label}`}
                          aria-label={`Bezel: ${bz.label}`}
                          onClick={() => onChangeBezelId(bz.id)}
                          className={`cursor-pointer h-4.5 w-4.5 rounded-full border transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-[#D4AF37] ${
                            active
                              ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/40 scale-105'
                              : 'border-white/25'
                          }`}
                          style={{
                            background: sHex
                              ? `linear-gradient(180deg, ${pHex} 50%, ${sHex} 50%)`
                              : pHex,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {(activeWatch.hasGmtHand || activeWatch.hasSkyDwellerDisc) && (
                <div className="flex items-center gap-1 rounded border border-white/10 bg-[#0A0D0C] p-0.5">
                  <span className="px-1.5 text-[10px] font-medium tracking-wider text-[#D4AF37] uppercase">
                    GMT
                  </span>
                  {GMT_TIMEZONES.map((tz) => (
                    <button
                      key={tz.id}
                      type="button"
                      title={`24-Hour Zone: ${tz.label}`}
                      onClick={() => setGmtTimezoneOffset(tz.utcOffsetHours)}
                      className={`cursor-pointer rounded px-1.5 py-0.5 font-mono text-[10px] uppercase transition-colors ${
                        gmtTimezoneOffset === tz.utcOffsetHours
                          ? 'bg-[#D4AF37]/20 text-[#F4E2A6]'
                          : 'text-[#F4F2ED]/55 hover:text-white'
                      }`}
                    >
                      {tz.id}
                    </button>
                  ))}
                </div>
              )}

              {(allowedBeltOptions.length > 1 || effectiveBeltId !== 'bracelet') && (
                <div className="flex items-center gap-2">
                  {allowedBeltOptions.length > 1 && (
                    <div className="flex items-center gap-1 rounded border border-white/10 bg-[#0A0D0C] p-0.5">
                      {allowedBeltOptions.map((belt) => (
                        <button
                          key={belt.id}
                          type="button"
                          onClick={() => onChangeBeltId(belt.id)}
                          className={`cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                            effectiveBeltId === belt.id
                              ? 'bg-[#006039] text-white'
                              : 'text-[#F4F2ED]/60 hover:text-white'
                          }`}
                        >
                          {getShortBeltTabLabel(activeWatch, belt.id)}
                        </button>
                      ))}
                    </div>
                  )}

                  {effectiveBeltId !== 'bracelet' && (
                    <div className="flex items-center gap-1" title="Strap Colorway">
                      {BELT_SHADE_OPTIONS.map((shade) => {
                        const resolvedShade = resolveBeltShade(activeWatch, shade.id);
                        const active = beltShadeId === shade.id;
                        return (
                          <button
                            key={shade.id}
                            type="button"
                            title={`Strap: ${shade.id === 'default' ? `Signature (${resolvedShade.label})` : shade.label}`}
                            aria-label={`Strap Color: ${shade.label}`}
                            onClick={() => onChangeBeltShadeId(shade.id)}
                            className={`cursor-pointer h-4 w-4 rounded-full border transition-transform hover:scale-110 ${
                              active
                                ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/40 scale-105'
                                : 'border-white/25'
                            }`}
                            style={{ backgroundColor: resolvedShade.swatchHex }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeWatch.supportsPatina && (
                <div className="flex flex-1 min-w-[135px] max-w-[180px] items-center gap-2">
                  <label
                    htmlFor="patina-slider"
                    className="text-[11px] font-medium tracking-wider text-amber-300/85 uppercase whitespace-nowrap"
                  >
                    Patina
                  </label>
                  <input
                    id="patina-slider"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={patina}
                    onChange={(e) => setPatina(parseFloat(e.target.value))}
                    className="horology-slider w-full"
                  />
                  <span className="w-8 text-right font-mono text-[11px] tabular-nums text-[#F4F2ED]/75">
                    {Math.round(patina * 100)}%
                  </span>
                </div>
              )}

              <div className="flex flex-1 min-w-[155px] max-w-[215px] items-center gap-2">
                <Layers className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                <label
                  htmlFor="explode-slider"
                  className="text-[11px] font-medium tracking-wider text-[#F4F2ED]/75 uppercase whitespace-nowrap"
                >
                  Explode
                </label>
                <input
                  id="explode-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={explode}
                  onChange={(e) => setExplode(parseFloat(e.target.value))}
                  className="horology-slider w-full"
                />
                <span className="w-8 text-right font-mono text-[11px] tabular-nums text-[#F4F2ED]/75">
                  {Math.round(explode * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
