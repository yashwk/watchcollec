'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Columns2,
  Compass,
  Search,
  X,
} from 'lucide-react';
import { horologyAudio } from '@/lib/three/soundEngine';
import {
  WATCH_BRANDS,
  WATCH_CATEGORIES,
  WATCH_MODELS,
  WatchBrand,
  WatchCategoryId,
  WatchModelId,
  WatchSpec,
  getWatchYearNumeric,
} from '@/lib/watches';
import WatchMiniDial from './WatchMiniDial';

interface NavBezelWheelProps {
  open: boolean;
  onClose: () => void;
  selectedModel: WatchModelId;
  compareModelId: WatchModelId | null;
  onSelectModel: (id: WatchModelId) => void;
  onSelectCompare: (id: WatchModelId | null) => void;
  isLightBackdrop: boolean;
}

type FilterMode = 'all' | 'pillar' | 'maison' | 'timeline';

const ARC_TICKS = Array.from({ length: 48 }, (_, i) => i * 7.5);

function wrapIndex(idx: number, total: number): number {
  if (total <= 0) return 0;
  return ((idx % total) + total) % total;
}

function getShortestDelta(targetIdx: number, currentFloat: number, total: number): number {
  const raw = targetIdx - currentFloat;
  if (total <= 5) return raw;
  return ((((raw % total) + total + total / 2) % total) - total / 2);
}

interface WheelToothProps {
  watch: WatchSpec;
  index: number;
  total: number;
  smoothScrollMV: MotionValue<number>;
  isActive3D: boolean;
  isCompared: boolean;
  isFocused: boolean;
  isLightBackdrop: boolean;
  onPick: (index: number, watch: WatchSpec) => void;
}

function WheelTooth({
  watch,
  index,
  total,
  smoothScrollMV,
  isActive3D,
  isCompared,
  isFocused,
  isLightBackdrop,
  onPick,
}: WheelToothProps) {
  const offsetMV = useTransform(smoothScrollMV, (v) =>
    getShortestDelta(index, v, total)
  );
  const yMV = useTransform(offsetMV, (off) => off * 66);
  const xMV = useTransform(offsetMV, (off) => {
    const clamped = Math.min(Math.abs(off), 4.5);
    return (1 - Math.cos(clamped * 0.25)) * 78;
  });
  const scaleMV = useTransform(offsetMV, (off) =>
    Math.max(0.76, 1 - Math.abs(off) * 0.062)
  );
  const opacityMV = useTransform(offsetMV, (off) => {
    const abs = Math.abs(off);
    if (abs > 4.1) return 0;
    return Math.max(0.14, 1 - abs * 0.24);
  });

  return (
    <motion.button
      type="button"
      onClick={() => onPick(index, watch)}
      style={{
        y: yMV,
        x: xMV,
        scale: scaleMV,
        opacity: opacityMV,
      }}
      className={`cursor-pointer absolute top-1/2 left-4 right-5 flex h-[60px] -translate-y-1/2 items-center justify-between gap-2.5 px-3 text-left will-change-transform ${
        isFocused ? 'z-10' : 'z-0'
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <WatchMiniDial watch={watch} size="md" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#D4AF37] uppercase">
              {watch.brand}
            </span>
            {isActive3D && (
              <span className="inline-flex items-center gap-0.5 rounded bg-[#006039] px-1.5 py-0.2 font-mono text-[9px] font-semibold text-white uppercase">
                <Check className="h-2.5 w-2.5" />
                Live
              </span>
            )}
            {isCompared && (
              <span className="rounded border border-[#D4AF37]/60 px-1 font-mono text-[9px] text-[#D4AF37] uppercase">
                Vs
              </span>
            )}
          </div>
          <div className="truncate font-serif text-[15px] font-medium leading-tight">
            {watch.name}
          </div>
        </div>
      </div>

      <div
        className={`shrink-0 text-right font-mono text-[10px] tabular-nums ${
          isLightBackdrop ? 'text-black/60' : 'text-white/55'
        }`}
      >
        <div>{watch.caseDiameterMm} mm</div>
        <div>{watch.yearIntroduced}</div>
      </div>
    </motion.button>
  );
}

export default function NavBezelWheel({
  open,
  onClose,
  selectedModel,
  compareModelId,
  onSelectModel,
  onSelectCompare,
  isLightBackdrop,
}: NavBezelWheelProps) {
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [pillarFilter, setPillarFilter] = useState<WatchCategoryId>('dive-sport');
  const [maisonFilter, setMaisonFilter] = useState<WatchBrand>('ROLEX');
  const [focusedIdx, setFocusedIdx] = useState<number>(0);

  const rawScrollMV = useMotionValue(0);
  const smoothScrollMV = useSpring(rawScrollMV, {
    stiffness: 270,
    damping: 29,
    mass: 0.45,
  });
  const tickRingRotateMV = useTransform(smoothScrollMV, (v) => -v * 15);

  const targetPosRef = useRef<number>(0);
  const snapTimerRef = useRef<number | null>(null);
  const lastDetentRef = useRef<number>(0);
  const dragStateRef = useRef<{
    active: boolean;
    startY: number;
    lastY: number;
    moved: boolean;
  }>({ active: false, startY: 0, lastY: 0, moved: false });

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = WATCH_MODELS.filter((w) => {
      if (filterMode === 'pillar' && w.category !== pillarFilter) return false;
      if (filterMode === 'maison' && w.brand !== maisonFilter) return false;
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        w.shortName.toLowerCase().includes(q) ||
        w.brand.toLowerCase().includes(q) ||
        w.reference.toLowerCase().includes(q) ||
        w.caliber.toLowerCase().includes(q) ||
        w.collection.toLowerCase().includes(q) ||
        w.yearIntroduced.toLowerCase().includes(q)
      );
    });
    if (filterMode === 'timeline') {
      return [...filtered].sort(
        (a, b) => getWatchYearNumeric(a) - getWatchYearNumeric(b)
      );
    }
    return filtered;
  }, [query, filterMode, pillarFilter, maisonFilter]);

  const total = items.length;
  const safeFocusedIdx = total > 0 ? wrapIndex(focusedIdx, total) : 0;
  const focusedWatch = items[safeFocusedIdx] ?? WATCH_MODELS[0];

  // Jump continuous wheel smoothly to selected model when opening or resetting filters
  const syncWheelToIndex = useCallback(
    (idx: number, immediate = false) => {
      targetPosRef.current = idx;
      lastDetentRef.current = idx;
      if (immediate) {
        rawScrollMV.jump(idx);
      } else {
        rawScrollMV.set(idx);
      }
    },
    [rawScrollMV]
  );

  const prevSyncKeyRef = useRef<string>('');

  useEffect(() => {
    if (!open || total === 0) {
      prevSyncKeyRef.current = '';
      return;
    }
    const filterKey = `${filterMode}:${pillarFilter}:${maisonFilter}:${query}`;
    const matchIdx = items.findIndex((w) => w.id === selectedModel);
    const initialIdx = matchIdx >= 0 ? matchIdx : 0;
    const filterChanged = prevSyncKeyRef.current !== filterKey;
    const alreadyAligned =
      wrapIndex(Math.round(targetPosRef.current), total) === initialIdx;

    if (filterChanged || !alreadyAligned) {
      syncWheelToIndex(initialIdx, filterChanged);
      const id = window.requestAnimationFrame(() => setFocusedIdx(initialIdx));
      prevSyncKeyRef.current = filterKey;
      return () => window.cancelAnimationFrame(id);
    }
    prevSyncKeyRef.current = filterKey;
  }, [
    open,
    total,
    items,
    selectedModel,
    filterMode,
    pillarFilter,
    maisonFilter,
    query,
    syncWheelToIndex,
  ]);

  // Listen to continuous spring position to fire detent ticks & sync active telemetry
  useEffect(() => {
    if (!open || total === 0) return;
    const unsub = smoothScrollMV.on('change', (v) => {
      const rounded = Math.round(v);
      const clampedOrWrapped =
        total <= 5 ? Math.min(Math.max(rounded, 0), total - 1) : wrapIndex(rounded, total);
      if (rounded !== lastDetentRef.current) {
        lastDetentRef.current = rounded;
        horologyAudio.playEscapementTick(true);
        setFocusedIdx(clampedOrWrapped);
      }
    });
    return () => unsub();
  }, [open, total, smoothScrollMV]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (snapTimerRef.current !== null) {
        window.clearTimeout(snapTimerRef.current);
      }
    };
  }, []);

  const scheduleMagneticSnap = useCallback(() => {
    if (snapTimerRef.current !== null) {
      window.clearTimeout(snapTimerRef.current);
    }
    snapTimerRef.current = window.setTimeout(() => {
      if (total <= 0) return;
      let snapped = Math.round(targetPosRef.current);
      if (total <= 5) {
        snapped = Math.min(Math.max(snapped, 0), total - 1);
      }
      targetPosRef.current = snapped;
      rawScrollMV.set(snapped);
    }, 115);
  }, [rawScrollMV, total]);

  const applyContinuousScroll = useCallback(
    (deltaFloat: number) => {
      if (total <= 1) return;
      let next = targetPosRef.current + deltaFloat;
      if (total <= 5) {
        next = Math.min(Math.max(next, -0.35), total - 1 + 0.35);
      }
      targetPosRef.current = next;
      rawScrollMV.set(next);
      scheduleMagneticSnap();
    },
    [rawScrollMV, scheduleMagneticSnap, total]
  );

  const stepTooth = useCallback(
    (delta: number) => {
      if (total <= 1) return;
      if (snapTimerRef.current !== null) {
        window.clearTimeout(snapTimerRef.current);
      }
      let next = Math.round(targetPosRef.current) + delta;
      if (total <= 5) {
        next = Math.min(Math.max(next, 0), total - 1);
      }
      targetPosRef.current = next;
      rawScrollMV.set(next);
    },
    [rawScrollMV, total]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (query) {
          setQuery('');
          return;
        }
        onClose();
        return;
      }
      if (e.target instanceof HTMLInputElement) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          stepTooth(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          stepTooth(-1);
        } else if (e.key === 'Enter' && total > 0) {
          onSelectModel(focusedWatch.id);
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        stepTooth(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        stepTooth(-1);
      } else if (e.key === 'Enter' && total > 0) {
        onSelectModel(focusedWatch.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, query, onClose, stepTooth, total, focusedWatch, onSelectModel]);

  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (total <= 1) return;
    // Smooth continuous trackpad & wheel mapping
    const clampedDelta = Math.max(-140, Math.min(140, e.deltaY));
    applyContinuousScroll(clampedDelta * 0.0115);
  };

  const handleDialPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input')) return;
    dragStateRef.current = {
      active: true,
      startY: e.clientY,
      lastY: e.clientY,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDialPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active) return;
    const dy = dragStateRef.current.lastY - e.clientY;
    dragStateRef.current.lastY = e.clientY;
    if (Math.abs(e.clientY - dragStateRef.current.startY) > 4) {
      dragStateRef.current.moved = true;
    }
    if (Math.abs(dy) > 0.2) {
      applyContinuousScroll(dy * 0.0155);
    }
  };

  const handleDialPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active) return;
    dragStateRef.current.active = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    scheduleMagneticSnap();
  };

  const handlePickTooth = (idx: number, watch: WatchSpec) => {
    const delta = getShortestDelta(idx, targetPosRef.current, total);
    targetPosRef.current += delta;
    rawScrollMV.set(targetPosRef.current);
    onSelectModel(watch.id);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="bezel-wheel"
          aria-label="Rotating Bezel Wheel Navigator"
          initial={{ x: 460, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 460, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className={`fixed top-14 right-0 bottom-0 z-35 flex w-full max-w-[420px] flex-col justify-between border-l shadow-2xl ${
            isLightBackdrop
              ? 'border-black/15 bg-[#F1F3F2] text-[#111513]'
              : 'border-[#D4AF37]/35 bg-[#0B0F0D] text-[#F4F2ED]'
          }`}
        >
          {/* Top Bar: Title + Search + Filter Modes */}
          <div
            className={`border-b px-4 pt-3 pb-2.5 ${
              isLightBackdrop ? 'border-black/10' : 'border-white/10'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-[#D4AF37] uppercase">
                <Compass className="h-3.5 w-3.5" />
                <span>Complication Bezel Wheel</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Bezel Wheel"
                className={`cursor-pointer rounded p-1 transition-colors ${
                  isLightBackdrop
                    ? 'text-black/60 hover:bg-black/10 hover:text-black'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Instant Search Bar on Top */}
            <div className="relative mt-2">
              <Search
                className={`pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 ${
                  isLightBackdrop ? 'text-black/45' : 'text-white/45'
                }`}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search model, maison, caliber, ref..."
                className={`w-full rounded-md border py-1.5 pr-8 pl-8 text-xs focus:border-[#D4AF37] focus:outline-none ${
                  isLightBackdrop
                    ? 'border-black/15 bg-white text-[#111513] placeholder:text-black/40'
                    : 'border-white/15 bg-[#060908] text-[#F4F2ED] placeholder:text-white/40'
                }`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className={`cursor-pointer absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 ${
                    isLightBackdrop
                      ? 'text-black/50 hover:text-black'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Inner Ring Filter Switcher */}
            <div
              className={`mt-2 flex items-center rounded border p-0.5 ${
                isLightBackdrop
                  ? 'border-black/12 bg-black/5'
                  : 'border-white/12 bg-white/[0.04]'
              }`}
            >
              {(['all', 'pillar', 'maison', 'timeline'] as FilterMode[]).map((mode) => {
                const active = filterMode === mode;
                const label =
                  mode === 'all'
                    ? `All (${WATCH_MODELS.length})`
                    : mode === 'pillar'
                      ? 'Pillar'
                      : mode === 'maison'
                        ? 'Maison'
                        : '1795+ Era';
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setFilterMode(mode);
                      horologyAudio.playEscapementTick(false);
                    }}
                    className={`cursor-pointer relative flex-1 rounded py-1 text-[10.5px] font-medium tracking-wider uppercase transition-colors ${
                      active
                        ? 'text-white'
                        : isLightBackdrop
                          ? 'text-black/65 hover:text-black'
                          : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="wheel-filter-pill"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        className="absolute inset-0 rounded bg-[#006039]"
                      />
                    )}
                    <span className="relative z-10">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sub-filter strip for Pillar or Maison */}
            {(filterMode === 'pillar' || filterMode === 'maison') && (
              <div className="mt-2 flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-0.5">
                {filterMode === 'pillar'
                  ? WATCH_CATEGORIES.map((cat) => {
                      const active = pillarFilter === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setPillarFilter(cat.id);
                            horologyAudio.playEscapementTick(false);
                          }}
                          className={`cursor-pointer shrink-0 rounded px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase transition-colors ${
                            active
                              ? 'bg-[#D4AF37] text-[#0A0D0C] font-semibold'
                              : isLightBackdrop
                                ? 'bg-black/5 text-black/70 hover:text-black'
                                : 'bg-white/5 text-white/65 hover:text-white'
                          }`}
                        >
                          {cat.shortLabel}
                        </button>
                      );
                    })
                  : WATCH_BRANDS.map((brand) => {
                      const active = maisonFilter === brand.id;
                      return (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => {
                            setMaisonFilter(brand.id);
                            horologyAudio.playEscapementTick(false);
                          }}
                          className={`cursor-pointer shrink-0 rounded px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase transition-colors ${
                            active
                              ? 'bg-[#D4AF37] text-[#0A0D0C] font-semibold'
                              : isLightBackdrop
                                ? 'bg-black/5 text-black/70 hover:text-black'
                                : 'bg-white/5 text-white/65 hover:text-white'
                          }`}
                        >
                          {brand.id}
                        </button>
                      );
                    })}
              </div>
            )}
          </div>

          {/* Center Continuous Rotating Mechanical Dial */}
          <div
            onWheel={handleWheelScroll}
            onPointerDown={handleDialPointerDown}
            onPointerMove={handleDialPointerMove}
            onPointerUp={handleDialPointerUp}
            onPointerCancel={handleDialPointerUp}
            className="relative flex-1 overflow-hidden select-none touch-none cursor-ns-resize"
          >
            {/* Curved outer bezel tick ring centered off right edge */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 -right-[255px] h-[570px] w-[570px] -translate-y-1/2 rounded-full border border-[#D4AF37]/25"
            >
              <motion.div
                style={{ rotate: tickRingRotateMV }}
                className="relative h-full w-full will-change-transform"
              >
                {ARC_TICKS.map((deg) => (
                  <span
                    key={deg}
                    className={`absolute top-1/2 left-0 h-px -translate-y-1/2 ${
                      deg % 15 === 0
                        ? 'w-3.5 bg-[#D4AF37]/80'
                        : 'w-1.5 bg-[#D4AF37]/30'
                    }`}
                    style={{
                      transformOrigin: '285px 0px',
                      transform: `rotate(${deg}deg)`,
                    }}
                  />
                ))}
              </motion.div>
            </div>

            {/* 9 o'clock Fixed Brass Reading Reticle */}
            {total > 0 && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 right-3 h-[68px] -translate-y-1/2 rounded-lg border border-[#D4AF37]/75 bg-[#D4AF37]/[0.08]"
              >
                <span className="absolute top-1/2 -left-1 h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-[#D4AF37]" />
              </div>
            )}

            {/* Continuous Radial Timepiece Teeth or Empty State */}
            {total === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <p className="font-serif text-base">No matching timepieces</p>
                <p
                  className={`mt-1 text-xs ${
                    isLightBackdrop ? 'text-black/55' : 'text-white/55'
                  }`}
                >
                  Try clearing your search or switching Maison/Pillar.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setFilterMode('all');
                  }}
                  className="cursor-pointer mt-3 rounded bg-[#006039] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#007546]"
                >
                  Reset Search
                </button>
              </div>
            ) : (
              <div className="relative h-full w-full">
                {items.map((w, idx) => {
                  if (
                    total > 13 &&
                    Math.abs(getShortestDelta(idx, safeFocusedIdx, total)) > 6
                  ) {
                    return null;
                  }
                  return (
                    <WheelTooth
                      key={w.id}
                      watch={w}
                      index={idx}
                      total={total}
                      smoothScrollMV={smoothScrollMV}
                      isActive3D={w.id === selectedModel}
                      isCompared={w.id === compareModelId}
                      isFocused={idx === safeFocusedIdx}
                      isLightBackdrop={isLightBackdrop}
                      onPick={handlePickTooth}
                    />
                  );
                })}
              </div>
            )}

            {/* Tactile Bezel Steppers */}
            {total > 1 && (
              <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => stepTooth(-1)}
                  aria-label="Previous timepiece on wheel"
                  className={`cursor-pointer rounded border p-1 transition-colors ${
                    isLightBackdrop
                      ? 'border-black/15 bg-white text-black/75 hover:border-black/40'
                      : 'border-white/15 bg-[#121614] text-white/75 hover:border-[#D4AF37]/60 hover:text-white'
                  }`}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => stepTooth(1)}
                  aria-label="Next timepiece on wheel"
                  className={`cursor-pointer rounded border p-1 transition-colors ${
                    isLightBackdrop
                      ? 'border-black/15 bg-white text-black/75 hover:border-black/40'
                      : 'border-white/15 bg-[#121614] text-white/75 hover:border-[#D4AF37]/60 hover:text-white'
                  }`}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Bottom Focused Timepiece Action Deck */}
          <div
            className={`border-t px-4 py-3 ${
              isLightBackdrop
                ? 'border-black/10 bg-black/[0.03]'
                : 'border-white/10 bg-[#080B0A]'
            }`}
          >
            {total > 0 ? (
              <>
                <div className="flex items-center justify-between font-mono text-[10px] tabular-nums text-[#D4AF37]">
                  <span>
                    INDEX {safeFocusedIdx + 1} / {total} · DRAG OR SCROLL WHEEL
                  </span>
                  <span>{focusedWatch.caliber}</span>
                </div>
                <p
                  className={`mt-1 line-clamp-2 text-xs leading-relaxed ${
                    isLightBackdrop ? 'text-black/70' : 'text-white/70'
                  }`}
                >
                  {focusedWatch.tagline}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectModel(focusedWatch.id)}
                    className="cursor-pointer flex-1 rounded bg-[#006039] px-3 py-1.5 text-xs font-semibold tracking-wide text-white transition-colors hover:bg-[#007546]"
                  >
                    {focusedWatch.id === selectedModel
                      ? 'Active on 3D Stage'
                      : `Load ${focusedWatch.shortName}`}
                  </button>
                  <button
                    type="button"
                    disabled={focusedWatch.id === selectedModel}
                    onClick={() =>
                      onSelectCompare(
                        compareModelId === focusedWatch.id ? null : focusedWatch.id
                      )
                    }
                    className={`cursor-pointer flex items-center gap-1 rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      compareModelId === focusedWatch.id
                        ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37]'
                        : isLightBackdrop
                          ? 'border-black/15 text-black/80 hover:border-black/35'
                          : 'border-white/15 text-white/80 hover:border-[#D4AF37]/50'
                    }`}
                  >
                    <Columns2 className="h-3.5 w-3.5" />
                    <span>
                      {compareModelId === focusedWatch.id ? 'Paired' : 'Compare'}
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <div className="font-mono text-[10px] text-[#D4AF37]">
                0 TIMEPIECES MATCH FILTER
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
