'use client';

import React from 'react';
import { WatchSpec, resolveAlloy, resolveDial } from '@/lib/watches';

interface WatchMiniDialProps {
  watch: WatchSpec;
  size?: 'sm' | 'md' | 'lg';
}

export default function WatchMiniDial({
  watch,
  size = 'md',
}: WatchMiniDialProps) {
  const alloy = resolveAlloy(watch, 'default');
  const dial = resolveDial(watch, 'default');
  const px = size === 'sm' ? 30 : size === 'lg' ? 116 : 38;
  const shape = watch.caseShape ?? 'round';

  const isRectangular = shape === 'rectangular';
  const isTonneau = shape === 'tonneau';
  const isOctagonal = shape === 'octagonal' || shape === 'compact-octagon';
  const isCompactOctagon = shape === 'compact-octagon';
  const isSquare = shape === 'square';
  const isCushion = shape === 'cushion';
  const isCrash = shape === 'crash';

  const width = isRectangular
    ? Math.round(px * 0.72)
    : isCompactOctagon
      ? Math.round(px * 0.92)
      : isTonneau || isCrash
        ? Math.round(px * 0.86)
        : px;
  const height = px;

  const borderRadius = isCrash
    ? '64% 36% 58% 42% / 44% 64% 36% 56%'
    : isRectangular
      ? '5px'
      : isSquare
        ? '8px'
        : isCushion
          ? '12px'
          : isTonneau
            ? '44% / 30%'
            : isOctagonal
              ? '9px'
              : '9999px';

  const clipPath = isCompactOctagon
    ? 'polygon(20% 0%, 80% 0%, 100% 18%, 100% 82%, 80% 100%, 20% 100%, 0% 82%, 0% 18%)'
    : isOctagonal
      ? 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
      : undefined;

  const bezelBackground = watch.bezelSecondaryHex
    ? `linear-gradient(180deg, ${watch.bezelPrimaryHex} 50%, ${watch.bezelSecondaryHex} 50%)`
    : watch.bezelType === 'fluted'
      ? `repeating-conic-gradient(from 0deg, ${alloy.swatchHex} 0deg 8deg, #7A7F85 8deg 15deg)`
      : watch.bezelType === 'navitimer'
        ? `repeating-conic-gradient(from 0deg, ${alloy.swatchHex} 0deg 4deg, #646970 4deg 7.5deg)`
        : watch.bezelType === 'overseas'
          ? `repeating-conic-gradient(from -10deg, #9EA4AB 0deg 20deg, ${alloy.swatchHex} 20deg 60deg)`
          : watch.bezelType === 'dive-cerachrom' ||
              watch.bezelType === 'seamaster' ||
              watch.bezelType === 'yacht-cerachrom' ||
              watch.bezelType === 'tachymeter' ||
              watch.bezelType === 'tonneau'
            ? watch.bezelPrimaryHex
            : alloy.swatchHex;

  const handColor = dial.lightText ? '#F4F2ED' : '#181C1E';
  const isZenith = watch.id === 'zenith-el-primero';

  return (
    <div
      aria-hidden="true"
      className="relative flex shrink-0 items-center justify-center shadow-inner"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius,
        clipPath,
        background: bezelBackground,
        padding: isRectangular ? '3px' : '4px',
        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.35), 0 2px 6px rgba(0,0,0,0.45)',
      }}
    >
      {/* Inner Dial Plate */}
      <div
        className="relative h-full w-full overflow-hidden"
        style={{
          borderRadius: isCrash
            ? '64% 36% 58% 42% / 44% 64% 36% 56%'
            : isRectangular
              ? '2px'
              : isSquare
                ? '4px'
                : '9999px',
          background: `radial-gradient(circle at 42% 35%, ${dial.baseHex}, ${dial.edgeHex})`,
          boxShadow: 'inset 0 0 4px rgba(0,0,0,0.55)',
        }}
      >
        {/* Digital LCD Face (Casio DW-5600 / F-91W) */}
        {watch.isDigitalDisplay ? (
          <div className="flex h-full w-full items-center justify-center p-[3px]">
            <div
              className="flex h-[68%] w-[84%] items-center justify-center rounded-[1px] border"
              style={{
                backgroundColor: '#9AA894',
                borderColor: watch.id === 'casio-f91w' ? '#2563EB' : '#DC2626',
              }}
            >
              <span className="font-mono text-[6px] font-bold leading-none tracking-tighter text-[#151C16]">
                10:10
              </span>
            </div>
          </div>
        ) : watch.isJumpingDigital ? (
          /* Mechanical Jumping Digital Bridge (Lange Zeitwerk) */
          <div className="relative h-full w-full">
            <span className="absolute top-1/2 left-[8%] right-[8%] h-[34%] -translate-y-1/2 rounded-[3px] bg-[#DDD8CB] flex items-center justify-around px-[2px]">
              <span className="h-[68%] w-[36%] rounded-[1px] bg-[#121417]" />
              <span className="h-[68%] w-[36%] rounded-[1px] bg-[#121417]" />
            </span>
            <span className="absolute bottom-[10%] left-1/2 h-[22%] w-[22%] -translate-x-1/2 rounded-full border border-[#DDD8CB] bg-[#15181C]" />
          </div>
        ) : (
          <>
            {/* Patek World Time 24-City Perimeter Ring */}
            {watch.hasWorldTimeRing && (
              <span className="absolute inset-[1px] rounded-full border-[4px] border-[#EAE4D4]" />
            )}

            {/* MB&F LM101 Floating Golden Balance & Lacquer Sub-Dial */}
            {watch.hasFloatingBalance && (
              <>
                <span className="absolute top-[24%] left-[14%] h-[34%] w-[34%] rounded-full border-[1.5px] border-[#D4AF37] bg-[#D4AF37]/15" />
                <span className="absolute top-[20%] right-[12%] h-[36%] w-[36%] rounded-full border border-[#D4AF37]/70 bg-[#F4F1E8]" />
              </>
            )}

            {/* Subtle Chronograph Subdial Hints */}
            {watch.hasChronoSubdials === 3 && (
              <>
                <span
                  className="absolute top-[42%] left-[16%] h-[22%] w-[22%] rounded-full border border-white/25"
                  style={{ backgroundColor: isZenith ? '#C6CBD1' : 'rgba(0,0,0,0.28)' }}
                />
                <span
                  className="absolute top-[42%] right-[16%] h-[22%] w-[22%] rounded-full border border-white/25"
                  style={{ backgroundColor: isZenith ? '#1D3C6B' : 'rgba(0,0,0,0.28)' }}
                />
                <span
                  className="absolute bottom-[15%] left-1/2 h-[22%] w-[22%] -translate-x-1/2 rounded-full border border-white/25"
                  style={{ backgroundColor: isZenith ? '#373C44' : 'rgba(0,0,0,0.28)' }}
                />
              </>
            )}
            {watch.hasChronoSubdials === 2 && (
              <>
                <span
                  className={`absolute top-[39%] left-[16%] h-[26%] w-[26%] border border-white/30 bg-black/30 ${
                    isSquare ? 'rounded-[3px]' : 'rounded-full'
                  }`}
                />
                <span
                  className={`absolute top-[39%] right-[16%] h-[26%] w-[26%] border border-white/30 bg-black/30 ${
                    isSquare ? 'rounded-[3px]' : 'rounded-full'
                  }`}
                />
              </>
            )}

            {/* Small Seconds Subdial */}
            {watch.hasSmallSeconds === 9 && (
              <span className="absolute top-[40%] left-[14%] h-[22%] w-[22%] rounded-full border border-white/35 bg-black/25" />
            )}
            {watch.hasSmallSeconds === 7.5 && (
              <span className="absolute bottom-[18%] left-[18%] h-[22%] w-[22%] rounded-full border border-white/35 bg-black/25" />
            )}
            {watch.hasSmallSeconds === 6 && (
              <span className="absolute bottom-[14%] left-1/2 h-[22%] w-[22%] -translate-x-1/2 rounded-full border border-black/25 bg-black/10" />
            )}

            {/* Tourbillon / Moonphase / SkyDweller Disc Hint */}
            {watch.hasTourbillon && (
              <span className="absolute bottom-[14%] left-1/2 h-[24%] w-[24%] -translate-x-1/2 rounded-full border border-[#D4AF37]/80 bg-[#D4AF37]/20" />
            )}
            {watch.hasMoonphase && (
              <span className="absolute bottom-[16%] right-[18%] h-[22%] w-[22%] rounded-full bg-[#10264A] ring-1 ring-[#D4AF37]/70" />
            )}
            {watch.hasSkyDwellerDisc && (
              <span className="absolute bottom-[20%] left-1/2 h-[32%] w-[32%] -translate-x-1/2 rounded-full border border-white/40" />
            )}

            {/* 10:10 Signature Hands */}
            <span
              className="absolute top-1/2 left-1/2 h-[2px] w-[30%] origin-left rounded-full"
              style={{
                backgroundColor: handColor,
                transform: 'translate(0, -50%) rotate(-145deg)',
              }}
            />
            <span
              className="absolute top-1/2 left-1/2 h-[1.5px] w-[40%] origin-left rounded-full"
              style={{
                backgroundColor: handColor,
                transform: 'translate(0, -50%) rotate(-32deg)',
              }}
            />
            {watch.hasGmtHand && (
              <span
                className="absolute top-1/2 left-1/2 h-[1.5px] w-[38%] origin-left rounded-full"
                style={{
                  backgroundColor: watch.gmtHandColorHex
                    ? `#${watch.gmtHandColorHex.toString(16).padStart(6, '0')}`
                    : '#EF4444',
                  transform: 'translate(0, -50%) rotate(40deg)',
                }}
              />
            )}
            {/* Center Pinion */}
            <span
              className="absolute top-1/2 left-1/2 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]"
            />
          </>
        )}
      </div>

      {/* Tiny Winding Crown Nub (Left for Monaco Calibre 11, Bridge-Guarded for Luminor, Standard 3h) */}
      {watch.brand === 'CASIO' ? null : watch.leftCrown ? (
        <span
          className="absolute top-1/2 -left-[2px] h-[6px] w-[3px] -translate-y-1/2 rounded-l-[1px]"
          style={{ backgroundColor: alloy.swatchHex }}
        />
      ) : watch.hasCrownBridge ? (
        <span
          className="absolute top-1/2 -right-[3px] h-[12px] w-[4px] -translate-y-1/2 rounded-r-[3px] border border-white/30"
          style={{ backgroundColor: alloy.swatchHex }}
        />
      ) : (
        <span
          className="absolute top-1/2 -right-[2px] h-[6px] w-[3px] -translate-y-1/2 rounded-r-[1px]"
          style={{ backgroundColor: alloy.swatchHex }}
        />
      )}
    </div>
  );
}
