'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronLeft, Columns2, X } from 'lucide-react';
import { horologyAudio } from '@/lib/three/soundEngine';
import {
  WATCH_BRANDS,
  WATCH_MODELS,
  WatchBrand,
  WatchModelId,
  getWatchById,
} from '@/lib/watches';
import WatchMiniDial from './WatchMiniDial';

interface NavEdgeSpineProps {
  selectedModel: WatchModelId;
  compareModelId: WatchModelId | null;
  onSelectModel: (id: WatchModelId) => void;
  onSelectCompare: (id: WatchModelId | null) => void;
  exhibitionMode: boolean;
  isLightBackdrop: boolean;
}

export default function NavEdgeSpine({
  selectedModel,
  compareModelId,
  onSelectModel,
  onSelectCompare,
  exhibitionMode,
  isLightBackdrop,
}: NavEdgeSpineProps) {
  const activeWatch = getWatchById(selectedModel);
  const [expandedBrand, setExpandedBrand] = useState<WatchBrand | null>(null);

  useEffect(() => {
    if (!expandedBrand) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedBrand(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expandedBrand]);

  if (exhibitionMode) return null;

  const brandWatches = expandedBrand
    ? WATCH_MODELS.filter((w) => w.brand === expandedBrand)
    : [];

  return (
    <div
      className="pointer-events-none fixed top-1/2 right-4 z-35 flex -translate-y-1/2 items-center gap-2.5"
      onMouseLeave={() => setExpandedBrand(null)}
    >
      {/* Floating Horizontal Maison Accordion */}
      <AnimatePresence mode="wait">
        {expandedBrand && (
          <motion.div
            key={expandedBrand}
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 18, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className={`pointer-events-auto w-80 rounded-xl border p-3 shadow-2xl ${
              isLightBackdrop
                ? 'border-black/15 bg-[#F2F4F3] text-[#111513]'
                : 'border-[#D4AF37]/40 bg-[#0C100E] text-[#F4F2ED]'
            }`}
          >
            <div
              className={`mb-2 flex items-center justify-between border-b pb-2 ${
                isLightBackdrop ? 'border-black/10' : 'border-white/10'
              }`}
            >
              <div>
                <div className="font-mono text-[10px] font-semibold tracking-[0.2em] text-[#D4AF37] uppercase">
                  {expandedBrand}
                </div>
                <div
                  className={`text-[11px] ${
                    isLightBackdrop ? 'text-black/60' : 'text-white/55'
                  }`}
                >
                  {WATCH_BRANDS.find((b) => b.id === expandedBrand)?.heritage}
                </div>
              </div>
              <button
                type="button"
                aria-label="Close Maison drawer"
                onClick={() => setExpandedBrand(null)}
                className={`cursor-pointer rounded p-1 ${
                  isLightBackdrop
                    ? 'text-black/50 hover:bg-black/5'
                    : 'text-white/50 hover:bg-white/10'
                }`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex max-h-[320px] flex-col gap-1.5 overflow-y-auto pr-0.5">
              {brandWatches.map((w, idx) => {
                const isSelected = w.id === selectedModel;
                const isCompared = w.id === compareModelId;
                return (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: idx * 0.035,
                      type: 'spring',
                      stiffness: 380,
                      damping: 30,
                    }}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                      isSelected
                        ? isLightBackdrop
                          ? 'border-[#006039] bg-[#006039]/10'
                          : 'border-[#D4AF37]/70 bg-[#141B17]'
                        : isLightBackdrop
                          ? 'border-black/10 bg-white hover:border-black/25'
                          : 'border-white/10 bg-[#121614] hover:border-white/25'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectModel(w.id);
                      }}
                      className="cursor-pointer flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      <WatchMiniDial watch={w} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-serif text-sm font-medium">
                            {w.shortName}
                          </span>
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-[#006039]" />
                          )}
                        </div>
                        <div
                          className={`font-mono text-[10px] tabular-nums ${
                            isLightBackdrop ? 'text-black/55' : 'text-white/50'
                          }`}
                        >
                          {w.caseDiameterMm} mm · {w.caliber}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={isSelected}
                      onClick={() => onSelectCompare(isCompared ? null : w.id)}
                      title={isSelected ? 'Primary model' : 'Compare side-by-side'}
                      className={`cursor-pointer shrink-0 rounded border px-1.5 py-1 font-mono text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                        isCompared
                          ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37]'
                          : isLightBackdrop
                            ? 'border-black/15 text-black/65 hover:border-black/40'
                            : 'border-white/15 text-white/65 hover:border-[#D4AF37]/50'
                      }`}
                    >
                      <Columns2 className="h-3 w-3" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Whisper-Thin Right Edge Vertical Maison Spine */}
      <nav
        aria-label="Maison Edge Spine"
        className={`pointer-events-auto flex max-h-[calc(100dvh-10rem)] flex-col gap-0.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-xl border p-1.5 shadow-xl ${
          isLightBackdrop
            ? 'border-black/15 bg-[#F2F4F3]'
            : 'border-white/12 bg-[#0C100E]'
        }`}
      >
        {WATCH_BRANDS.map((brand) => {
          const count = WATCH_MODELS.filter((w) => w.brand === brand.id).length;
          if (count === 0) return null;
          const isCurrentBrand = activeWatch.brand === brand.id;
          const isHovered = expandedBrand === brand.id;

          return (
            <button
              key={brand.id}
              type="button"
              onMouseEnter={() => {
                if (expandedBrand !== brand.id) {
                  horologyAudio.playEscapementTick(false);
                }
                setExpandedBrand(brand.id);
              }}
              onClick={() =>
                setExpandedBrand((prev) => (prev === brand.id ? null : brand.id))
              }
              className={`cursor-pointer relative flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors ${
                isHovered
                  ? isLightBackdrop
                    ? 'bg-black/10 text-[#111513]'
                    : 'bg-white/10 text-white'
                  : isCurrentBrand
                    ? isLightBackdrop
                      ? 'text-[#006039]'
                      : 'text-[#D4AF37]'
                    : isLightBackdrop
                      ? 'text-black/60 hover:text-black'
                      : 'text-white/60 hover:text-white'
              }`}
            >
              {isCurrentBrand && (
                <motion.span
                  layoutId="spine-active-bar"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="absolute top-1.5 bottom-1.5 left-0.5 w-0.5 rounded-full bg-[#D4AF37]"
                />
              )}
              <span className="flex items-center gap-1 pl-1 font-mono text-[10px] font-semibold tracking-wider uppercase whitespace-nowrap">
                {isHovered && <ChevronLeft className="h-2.5 w-2.5 text-[#D4AF37]" />}
                <span>{brand.id}</span>
              </span>
              <span
                className={`font-mono text-[9px] tabular-nums ${
                  isLightBackdrop ? 'text-black/40' : 'text-white/40'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
