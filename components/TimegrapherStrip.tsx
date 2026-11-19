'use client';

import React, { useEffect, useRef } from 'react';
import { Activity, Compass, X } from 'lucide-react';
import type { TimegrapherTelemetry } from '@/lib/three/WatchStudioEngine';
import type { CaliberBeatProfile, CameraPresetId } from '@/lib/watches';

interface TimegrapherStripProps {
  telemetry: TimegrapherTelemetry | null;
  fallbackProfile: CaliberBeatProfile;
  onSelectOrientation: (preset: CameraPresetId, flipWatch: boolean) => void;
  onClose: () => void;
}

export default function TimegrapherStrip({
  telemetry,
  fallbackProfile,
  onSelectOrientation,
  onClose,
}: TimegrapherStripProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const telemetryRef = useRef<TimegrapherTelemetry | null>(telemetry);
  const fallbackRef = useRef<CaliberBeatProfile>(fallbackProfile);

  useEffect(() => {
    telemetryRef.current = telemetry;
  }, [telemetry]);

  useEffect(() => {
    fallbackRef.current = fallbackProfile;
  }, [fallbackProfile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const startMs = performance.now();

    const drawFrame = (nowMs: number) => {
      const t = (nowMs - startMs) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      const midY = h * 0.5;
      const data = telemetryRef.current;
      const fb = fallbackRef.current;

      const isHacked = data?.isHacked ?? false;
      const isSpringDrive = data?.isSpringDrive ?? fb.isSpringDrive;
      const isQuartz = data?.isQuartz ?? fb.isQuartz;
      const beatHz = data?.beatHz ?? fb.beatHz;
      const rate = data?.rateSecPerDay ?? 0.4;
      const beatError = data?.beatErrorMs ?? 0.1;

      ctx.fillStyle = '#050907';
      ctx.fillRect(0, 0, w, h);

      // Horizontal reference grid lines
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.14)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 32) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();

      if (isHacked) {
        // Crown pulled to Pos 3: balance wheel halted -> flat amber trace
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(w, midY);
        ctx.stroke();
      } else if (isSpringDrive) {
        // Tri-Synchro continuous electromagnetic glide trace
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let x = 0; x < w; x += 2) {
          const y =
            midY +
            Math.sin(x * 0.055 - t * 6.5) * 4.5 +
            Math.sin(x * 0.11 - t * 3.2) * 1.4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (isQuartz) {
        // Crisp 1 Hz pulse markers
        const cols = 42;
        const speedPx = 28;
        const stepPx = w / cols;
        ctx.fillStyle = '#a3e635';
        for (let i = 0; i < cols; i++) {
          const x = ((i * stepPx - t * speedPx) % w + w) % w;
          if (i % 4 === 0) {
            ctx.fillRect(x, midY - 12, 2.2, 24);
          } else {
            ctx.fillStyle = 'rgba(163, 230, 53, 0.25)';
            ctx.fillRect(x, midY - 1, 1.5, 2);
            ctx.fillStyle = '#a3e635';
          }
        }
      } else {
        // Classic Witschi dual-beat paper tape trace
        const beatsPerSec = Math.max(2, beatHz * 2);
        const speedPx = beatsPerSec * 7.2;
        const dotCount = 56;
        const spacing = w / dotCount;
        const slopeFactor = rate * 1.8;
        const beatSplitPx = 1.4 + beatError * 14;

        for (let i = 0; i < dotCount; i++) {
          const phaseIdx = i + Math.floor(t * (speedPx / spacing));
          const x = w - (i * spacing + ((t * speedPx) % spacing));
          const progress = 1 - x / w;
          const baseCenterY = midY - progress * slopeFactor;
          const jitter = Math.sin(phaseIdx * 1.7) * 0.8;
          const isEven = phaseIdx % 2 === 0;
          const y =
            baseCenterY + (isEven ? -beatSplitPx : beatSplitPx) + jitter;

          ctx.fillStyle = isEven ? '#4ade80' : '#facc15';
          ctx.fillRect(x - 1.2, Math.max(4, Math.min(h - 6, y)), 2.5, 2.5);
        }
      }

      rafId = window.requestAnimationFrame(drawFrame);
    };

    rafId = window.requestAnimationFrame(drawFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const positionLabel = telemetry?.positionLabel ?? 'Dial Up (DU)';
  const vph = telemetry?.vph ?? fallbackProfile.vph;
  const isSpringDrive = telemetry?.isSpringDrive ?? fallbackProfile.isSpringDrive;
  const isQuartz = telemetry?.isQuartz ?? fallbackProfile.isQuartz;
  const isHacked = telemetry?.isHacked ?? false;
  const amplitudeDeg = telemetry?.amplitudeDeg ?? (isSpringDrive || isQuartz ? 0 : 292);
  const beatErrorMs = telemetry?.beatErrorMs ?? 0.1;
  const rateSecPerDay = telemetry?.rateSecPerDay ?? (isSpringDrive ? 0.1 : 0.6);
  const liftAngleDeg = telemetry?.liftAngleDeg ?? fallbackProfile.liftAngleDeg;

  const rateText =
    rateSecPerDay > 0
      ? `+${rateSecPerDay.toFixed(1)} s/d`
      : `${rateSecPerDay.toFixed(1)} s/d`;

  return (
    <div className="mb-2 flex justify-center">
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-3 rounded-md border border-[#D4AF37]/45 bg-[#101513]/95 px-3.5 py-2 text-xs shadow-xl">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
          <div className="leading-tight">
            <div className="font-mono text-[10px] tracking-wider text-[#D4AF37] uppercase">
              Timegrapher
            </div>
            <div className="font-mono text-[10px] text-[#F4F2ED]/75">
              {positionLabel}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded border border-white/15 bg-[#050907]">
          <canvas
            ref={canvasRef}
            width={240}
            height={44}
            className="block h-[44px] w-[220px] sm:w-[240px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] tabular-nums">
          <span className="rounded border border-emerald-500/35 bg-emerald-950/40 px-2 py-0.5 text-emerald-200">
            {isHacked
              ? 'HACKED (0 Hz)'
              : isSpringDrive
                ? 'GLIDE · 0 Hz'
                : isQuartz
                  ? fallbackProfile.label
                  : `${vph.toLocaleString()} vph`}
          </span>
          <span className="rounded border border-white/15 bg-[#0A0D0C] px-2 py-0.5 text-[#F4E2A6]">
            {rateText}
          </span>
          {!isSpringDrive && !isQuartz && (
            <>
              <span className="rounded border border-white/15 bg-[#0A0D0C] px-2 py-0.5 text-[#F4F2ED]/85">
                AMP {amplitudeDeg}°
              </span>
              <span className="rounded border border-white/15 bg-[#0A0D0C] px-2 py-0.5 text-[#F4F2ED]/75">
                BE {beatErrorMs.toFixed(1)} ms
              </span>
              <span className="hidden md:inline rounded border border-white/10 bg-[#0A0D0C] px-2 py-0.5 text-[#F4F2ED]/55">
                LIFT {liftAngleDeg}°
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 border-l border-white/10 pl-2">
          <Compass className="h-3 w-3 text-[#D4AF37]/80" />
          <button
            type="button"
            onClick={() => onSelectOrientation('dial', false)}
            className="cursor-pointer rounded border border-white/15 bg-[#0A0D0C] px-1.5 py-0.5 font-mono text-[10px] text-[#F4F2ED]/80 hover:border-[#D4AF37]/50 hover:text-white"
            title="Test Dial Up (DU) Position"
          >
            DU
          </button>
          <button
            type="button"
            onClick={() => onSelectOrientation('profile', false)}
            className="cursor-pointer rounded border border-white/15 bg-[#0A0D0C] px-1.5 py-0.5 font-mono text-[10px] text-[#F4F2ED]/80 hover:border-[#D4AF37]/50 hover:text-white"
            title="Test Crown Down / Profile Position"
          >
            9H
          </button>
          <button
            type="button"
            onClick={() => onSelectOrientation('caliber', true)}
            className="cursor-pointer rounded border border-white/15 bg-[#0A0D0C] px-1.5 py-0.5 font-mono text-[10px] text-[#F4F2ED]/80 hover:border-[#D4AF37]/50 hover:text-white"
            title="Test Caseback Up (PD) Position"
          >
            PD
          </button>
        </div>

        <button
          type="button"
          aria-label="Close Timegrapher"
          onClick={onClose}
          className="cursor-pointer rounded p-1 text-[#F4F2ED]/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
