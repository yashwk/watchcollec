'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import Image from 'next/image';
import {
  Archive,
  Camera,
  ChevronDown,
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
  Layers,
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
  Sparkles,
  Sun,
  Sunrise,
  Timer,
  Trash2,
  Video,
  Volume2,
  VolumeX,
  Watch,
  X,
} from 'lucide-react';
import {
  ALLOY_OPTIONS,
  AlloyId,
  BELT_OPTIONS,
  BEZEL_OPTIONS,
  BeltId,
  BezelId,
  CameraPresetId,
  DIAL_OPTIONS,
  DialId,
  GMT_TIMEZONES,
  LightingModeId,
  WATCH_CATEGORIES,
  WATCH_HOTSPOTS,
  WATCH_MODELS,
  WatchCategoryId,
  WatchModelId,
  getWatchById,
  resolveAlloy,
  resolveBezel,
  resolveDial,
} from '@/lib/watches';
import type {
  CaliperCallout,
  ChronoTelemetry,
  ExplodeCallout,
  WatchStudioEngine,
} from '@/lib/three/WatchStudioEngine';

export interface VaultSlotPreset {
  modelId: WatchModelId;
  alloyId: AlloyId;
  dialId: DialId;
  bezelId: BezelId;
  beltId: BeltId;
  lightingMode: LightingModeId;
  customEngraving: string;
  patina: number;
  glidelockMm: number;
  savedAt: string;
}

const VAULT_STORAGE_KEY = 'rolex_studio_vault_v1';
const VAULT_EMPTY_SNAPSHOT: (VaultSlotPreset | null)[] = [null, null, null];
let cachedVaultRaw: string | null | undefined = undefined;
let cachedVaultParsed: (VaultSlotPreset | null)[] = VAULT_EMPTY_SNAPSHOT;
const vaultListeners = new Set<() => void>();

function subscribeVaultStore(cb: () => void) {
  vaultListeners.add(cb);
  if (typeof window !== 'undefined') {
    const onStorage = (e: StorageEvent) => {
      if (e.key === VAULT_STORAGE_KEY) {
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
    const raw = window.localStorage.getItem(VAULT_STORAGE_KEY);
    if (raw === cachedVaultRaw) return cachedVaultParsed;
    cachedVaultRaw = raw;
    if (!raw) {
      cachedVaultParsed = VAULT_EMPTY_SNAPSHOT;
      return cachedVaultParsed;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cachedVaultParsed = [
        parsed[0] ?? null,
        parsed[1] ?? null,
        parsed[2] ?? null,
      ];
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
  alloyId: AlloyId;
  onChangeAlloyId: (id: AlloyId) => void;
  dialId: DialId;
  onChangeDialId: (id: DialId) => void;
  bezelId: BezelId;
  onChangeBezelId: (id: BezelId) => void;
  beltId: BeltId;
  onChangeBeltId: (id: BeltId) => void;
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
  alloyId,
  onChangeAlloyId,
  dialId,
  onChangeDialId,
  bezelId,
  onChangeBezelId,
  beltId,
  onChangeBeltId,
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
  const [crownPulled, setCrownPulled] = useState<boolean>(false);
  const [claspOpen, setClaspOpen] = useState<boolean>(false);
  const [xrayDial, setXrayDial] = useState<boolean>(false);
  const [compareModelId, setCompareModelId] = useState<WatchModelId | null>(null);
  const [customEngraving, setCustomEngraving] = useState<string>('');
  const [engraveOpen, setEngraveOpen] = useState<boolean>(false);
  const [patina, setPatina] = useState<number>(0);
  const [wetStage, setWetStage] = useState<boolean>(false);
  const [wristMode, setWristMode] = useState<boolean>(false);
  const [wristMm, setWristMm] = useState<number>(175);
  const [manualTimeMin, setManualTimeMin] = useState<number>(0);
  const [uvTorch, setUvTorch] = useState<boolean>(true);
  const [caliperMode, setCaliperMode] = useState<boolean>(false);
  const [glidelockMm, setGlidelockMm] = useState<number>(0);
  const [powerReservePct, setPowerReservePct] = useState<number>(82);
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

  const isLightBackdrop = lightingMode === 'alpine';
  const activeWatch = getWatchById(selectedModel);
  const effectiveReversoFlipped = Boolean(activeWatch.hasReversoFlip && reversoFlipped);
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
  const activeAlloy = resolveAlloy(activeWatch, alloyId);
  const activeDial = resolveDial(activeWatch, dialId);
  const activeBezel = resolveBezel(activeWatch, bezelId);
  const activeBeltLabel =
    BELT_OPTIONS.find((b) => b.id === beltId)?.label ?? 'Bracelet';
  const activeHotspot =
    WATCH_HOTSPOTS.find((h) => h.id === activeHotspotId) ?? null;

  const hasCerachromBezel =
    activeWatch.bezelType === 'dive-cerachrom' ||
    activeWatch.bezelType === 'yacht-cerachrom' ||
    activeWatch.bezelType === 'tachymeter' ||
    activeWatch.bezelType === 'gmt-cerachrom';

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
              crownPulled,
              claspOpen,
              soundEnabled,
              xrayDial,
              compareModelId,
              customEngraving,
              patina,
              wetStage,
              wristMode,
              wristMm,
              uvTorch,
              reversoFlipped: effectiveReversoFlipped,
              caliperMode,
              glidelockMm,
            },
            {
              onContextLost: () => setWebglError(true),
              onContextRestored: () => setWebglError(false),
              onExplodeCallouts: (callouts) => setExplodeCallouts(callouts),
              onCaliperCallouts: (callouts) => setCaliperCallouts(callouts),
              onCrownPullChange: (pulled) => setCrownPulled(pulled),
              onClaspOpenChange: (open) => setClaspOpen(open),
              onReversoFlipChange: (rev) => onChangeReversoFlipped(rev),
              onPowerReserveChange: (pct) => setPowerReservePct(pct),
              onCinemaStop: () => setCinemaMode(false),
              onMidnightDateJump: (dayNum) =>
                showToast(`Midnight Date Jump -> Day ${dayNum}`),
              onChronoTelemetry: (telemetry) => setChronoTelemetry(telemetry),
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
      alloyId,
      dialId,
      bezelId,
      beltId,
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
      crownPulled,
      claspOpen,
      soundEnabled,
      xrayDial,
      compareModelId,
      customEngraving,
      patina: activeWatch.supportsPatina ? patina : 0,
      wetStage,
      wristMode,
      wristMm,
      uvTorch,
      reversoFlipped: effectiveReversoFlipped,
      caliperMode,
      glidelockMm,
    });
  }, [
    selectedModel,
    activeWatch.supportsPatina,
    alloyId,
    dialId,
    bezelId,
    beltId,
    exhibitionBack,
    explode,
    lightingMode,
    autoRotate,
    liveTime,
    gmtTimezoneOffset,
    flipped,
    gallerySweep,
    loupeActive,
    cinemaMode,
    crownPulled,
    claspOpen,
    soundEnabled,
    xrayDial,
    compareModelId,
    customEngraving,
    patina,
    wetStage,
    wristMode,
    wristMm,
    uvTorch,
    effectiveReversoFlipped,
    caliperMode,
    glidelockMm,
  ]);

  // Keyboard shortcuts: 'H' dock, 'Esc' exit exhibition, 'Space' spin, 'L' loupe, '1-9' watch models
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
  }, [exhibitionMode, onToggleExhibition, onSelectModel, selectedModel]);

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
      lightingMode,
      customEngraving,
      patina,
      glidelockMm,
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    writeVaultSlots(next);
    showToast(`Saved ${activeWatch.name} to Watch Box Slot ${slotIdx + 1}`);
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

  const handleCameraSwitch = (preset: CameraPresetId) => {
    setCameraPreset(preset);
    setActiveHotspotId(null);
    if (preset === 'caliber') {
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
      setExhibitionBack(true);
    }
    engineRef.current?.focusCameraTarget(target.camPos, target.camTarget);
  };

  const handleToggleCompare = () => {
    setCompareModelId((prev) => {
      if (prev !== null) return null;
      return selectedModel === 'submariner' ? 'daydate' : 'submariner';
    });
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
      link.download = `${activeWatch.brand.toLowerCase()}-${activeWatch.id}-${activeWatch.reference}.png`;
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
          ['STRAP / BELT', activeBeltLabel],
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
        link.download = `${activeWatch.brand.toLowerCase()}-${activeWatch.id}-spec-card.png`;
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
      link.download = `${activeWatch.brand.toLowerCase()}-${activeWatch.id}-360.webm`;
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
            <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden bg-[#0A0D0C]">
              <Image
                src={activeWatch.image}
                alt={activeWatch.name}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
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
          {hasCerachromBezel ? ` · ${activeBezel.label}` : ''} · {activeBeltLabel} ·{' '}
          {activeWatch.caliber}
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
            Side-by-Side Split: vs. {compareWatch.name} ({compareWatch.caseDiameterMm} mm ·{' '}
            {compareWatch.caliber})
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
          {/* Side-by-Side Split Compare Companion Strip */}
          {compareModelId && isDockVisible && (
            <div className="mb-2 flex justify-center">
              <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-md border border-[#D4AF37]/45 bg-[#101513]/95 px-3 py-1.5 text-xs shadow-lg">
                <span className="font-mono text-[10px] tracking-wider text-[#D4AF37] uppercase">
                  Compare With
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {WATCH_MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCompareModelId(m.id)}
                      className={`cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                        compareModelId === m.id
                          ? 'bg-[#006039] text-white'
                          : 'bg-[#0A0D0C] text-[#F4F2ED]/70 hover:text-white'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Close comparison mode"
                  onClick={() => setCompareModelId(null)}
                  className="cursor-pointer ml-1 rounded p-1 text-[#F4F2ED]/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
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

          {/* 3-Slot Velvet Watch Box Strip ("My Vault") */}
          {vaultOpen && isDockVisible && (
            <div className="mb-2 flex justify-center">
              <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-md border border-[#D4AF37]/45 bg-[#101513]/95 px-3 py-2 text-xs shadow-lg">
                <div className="flex items-center gap-1.5 pr-1">
                  <Archive className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span className="font-mono text-[10px] tracking-wider text-[#D4AF37] uppercase">
                    Velvet Watch Box
                  </span>
                </div>
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
                            title={`Load ${slotWatch.name} (${slot.savedAt})`}
                          >
                            {slotWatch.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCompareModelId(slot.modelId)}
                            className="cursor-pointer rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-[#F4F2ED]/75 hover:border-[#D4AF37]/50 hover:text-white"
                            title="Compare against this saved slot"
                          >
                            Vs
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
                <button
                  type="button"
                  aria-label="Close velvet watch box"
                  onClick={() => setVaultOpen(false)}
                  className="cursor-pointer rounded p-1 text-[#F4F2ED]/60 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Glidelock Clasp Micro-Adjustment Strip */}
          {claspOpen && beltId !== 'leather' && isDockVisible && (
            <div className="mb-2 flex justify-center">
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-md border border-[#D4AF37]/45 bg-[#101513]/95 px-3.5 py-1.5 text-xs shadow-lg">
                <span className="font-mono text-[11px] tracking-wider text-[#D4AF37] uppercase">
                  Glidelock Extension · +{glidelockMm} mm
                </span>
                <input
                  aria-label="Glidelock micro-adjustment millimeters"
                  type="range"
                  min={0}
                  max={20}
                  step={2}
                  value={glidelockMm}
                  onChange={(e) => setGlidelockMm(parseInt(e.target.value, 10))}
                  className="rolex-slider w-32"
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

          {/* Leather Tang Buckle Close Bar */}
          {claspOpen && beltId === 'leather' && isDockVisible && (
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

          {/* Wrist Try-On Sizing & Rotor Impulse Strip */}
          {wristMode && isDockVisible && (
            <div className="mb-2 flex justify-center">
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-md border border-[#D4AF37]/45 bg-[#101513]/95 px-3.5 py-1.5 text-xs shadow-lg">
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
                  className="rolex-slider w-32"
                />
                <span className="rounded border border-white/15 bg-[#0A0D0C] px-2 py-0.5 font-mono text-[10px] text-[#F4E2A6]">
                  {lugToLugMm} mm L2L · {wristFitLabel}
                </span>
                <button
                  type="button"
                  onClick={() => engineRef.current?.triggerWristFlick()}
                  className="cursor-pointer flex items-center gap-1 rounded border border-[#D4AF37]/45 bg-[#0A0D0C] px-2.5 py-0.5 font-mono text-[11px] text-[#F4E2A6] transition-colors hover:bg-[#D4AF37]/15"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Flick Wrist (Spin Rotor)</span>
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

          {/* Active Crown Time-Setting Strip (Drag 3D Crown Vertically or Scrub Slider) */}
          {crownPulled && isDockVisible && (
            <div className="mb-2 flex justify-center">
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-md border border-[#D4AF37]/45 bg-[#101513]/95 px-3.5 py-1.5 text-xs shadow-lg">
                <span className="font-mono text-[11px] tracking-wider text-[#D4AF37] uppercase">
                  Crown Unscrewed · Drag Crown or Scrub
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
                  className="rolex-slider w-32"
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
                  <button
                    type="button"
                    title="Reset Time Offset"
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
                      setCrownPulled(false);
                      engineRef.current?.windCrownImpulse();
                    }}
                    className="cursor-pointer ml-1 rounded bg-[#006039] px-2.5 py-0.5 text-[11px] font-medium text-white transition-colors hover:bg-[#007547]"
                  >
                    Screw Down
                  </button>
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
            {/* Mobile-only Category & Model Switcher */}
            <div className="mb-2 flex items-center gap-1.5 overflow-x-auto border-b border-white/10 pb-2 md:hidden">
              <div className="flex items-center rounded border border-white/10 bg-[#0A0D0C] p-0.5 shrink-0">
                {WATCH_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleMobileCategorySwitch(cat.id)}
                    className={`cursor-pointer flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium uppercase whitespace-nowrap ${
                      activeWatch.category === cat.id
                        ? cat.id === 'others'
                          ? 'bg-[#8A6818] text-white'
                          : 'bg-[#006039] text-white'
                        : 'text-[#F4F2ED]/60'
                    }`}
                  >
                    {cat.id === 'others' && <Watch className="h-2.5 w-2.5" />}
                    <span>{cat.label}</span>
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
                    {w.name}
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

                {lightingMode === 'nocturne' && (
                  <button
                    type="button"
                    onClick={() => setUvTorch((v) => !v)}
                    title="Cursor UV Torch (Hover Watch to Charge Chromalight Lume)"
                    className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                      uvTorch
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
                  onClick={() => setVaultOpen((v) => !v)}
                  title="3-Slot Velvet Watch Box (Save, Load & Compare Specs)"
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
                  title="Smoked Sapphire Dial X-Ray Mode (Reveals Gear Train)"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    xrayDial
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F4E2A6]'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                  }`}
                >
                  <ScanEye className="h-3.5 w-3.5" />
                  <span>X-Ray</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExhibitionBack((v) => !v)}
                  title="Toggle Sapphire Exhibition Caseback"
                  className={`cursor-pointer flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    exhibitionBack
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#F4E2A6]'
                      : 'border-white/10 bg-[#0A0D0C] text-[#F4F2ED]/75 hover:text-white'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {exhibitionBack ? 'Sapphire Back' : 'Solid Back'}
                  </span>
                </button>

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
                  title="Wrist Try-On Scale & Rotor Flick Simulation"
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
                  title="Toggle 28,800 vph Escapement & Bezel Acoustics"
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

            {/* Row 2: Alloy · Dial · Cerachrom Bezel · GMT/24h Zone · Belt · Explode */}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 xl:justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium tracking-wider text-[#F4F2ED]/55 uppercase whitespace-nowrap">
                  Alloy
                </span>
                <div className="flex items-center gap-1.5">
                  {ALLOY_OPTIONS.map((alloy) => {
                    const active = alloyId === alloy.id;
                    return (
                      <button
                        key={alloy.id}
                        type="button"
                        title={alloy.label}
                        aria-label={`Alloy: ${alloy.label}`}
                        onClick={() => onChangeAlloyId(alloy.id)}
                        className={`cursor-pointer relative h-4.5 w-4.5 rounded-full border transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-[#D4AF37] ${
                          active
                            ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/40 scale-105'
                            : 'border-white/25'
                        }`}
                        style={{
                          background: alloy.secondaryHex
                            ? `linear-gradient(135deg, ${alloy.swatchHex} 50%, ${alloy.secondaryHex} 50%)`
                            : alloy.swatchHex,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium tracking-wider text-[#F4F2ED]/55 uppercase whitespace-nowrap">
                  Dial
                </span>
                <div className="flex items-center gap-1.5">
                  {DIAL_OPTIONS.map((dial) => {
                    const active = dialId === dial.id;
                    return (
                      <button
                        key={dial.id}
                        type="button"
                        title={dial.label}
                        aria-label={`Dial: ${dial.label}`}
                        onClick={() => onChangeDialId(dial.id)}
                        className={`cursor-pointer h-4.5 w-4.5 rounded-full border transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-[#D4AF37] ${
                          active
                            ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/40 scale-105'
                            : 'border-white/25'
                        }`}
                        style={{ backgroundColor: dial.swatchHex }}
                      />
                    );
                  })}
                </div>
              </div>

              {hasCerachromBezel && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium tracking-wider text-[#F4F2ED]/55 uppercase whitespace-nowrap">
                    Bezel
                  </span>
                  <div className="flex items-center gap-1.5">
                    {BEZEL_OPTIONS.map((bz) => {
                      const active = bezelId === bz.id;
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

              <div className="flex items-center gap-1 rounded border border-white/10 bg-[#0A0D0C] p-0.5">
                {BELT_OPTIONS.map((belt) => (
                  <button
                    key={belt.id}
                    type="button"
                    onClick={() => onChangeBeltId(belt.id)}
                    className={`cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                      beltId === belt.id
                        ? 'bg-[#006039] text-white'
                        : 'text-[#F4F2ED]/60 hover:text-white'
                    }`}
                  >
                    {belt.label}
                  </button>
                ))}
              </div>

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
                    className="rolex-slider w-full"
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
                  className="rolex-slider w-full"
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
