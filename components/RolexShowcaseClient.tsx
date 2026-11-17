'use client';

import React, { useCallback, useState } from 'react';
import {
  AlloyId,
  BeltId,
  BezelId,
  DialId,
  LightingModeId,
  WatchModelId,
  getWatchById,
} from '@/lib/watches';
import Navbar from './Navbar';
import WatchStudioViewport from './WatchStudioViewport';

export default function RolexShowcaseClient() {
  const [selectedModel, setSelectedModel] = useState<WatchModelId>('submariner');
  const [alloyId, setAlloyId] = useState<AlloyId>('default');
  const [dialId, setDialId] = useState<DialId>('default');
  const [bezelId, setBezelId] = useState<BezelId>('default');
  const [beltId, setBeltId] = useState<BeltId>('bracelet');
  const [exhibitionMode, setExhibitionMode] = useState<boolean>(false);
  const [lightingMode, setLightingMode] = useState<LightingModeId>('atelier');
  const [reversoFlipped, setReversoFlipped] = useState<boolean>(false);

  const handleSelectModel = useCallback((id: WatchModelId) => {
    const spec = getWatchById(id);
    setSelectedModel(id);
    setAlloyId('default');
    setDialId('default');
    setBezelId('default');
    setBeltId(spec.defaultBelt ?? 'bracelet');
    setReversoFlipped(false);
  }, []);

  const handleRestorePreset = useCallback(
    (preset: {
      modelId: WatchModelId;
      alloyId: AlloyId;
      dialId: DialId;
      bezelId: BezelId;
      beltId: BeltId;
      lightingMode: LightingModeId;
    }) => {
      setSelectedModel(preset.modelId);
      setAlloyId(preset.alloyId);
      setDialId(preset.dialId);
      setBezelId(preset.bezelId);
      setBeltId(preset.beltId);
      setLightingMode(preset.lightingMode);
      setReversoFlipped(false);
    },
    []
  );

  const handleToggleExhibition = useCallback(() => {
    setExhibitionMode((prev) => !prev);
  }, []);

  const isLightBackdrop = lightingMode === 'alpine';

  return (
    <div
      className={`h-dvh w-screen overflow-hidden transition-colors duration-300 ${
        isLightBackdrop ? 'bg-[#E8ECEA] text-[#111513]' : 'bg-[#0A0D0C] text-[#F4F2ED]'
      }`}
    >
      <Navbar
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
        exhibitionMode={exhibitionMode}
        onToggleExhibition={handleToggleExhibition}
        isLightBackdrop={isLightBackdrop}
      />

      <main className="h-full w-full">
        <WatchStudioViewport
          selectedModel={selectedModel}
          onSelectModel={handleSelectModel}
          alloyId={alloyId}
          onChangeAlloyId={setAlloyId}
          dialId={dialId}
          onChangeDialId={setDialId}
          bezelId={bezelId}
          onChangeBezelId={setBezelId}
          beltId={beltId}
          onChangeBeltId={setBeltId}
          exhibitionMode={exhibitionMode}
          onToggleExhibition={handleToggleExhibition}
          lightingMode={lightingMode}
          onChangeLightingMode={setLightingMode}
          reversoFlipped={reversoFlipped}
          onChangeReversoFlipped={setReversoFlipped}
          onRestorePreset={handleRestorePreset}
        />
      </main>
    </div>
  );
}
