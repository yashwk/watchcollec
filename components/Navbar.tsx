'use client';

import React from 'react';
import { Maximize2, Minimize2, Watch } from 'lucide-react';
import {
  WATCH_CATEGORIES,
  WATCH_MODELS,
  WatchCategoryId,
  WatchModelId,
  getWatchById,
} from '@/lib/watches';

interface NavbarProps {
  selectedModel: WatchModelId;
  onSelectModel: (id: WatchModelId) => void;
  exhibitionMode: boolean;
  onToggleExhibition: () => void;
  isLightBackdrop: boolean;
}

const SHORT_LABELS: Record<WatchModelId, string> = {
  submariner: 'Submariner',
  daytona: 'Daytona',
  datejust: 'Datejust 36',
  gmt: 'GMT-Master II',
  daydate: 'Day-Date 40',
  explorer2: 'Explorer II',
  milgauss: 'Milgauss',
  skydweller: 'Sky-Dweller',
  yachtmaster: 'Yacht-Master',
  'avi8-spitfire': 'Spitfire Lock',
  'omega-speedmaster': 'Speedmaster',
  'ap-royal-oak': 'Royal Oak',
  'pp-nautilus': 'Nautilus',
  'cartier-santos': 'Santos',
  'jlc-reverso': 'Reverso',
  'gs-snowflake': 'Snowflake',
  'lange-1': 'Lange 1',
  'rm-tonneau': 'RM 11-03',
};

export default function Navbar({
  selectedModel,
  onSelectModel,
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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 border-b transition-all duration-300 ${
        isLightBackdrop
          ? 'border-black/10 bg-[#E8ECEA]/95'
          : 'border-white/10 bg-[#0A0D0C]/92'
      } ${exhibitionMode ? '-translate-y-full pointer-events-none' : 'translate-y-0'}`}
    >
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-5 lg:px-10">
        {/* Zone 1: Brand Wordmark + Category Switcher */}
        <div className="flex items-center gap-3.5 shrink-0">
          <span
            className={`font-serif text-xl sm:text-2xl font-semibold tracking-[0.28em] whitespace-nowrap select-none ${
              isLightBackdrop ? 'text-[#111513]' : 'text-[#F4F2ED]'
            }`}
          >
            {activeWatch.brand}
          </span>

          <div
            role="group"
            aria-label="Collection category"
            className={`hidden sm:flex items-center rounded border p-0.5 ${
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
                  onClick={() => handleCategorySwitch(cat.id)}
                  className={`cursor-pointer flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium tracking-wider uppercase transition-colors whitespace-nowrap ${
                    active
                      ? cat.id === 'others'
                        ? 'bg-[#8A6818] text-white'
                        : 'bg-[#006039] text-white'
                      : isLightBackdrop
                        ? 'text-[#111513]/65 hover:text-[#111513]'
                        : 'text-[#F4F2ED]/65 hover:text-[#F4F2ED]'
                  }`}
                >
                  {cat.id === 'others' && <Watch className="h-3 w-3" />}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Zone 2: Category Model Tabs */}
        <nav
          aria-label="Timepiece models"
          className="hidden md:flex min-w-0 flex-1 items-center justify-center gap-4 lg:gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-[12px] lg:text-[13px] font-medium tracking-wide"
        >
          {visibleModels.map((w) => {
            const active = w.id === selectedModel;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => onSelectModel(w.id)}
                className={`cursor-pointer whitespace-nowrap shrink-0 border-b-2 py-1 transition-colors ${
                  active
                    ? isLightBackdrop
                      ? 'border-[#8A6818] text-[#111513]'
                      : 'border-[#D4AF37] text-[#F4F2ED]'
                    : isLightBackdrop
                      ? 'border-transparent text-[#111513]/60 hover:text-[#111513]'
                      : 'border-transparent text-[#F4F2ED]/60 hover:text-[#F4F2ED]'
                }`}
              >
                {SHORT_LABELS[w.id]}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onToggleExhibition}
            className="cursor-pointer flex items-center gap-1.5 rounded-md border border-[#D4AF37]/45 bg-[#006039] px-4 py-2 text-xs font-semibold tracking-wider text-white transition-colors hover:bg-[#007546] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] whitespace-nowrap shrink-0"
          >
            {exhibitionMode ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span>Exit Exhibition</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Exhibition</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
