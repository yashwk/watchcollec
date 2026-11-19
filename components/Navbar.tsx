'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  WATCH_CATEGORIES,
  WATCH_MODELS,
  WatchCategoryId,
  WatchModelId,
  getWatchById,
} from '@/lib/watches';
import { NAV_STYLE_OPTIONS, NavStyleId } from './navigation/types';

interface NavbarProps {
  selectedModel: WatchModelId;
  onSelectModel: (id: WatchModelId) => void;
  navStyle: NavStyleId;
  onChangeNavStyle: (style: NavStyleId) => void;
  navDrawerOpen: boolean;
  onToggleNavDrawer: () => void;
  exhibitionMode: boolean;
  onToggleExhibition: () => void;
  isLightBackdrop: boolean;
}

export default function Navbar({
  selectedModel,
  onSelectModel,
  navStyle,
  onChangeNavStyle,
  navDrawerOpen,
  onToggleNavDrawer,
  exhibitionMode,
  onToggleExhibition,
  isLightBackdrop,
}: NavbarProps) {
  const activeWatch = getWatchById(selectedModel);
  const activeCategory = activeWatch.category;
  const visibleModels = WATCH_MODELS.filter((w) => w.category === activeCategory);

  const handleCategorySwitch = (cat: WatchCategoryId) => {
    if (cat === activeCategory) return;
    const firstInCat = WATCH_MODELS.find((w) => w.category === cat);
    if (firstInCat) onSelectModel(firstInCat.id);
  };

  const stepModel = (delta: number) => {
    const idx = WATCH_MODELS.findIndex((w) => w.id === selectedModel);
    const nextIdx = (idx + delta + WATCH_MODELS.length) % WATCH_MODELS.length;
    onSelectModel(WATCH_MODELS[nextIdx].id);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 border-b transition-all duration-300 ${
        isLightBackdrop
          ? 'border-black/10 bg-[#E8ECEA]/95'
          : 'border-white/10 bg-[#0A0D0C]/92'
      } ${exhibitionMode ? '-translate-y-full pointer-events-none' : 'translate-y-0'}`}
    >
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-2.5 px-3 sm:px-5 lg:px-8">
        {/* Zone 1: Active Maison Wordmark + Bezel Wheel Trigger + Collection Pillars */}
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (navStyle !== 'spine') onToggleNavDrawer();
            }}
            title={
              navStyle === 'spine'
                ? 'Browse Maisons on the Edge Spine (right margin)'
                : 'Open Rotating Bezel Wheel (C)'
            }
            className={`font-serif text-base sm:text-xl font-semibold tracking-[0.2em] whitespace-nowrap select-none transition-colors ${
              navStyle === 'spine' ? 'cursor-default' : 'cursor-pointer'
            } ${
              isLightBackdrop
                ? 'text-[#111513] hover:text-[#006039]'
                : 'text-[#F4F2ED] hover:text-[#D4AF37]'
            }`}
          >
            {activeWatch.brand}
          </button>

          {navStyle === 'wheel' && (
            <button
              type="button"
              onClick={onToggleNavDrawer}
              title="Toggle Rotating Bezel Wheel (C)"
              className={`cursor-pointer flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-medium tracking-wider uppercase transition-colors whitespace-nowrap ${
                navDrawerOpen
                  ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37]'
                  : isLightBackdrop
                    ? 'border-black/15 bg-black/5 text-[#111513]/85 hover:border-[#006039]'
                    : 'border-white/15 bg-white/[0.04] text-[#F4E2A6] hover:border-[#D4AF37]/60'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Wheel ({WATCH_MODELS.length})</span>
            </button>
          )}

          {navStyle === 'wheel' && (
            <div
              role="group"
              aria-label="Collection pillar"
              className={`hidden 2xl:flex items-center rounded border p-0.5 ${
                isLightBackdrop
                  ? 'border-black/15 bg-black/5'
                  : 'border-white/12 bg-white/[0.04]'
              }`}
            >
              {WATCH_CATEGORIES.map((cat) => {
                const active = cat.id === activeCategory;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    title={cat.label}
                    onClick={() => handleCategorySwitch(cat.id)}
                    className={`cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium tracking-wider uppercase transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#006039] text-white'
                        : isLightBackdrop
                          ? 'text-[#111513]/65 hover:text-[#111513]'
                          : 'text-[#F4F2ED]/65 hover:text-[#F4F2ED]'
                    }`}
                  >
                    {cat.shortLabel}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Zone 2: Center Model Tabs or Minimal Stepper */}
        {navStyle === 'wheel' ? (
          <nav
            aria-label="Timepiece models"
            className="hidden lg:flex min-w-0 flex-1 items-center justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-[12px] font-medium tracking-wide"
          >
            <div className="mx-auto flex w-max items-center gap-4 px-1">
              {visibleModels.map((w) => {
                const active = w.id === selectedModel;
                return (
                  <button
                    key={w.id}
                    type="button"
                    title={`${w.brand} — ${w.name}`}
                    onClick={() => onSelectModel(w.id)}
                    className={`cursor-pointer relative whitespace-nowrap shrink-0 py-1.5 transition-colors ${
                      active
                        ? isLightBackdrop
                          ? 'text-[#111513]'
                          : 'text-[#F4F2ED]'
                        : isLightBackdrop
                          ? 'text-[#111513]/60 hover:text-[#111513]'
                          : 'text-[#F4F2ED]/60 hover:text-[#F4F2ED]'
                    }`}
                  >
                    {w.shortName}
                    {active && (
                      <motion.span
                        layoutId="navbar-model-underline"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className={`absolute right-0 bottom-0 left-0 h-0.5 ${
                          isLightBackdrop ? 'bg-[#8A6818]' : 'bg-[#D4AF37]'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        ) : (
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => stepModel(-1)}
              aria-label="Previous timepiece"
              className={`cursor-pointer rounded border p-1 transition-colors ${
                isLightBackdrop
                  ? 'border-black/15 text-black/70 hover:bg-black/5'
                  : 'border-white/15 text-white/70 hover:bg-white/10'
              }`}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span
              className={`font-mono text-xs tracking-wider uppercase ${
                isLightBackdrop ? 'text-[#111513]/75' : 'text-[#F4F2ED]/80'
              }`}
            >
              {activeWatch.shortName}
            </span>
            <button
              type="button"
              onClick={() => stepModel(1)}
              aria-label="Next timepiece"
              className={`cursor-pointer rounded border p-1 transition-colors ${
                isLightBackdrop
                  ? 'border-black/15 text-black/70 hover:bg-black/5'
                  : 'border-white/15 text-white/70 hover:bg-white/10'
              }`}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Zone 3: Wheel / Edge Spine Switcher + Exhibition */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Navigation Mode"
            className={`flex items-center rounded border p-0.5 ${
              isLightBackdrop
                ? 'border-black/15 bg-black/5'
                : 'border-white/15 bg-white/[0.04]'
            }`}
          >
            {NAV_STYLE_OPTIONS.map((opt) => {
              const active = navStyle === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  title={`${opt.hint} (Shortcut: N)`}
                  onClick={() => onChangeNavStyle(opt.id)}
                  className={`cursor-pointer relative rounded px-2 py-1 text-[10px] sm:text-[11px] font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'text-white'
                      : isLightBackdrop
                        ? 'text-black/65 hover:text-black'
                        : 'text-white/65 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-style-test-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded bg-[#006039]"
                    />
                  )}
                  <span className="relative z-10">{opt.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onToggleExhibition}
            className="cursor-pointer flex items-center gap-1.5 rounded-md border border-[#D4AF37]/45 bg-[#006039] px-3 py-2 text-xs font-semibold tracking-wider text-white transition-colors hover:bg-[#007546] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] whitespace-nowrap shrink-0"
          >
            {exhibitionMode ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exit Exhibition</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exhibition</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
