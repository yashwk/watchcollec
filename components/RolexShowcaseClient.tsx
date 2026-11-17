'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ALLOY_OPTIONS,
  AlloyId,
  BELT_OPTIONS,
  BELT_SHADE_OPTIONS,
  BEZEL_OPTIONS,
  BeltId,
  BeltShadeId,
  BezelId,
  DIAL_OPTIONS,
  DialId,
  LightingModeId,
  WATCH_MODELS,
  WatchModelId,
  getWatchById,
} from '@/lib/watches';
import Navbar from './Navbar';
import NavBezelWheel from './navigation/NavBezelWheel';
import NavEdgeSpine from './navigation/NavEdgeSpine';
import { NavStyleId } from './navigation/types';
import WatchStudioViewport from './WatchStudioViewport';

const VALID_LIGHTING: LightingModeId[] = ['atelier', 'vault', 'nocturne', 'alpine', 'bronze'];

export default function RolexShowcaseClient() {
  const [selectedModel, setSelectedModel] = useState<WatchModelId>('submariner');
  const [compareModelId, setCompareModelId] = useState<WatchModelId | null>(null);
  const [navStyle, setNavStyle] = useState<NavStyleId>('wheel');
  const [navDrawerOpen, setNavDrawerOpen] = useState<boolean>(false);
  const [alloyId, setAlloyId] = useState<AlloyId>('default');
  const [dialId, setDialId] = useState<DialId>('default');
  const [bezelId, setBezelId] = useState<BezelId>('default');
  const [beltId, setBeltId] = useState<BeltId>('bracelet');
  const [beltShadeId, setBeltShadeId] = useState<BeltShadeId>('default');
  const [exhibitionMode, setExhibitionMode] = useState<boolean>(false);
  const [lightingMode, setLightingMode] = useState<LightingModeId>('atelier');
  const [reversoFlipped, setReversoFlipped] = useState<boolean>(false);
  const urlHydratedRef = useRef(false);

  // Hydrate configurator from shareable URL query params on client mount
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const params = new URLSearchParams(window.location.search);
        const qWatch = params.get('watch') as WatchModelId | null;
        if (qWatch && WATCH_MODELS.some((w) => w.id === qWatch)) {
          const spec = getWatchById(qWatch);
          setSelectedModel(qWatch);
          setBeltId(spec.defaultBelt ?? 'bracelet');
        }
        const qAlloy = params.get('alloy') as AlloyId | null;
        if (qAlloy && ALLOY_OPTIONS.some((a) => a.id === qAlloy)) {
          setAlloyId(qAlloy);
        }
        const qDial = params.get('dial') as DialId | null;
        if (qDial && DIAL_OPTIONS.some((d) => d.id === qDial)) {
          setDialId(qDial);
        }
        const qBezel = params.get('bezel') as BezelId | null;
        if (qBezel && BEZEL_OPTIONS.some((b) => b.id === qBezel)) {
          setBezelId(qBezel);
        }
        const qBelt = params.get('belt') as BeltId | null;
        if (qBelt && BELT_OPTIONS.some((b) => b.id === qBelt)) {
          setBeltId(qBelt);
        }
        const qShade = params.get('shade') as BeltShadeId | null;
        if (qShade && BELT_SHADE_OPTIONS.some((s) => s.id === qShade)) {
          setBeltShadeId(qShade);
        }
        const qLight = params.get('light') as LightingModeId | null;
        if (qLight && VALID_LIGHTING.includes(qLight)) {
          setLightingMode(qLight);
        }
        const qCompare = params.get('compare') as WatchModelId | null;
        if (qCompare && WATCH_MODELS.some((w) => w.id === qCompare) && qCompare !== qWatch) {
          setCompareModelId(qCompare);
        }
      } catch {
        // Ignore malformed URL params
      } finally {
        urlHydratedRef.current = true;
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync active build into URL query params cleanly without reloading
  useEffect(() => {
    if (!urlHydratedRef.current || typeof window === 'undefined') return;
    const spec = getWatchById(selectedModel);
    const params = new URLSearchParams();
    if (selectedModel !== 'submariner') params.set('watch', selectedModel);
    if (alloyId !== 'default') params.set('alloy', alloyId);
    if (dialId !== 'default') params.set('dial', dialId);
    if (bezelId !== 'default') params.set('bezel', bezelId);
    if (beltId !== (spec.defaultBelt ?? 'bracelet')) params.set('belt', beltId);
    if (beltShadeId !== 'default') params.set('shade', beltShadeId);
    if (lightingMode !== 'atelier') params.set('light', lightingMode);
    if (compareModelId) params.set('compare', compareModelId);

    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', nextUrl);
  }, [
    selectedModel,
    alloyId,
    dialId,
    bezelId,
    beltId,
    beltShadeId,
    lightingMode,
    compareModelId,
  ]);

  const handleSelectModel = useCallback((id: WatchModelId) => {
    const spec = getWatchById(id);
    setSelectedModel(id);
    setCompareModelId((prev) => (prev === id ? null : prev));
    setAlloyId('default');
    setDialId('default');
    setBezelId('default');
    setBeltId(spec.defaultBelt ?? 'bracelet');
    setBeltShadeId('default');
    setReversoFlipped(false);
  }, []);

  const handleActivateShowdown = useCallback(
    (primaryId: WatchModelId, compareId: WatchModelId) => {
      const spec = getWatchById(primaryId);
      setSelectedModel(primaryId);
      setCompareModelId(compareId);
      setAlloyId('default');
      setDialId('default');
      setBezelId('default');
      setBeltId(spec.defaultBelt ?? 'bracelet');
      setBeltShadeId('default');
      setReversoFlipped(false);
    },
    []
  );

  const handleRestorePreset = useCallback(
    (preset: {
      modelId: WatchModelId;
      alloyId: AlloyId;
      dialId: DialId;
      bezelId: BezelId;
      beltId: BeltId;
      beltShadeId?: BeltShadeId;
      lightingMode: LightingModeId;
    }) => {
      setSelectedModel(preset.modelId);
      setCompareModelId((prev) => (prev === preset.modelId ? null : prev));
      setAlloyId(preset.alloyId);
      setDialId(preset.dialId);
      setBezelId(preset.bezelId);
      setBeltId(preset.beltId);
      setBeltShadeId(preset.beltShadeId ?? 'default');
      setLightingMode(preset.lightingMode);
      setReversoFlipped(false);
    },
    []
  );

  const handleToggleExhibition = useCallback(() => {
    setExhibitionMode((prev) => {
      const next = !prev;
      if (next) setNavDrawerOpen(false);
      return next;
    });
  }, []);

  const handleChangeNavStyle = useCallback((next: NavStyleId) => {
    setNavStyle(next);
    setNavDrawerOpen(next === 'wheel');
  }, []);

  const handleCycleNavStyle = useCallback(() => {
    setNavStyle((prev) => {
      const next: NavStyleId = prev === 'wheel' ? 'spine' : 'wheel';
      setNavDrawerOpen(next === 'wheel');
      return next;
    });
  }, []);

  const handleToggleNavDrawer = useCallback(() => {
    setNavDrawerOpen((prev) => !prev);
  }, []);

  const isLightBackdrop = lightingMode === 'alpine';
  const stageShiftX =
    navStyle === 'wheel' && navDrawerOpen && !exhibitionMode ? -1.25 : 0;

  return (
    <div
      className={`h-dvh w-screen overflow-hidden transition-colors duration-300 ${
        isLightBackdrop ? 'bg-[#E8ECEA] text-[#111513]' : 'bg-[#0A0D0C] text-[#F4F2ED]'
      }`}
    >
      <Navbar
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
        navStyle={navStyle}
        onChangeNavStyle={handleChangeNavStyle}
        navDrawerOpen={navDrawerOpen}
        onToggleNavDrawer={handleToggleNavDrawer}
        exhibitionMode={exhibitionMode}
        onToggleExhibition={handleToggleExhibition}
        isLightBackdrop={isLightBackdrop}
      />

      <main className="h-full w-full">
        <WatchStudioViewport
          selectedModel={selectedModel}
          onSelectModel={handleSelectModel}
          compareModelId={compareModelId}
          onChangeCompareModelId={setCompareModelId}
          onActivateShowdown={handleActivateShowdown}
          onOpenCatalog={handleToggleNavDrawer}
          onCycleNavStyle={handleCycleNavStyle}
          stageShiftX={stageShiftX}
          alloyId={alloyId}
          onChangeAlloyId={setAlloyId}
          dialId={dialId}
          onChangeDialId={setDialId}
          bezelId={bezelId}
          onChangeBezelId={setBezelId}
          beltId={beltId}
          onChangeBeltId={setBeltId}
          beltShadeId={beltShadeId}
          onChangeBeltShadeId={setBeltShadeId}
          exhibitionMode={exhibitionMode}
          onToggleExhibition={handleToggleExhibition}
          lightingMode={lightingMode}
          onChangeLightingMode={setLightingMode}
          reversoFlipped={reversoFlipped}
          onChangeReversoFlipped={setReversoFlipped}
          onRestorePreset={handleRestorePreset}
        />
      </main>

      {/* Primary Navigation: Continuous Bezel Wheel */}
      {navStyle === 'wheel' && (
        <NavBezelWheel
          open={navDrawerOpen && !exhibitionMode}
          onClose={() => setNavDrawerOpen(false)}
          selectedModel={selectedModel}
          compareModelId={compareModelId}
          onSelectModel={handleSelectModel}
          onSelectCompare={setCompareModelId}
          isLightBackdrop={isLightBackdrop}
        />
      )}

      {/* Backup Navigation: Floating Edge Spine */}
      {navStyle === 'spine' && (
        <NavEdgeSpine
          selectedModel={selectedModel}
          compareModelId={compareModelId}
          onSelectModel={handleSelectModel}
          onSelectCompare={setCompareModelId}
          exhibitionMode={exhibitionMode}
          isLightBackdrop={isLightBackdrop}
        />
      )}
    </div>
  );
}
