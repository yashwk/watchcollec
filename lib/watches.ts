import type { StaticImageData } from 'next/image';
import submarinerImg from '@/src/assets/images/watch_submariner_macro_1794940069206.jpg';
import daytonaImg from '@/src/assets/images/watch_daytona_macro_1794940069486.jpg';
import datejustImg from '@/src/assets/images/watch_datejust_macro_1794940070792.jpg';
import gmtImg from '@/src/assets/images/watch_gmt_macro_1794940071849.jpg';

export type WatchCategoryId =
  | 'dive-sport'
  | 'chronograph'
  | 'gmt-travel'
  | 'dress-classic'
  | 'shaped-icons'
  | 'independent';
export type WatchModelId =
  | 'submariner'
  | 'daytona'
  | 'datejust'
  | 'gmt'
  | 'daydate'
  | 'explorer2'
  | 'milgauss'
  | 'skydweller'
  | 'yachtmaster'
  | 'avi8-spitfire'
  | 'omega-speedmaster'
  | 'omega-seamaster'
  | 'tudor-bb58'
  | 'vc-overseas'
  | 'ap-royal-oak'
  | 'pp-nautilus'
  | 'cartier-santos'
  | 'jlc-reverso'
  | 'panerai-luminor'
  | 'tag-monaco'
  | 'breitling-navitimer'
  | 'zenith-el-primero'
  | 'iwc-big-pilot'
  | 'breguet-classique'
  | 'gs-snowflake'
  | 'lange-1'
  | 'rm-tonneau'
  | 'fpj-chronometre-bleu'
  | 'moser-streamliner'
  | 'mbf-lm101'
  | 'bulgari-octo-finissimo'
  | 'pp-worldtime'
  | 'longines-zulu-time'
  | 'hamilton-murph'
  | 'nomos-tangente'
  | 'blancpain-fifty-fathoms'
  | 'doxa-sub300'
  | 'cartier-tank-louis'
  | 'cartier-crash'
  | 'gs-white-birch'
  | 'gp-laureato'
  | 'piaget-polo-79'
  | 'lange-zeitwerk'
  | 'casio-gshock-dw5600'
  | 'casio-casioak-ga2100'
  | 'casio-f91w';

export type AlloyId = 'default' | 'oystersteel' | 'yellow-gold' | 'everose' | 'rolesor';
export type DialId =
  | 'default'
  | 'obsidian'
  | 'emerald'
  | 'royal-blue'
  | 'champagne'
  | 'ice-blue'
  | 'panda'
  | 'meteorite'
  | 'aventurine'
  | 'mother-of-pearl'
  | 'snowflake';
export type BezelId =
  | 'default'
  | 'obsidian'
  | 'emerald'
  | 'pepsi'
  | 'batman'
  | 'sprite';
export type BeltId = 'bracelet' | 'leather' | 'oysterflex';
export type BeltShadeId =
  | 'default'
  | 'espresso'
  | 'midnight'
  | 'cognac'
  | 'racing-blue'
  | 'british-green'
  | 'obsidian';
export type CameraPresetId = 'hero' | 'dial' | 'profile' | 'caliber';
export type LightingModeId = 'atelier' | 'vault' | 'nocturne' | 'alpine' | 'bronze';
export type CrownPosition = 0 | 1 | 2 | 3;
export type WristStyleId = 'slate-mannequin' | 'navy-tailor' | 'espresso-suede';

export interface WristStyleOption {
  id: WristStyleId;
  label: string;
  swatchHex: string;
}

export const WRIST_STYLE_OPTIONS: WristStyleOption[] = [
  { id: 'slate-mannequin', label: 'Atelier Slate', swatchHex: '#22262b' },
  { id: 'navy-tailor', label: 'Navy Suit', swatchHex: '#16243d' },
  { id: 'espresso-suede', label: 'Espresso Suede', swatchHex: '#3b2618' },
];

export interface CaliberBeatProfile {
  beatHz: number;
  vph: number;
  isSpringDrive: boolean;
  isQuartz: boolean;
  liftAngleDeg: number;
  label: string;
}

export type WatchBrand =
  | 'ROLEX'
  | 'OMEGA'
  | 'TUDOR'
  | 'VACHERON CONSTANTIN'
  | 'AUDEMARS PIGUET'
  | 'PATEK PHILIPPE'
  | 'CARTIER'
  | 'JAEGER-LECOULTRE'
  | 'PANERAI'
  | 'TAG HEUER'
  | 'BREITLING'
  | 'ZENITH'
  | 'IWC SCHAFFHAUSEN'
  | 'BREGUET'
  | 'GRAND SEIKO'
  | 'A. LANGE & SÖHNE'
  | 'RICHARD MILLE'
  | 'AVI-8'
  | 'F.P. JOURNE'
  | 'H. MOSER & CIE'
  | 'MB&F'
  | 'BULGARI'
  | 'LONGINES'
  | 'HAMILTON'
  | 'NOMOS GLASHÜTTE'
  | 'BLANCPAIN'
  | 'DOXA'
  | 'GIRARD-PERREGAUX'
  | 'PIAGET'
  | 'CASIO';

export interface WatchBrandMeta {
  id: WatchBrand;
  origin: string;
  heritage: string;
}

export const WATCH_BRANDS: WatchBrandMeta[] = [
  { id: 'ROLEX', origin: 'Geneva · Switzerland', heritage: 'Perpetual Tool & Dress Icons' },
  { id: 'OMEGA', origin: 'Bienne · Switzerland', heritage: 'Co-Axial Master Chronometry' },
  { id: 'TUDOR', origin: 'Geneva · Switzerland', heritage: 'Born To Dare Heritage Divers' },
  { id: 'VACHERON CONSTANTIN', origin: 'Geneva · Switzerland', heritage: 'Maltese Cross Haute Sport' },
  { id: 'AUDEMARS PIGUET', origin: 'Le Brassus · Switzerland', heritage: 'Haute Horlogerie Octagon' },
  { id: 'PATEK PHILIPPE', origin: 'Geneva · Switzerland', heritage: 'Geneva Seal Architecture' },
  { id: 'CARTIER', origin: 'Paris · France', heritage: 'Shaped Wristwatch Pioneers' },
  { id: 'JAEGER-LECOULTRE', origin: 'Le Sentier · Switzerland', heritage: 'La Grande Maison Complications' },
  { id: 'PANERAI', origin: 'Florence · Italy', heritage: 'Marina Militare Cushion Instruments' },
  { id: 'TAG HEUER', origin: 'La Chaux-de-Fonds · Switzerland', heritage: 'Avant-Garde Motorsport Timing' },
  { id: 'BREITLING', origin: 'Grenchen · Switzerland', heritage: 'Aviation Slide-Rule Chronographs' },
  { id: 'ZENITH', origin: 'Le Locle · Switzerland', heritage: '36,000 vph High-Frequency Calibers' },
  { id: 'IWC SCHAFFHAUSEN', origin: 'Schaffhausen · Switzerland', heritage: 'Probus Scafusia Pilot Instruments' },
  { id: 'BREGUET', origin: 'Vallée de Joux · Switzerland', heritage: 'Guilloché & Pomme Hands Craft' },
  { id: 'GRAND SEIKO', origin: 'Shiojiri · Japan', heritage: 'Spring Drive, Hi-Beat & Zaratsu' },
  { id: 'A. LANGE & SÖHNE', origin: 'Glashütte · Germany', heritage: 'Saxon High Watchmaking' },
  { id: 'RICHARD MILLE', origin: 'Les Breuleux · Switzerland', heritage: 'Avant-Garde Skeleton Racing' },
  { id: 'F.P. JOURNE', origin: 'Geneva · Switzerland', heritage: 'Invenit et Fecit Solid-Gold Calibers' },
  { id: 'H. MOSER & CIE', origin: 'Schaffhausen · Switzerland', heritage: 'Minimalist Fumé Concept Watchmaking' },
  { id: 'MB&F', origin: 'Geneva · Switzerland', heritage: 'Kinetic Horological Machines' },
  { id: 'BULGARI', origin: 'Rome · Italy / Le Sentier', heritage: 'Record-Breaking Ultra-Thin Architecture' },
  { id: 'BLANCPAIN', origin: 'Le Brassus · Switzerland', heritage: '1953 Modern Diver Pioneers' },
  { id: 'DOXA', origin: 'Biel · Switzerland', heritage: 'High-Visibility Professional Saturation Divers' },
  { id: 'GIRARD-PERREGAUX', origin: 'La Chaux-de-Fonds · Switzerland', heritage: '1975 Integrated Octagonal Sport' },
  { id: 'PIAGET', origin: 'La Côte-aux-Fées · Switzerland', heritage: 'Ultra-Thin Gold Sculptural Horology' },
  { id: 'LONGINES', origin: 'Saint-Imier · Switzerland', heritage: 'Winged Hourglass Dual-Time Pioneers' },
  { id: 'HAMILTON', origin: 'Lancaster PA / Biel', heritage: 'Field & Cinema Mechanical Icons' },
  { id: 'NOMOS GLASHÜTTE', origin: 'Glashütte · Germany', heritage: 'Bauhaus Precision & Ultra-Thin Calibers' },
  { id: 'CASIO', origin: 'Tokyo · Japan', heritage: 'Shock-Resistant Digital & Ana-Digi Legends' },
  { id: 'AVI-8', origin: 'London · United Kingdom', heritage: 'Aviation Instrument Tributes' },
];

export interface WatchHotspot {
  id: string;
  label: string;
  title: string;
  detail: string;
  camPos: [number, number, number];
  camTarget: [number, number, number];
}

export type LumeStyleId = 'bgw9' | 'c3' | 'dual-dive';

export interface LumePalette {
  style: LumeStyleId;
  primaryLitHex: number;
  primaryEmissiveHex: number;
  secondaryLitHex: number;
  secondaryEmissiveHex: number;
  arCrystalTintHex: number;
}

export interface AtelierTourStep {
  id: string;
  chapter: string;
  title: string;
  detail: string;
  cameraPreset: CameraPresetId;
  camPos?: [number, number, number];
  camTarget?: [number, number, number];
  action?:
    | 'reset-hero'
    | 'chrono-demo'
    | 'dive-bezel'
    | 'navitimer-bezel'
    | 'reverso-flip'
    | 'caliber-flip'
    | 'nocturne-lume'
    | 'explode-layers';
}

export interface WatchSpec {
  id: WatchModelId;
  category: WatchCategoryId;
  brand: WatchBrand;
  name: string;
  shortName: string;
  collection: string;
  reference: string;
  yearIntroduced: string;
  tagline: string;
  description: string;
  caseShape?:
    | 'round'
    | 'octagonal'
    | 'compact-octagon'
    | 'cushion'
    | 'square'
    | 'rectangular'
    | 'tonneau'
    | 'crash';
  caseDiameterMm: number;
  caseThicknessMm: number;
  lugToLugMm?: number;
  caliber: string;
  frequency: string;
  powerReserve: string;
  waterResistance: string;
  bezelType:
    | 'dive-cerachrom'
    | 'yacht-cerachrom'
    | 'tachymeter'
    | 'fluted'
    | 'gmt-cerachrom'
    | 'steel-24h'
    | 'smooth'
    | 'overseas'
    | 'seamaster'
    | 'navitimer'
    | 'royal-oak'
    | 'nautilus'
    | 'santos'
    | 'reverso'
    | 'tonneau';
  braceletType: 'oyster' | 'jubilee' | 'president' | 'royal-oak' | 'nautilus' | 'santos' | 'overseas';
  handStyle?:
    | 'classic'
    | 'snowflake'
    | 'skeleton-sword'
    | 'breguet-pomme'
    | 'pilot-sword'
    | 'cathedral'
    | 'syringe'
    | 'dauphine'
    | 'worldtime-ring'
    | 'octo-skeleton'
    | 'leaf';
  hasCyclops: boolean;
  hasDateWindow?: boolean;
  hasDayWindow?: boolean;
  hasCrownGuards?: boolean;
  hasCrownBridge?: boolean;
  hasHeliumValve?: boolean;
  hasCoinEdge?: boolean;
  hasConicalCrown?: boolean;
  leftCrown?: boolean;
  highDomeSapphire?: boolean;
  highBeatHz?: number;
  hasSmallSeconds?: 6 | 7.5 | 9;
  hasChronoPushers: boolean;
  hasChronoSubdials?: 2 | 3;
  hasGmtHand: boolean;
  hasSkyDwellerDisc?: boolean;
  hasLightningSecond?: boolean;
  greenSapphire?: boolean;
  supportsPatina?: boolean;
  hasTourbillon?: boolean;
  hasMoonphase?: boolean;
  hasPowerReserveHand?: boolean;
  isSpringDrive?: boolean;
  hasReversoFlip?: boolean;
  hasBigDate?: boolean;
  isDigitalDisplay?: boolean;
  isJumpingDigital?: boolean;
  hasFloatingBalance?: boolean;
  hasWorldTimeRing?: boolean;
  gmtHandColorHex?: number;
  defaultAlloy: Exclude<AlloyId, 'default'>;
  defaultDial: DialId;
  defaultBezel: BezelId;
  defaultBelt?: BeltId;
  bezelPrimaryHex: string;
  bezelSecondaryHex?: string;
  image: StaticImageData;
}

export const WATCH_CATEGORIES: { id: WatchCategoryId; label: string; shortLabel: string }[] = [
  { id: 'dive-sport', label: 'Dive & Sport', shortLabel: 'Dive' },
  { id: 'chronograph', label: 'Chronographs', shortLabel: 'Chrono' },
  { id: 'gmt-travel', label: 'GMT & Travel', shortLabel: 'GMT' },
  { id: 'dress-classic', label: 'Dress & Heritage', shortLabel: 'Dress' },
  { id: 'shaped-icons', label: 'Shaped Icons', shortLabel: 'Shaped' },
  { id: 'independent', label: 'Independent & Haute', shortLabel: 'Indep.' },
];

export const WATCH_MODELS: WatchSpec[] = [
  {
    id: 'submariner',
    category: 'dive-sport',
    brand: 'ROLEX',
    name: 'Submariner Date',
    shortName: 'Submariner',
    collection: 'Oyster Perpetual',
    reference: '126610LV',
    yearIntroduced: '1953',
    tagline: 'The benchmark among divers’ watches.',
    description:
      'Engineered with a unidirectional 60-minute Cerachrom bezel in emerald ceramic, Chromalight luminescent markers, Triplock waterproofness, and the self-winding Caliber 3235.',
    caseDiameterMm: 41,
    caseThicknessMm: 12.5,
    caliber: 'Caliber 3235',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '70 hours',
    waterResistance: '300 m / 1,000 ft',
    bezelType: 'dive-cerachrom',
    braceletType: 'oyster',
    hasCyclops: true,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'obsidian',
    defaultBezel: 'emerald',
    bezelPrimaryHex: '#005A34',
    image: submarinerImg,
  },
  {
    id: 'daytona',
    category: 'chronograph',
    brand: 'ROLEX',
    name: 'Cosmograph Daytona',
    shortName: 'Daytona',
    collection: 'Oyster Perpetual',
    reference: '126503',
    yearIntroduced: '1963',
    tagline: 'Born to measure endurance at speed.',
    description:
      'Equipped with a high-contrast tachymetric bezel calibrated to 400 units per hour, three recessed chronograph counters, screw-down pushers, and the column-wheel Caliber 4131.',
    caseDiameterMm: 40,
    caseThicknessMm: 11.9,
    caliber: 'Caliber 4131',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '72 hours',
    waterResistance: '100 m / 330 ft',
    bezelType: 'tachymeter',
    braceletType: 'oyster',
    hasCyclops: false,
    hasChronoPushers: true,
    hasChronoSubdials: 3,
    hasGmtHand: false,
    defaultAlloy: 'rolesor',
    defaultDial: 'champagne',
    defaultBezel: 'obsidian',
    bezelPrimaryHex: '#121516',
    image: daytonaImg,
  },
  {
    id: 'datejust',
    category: 'dress-classic',
    brand: 'ROLEX',
    name: 'Datejust 36',
    shortName: 'Datejust 36',
    collection: 'Oyster Perpetual',
    reference: '126234',
    yearIntroduced: '1945',
    tagline: 'The archetype of the classic wristwatch.',
    description:
      'Defined by its 72-facet 18ct gold fluted bezel, supple five-piece link Jubilee bracelet, radial sunburst dial, and iconic Cyclops date magnification.',
    caseDiameterMm: 36,
    caseThicknessMm: 11.5,
    caliber: 'Caliber 3235',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '70 hours',
    waterResistance: '100 m / 330 ft',
    bezelType: 'fluted',
    braceletType: 'jubilee',
    hasCyclops: true,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'royal-blue',
    defaultBezel: 'obsidian',
    bezelPrimaryHex: '#E8ECEF',
    image: datejustImg,
  },
  {
    id: 'gmt',
    category: 'gmt-travel',
    brand: 'ROLEX',
    name: 'GMT-Master II',
    shortName: 'GMT-Master II',
    collection: 'Oyster Perpetual',
    reference: '126710BLRO',
    yearIntroduced: '1955',
    tagline: 'Mastery across two time zones simultaneously.',
    description:
      'Features a bidirectional 24-hour graduated Cerachrom insert in crimson and deep blue alongside an independent jumping local-hour hand and 24-hour GMT arrow.',
    caseDiameterMm: 40,
    caseThicknessMm: 12.0,
    caliber: 'Caliber 3285',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '70 hours',
    waterResistance: '100 m / 330 ft',
    bezelType: 'gmt-cerachrom',
    braceletType: 'jubilee',
    hasCyclops: true,
    hasChronoPushers: false,
    hasGmtHand: true,
    defaultAlloy: 'oystersteel',
    defaultDial: 'obsidian',
    defaultBezel: 'pepsi',
    bezelPrimaryHex: '#173468',
    bezelSecondaryHex: '#7A1624',
    image: gmtImg,
  },
  {
    id: 'daydate',
    category: 'dress-classic',
    brand: 'ROLEX',
    name: 'Day-Date 40',
    shortName: 'Day-Date 40',
    collection: 'Oyster Perpetual',
    reference: '228238',
    yearIntroduced: '1956',
    tagline: 'The ultimate watch of prestige.',
    description:
      'Crafted exclusively in precious metal with a 12 o’clock day-of-the-week arc, 72-facet fluted bezel, Roman numerals, and the supple three-piece President bracelet.',
    caseDiameterMm: 40,
    caseThicknessMm: 12.0,
    caliber: 'Caliber 3255',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '70 hours',
    waterResistance: '100 m / 330 ft',
    bezelType: 'fluted',
    braceletType: 'president',
    hasCyclops: true,
    hasDayWindow: true,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'yellow-gold',
    defaultDial: 'champagne',
    defaultBezel: 'obsidian',
    bezelPrimaryHex: '#DFB95B',
    image: datejustImg,
  },
  {
    id: 'explorer2',
    category: 'gmt-travel',
    brand: 'ROLEX',
    name: 'Explorer II',
    shortName: 'Explorer II',
    collection: 'Oyster Perpetual',
    reference: '226570',
    yearIntroduced: '1971',
    tagline: 'Built for polar frontiers and caverns.',
    description:
      'Featuring a fixed 24-hour graduated brushed Oystersteel bezel, stark Polar White lacquer dial, black-rimmed Chromalight markers, and signature orange 24-hour arrow hand.',
    caseDiameterMm: 42,
    caseThicknessMm: 12.5,
    caliber: 'Caliber 3285',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '70 hours',
    waterResistance: '100 m / 330 ft',
    bezelType: 'steel-24h',
    braceletType: 'oyster',
    hasCyclops: true,
    hasChronoPushers: false,
    hasGmtHand: true,
    gmtHandColorHex: 0xea580c,
    defaultAlloy: 'oystersteel',
    defaultDial: 'panda',
    defaultBezel: 'obsidian',
    bezelPrimaryHex: '#B6BCC2',
    image: gmtImg,
  },
  {
    id: 'milgauss',
    category: 'dress-classic',
    brand: 'ROLEX',
    name: 'Milgauss',
    shortName: 'Milgauss',
    collection: 'Oyster Perpetual',
    reference: '116400GV',
    yearIntroduced: '1956',
    tagline: 'Shielded against 1,000-gauss magnetic fields.',
    description:
      'Distinguished by its smooth domed steel bezel, green-tinted Glace Verte sapphire crystal, Z-Blue sunburst dial, and vibrant orange lightning-bolt seconds hand.',
    caseDiameterMm: 40,
    caseThicknessMm: 12.8,
    caliber: 'Caliber 3131',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '48 hours',
    waterResistance: '100 m / 330 ft',
    bezelType: 'smooth',
    braceletType: 'oyster',
    hasCyclops: false,
    hasChronoPushers: false,
    hasGmtHand: false,
    hasLightningSecond: true,
    greenSapphire: true,
    defaultAlloy: 'oystersteel',
    defaultDial: 'royal-blue',
    defaultBezel: 'obsidian',
    bezelPrimaryHex: '#D6DBDF',
    image: datejustImg,
  },
  {
    id: 'skydweller',
    category: 'gmt-travel',
    brand: 'ROLEX',
    name: 'Sky-Dweller',
    shortName: 'Sky-Dweller',
    collection: 'Oyster Perpetual',
    reference: '336934',
    yearIntroduced: '2012',
    tagline: 'Dual time zones and Saros annual calendar.',
    description:
      'Uniting an off-center 24-hour rotating GMT disc, twelve outer month indicator apertures, and the fluted Ring Command bezel in a high-complication traveler timepiece.',
    caseDiameterMm: 42,
    caseThicknessMm: 13.8,
    caliber: 'Caliber 9002',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '72 hours',
    waterResistance: '100 m / 330 ft',
    bezelType: 'fluted',
    braceletType: 'jubilee',
    hasCyclops: true,
    hasCrownGuards: false,
    hasChronoPushers: false,
    hasGmtHand: false,
    hasSkyDwellerDisc: true,
    defaultAlloy: 'oystersteel',
    defaultDial: 'royal-blue',
    defaultBezel: 'obsidian',
    bezelPrimaryHex: '#D6DBDF',
    image: datejustImg,
  },
  {
    id: 'yachtmaster',
    category: 'dive-sport',
    brand: 'ROLEX',
    name: 'Yacht-Master 42',
    shortName: 'Yacht-Master',
    collection: 'Oyster Perpetual',
    reference: '226659',
    yearIntroduced: '2019',
    tagline: 'The nautical watch of open-ocean regattas.',
    description:
      'Equipped with a bidirectional matte black Cerachrom bezel featuring raised polished numerals, a high-legibility Chromalight dial with red regatta script, and the Oysterflex bracelet.',
    caseDiameterMm: 42,
    caseThicknessMm: 11.8,
    caliber: 'Caliber 3235',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '70 hours',
    waterResistance: '100 m / 330 ft',
    bezelType: 'yacht-cerachrom',
    braceletType: 'oyster',
    hasCyclops: true,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'obsidian',
    defaultBezel: 'obsidian',
    defaultBelt: 'oysterflex',
    bezelPrimaryHex: '#181B1E',
    image: submarinerImg,
  },
  {
    id: 'avi8-spitfire',
    category: 'chronograph',
    brand: 'AVI-8',
    name: 'Spitfire Lock Chronograph',
    shortName: 'Spitfire Lock',
    collection: 'Hawker Spitfire Lock · Bronze Green',
    reference: 'AV-4089-02',
    yearIntroduced: '1940 Tribute',
    tagline: 'Antique bronze cockpit bi-compax chronograph.',
    description:
      'Dedicated to WWII RAF ace Eric "Sawn Off" Lock. Features a 42 mm antique bronze case with piston pump pushers, multi-layered khaki-green cockpit dial with bi-compax 9/3 subdials, recessed 6 o’clock tunnel date, and stitched brown leather.',
    caseDiameterMm: 42,
    caseThicknessMm: 12.0,
    caliber: 'Meca-Quartz VK64',
    frequency: '32,768 Hz · 1/5s Chrono',
    powerReserve: '3-Year Cell',
    waterResistance: '50 m / 5 ATM',
    bezelType: 'smooth',
    braceletType: 'oyster',
    hasCyclops: false,
    hasDateWindow: true,
    hasChronoPushers: true,
    hasChronoSubdials: 2,
    hasGmtHand: false,
    supportsPatina: true,
    defaultAlloy: 'oystersteel',
    defaultDial: 'emerald',
    defaultBezel: 'obsidian',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#8E643B',
    image: gmtImg,
  },
  {
    id: 'omega-speedmaster',
    category: 'chronograph',
    brand: 'OMEGA',
    name: 'Speedmaster Moonwatch',
    shortName: 'Speedmaster',
    collection: 'Professional Co-Axial',
    reference: '310.30.42.50.01.001',
    yearIntroduced: '1957',
    tagline: 'The first watch worn on the Moon.',
    description:
      'Defined by its asymmetrical twisted lyre lugs, black matte step dial with three recessed sub-registers, anodized tachymeter bezel with Dot-Over-90 graduation, and Master Chronometer Caliber 3861.',
    caseDiameterMm: 42,
    caseThicknessMm: 13.2,
    caliber: 'Caliber 3861',
    frequency: '21,600 vph (3 Hz)',
    powerReserve: '50 hours',
    waterResistance: '50 m / 167 ft',
    bezelType: 'tachymeter',
    braceletType: 'oyster',
    hasCyclops: false,
    hasChronoPushers: true,
    hasChronoSubdials: 3,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'obsidian',
    defaultBezel: 'obsidian',
    defaultBelt: 'bracelet',
    bezelPrimaryHex: '#14171A',
    image: daytonaImg,
  },
  {
    id: 'ap-royal-oak',
    category: 'shaped-icons',
    brand: 'AUDEMARS PIGUET',
    name: 'Royal Oak "Jumbo"',
    shortName: 'Royal Oak',
    collection: 'Extra-Thin · Petite Tapisserie',
    reference: '16202ST',
    yearIntroduced: '1972',
    tagline: 'Gérald Genta’s octagonal steel icon.',
    description:
      'Signature satin-brushed octagonal bezel anchored by eight hexagonal white-gold screws, integrated tapering steel bracelet, and Bleu Nuit, Nuage 50 Petite Tapisserie waffle dial.',
    caseShape: 'octagonal',
    caseDiameterMm: 39,
    caseThicknessMm: 8.1,
    caliber: 'Caliber 7121',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '55 hours',
    waterResistance: '50 m / 165 ft',
    bezelType: 'royal-oak',
    braceletType: 'royal-oak',
    hasCyclops: false,
    hasDateWindow: true,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'royal-blue',
    defaultBezel: 'obsidian',
    defaultBelt: 'bracelet',
    bezelPrimaryHex: '#D2D7DC',
    image: datejustImg,
  },
  {
    id: 'pp-nautilus',
    category: 'dive-sport',
    brand: 'PATEK PHILIPPE',
    name: 'Nautilus 5711',
    shortName: 'Nautilus',
    collection: 'Geneva · Horizontal Relief',
    reference: '5711/1A-010',
    yearIntroduced: '1976',
    tagline: 'Porthole cushion geometry in brushed steel.',
    description:
      'Crafted around a softly rounded octagonal porthole bezel flanked by lateral hinge ears, horizontally embossed gradient blue-black dial, and integrated center-polished bracelet.',
    caseShape: 'cushion',
    caseDiameterMm: 40,
    caseThicknessMm: 8.3,
    caliber: 'Caliber 26-330 S C',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '45 hours',
    waterResistance: '120 m / 390 ft',
    bezelType: 'nautilus',
    braceletType: 'nautilus',
    hasCyclops: false,
    hasDateWindow: true,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'royal-blue',
    defaultBezel: 'obsidian',
    defaultBelt: 'bracelet',
    bezelPrimaryHex: '#CFD5DA',
    image: datejustImg,
  },
  {
    id: 'cartier-santos',
    category: 'shaped-icons',
    brand: 'CARTIER',
    name: 'Santos de Cartier',
    shortName: 'Santos',
    collection: 'Medium · SmartLink',
    reference: 'WSSA0029',
    yearIntroduced: '1904',
    tagline: 'Pioneering square aviation architecture.',
    description:
      'Featuring a curved ergonomic square case, eight-screw bezel extending cleanly into integrated lugs, silvered opaline dial with slanted Roman numerals, heat-blued sword hands, and sapphire cabochon crown.',
    caseShape: 'square',
    caseDiameterMm: 35.1,
    caseThicknessMm: 8.8,
    caliber: 'Caliber 1847 MC',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '42 hours',
    waterResistance: '100 m / 330 ft',
    bezelType: 'santos',
    braceletType: 'santos',
    hasCyclops: false,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'panda',
    defaultBezel: 'obsidian',
    defaultBelt: 'bracelet',
    bezelPrimaryHex: '#DCE0E4',
    image: datejustImg,
  },
  {
    id: 'jlc-reverso',
    category: 'shaped-icons',
    brand: 'JAEGER-LECOULTRE',
    name: 'Reverso Tribute Duoface',
    shortName: 'Reverso',
    collection: 'Art Deco · Reversible Cradle',
    reference: 'Q3988482',
    yearIntroduced: '1931',
    tagline: 'Swiveling Art Deco dual-face architecture.',
    description:
      'Born on polo fields in 1931, featuring a stepped rectangular gadroon case that slides and rotates 180° inside its carrier cradle to reveal a second-time-zone reverse dial.',
    caseShape: 'rectangular',
    caseDiameterMm: 28.3,
    caseThicknessMm: 10.3,
    lugToLugMm: 47.0,
    caliber: 'Caliber 854A/2',
    frequency: '21,600 vph (3 Hz)',
    powerReserve: '42 hours',
    waterResistance: '30 m / 3 bar',
    bezelType: 'reverso',
    braceletType: 'santos',
    hasCyclops: false,
    hasChronoPushers: false,
    hasGmtHand: false,
    hasReversoFlip: true,
    handStyle: 'dauphine',
    defaultAlloy: 'oystersteel',
    defaultDial: 'royal-blue',
    defaultBezel: 'obsidian',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#D8DCE0',
    image: datejustImg,
  },
  {
    id: 'gs-snowflake',
    category: 'dress-classic',
    brand: 'GRAND SEIKO',
    name: 'Heritage "Snowflake"',
    shortName: 'Snowflake',
    collection: 'Spring Drive · Zaratsu',
    reference: 'SBGA211',
    yearIntroduced: '2005',
    tagline: 'Silent Spring Drive glide over winter frost.',
    description:
      'Crafted with distortion-free Zaratsu mirror chamfers, a wind-swept Shinshu snow-textured dial, heat-blued continuous-glide seconds hand, and 72-hour power reserve indicator.',
    caseShape: 'round',
    caseDiameterMm: 41,
    caseThicknessMm: 12.5,
    lugToLugMm: 49.0,
    caliber: 'Caliber 9R65',
    frequency: '32,768 Hz · Glide',
    powerReserve: '72 hours',
    waterResistance: '100 m / 10 bar',
    bezelType: 'smooth',
    braceletType: 'oyster',
    hasCyclops: false,
    hasDateWindow: true,
    hasChronoPushers: false,
    hasGmtHand: false,
    hasPowerReserveHand: true,
    hasCrownGuards: false,
    handStyle: 'dauphine',
    isSpringDrive: true,
    defaultAlloy: 'oystersteel',
    defaultDial: 'snowflake',
    defaultBezel: 'obsidian',
    defaultBelt: 'bracelet',
    bezelPrimaryHex: '#D7DCE0',
    image: datejustImg,
  },
  {
    id: 'lange-1',
    category: 'dress-classic',
    brand: 'A. LANGE & SÖHNE',
    name: 'Lange 1 Moonphase',
    shortName: 'Lange 1',
    collection: 'Saxon Haute Horlogerie',
    reference: '192.032',
    yearIntroduced: '1994',
    tagline: 'Asymmetric golden ratio & Outsize Big Date.',
    description:
      'Featuring an off-center silvered time circle, iconic double-window Outsize Date, AUF/AB power-reserve arc, astronomical moonphase disc, and hand-engraved German silver movement.',
    caseShape: 'round',
    caseDiameterMm: 38.5,
    caseThicknessMm: 10.2,
    lugToLugMm: 46.2,
    caliber: 'Caliber L121.3',
    frequency: '21,600 vph (3 Hz)',
    powerReserve: '72 hours',
    waterResistance: '30 m / 3 bar',
    bezelType: 'smooth',
    braceletType: 'president',
    hasCyclops: false,
    hasChronoPushers: false,
    hasGmtHand: false,
    hasMoonphase: true,
    hasPowerReserveHand: true,
    hasBigDate: true,
    handStyle: 'dauphine',
    defaultAlloy: 'everose',
    defaultDial: 'panda',
    defaultBezel: 'obsidian',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#D79880',
    image: datejustImg,
  },
  {
    id: 'rm-tonneau',
    category: 'chronograph',
    brand: 'RICHARD MILLE',
    name: 'RM 11-03 Tonneau',
    shortName: 'RM 11-03',
    collection: 'Racing Machine · Tourbillon',
    reference: 'RM 11-03 Ti',
    yearIntroduced: '2016',
    tagline: 'Skeletonized tonneau titanium & spline architecture.',
    description:
      'Tripartite curved tonneau chassis anchored by 12 titanium spline screws, openworked movement bridges, exposed 6 o’clock tourbillon cage, and vented elastomer strap.',
    caseShape: 'tonneau',
    caseDiameterMm: 44.5,
    caseThicknessMm: 16.1,
    lugToLugMm: 49.9,
    caliber: 'Caliber RMAC3',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '55 hours',
    waterResistance: '50 m / 5 bar',
    bezelType: 'tonneau',
    braceletType: 'oyster',
    hasCyclops: false,
    hasChronoPushers: true,
    hasChronoSubdials: 3,
    hasGmtHand: false,
    hasTourbillon: true,
    defaultAlloy: 'oystersteel',
    defaultDial: 'obsidian',
    defaultBezel: 'obsidian',
    defaultBelt: 'oysterflex',
    bezelPrimaryHex: '#25292E',
    image: daytonaImg,
  },
  {
    id: 'vc-overseas',
    category: 'dive-sport',
    brand: 'VACHERON CONSTANTIN',
    name: 'Overseas Self-Winding',
    shortName: 'Overseas',
    collection: '4520V · Geneva Seal',
    reference: '4520V/210A-B128',
    yearIntroduced: '1996',
    tagline: 'Six-notched Maltese Cross sport elegance.',
    description:
      'Completing the Swiss Holy Trinity with a 6-notch Maltese-cross sculpted steel bezel, deep translucent lacquered blue sunburst dial, and Geneva Seal Caliber 5100.',
    caseShape: 'round',
    caseDiameterMm: 41,
    caseThicknessMm: 10.7,
    lugToLugMm: 48.2,
    caliber: 'Caliber 5100',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '60 hours',
    waterResistance: '150 m / 500 ft',
    bezelType: 'overseas',
    braceletType: 'overseas',
    hasCyclops: false,
    hasDateWindow: true,
    hasCrownGuards: false,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'default',
    defaultBelt: 'bracelet',
    bezelPrimaryHex: '#CFD5DA',
    image: datejustImg,
  },
  {
    id: 'omega-seamaster',
    category: 'dive-sport',
    brand: 'OMEGA',
    name: 'Seamaster Diver 300M',
    shortName: 'Seamaster 300M',
    collection: 'Co-Axial Master Chronometer',
    reference: '210.30.42.20.03.001',
    yearIntroduced: '1993',
    tagline: 'Laser-wave ceramic diver with helium valve.',
    description:
      'Built with a 12-lobe scalloped ceramic diving bezel, conical 10 o’clock helium escape valve, laser-engraved ZrO2 wave dial, skeleton sword hands, and Master Chronometer Caliber 8800.',
    caseShape: 'round',
    caseDiameterMm: 42,
    caseThicknessMm: 13.6,
    lugToLugMm: 49.9,
    caliber: 'Caliber 8800',
    frequency: '25,200 vph (3.5 Hz)',
    powerReserve: '55 hours',
    waterResistance: '300 m / 1,000 ft',
    bezelType: 'seamaster',
    braceletType: 'oyster',
    handStyle: 'skeleton-sword',
    hasCyclops: false,
    hasDateWindow: true,
    hasHeliumValve: true,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'default',
    defaultBelt: 'bracelet',
    bezelPrimaryHex: '#12315E',
    image: submarinerImg,
  },
  {
    id: 'tudor-bb58',
    category: 'dive-sport',
    brand: 'TUDOR',
    name: 'Black Bay 58',
    shortName: 'Black Bay 58',
    collection: 'Manufacture · Heritage 39',
    reference: 'M79030N-0001',
    yearIntroduced: '1958',
    tagline: 'Crown-guardless vintage diver & Snowflake hands.',
    description:
      'Channeling 1958 proportions in a slim 39 mm crown-guardless case topped with a domed sapphire crystal, crimson-triangle gilt dive bezel, and Tudor’s signature Snowflake hands.',
    caseShape: 'round',
    caseDiameterMm: 39,
    caseThicknessMm: 11.9,
    lugToLugMm: 47.7,
    caliber: 'Caliber MT5402',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '70 hours',
    waterResistance: '200 m / 660 ft',
    bezelType: 'dive-cerachrom',
    braceletType: 'oyster',
    handStyle: 'snowflake',
    hasCyclops: false,
    hasCrownGuards: false,
    highDomeSapphire: true,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'default',
    defaultBelt: 'bracelet',
    bezelPrimaryHex: '#141618',
    image: submarinerImg,
  },
  {
    id: 'panerai-luminor',
    category: 'shaped-icons',
    brand: 'PANERAI',
    name: 'Luminor Marina',
    shortName: 'Luminor',
    collection: '1950 Cushion · Sandwich Dial',
    reference: 'PAM01312',
    yearIntroduced: '1950',
    tagline: 'Crescent locking crown-guard & sandwich lume.',
    description:
      'Iconic 44 mm cushion architecture anchored by Panerai’s patented 3 o’clock crescent crown-locking lever bridge, dual-layer luminous sandwich dial, and 9 o’clock small seconds.',
    caseShape: 'cushion',
    caseDiameterMm: 44,
    caseThicknessMm: 15.6,
    lugToLugMm: 53.2,
    caliber: 'Caliber P.9010',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '72 hours',
    waterResistance: '300 m / 30 bar',
    bezelType: 'smooth',
    braceletType: 'oyster',
    hasCyclops: false,
    hasDateWindow: true,
    hasCrownGuards: false,
    hasCrownBridge: true,
    hasSmallSeconds: 9,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#D5DADF',
    image: gmtImg,
  },
  {
    id: 'tag-monaco',
    category: 'chronograph',
    brand: 'TAG HEUER',
    name: 'Monaco Calibre 11',
    shortName: 'Monaco',
    collection: 'Square Racing · Left Crown',
    reference: 'CAW211P.FC6356',
    yearIntroduced: '1969',
    tagline: 'World’s first square automatic racing chronograph.',
    description:
      'Distinguished by its architectural square steel case, authentic 9 o’clock left-hand winding crown, petrol-blue matte dial with twin silvered square subdials, and crimson racing accents.',
    caseShape: 'square',
    caseDiameterMm: 39,
    caseThicknessMm: 14.3,
    lugToLugMm: 47.4,
    caliber: 'Caliber 11',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '40 hours',
    waterResistance: '100 m / 10 bar',
    bezelType: 'santos',
    braceletType: 'santos',
    hasCyclops: false,
    hasDateWindow: true,
    hasCrownGuards: false,
    leftCrown: true,
    hasChronoPushers: true,
    hasChronoSubdials: 2,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#D6DBDF',
    image: daytonaImg,
  },
  {
    id: 'breitling-navitimer',
    category: 'chronograph',
    brand: 'BREITLING',
    name: 'Navitimer B01 Chronograph',
    shortName: 'Navitimer',
    collection: 'Aviation E6B Slide-Rule',
    reference: 'AB0138211B1P1',
    yearIntroduced: '1952',
    tagline: 'Circular flight-computer slide-rule & beaded bezel.',
    description:
      'The aviator’s wrist instrument with a bidirectional 72-bead perimeter bezel driving a logarithmic E6B slide-rule scale around reverse-panda tri-compax chronograph registers.',
    caseShape: 'round',
    caseDiameterMm: 43,
    caseThicknessMm: 13.6,
    lugToLugMm: 49.1,
    caliber: 'Caliber B01',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '70 hours',
    waterResistance: '30 m / 3 bar',
    bezelType: 'navitimer',
    braceletType: 'oyster',
    hasCyclops: false,
    hasDateWindow: true,
    hasCrownGuards: false,
    hasChronoPushers: true,
    hasChronoSubdials: 3,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'obsidian',
    defaultBezel: 'default',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#14171A',
    image: daytonaImg,
  },
  {
    id: 'zenith-el-primero',
    category: 'chronograph',
    brand: 'ZENITH',
    name: 'Chronomaster Original',
    shortName: 'El Primero',
    collection: '36,000 vph · Tri-Color Counters',
    reference: '03.3200.3600/69.M3200',
    yearIntroduced: '1969',
    tagline: 'High-beat 5 Hz column-wheel tri-color icon.',
    description:
      'Powered by the legendary 36,000 vph (5 Hz) El Primero movement ticking ten times per second across overlapping silver, slate, and midnight-blue counters in a 38 mm A386 silhouette.',
    caseShape: 'round',
    caseDiameterMm: 38,
    caseThicknessMm: 12.6,
    lugToLugMm: 46.0,
    caliber: 'El Primero 3600',
    frequency: '36,000 vph (5 Hz)',
    powerReserve: '60 hours',
    waterResistance: '50 m / 5 bar',
    bezelType: 'smooth',
    braceletType: 'oyster',
    hasCyclops: false,
    hasDateWindow: true,
    hasCrownGuards: false,
    highBeatHz: 5,
    hasChronoPushers: true,
    hasChronoSubdials: 3,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'panda',
    defaultBezel: 'obsidian',
    defaultBelt: 'bracelet',
    bezelPrimaryHex: '#D8DCE0',
    image: daytonaImg,
  },
  {
    id: 'iwc-big-pilot',
    category: 'gmt-travel',
    brand: 'IWC SCHAFFHAUSEN',
    name: 'Big Pilot’s Watch UTC',
    shortName: 'Big Pilot UTC',
    collection: 'Cockpit Instrument · 24h Ring',
    reference: 'IW327101',
    yearIntroduced: '1940',
    tagline: 'Conical onion crown & cockpit dual-zone clarity.',
    description:
      'Engineered for long-haul transcontinental navigation with an oversized conical fluted diamond crown, high-contrast cockpit Arabic numerals, 24-hour GMT hand, and power reserve display.',
    caseShape: 'round',
    caseDiameterMm: 43,
    caseThicknessMm: 14.1,
    lugToLugMm: 51.8,
    caliber: 'Caliber 82760',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '60 hours',
    waterResistance: '60 m / 6 bar',
    bezelType: 'smooth',
    braceletType: 'oyster',
    handStyle: 'pilot-sword',
    hasCyclops: false,
    hasDateWindow: true,
    hasCrownGuards: false,
    hasConicalCrown: true,
    hasPowerReserveHand: true,
    hasChronoPushers: false,
    hasGmtHand: true,
    gmtHandColorHex: 0xef4444,
    defaultAlloy: 'oystersteel',
    defaultDial: 'obsidian',
    defaultBezel: 'obsidian',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#D6DBDF',
    image: gmtImg,
  },
  {
    id: 'breguet-classique',
    category: 'dress-classic',
    brand: 'BREGUET',
    name: 'Classique 5177',
    shortName: 'Classique',
    collection: 'Clous de Paris Guilloché',
    reference: '5177BB/29/9V6',
    yearIntroduced: '1795',
    tagline: 'Coin-edge caseband, guilloché & pomme hands.',
    description:
      'An enduring expression of neoclassical horology uniting a finely fluted coin-edge caseband, engine-turned Clous de Paris guilloché dial, Breguet numerals, and heat-blued open-moon pomme hands.',
    caseShape: 'round',
    caseDiameterMm: 38,
    caseThicknessMm: 8.8,
    lugToLugMm: 45.5,
    caliber: 'Caliber 777Q',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '55 hours',
    waterResistance: '30 m / 3 bar',
    bezelType: 'smooth',
    braceletType: 'president',
    handStyle: 'breguet-pomme',
    hasCyclops: false,
    hasDateWindow: true,
    hasCrownGuards: false,
    hasCoinEdge: true,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#E0E4E8',
    image: datejustImg,
  },
  // --- PACK 1: INDEPENDENT & HAUTE HORLOGERIE ---
  {
    id: 'fpj-chronometre-bleu',
    category: 'independent',
    brand: 'F.P. JOURNE',
    name: 'Chronomètre Bleu',
    shortName: 'Chronomètre Bleu',
    collection: 'Souveraine · Tantalum',
    reference: 'CB-TAN-39',
    yearIntroduced: '2009',
    tagline: 'Blue-grey tantalum case & solid 18k rose-gold caliber.',
    description:
      'Milled from rare, dense blue-grey tantalum and paired with a seven-layer chrome-blue mirror dial, cream Journe numerals, 7:30 small seconds, and a solid 18k rose-gold Calibre 1304.',
    caseShape: 'round',
    caseDiameterMm: 39,
    caseThicknessMm: 8.6,
    lugToLugMm: 46.8,
    caliber: 'Calibre 1304 (18k Rose Gold)',
    frequency: '21,600 vph (3 Hz)',
    powerReserve: '56 hours',
    waterResistance: '30 m / 3 bar',
    bezelType: 'smooth',
    braceletType: 'president',
    handStyle: 'syringe',
    hasCyclops: false,
    hasDateWindow: false,
    hasCrownGuards: false,
    hasSmallSeconds: 7.5,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#6C798A',
    image: datejustImg,
  },
  {
    id: 'moser-streamliner',
    category: 'independent',
    brand: 'H. MOSER & CIE',
    name: 'Streamliner Centre Seconds',
    shortName: 'Streamliner',
    collection: 'Matrix Green Fumé',
    reference: '6200-1200',
    yearIntroduced: '2020',
    tagline: 'Zero-logo Matrix Green fumé dial in fluid cushion steel.',
    description:
      'Sculpted like a 1920s high-speed locomotive with a seamlessly integrated cushion case and dramatic sunburst Matrix Green fumé dial bearing a stealth transparent lacquer logo.',
    caseShape: 'cushion',
    caseDiameterMm: 40,
    caseThicknessMm: 11.8,
    lugToLugMm: 46.5,
    caliber: 'Calibre HMC 200',
    frequency: '21,600 vph (3 Hz)',
    powerReserve: '72 hours',
    waterResistance: '120 m / 12 bar',
    bezelType: 'nautilus',
    braceletType: 'nautilus',
    handStyle: 'leaf',
    hasCyclops: false,
    hasDateWindow: false,
    hasCrownGuards: false,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'bracelet',
    bezelPrimaryHex: '#C8CFD6',
    image: datejustImg,
  },
  {
    id: 'mbf-lm101',
    category: 'independent',
    brand: 'MB&F',
    name: 'Legacy Machine LM101',
    shortName: 'Legacy LM101',
    collection: 'Legacy Machine',
    reference: 'LM101-WG-FROST',
    yearIntroduced: '2014',
    tagline: 'Suspended dial-side flying balance wheel under bubble dome.',
    description:
      'A three-dimensional tribute to 19th-century pocket chronometry: a monumental 14mm golden balance wheel suspended from twin mirror-polished arches above floating white lacquer sub-dials.',
    caseShape: 'round',
    caseDiameterMm: 40,
    caseThicknessMm: 16.0,
    lugToLugMm: 47.4,
    caliber: 'MB&F × Kari Voutilainen LM101',
    frequency: '18,000 vph (2.5 Hz)',
    powerReserve: '45 hours',
    waterResistance: '30 m / 3 bar',
    bezelType: 'smooth',
    braceletType: 'president',
    handStyle: 'breguet-pomme',
    hasCyclops: false,
    hasDateWindow: false,
    hasCrownGuards: false,
    highDomeSapphire: true,
    hasFloatingBalance: true,
    hasPowerReserveHand: true,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#D5D9DE',
    image: datejustImg,
  },
  {
    id: 'bulgari-octo-finissimo',
    category: 'independent',
    brand: 'BULGARI',
    name: 'Octo Finissimo Automatic',
    shortName: 'Octo Finissimo',
    collection: 'Ultra-Thin Titanium',
    reference: '102713',
    yearIntroduced: '2017',
    tagline: '5.15mm world-record micro-rotor octagonal architecture.',
    description:
      '110 razor-sharp architectural facets machined in monochrome sandblasted Grade 5 titanium, housing a 2.23mm platinum micro-rotor caliber and off-center small seconds.',
    caseShape: 'octagonal',
    caseDiameterMm: 40,
    caseThicknessMm: 5.15,
    lugToLugMm: 46.0,
    caliber: 'Calibre BVL 138 Finissimo',
    frequency: '21,600 vph (3 Hz)',
    powerReserve: '60 hours',
    waterResistance: '30 m / 3 bar',
    bezelType: 'royal-oak',
    braceletType: 'royal-oak',
    handStyle: 'octo-skeleton',
    hasCyclops: false,
    hasDateWindow: false,
    hasCrownGuards: false,
    hasSmallSeconds: 7.5,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'bracelet',
    bezelPrimaryHex: '#9AA0A6',
    image: datejustImg,
  },
  // --- PACK 2: WORLDTIMERS, FIELD & EXPLORATION ---
  {
    id: 'pp-worldtime',
    category: 'gmt-travel',
    brand: 'PATEK PHILIPPE',
    name: 'World Time Ref. 5230',
    shortName: 'World Time 5230',
    collection: 'Complications · Cottier',
    reference: '5230G-014',
    yearIntroduced: '1937',
    tagline: '24 global cities & day/night ring with hand-guilloché center.',
    description:
      'Inheriting Louis Cottier’s 1937 universal time display, simultaneously tracking all 24 time zones across a concentric city disc, 24-hour sun/moon ring, and hand-guilloché charcoal dial center.',
    caseShape: 'round',
    caseDiameterMm: 38.5,
    caseThicknessMm: 10.2,
    lugToLugMm: 46.2,
    caliber: 'Caliber 240 HU Micro-Rotor',
    frequency: '21,600 vph (3 Hz)',
    powerReserve: '48 hours',
    waterResistance: '30 m / 3 bar',
    bezelType: 'smooth',
    braceletType: 'president',
    handStyle: 'worldtime-ring',
    hasCyclops: false,
    hasDateWindow: false,
    hasCrownGuards: false,
    hasWorldTimeRing: true,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#D8DCE0',
    image: gmtImg,
  },
  {
    id: 'longines-zulu-time',
    category: 'gmt-travel',
    brand: 'LONGINES',
    name: 'Spirit Zulu Time 39',
    shortName: 'Spirit Zulu 39',
    collection: 'Heritage Aviation GMT',
    reference: 'L3.802.4.53.6',
    yearIntroduced: '1925',
    tagline: 'True flyer GMT honoring the 1925 dual-time Zulu flag icon.',
    description:
      'Equipped with a bidirectional 24-hour ceramic bezel, gilt Arabic numerals, five applied chronometer stars, and an independent jumping local hour hand calibrated to COSC standards.',
    caseShape: 'round',
    caseDiameterMm: 39,
    caseThicknessMm: 13.5,
    lugToLugMm: 46.8,
    caliber: 'Calibre L844.4 Silicon',
    frequency: '25,200 vph (3.5 Hz)',
    powerReserve: '72 hours',
    waterResistance: '100 m / 10 bar',
    bezelType: 'gmt-cerachrom',
    braceletType: 'oyster',
    handStyle: 'pilot-sword',
    hasCyclops: false,
    hasDateWindow: true,
    hasCrownGuards: false,
    hasChronoPushers: false,
    hasGmtHand: true,
    gmtHandColorHex: 0xd9a74a,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'bracelet',
    bezelPrimaryHex: '#152E24',
    image: gmtImg,
  },
  {
    id: 'hamilton-murph',
    category: 'gmt-travel',
    brand: 'HAMILTON',
    name: 'Khaki Field Murph 38',
    shortName: 'Khaki Murph',
    collection: 'Khaki Field Mechanical',
    reference: 'H70405730',
    yearIntroduced: '2019',
    tagline: 'Cathedral hands & vintage radium field dial from cinema lore.',
    description:
      'Celebrated for its matte black instrument dial, vintage Super-LumiNova cathedral hands, crisp railroad minute track, and 80-hour Nivachron H-10 automatic movement.',
    caseShape: 'round',
    caseDiameterMm: 38,
    caseThicknessMm: 11.1,
    lugToLugMm: 44.7,
    caliber: 'Caliber H-10 (80h)',
    frequency: '21,600 vph (3 Hz)',
    powerReserve: '80 hours',
    waterResistance: '100 m / 10 bar',
    bezelType: 'smooth',
    braceletType: 'oyster',
    handStyle: 'cathedral',
    hasCyclops: false,
    hasDateWindow: false,
    hasCrownGuards: false,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#CFD4D9',
    image: gmtImg,
  },
  {
    id: 'nomos-tangente',
    category: 'dress-classic',
    brand: 'NOMOS GLASHÜTTE',
    name: 'Tangente Neomatik 39',
    shortName: 'Tangente 39',
    collection: 'Bauhaus Glashütte',
    reference: 'Ref. 140',
    yearIntroduced: '1992',
    tagline: 'Pure Bauhaus typography & tempered cornflower-blue hands.',
    description:
      'Defined by angular downturned lugs, a razor-thin bezel framing a galvanized white silver-plated dial, alternating slender Arabic numerals, recessed 6 o’clock sub-seconds, and ultra-thin DUW 3001.',
    caseShape: 'round',
    caseDiameterMm: 38.5,
    caseThicknessMm: 6.9,
    lugToLugMm: 47.6,
    caliber: 'Caliber DUW 3001 Neomatik',
    frequency: '21,600 vph (3 Hz)',
    powerReserve: '43 hours',
    waterResistance: '30 m / 3 bar',
    bezelType: 'smooth',
    braceletType: 'president',
    handStyle: 'syringe',
    hasCyclops: false,
    hasDateWindow: false,
    hasCrownGuards: false,
    hasSmallSeconds: 6,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#DFE3E8',
    image: datejustImg,
  },
  // --- PACK 3: CULT DIVE & ASYMMETRIC TOOL ICONS ---
  {
    id: 'blancpain-fifty-fathoms',
    category: 'dive-sport',
    brand: 'BLANCPAIN',
    name: 'Fifty Fathoms Automatique',
    shortName: 'Fifty Fathoms',
    collection: '1953 Modern Diver Origin',
    reference: '5015-1130-52A',
    yearIntroduced: '1953',
    tagline: 'The 1953 archetypal diver with domed luminous sapphire bezel.',
    description:
      'Born for French combat divers in 1953, featuring a domed scratch-proof sapphire dive bezel over luminous markers, sunburst black dial, 4:30 date aperture, and triple-barrel 120-hour Calibre 1315.',
    caseShape: 'round',
    caseDiameterMm: 45,
    caseThicknessMm: 15.4,
    lugToLugMm: 50.6,
    caliber: 'Calibre 1315 (3 Barrels)',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '120 hours',
    waterResistance: '300 m / 30 bar',
    bezelType: 'dive-cerachrom',
    braceletType: 'oyster',
    handStyle: 'pilot-sword',
    hasCyclops: false,
    hasDateWindow: true,
    hasCrownGuards: false,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'oysterflex',
    bezelPrimaryHex: '#0F1216',
    image: submarinerImg,
  },
  {
    id: 'doxa-sub300',
    category: 'dive-sport',
    brand: 'DOXA',
    name: 'SUB 300 "Professional"',
    shortName: 'DOXA SUB 300',
    collection: 'Orange Saturation Icon',
    reference: '821.10.351.10',
    yearIntroduced: '1967',
    tagline: 'High-visibility orange dial & dual no-decompression bezel.',
    description:
      'Tested by Jacques Cousteau’s teams in 1967: a hooded cushion steel case, vibrant orange high-contrast dial engineered for murky depths, and dual-scale US Navy no-deco steel bezel.',
    caseShape: 'cushion',
    caseDiameterMm: 42.5,
    caseThicknessMm: 13.4,
    lugToLugMm: 45.0,
    caliber: 'COSC Chronometer Automatic',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '38 hours',
    waterResistance: '300 m / 30 bar',
    bezelType: 'dive-cerachrom',
    braceletType: 'jubilee',
    handStyle: 'classic',
    hasCyclops: false,
    hasDateWindow: true,
    hasCrownGuards: false,
    highDomeSapphire: true,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'bracelet',
    bezelPrimaryHex: '#C9CFD5',
    image: submarinerImg,
  },
  {
    id: 'cartier-tank-louis',
    category: 'shaped-icons',
    brand: 'CARTIER',
    name: 'Tank Louis Cartier',
    shortName: 'Tank Louis',
    collection: '1917 Paris Rectangular Icon',
    reference: 'WGTA0011',
    yearIntroduced: '1917',
    tagline: 'Stepped gold brancards, chemin-de-fer track & blued swords.',
    description:
      'Designed by Louis Cartier in 1917 with seamlessly integrated parallel brancards, silvered grained dial, radial Roman numerals, sapphire cabochon crown, and heat-blued sword hands.',
    caseShape: 'rectangular',
    caseDiameterMm: 33.7,
    caseThicknessMm: 6.6,
    lugToLugMm: 33.7,
    caliber: 'Caliber 1917 MC Manual',
    frequency: '21,600 vph (3 Hz)',
    powerReserve: '38 hours',
    waterResistance: '30 m / 3 bar',
    bezelType: 'reverso',
    braceletType: 'santos',
    handStyle: 'classic',
    hasCyclops: false,
    hasDateWindow: false,
    hasCrownGuards: false,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'yellow-gold',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#DEC274',
    image: datejustImg,
  },
  {
    id: 'cartier-crash',
    category: 'shaped-icons',
    brand: 'CARTIER',
    name: 'Cartier Crash',
    shortName: 'Cartier Crash',
    collection: '1967 London Surrealist',
    reference: 'CRWGCH0001',
    yearIntroduced: '1967',
    tagline: 'Sculpted asymmetric melted gold case & warped Romans.',
    description:
      'Born in Swinging Sixties London, defying symmetry with an organically melted 18k yellow gold silhouette, custom-contoured Roman numerals, and heat-blued steel sword hands.',
    caseShape: 'crash',
    caseDiameterMm: 38.5,
    caseThicknessMm: 8.8,
    lugToLugMm: 42.0,
    caliber: 'Caliber 1917 MC Shaped Manual',
    frequency: '21,600 vph (3 Hz)',
    powerReserve: '38 hours',
    waterResistance: '30 m / 3 bar',
    bezelType: 'reverso',
    braceletType: 'santos',
    handStyle: 'classic',
    hasCyclops: false,
    hasDateWindow: false,
    hasCrownGuards: false,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'yellow-gold',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#DEC274',
    image: datejustImg,
  },
  // --- PACK 4: PRECISION HIGH-BEAT & AVANT-GARDE ENGINEERING ---
  {
    id: 'gs-white-birch',
    category: 'dress-classic',
    brand: 'GRAND SEIKO',
    name: 'Evolution 9 "White Birch"',
    shortName: 'White Birch 9SA5',
    collection: 'Hi-Beat 36000 · Shizukuishi',
    reference: 'SLGH005',
    yearIntroduced: '2021',
    tagline: '36,000 vph Dual-Impulse 5 Hz caliber & sculpted birch dial.',
    description:
      'Inspired by the birch forests of Iwate Prefecture: a richly embossed vertical silver-white birch dial driven by the revolutionary 5 Hz Hi-Beat Caliber 9SA5 with 80-hour dual-barrel reserve.',
    caseShape: 'round',
    caseDiameterMm: 40,
    caseThicknessMm: 11.7,
    lugToLugMm: 47.0,
    caliber: 'Caliber 9SA5 Hi-Beat 36000',
    frequency: '36,000 vph (5 Hz)',
    powerReserve: '80 hours',
    waterResistance: '100 m / 10 bar',
    bezelType: 'smooth',
    braceletType: 'oyster',
    handStyle: 'dauphine',
    hasCyclops: false,
    hasDateWindow: true,
    hasCrownGuards: true,
    highBeatHz: 5,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'bracelet',
    bezelPrimaryHex: '#DCE0E5',
    image: datejustImg,
  },
  {
    id: 'gp-laureato',
    category: 'shaped-icons',
    brand: 'GIRARD-PERREGAUX',
    name: 'Laureato 42',
    shortName: 'Laureato 42',
    collection: '1975 Clous de Paris Sport',
    reference: '81010-11-431-11A',
    yearIntroduced: '1975',
    tagline: 'Octagonal bezel atop circular plinth & Clous de Paris dial.',
    description:
      'A 1975 Italian-designed architectural sport icon pairing a polished octagonal bezel with a deep blue Clous de Paris hobnail dial and fluidly integrated H-link steel bracelet.',
    caseShape: 'octagonal',
    caseDiameterMm: 42,
    caseThicknessMm: 10.7,
    lugToLugMm: 49.0,
    caliber: 'Calibre GP01800-0008',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '54 hours',
    waterResistance: '100 m / 10 bar',
    bezelType: 'royal-oak',
    braceletType: 'royal-oak',
    handStyle: 'classic',
    hasCyclops: false,
    hasDateWindow: true,
    hasCrownGuards: true,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'bracelet',
    bezelPrimaryHex: '#CFD5DC',
    image: datejustImg,
  },
  {
    id: 'piaget-polo-79',
    category: 'dress-classic',
    brand: 'PIAGET',
    name: 'Piaget Polo 79',
    shortName: 'Polo 79',
    collection: '1979 Sculptural Gold',
    reference: 'G0A49150',
    yearIntroduced: '1979',
    tagline: 'Full 18k yellow gold with continuous horizontal gadroon ribs.',
    description:
      'A quintessential 1979 jet-set design icon where brushed gold links alternate with mirror-polished horizontal gadroon bars seamlessly across the bracelet, case, and dial.',
    caseShape: 'round',
    caseDiameterMm: 38,
    caseThicknessMm: 7.45,
    lugToLugMm: 44.0,
    caliber: 'Calibre 1200P1 Micro-Rotor',
    frequency: '21,600 vph (3 Hz)',
    powerReserve: '44 hours',
    waterResistance: '30 m / 3 bar',
    bezelType: 'smooth',
    braceletType: 'nautilus',
    handStyle: 'classic',
    hasCyclops: false,
    hasDateWindow: false,
    hasCrownGuards: false,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'yellow-gold',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'bracelet',
    bezelPrimaryHex: '#E0C370',
    image: datejustImg,
  },
  {
    id: 'lange-zeitwerk',
    category: 'independent',
    brand: 'A. LANGE & SÖHNE',
    name: 'Zeitwerk',
    shortName: 'Zeitwerk',
    collection: 'Mechanical Digital Jumping',
    reference: '142.029',
    yearIntroduced: '2009',
    tagline: 'Constant-force mechanical jumping numerals & German silver bridge.',
    description:
      'A watershed of modern haute horlogerie: a sculpted rhodiumed German silver time bridge frames instantaneous jumping mechanical hour and minute discs alongside a 6 o’clock small seconds.',
    caseShape: 'round',
    caseDiameterMm: 41.9,
    caseThicknessMm: 12.2,
    lugToLugMm: 50.0,
    caliber: 'Calibre L043.6 Constant-Force',
    frequency: '18,000 vph (2.5 Hz)',
    powerReserve: '72 hours',
    waterResistance: '30 m / 3 bar',
    bezelType: 'smooth',
    braceletType: 'president',
    handStyle: 'classic',
    hasCyclops: false,
    hasDateWindow: false,
    hasCrownGuards: false,
    hasSmallSeconds: 6,
    hasPowerReserveHand: true,
    isJumpingDigital: true,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#D8DCE0',
    image: datejustImg,
  },
  // --- CASIO ICONS ---
  {
    id: 'casio-gshock-dw5600',
    category: 'dive-sport',
    brand: 'CASIO',
    name: 'G-Shock Origin DW-5600',
    shortName: 'G-Shock DW-5600',
    collection: '1983 Triple-10 Shock Icon',
    reference: 'DW-5600E-1V',
    yearIntroduced: '1983',
    tagline: 'Kikuo Ibe’s indestructible hollow-core square digital legend.',
    description:
      'Born from Kikuo Ibe’s Triple-10 vision (10m drop, 10-year battery, 10-bar minimum): a shock-absorbing matte resin square case, iconic red/blue perimeter frame, and high-contrast 7-segment LCD.',
    caseShape: 'square',
    caseDiameterMm: 42.8,
    caseThicknessMm: 13.4,
    lugToLugMm: 48.9,
    caliber: 'Module 3229 Digital Quartz',
    frequency: '32,768 Hz (Digital Quartz)',
    powerReserve: '2-Year CR2016 Cell',
    waterResistance: '200 m / 20 bar',
    bezelType: 'santos',
    braceletType: 'oyster',
    handStyle: 'classic',
    hasCyclops: false,
    hasDateWindow: false,
    hasCrownGuards: false,
    isDigitalDisplay: true,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'oysterflex',
    bezelPrimaryHex: '#1D2024',
    image: submarinerImg,
  },
  {
    id: 'casio-casioak-ga2100',
    category: 'shaped-icons',
    brand: 'CASIO',
    name: 'G-Shock "CasiOak" GA-2100',
    shortName: 'CasiOak GA-2100',
    collection: 'Carbon Core Guard Octagon',
    reference: 'GA-2100-1A1',
    yearIntroduced: '2019',
    tagline: 'Stealth Carbon Core Guard octagonal ana-digi phenomenon.',
    description:
      'Nicknamed the "CasiOak" for its crisp octagonal bezel silhouette, fusing ultra-slim 11.8mm Carbon Core Guard resin architecture with luminous analog hands, a 9 o’clock day fan, and 4:30 LCD.',
    caseShape: 'octagonal',
    caseDiameterMm: 45.4,
    caseThicknessMm: 11.8,
    lugToLugMm: 48.5,
    caliber: 'Module 5611 Ana-Digi Quartz',
    frequency: '32,768 Hz (Ana-Digi Quartz)',
    powerReserve: '3-Year Dual SR726W',
    waterResistance: '200 m / 20 bar',
    bezelType: 'royal-oak',
    braceletType: 'royal-oak',
    handStyle: 'pilot-sword',
    hasCyclops: false,
    hasDateWindow: false,
    hasCrownGuards: false,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'oysterflex',
    bezelPrimaryHex: '#1E2226',
    image: submarinerImg,
  },
  {
    id: 'casio-f91w',
    category: 'shaped-icons',
    brand: 'CASIO',
    name: 'Casio F-91W Vintage',
    shortName: 'Casio F-91W',
    collection: '1989 Retro Digital Classic',
    reference: 'F-91W-1XY',
    yearIntroduced: '1989',
    tagline: '21-gram utilitarian icon with blue/gold striped LCD frame.',
    description:
      'Perhaps the most recognizable digital wristwatch ever made: an ultra-slim 8.5mm angular resin case, crisp blue and gold perimeter graphic, micro-LED backlight, and 7-year quartz reliability.',
    caseShape: 'compact-octagon',
    caseDiameterMm: 35.2,
    caseThicknessMm: 8.5,
    lugToLugMm: 38.2,
    caliber: 'Module 593 Digital Quartz',
    frequency: '32,768 Hz (Digital Quartz)',
    powerReserve: '7-Year CR2016 Cell',
    waterResistance: '30 m / 3 bar (WR)',
    bezelType: 'reverso',
    braceletType: 'oyster',
    handStyle: 'classic',
    hasCyclops: false,
    hasDateWindow: false,
    hasCrownGuards: false,
    isDigitalDisplay: true,
    hasChronoPushers: false,
    hasGmtHand: false,
    defaultAlloy: 'oystersteel',
    defaultDial: 'default',
    defaultBezel: 'obsidian',
    defaultBelt: 'oysterflex',
    bezelPrimaryHex: '#1A1D21',
    image: submarinerImg,
  },
];

export const WATCH_HOTSPOTS: WatchHotspot[] = [
  {
    id: 'bezel',
    label: 'Bezel',
    title: 'Precision Sculpted Bezel',
    detail: 'Ceramic insert, octagonal screw-locked bezel, square Santos frame, or 72-facet fluted gold ring.',
    camPos: [1.6, 5.1, 4.7],
    camTarget: [0, 3.85, 0.35],
  },
  {
    id: 'dial',
    label: 'Dial & Rehaut',
    title: 'Sunburst, Tapisserie & Telemetry Dial',
    detail: 'Applied markers, Petit Tapisserie relief, horizontal embossing, or bi-compax gauges beneath sapphire.',
    camPos: [0.0, 4.5, 4.4],
    camTarget: [0, 3.58, 0.25],
  },
  {
    id: 'crown',
    label: 'Crown',
    title: '3-Position Winding Crown & Pushers',
    detail:
      'Click crown for Pos 1 (Wind), Pos 2 (Quick-Set Date/Moon), and Pos 3 (Hack Seconds & Set Time), or press pushers.',
    camPos: [5.2, 4.0, 2.2],
    camTarget: [1.75, 3.55, 0.2],
  },
  {
    id: 'caliber',
    label: 'Caliber',
    title: 'Mechanical Self-Winding Caliber',
    detail: 'Côtes de Genève bridges, blued steel screws, toothed brass gear train, and pendulum rotor.',
    camPos: [-1.4, 3.6, -5.6],
    camTarget: [0, 3.55, -0.35],
  },
  {
    id: 'clasp',
    label: 'Clasp & Belt',
    title: 'Folding Clasp & Stitched Leather Buckle',
    detail: 'Integrated links, folding deployant clasp, vulcanized elastomer, or stitched leather strap with tang pin buckle.',
    camPos: [3.6, 3.1, -5.8],
    camTarget: [0, 2.75, -2.5],
  },
];

export interface AlloyOption {
  id: AlloyId;
  label: string;
  swatchHex: string;
  secondaryHex?: string;
  primaryColor: number;
  centerColor: number;
  bezelMetalColor: number;
}

export const ALLOY_OPTIONS: AlloyOption[] = [
  {
    id: 'default',
    label: 'Signature',
    swatchHex: '#CBD2D6',
    primaryColor: 0xd6dbdf,
    centerColor: 0xd6dbdf,
    bezelMetalColor: 0xd6dbdf,
  },
  {
    id: 'oystersteel',
    label: 'Oystersteel',
    swatchHex: '#D6DBDF',
    primaryColor: 0xd6dbdf,
    centerColor: 0xe2e6ea,
    bezelMetalColor: 0xe0e4e8,
  },
  {
    id: 'rolesor',
    label: 'Yellow Rolesor',
    swatchHex: '#D6DBDF',
    secondaryHex: '#DFB95B',
    primaryColor: 0xd6dbdf,
    centerColor: 0xdfb95b,
    bezelMetalColor: 0xdfb95b,
  },
  {
    id: 'yellow-gold',
    label: '18ct Yellow Gold',
    swatchHex: '#DFB95B',
    primaryColor: 0xdfb95b,
    centerColor: 0xe8c76c,
    bezelMetalColor: 0xe5c365,
  },
  {
    id: 'everose',
    label: '18ct Everose',
    swatchHex: '#D79880',
    primaryColor: 0xd79880,
    centerColor: 0xe0a48c,
    bezelMetalColor: 0xdd9e86,
  },
];

export interface DialOption {
  id: DialId;
  label: string;
  swatchHex: string;
  baseHex: string;
  edgeHex: string;
  sunburst: boolean;
  lightText: boolean;
}

export const DIAL_OPTIONS: DialOption[] = [
  {
    id: 'default',
    label: 'Signature',
    swatchHex: '#181C1E',
    baseHex: '#121517',
    edgeHex: '#07090A',
    sunburst: false,
    lightText: true,
  },
  {
    id: 'obsidian',
    label: 'Obsidian Gloss',
    swatchHex: '#101315',
    baseHex: '#121518',
    edgeHex: '#060708',
    sunburst: false,
    lightText: true,
  },
  {
    id: 'panda',
    label: 'Opaline White',
    swatchHex: '#EDEAE2',
    baseHex: '#F3F0E8',
    edgeHex: '#D6D1C6',
    sunburst: false,
    lightText: false,
  },
  {
    id: 'emerald',
    label: 'Emerald Sunburst',
    swatchHex: '#005633',
    baseHex: '#00683E',
    edgeHex: '#002D1A',
    sunburst: true,
    lightText: true,
  },
  {
    id: 'royal-blue',
    label: 'Bright Blue',
    swatchHex: '#0F3D75',
    baseHex: '#145299',
    edgeHex: '#082040',
    sunburst: true,
    lightText: true,
  },
  {
    id: 'champagne',
    label: 'Champagne',
    swatchHex: '#CEB06A',
    baseHex: '#DFC37E',
    edgeHex: '#9D7F3C',
    sunburst: true,
    lightText: false,
  },
  {
    id: 'ice-blue',
    label: 'Ice Blue',
    swatchHex: '#9AC2DA',
    baseHex: '#B6D9EE',
    edgeHex: '#6993B0',
    sunburst: true,
    lightText: false,
  },
  {
    id: 'meteorite',
    label: 'Gibeon Meteorite',
    swatchHex: '#949CA4',
    baseHex: '#9EA6AE',
    edgeHex: '#596068',
    sunburst: false,
    lightText: false,
  },
  {
    id: 'aventurine',
    label: 'Aventurine Starlight',
    swatchHex: '#0E1938',
    baseHex: '#101D42',
    edgeHex: '#040814',
    sunburst: false,
    lightText: true,
  },
  {
    id: 'mother-of-pearl',
    label: 'Mother-of-Pearl',
    swatchHex: '#EDE5EA',
    baseHex: '#F3EDF0',
    edgeHex: '#C7BEC7',
    sunburst: false,
    lightText: false,
  },
  {
    id: 'snowflake',
    label: 'Zaratsu Snowflake',
    swatchHex: '#F2F5F8',
    baseHex: '#F6F8FA',
    edgeHex: '#DCE2E8',
    sunburst: false,
    lightText: false,
  },
];

export interface BezelOption {
  id: BezelId;
  label: string;
  primaryHex: string;
  secondaryHex?: string;
}

export const BEZEL_OPTIONS: BezelOption[] = [
  {
    id: 'default',
    label: 'Signature',
    primaryHex: '#3A4240',
    secondaryHex: '#8E9994',
  },
  {
    id: 'obsidian',
    label: 'Obsidian',
    primaryHex: '#121517',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    primaryHex: '#005A34',
  },
  {
    id: 'pepsi',
    label: 'Blue / Crimson',
    primaryHex: '#153263',
    secondaryHex: '#7D1524',
  },
  {
    id: 'batman',
    label: 'Blue / Obsidian',
    primaryHex: '#133060',
    secondaryHex: '#111416',
  },
  {
    id: 'sprite',
    label: 'Emerald / Obsidian',
    primaryHex: '#005A34',
    secondaryHex: '#111416',
  },
];

export interface GmtTimezoneOption {
  id: string;
  label: string;
  utcOffsetHours: number;
}

export const GMT_TIMEZONES: GmtTimezoneOption[] = [
  { id: 'gva', label: 'Geneva', utcOffsetHours: 1 },
  { id: 'lon', label: 'London', utcOffsetHours: 0 },
  { id: 'nyc', label: 'New York', utcOffsetHours: -5 },
  { id: 'tyo', label: 'Tokyo', utcOffsetHours: 9 },
];

export interface BeltOption {
  id: BeltId;
  label: string;
}

export const BELT_OPTIONS: BeltOption[] = [
  { id: 'bracelet', label: 'Bracelet' },
  { id: 'leather', label: 'Leather' },
  { id: 'oysterflex', label: 'Elastomer' },
];

export interface BeltShadeOption {
  id: BeltShadeId;
  label: string;
  swatchHex: string;
  leatherHex: number;
  sheenHex: number;
  stitchHex: number;
  rubberHex: number;
}

export const BELT_SHADE_OPTIONS: BeltShadeOption[] = [
  {
    id: 'default',
    label: 'Maison Signature',
    swatchHex: '#4E3122',
    leatherHex: 0xffffff,
    sheenHex: 0x5c3e2b,
    stitchHex: 0xdfd0a8,
    rubberHex: 0x1c1f22,
  },
  {
    id: 'espresso',
    label: 'Espresso Alligator',
    swatchHex: '#462A1B',
    leatherHex: 0xd9c2b2,
    sheenHex: 0x5e3b27,
    stitchHex: 0xe3d3ae,
    rubberHex: 0x261c17,
  },
  {
    id: 'midnight',
    label: 'Midnight Navy',
    swatchHex: '#172947',
    leatherHex: 0x45608a,
    sheenHex: 0x243e6b,
    stitchHex: 0xc9d3e3,
    rubberHex: 0x132238,
  },
  {
    id: 'cognac',
    label: 'Cognac Suede',
    swatchHex: '#9C5C32',
    leatherHex: 0xe6a875,
    sheenHex: 0xb8733d,
    stitchHex: 0xf4ebd4,
    rubberHex: 0x4a3121,
  },
  {
    id: 'racing-blue',
    label: 'Racing Petrol Blue',
    swatchHex: '#1E4E79',
    leatherHex: 0x4e86ba,
    sheenHex: 0x2b6294,
    stitchHex: 0xd93829,
    rubberHex: 0x193f63,
  },
  {
    id: 'british-green',
    label: 'British Racing Green',
    swatchHex: '#12422E',
    leatherHex: 0x3b785c,
    sheenHex: 0x1e5c41,
    stitchHex: 0xe5d6ad,
    rubberHex: 0x0f3324,
  },
  {
    id: 'obsidian',
    label: 'Obsidian Matte',
    swatchHex: '#181A1D',
    leatherHex: 0x45494f,
    sheenHex: 0x2b2e33,
    stitchHex: 0xc5cad1,
    rubberHex: 0x15171a,
  },
];

export interface CuratedShowdown {
  id: string;
  label: string;
  primaryId: WatchModelId;
  compareId: WatchModelId;
}

export const CURATED_SHOWDOWNS: CuratedShowdown[] = [
  {
    id: 'holy-trinity',
    label: 'Holy Trinity Steel',
    primaryId: 'ap-royal-oak',
    compareId: 'pp-nautilus',
  },
  {
    id: 'trinity-overseas',
    label: 'Nautilus vs Overseas',
    primaryId: 'pp-nautilus',
    compareId: 'vc-overseas',
  },
  {
    id: 'chrono-1969',
    label: "'69 Racing Chronos",
    primaryId: 'daytona',
    compareId: 'tag-monaco',
  },
  {
    id: 'high-beat-vs-moon',
    label: 'El Primero vs Moonwatch',
    primaryId: 'zenith-el-primero',
    compareId: 'omega-speedmaster',
  },
  {
    id: 'dive-legends',
    label: 'Submariner vs Seamaster',
    primaryId: 'submariner',
    compareId: 'omega-seamaster',
  },
  {
    id: 'neoclassical-craft',
    label: 'Breguet vs Lange 1',
    primaryId: 'breguet-classique',
    compareId: 'lange-1',
  },
  {
    id: 'diver-origins',
    label: 'Fifty Fathoms vs Sub',
    primaryId: 'blancpain-fifty-fathoms',
    compareId: 'submariner',
  },
  {
    id: 'octagon-clash',
    label: 'Royal Oak vs CasiOak',
    primaryId: 'ap-royal-oak',
    compareId: 'casio-casioak-ga2100',
  },
  {
    id: 'japanese-duel',
    label: 'White Birch vs Snowflake',
    primaryId: 'gs-white-birch',
    compareId: 'gs-snowflake',
  },
  {
    id: 'indep-haute',
    label: 'LM101 vs Zeitwerk',
    primaryId: 'mbf-lm101',
    compareId: 'lange-zeitwerk',
  },
  {
    id: 'rectangular-legends',
    label: 'Tank Louis vs Reverso',
    primaryId: 'cartier-tank-louis',
    compareId: 'jlc-reverso',
  },
];

export function resolveBeltShade(watch: WatchSpec, shadeId: BeltShadeId): BeltShadeOption {
  if (shadeId !== 'default') {
    return BELT_SHADE_OPTIONS.find((s) => s.id === shadeId) ?? BELT_SHADE_OPTIONS[0];
  }
  if (watch.id === 'tag-monaco') {
    return BELT_SHADE_OPTIONS.find((s) => s.id === 'racing-blue') ?? BELT_SHADE_OPTIONS[0];
  }
  if (
    watch.id === 'vc-overseas' ||
    watch.id === 'jlc-reverso' ||
    watch.id === 'breguet-classique' ||
    watch.id === 'omega-seamaster' ||
    watch.id === 'fpj-chronometre-bleu' ||
    watch.id === 'pp-worldtime' ||
    watch.id === 'gp-laureato'
  ) {
    return BELT_SHADE_OPTIONS.find((s) => s.id === 'midnight') ?? BELT_SHADE_OPTIONS[0];
  }
  if (
    watch.id === 'tudor-bb58' ||
    watch.id === 'iwc-big-pilot' ||
    watch.id === 'avi8-spitfire' ||
    watch.id === 'panerai-luminor' ||
    watch.id === 'mbf-lm101' ||
    watch.id === 'cartier-tank-louis'
  ) {
    return BELT_SHADE_OPTIONS.find((s) => s.id === 'cognac') ?? BELT_SHADE_OPTIONS[0];
  }
  if (
    watch.id === 'breitling-navitimer' ||
    watch.id === 'rm-tonneau' ||
    watch.id === 'omega-speedmaster' ||
    watch.id === 'hamilton-murph' ||
    watch.id === 'nomos-tangente' ||
    watch.id === 'blancpain-fifty-fathoms' ||
    watch.id === 'lange-zeitwerk' ||
    watch.brand === 'CASIO'
  ) {
    return BELT_SHADE_OPTIONS.find((s) => s.id === 'obsidian') ?? BELT_SHADE_OPTIONS[0];
  }
  if (watch.defaultDial === 'emerald' || watch.id === 'moser-streamliner' || watch.id === 'longines-zulu-time') {
    return BELT_SHADE_OPTIONS.find((s) => s.id === 'british-green') ?? BELT_SHADE_OPTIONS[0];
  }
  return BELT_SHADE_OPTIONS[0];
}

export function getBeltLabelForWatch(watch: WatchSpec, beltId: BeltId): string {
  if (beltId === 'bracelet') {
    if (
      watch.braceletType === 'royal-oak' ||
      watch.braceletType === 'nautilus' ||
      watch.braceletType === 'santos'
    ) {
      return 'Integrated Bracelet';
    }
    return 'Metal Bracelet';
  }
  if (beltId === 'leather') {
    return watch.brand === 'AVI-8' ? 'Aviator Leather' : 'Alligator Leather';
  }
  if (watch.brand === 'ROLEX') return 'Oysterflex';
  if (watch.brand === 'RICHARD MILLE') return 'Vented Elastomer';
  if (watch.brand === 'CASIO') return 'Shock-Absorbing Resin';
  return 'Vulcanized Rubber';
}

export function getShortBeltTabLabel(watch: WatchSpec, beltId: BeltId): string {
  if (beltId === 'bracelet') return 'Bracelet';
  if (beltId === 'leather') return 'Leather';
  if (watch.brand === 'CASIO') return 'Resin';
  return watch.brand === 'ROLEX' ? 'Oysterflex' : 'Rubber';
}

export function resolveAlloy(watch: WatchSpec, alloyId: AlloyId): AlloyOption {
  if (watch.id === 'avi8-spitfire' && alloyId === 'default') {
    return {
      id: 'default',
      label: 'Antique Bronze',
      swatchHex: '#9C6F44',
      primaryColor: 0x9b6e44,
      centerColor: 0x895e36,
      bezelMetalColor: 0xa6784b,
    };
  }
  if (watch.id === 'fpj-chronometre-bleu' && alloyId === 'default') {
    return {
      id: 'default',
      label: 'Blue-Grey Tantalum',
      swatchHex: '#6E7A8A',
      primaryColor: 0x6c798a,
      centerColor: 0x7a8899,
      bezelMetalColor: 0x738192,
    };
  }
  if (watch.id === 'bulgari-octo-finissimo' && alloyId === 'default') {
    return {
      id: 'default',
      label: 'Sandblasted Titanium',
      swatchHex: '#9AA0A6',
      primaryColor: 0x9aa0a6,
      centerColor: 0xa4aab0,
      bezelMetalColor: 0x9ea4aa,
    };
  }
  if (watch.brand === 'CASIO' && alloyId === 'default') {
    return {
      id: 'default',
      label: watch.id === 'casio-casioak-ga2100' ? 'Carbon Core Resin' : 'Matte Stealth Resin',
      swatchHex: '#202429',
      primaryColor: 0x22262b,
      centerColor: 0x1b1f24,
      bezelMetalColor: 0x272b30,
    };
  }
  const effective = alloyId === 'default' ? watch.defaultAlloy : alloyId;
  const base = ALLOY_OPTIONS.find((a) => a.id === effective) ?? ALLOY_OPTIONS[1];
  if (watch.brand !== 'ROLEX') {
    if (base.id === 'oystersteel') {
      const titaniumBrand =
        watch.brand === 'GRAND SEIKO' ||
        watch.brand === 'RICHARD MILLE' ||
        watch.brand === 'BULGARI';
      return {
        ...base,
        label: titaniumBrand ? 'Grade 5 Titanium' : '316L Stainless Steel',
      };
    }
    if (base.id === 'rolesor') {
      return { ...base, label: 'Two-Tone Steel & Gold' };
    }
    if (base.id === 'everose') {
      return { ...base, label: '18ct Rose Gold' };
    }
  }
  return base;
}

export function resolveDial(watch: WatchSpec, dialId: DialId): DialOption {
  if (watch.id === 'avi8-spitfire' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Bronze Green',
      swatchHex: '#35452D',
      baseHex: '#35452C',
      edgeHex: '#182114',
      sunburst: false,
      lightText: true,
    };
  }
  if (watch.id === 'ap-royal-oak' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Bleu Nuit, Nuage 50',
      swatchHex: '#1B3860',
      baseHex: '#1F416E',
      edgeHex: '#0C1A30',
      sunburst: false,
      lightText: true,
    };
  }
  if (watch.id === 'pp-nautilus' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Geneva Blue-Black',
      swatchHex: '#244663',
      baseHex: '#2B5373',
      edgeHex: '#0A131C',
      sunburst: false,
      lightText: true,
    };
  }
  if (watch.id === 'cartier-santos' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Silvered Opaline',
      swatchHex: '#EDEAE2',
      baseHex: '#F4F1EA',
      edgeHex: '#DAD4C8',
      sunburst: true,
      lightText: false,
    };
  }
  if (watch.id === 'jlc-reverso' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Tribute Sunray Blue',
      swatchHex: '#15396B',
      baseHex: '#194582',
      edgeHex: '#091B36',
      sunburst: true,
      lightText: true,
    };
  }
  if (watch.id === 'vc-overseas' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Geneva Lacquer Blue',
      swatchHex: '#0B3B78',
      baseHex: '#0F4D9C',
      edgeHex: '#051B3B',
      sunburst: true,
      lightText: true,
    };
  }
  if (watch.id === 'omega-seamaster' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Ceramic Wave Blue',
      swatchHex: '#113A6E',
      baseHex: '#174B8C',
      edgeHex: '#081D3B',
      sunburst: false,
      lightText: true,
    };
  }
  if (watch.id === 'tudor-bb58' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Gilt Noir Grain',
      swatchHex: '#181817',
      baseHex: '#1C1B19',
      edgeHex: '#0A0A09',
      sunburst: false,
      lightText: true,
    };
  }
  if (watch.id === 'panerai-luminor' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Matte Sandwich Black',
      swatchHex: '#111314',
      baseHex: '#15181A',
      edgeHex: '#08090A',
      sunburst: false,
      lightText: true,
    };
  }
  if (watch.id === 'tag-monaco' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Petrol Racing Blue',
      swatchHex: '#1C4872',
      baseHex: '#215485',
      edgeHex: '#0E2A45',
      sunburst: false,
      lightText: true,
    };
  }
  if (watch.id === 'breguet-classique' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Silvered Clous de Paris',
      swatchHex: '#EAE8E2',
      baseHex: '#F2EFEA',
      edgeHex: '#CFCAC0',
      sunburst: false,
      lightText: false,
    };
  }
  if (watch.id === 'lange-1' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Argenté Solid Silver',
      swatchHex: '#EAE5DB',
      baseHex: '#F0ECE3',
      edgeHex: '#CEC6B8',
      sunburst: false,
      lightText: false,
    };
  }
  if (watch.id === 'fpj-chronometre-bleu' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Chrome Blue Mirror',
      swatchHex: '#0F4EA8',
      baseHex: '#1562C9',
      edgeHex: '#071F4A',
      sunburst: true,
      lightText: true,
    };
  }
  if (watch.id === 'moser-streamliner' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Matrix Green Fumé',
      swatchHex: '#1E6B47',
      baseHex: '#2B8E5D',
      edgeHex: '#06140D',
      sunburst: true,
      lightText: true,
    };
  }
  if (watch.id === 'mbf-lm101' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Frosted Anthracite Plate',
      swatchHex: '#333840',
      baseHex: '#3E444E',
      edgeHex: '#1B1E24',
      sunburst: false,
      lightText: true,
    };
  }
  if (watch.id === 'bulgari-octo-finissimo' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Sandblasted Titanium',
      swatchHex: '#8E959C',
      baseHex: '#9BA2A9',
      edgeHex: '#6F767D',
      sunburst: false,
      lightText: false,
    };
  }
  if (watch.id === 'pp-worldtime' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Charcoal Hand-Guilloché',
      swatchHex: '#2D343D',
      baseHex: '#39414C',
      edgeHex: '#1A1E24',
      sunburst: false,
      lightText: true,
    };
  }
  if (watch.id === 'longines-zulu-time' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Anthracite Gilt Aviation',
      swatchHex: '#1F2225',
      baseHex: '#25292D',
      edgeHex: '#0D0F11',
      sunburst: false,
      lightText: true,
    };
  }
  if (watch.id === 'hamilton-murph' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Matte Black Field',
      swatchHex: '#141618',
      baseHex: '#191B1E',
      edgeHex: '#090A0B',
      sunburst: false,
      lightText: true,
    };
  }
  if (watch.id === 'nomos-tangente' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Galvanized White Silver',
      swatchHex: '#F3F1EC',
      baseHex: '#FAF9F6',
      edgeHex: '#E0DDD5',
      sunburst: false,
      lightText: false,
    };
  }
  if (watch.id === 'blancpain-fifty-fathoms' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Sunburst Abyssal Black',
      swatchHex: '#101318',
      baseHex: '#1A1F26',
      edgeHex: '#06080A',
      sunburst: true,
      lightText: true,
    };
  }
  if (watch.id === 'doxa-sub300' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Professional Orange',
      swatchHex: '#EE621B',
      baseHex: '#F46A20',
      edgeHex: '#C8480C',
      sunburst: false,
      lightText: false,
    };
  }
  if ((watch.id === 'cartier-tank-louis' || watch.id === 'cartier-crash') && dialId === 'default') {
    return {
      id: 'default',
      label: 'Silvered Grained Opaline',
      swatchHex: '#EFECE3',
      baseHex: '#F5F2EA',
      edgeHex: '#DCD6C7',
      sunburst: false,
      lightText: false,
    };
  }
  if (watch.id === 'gs-white-birch' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Shizukuishi White Birch',
      swatchHex: '#E6E9ED',
      baseHex: '#F1F3F6',
      edgeHex: '#CDD3DB',
      sunburst: false,
      lightText: false,
    };
  }
  if (watch.id === 'gp-laureato' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Clous de Paris Cobalt',
      swatchHex: '#163A6B',
      baseHex: '#1D4B8A',
      edgeHex: '#0A1C38',
      sunburst: false,
      lightText: true,
    };
  }
  if (watch.id === 'piaget-polo-79' && dialId === 'default') {
    return {
      id: 'default',
      label: '18k Gold Gadroon Ribbed',
      swatchHex: '#D8B75D',
      baseHex: '#E5C773',
      edgeHex: '#B6913B',
      sunburst: false,
      lightText: false,
    };
  }
  if (watch.id === 'lange-zeitwerk' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Obsidian & German Silver',
      swatchHex: '#181A1D',
      baseHex: '#202327',
      edgeHex: '#0B0C0E',
      sunburst: false,
      lightText: true,
    };
  }
  if (watch.id === 'casio-gshock-dw5600' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Origin Red-Line LCD',
      swatchHex: '#1B1E22',
      baseHex: '#1E2227',
      edgeHex: '#0E1013',
      sunburst: false,
      lightText: true,
    };
  }
  if (watch.id === 'casio-casioak-ga2100' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Stealth Carbon Matte',
      swatchHex: '#1C1F23',
      baseHex: '#22262B',
      edgeHex: '#0F1114',
      sunburst: false,
      lightText: true,
    };
  }
  if (watch.id === 'casio-f91w' && dialId === 'default') {
    return {
      id: 'default',
      label: 'Retro Blue/Gold LCD',
      swatchHex: '#1A1E24',
      baseHex: '#1D2229',
      edgeHex: '#0D1014',
      sunburst: false,
      lightText: true,
    };
  }
  const effective = dialId === 'default' ? watch.defaultDial : dialId;
  return DIAL_OPTIONS.find((d) => d.id === effective) ?? DIAL_OPTIONS[1];
}

export function resolveBezel(watch: WatchSpec, bezelId: BezelId): BezelOption {
  const effective = bezelId === 'default' ? watch.defaultBezel : bezelId;
  return BEZEL_OPTIONS.find((b) => b.id === effective) ?? BEZEL_OPTIONS[1];
}

export function resolveLumePalette(watch: WatchSpec): LumePalette {
  const arTint = watch.greenSapphire
    ? 0xd1fae5
    : watch.brand === 'OMEGA' ||
        watch.brand === 'BREITLING' ||
        watch.brand === 'PANERAI' ||
        watch.brand === 'IWC SCHAFFHAUSEN'
      ? 0xdbeafe
      : 0xf4f8ff;

  if (watch.id === 'omega-seamaster') {
    return {
      style: 'dual-dive',
      primaryLitHex: 0x7dd3fc,
      primaryEmissiveHex: 0x0ea5e9,
      secondaryLitHex: 0x86efac,
      secondaryEmissiveHex: 0x22c55e,
      arCrystalTintHex: arTint,
    };
  }
  if (
    watch.id === 'omega-speedmaster' ||
    watch.id === 'panerai-luminor' ||
    watch.id === 'iwc-big-pilot' ||
    watch.id === 'avi8-spitfire' ||
    watch.id === 'rm-tonneau'
  ) {
    return {
      style: 'c3',
      primaryLitHex: 0x86efac,
      primaryEmissiveHex: 0x22c55e,
      secondaryLitHex: 0x86efac,
      secondaryEmissiveHex: 0x22c55e,
      arCrystalTintHex: arTint,
    };
  }
  return {
    style: 'bgw9',
    primaryLitHex: 0x7dd3fc,
    primaryEmissiveHex: 0x0ea5e9,
    secondaryLitHex: 0x7dd3fc,
    secondaryEmissiveHex: 0x0ea5e9,
    arCrystalTintHex: arTint,
  };
}

export function getAtelierTourSteps(watch: WatchSpec): AtelierTourStep[] {
  const caseNote = watch.hasCrownBridge
    ? `${watch.caseDiameterMm} mm cushion case featuring Panerai’s patented 3 o’clock crescent lever crown bridge.`
    : watch.leftCrown
      ? `${watch.caseDiameterMm} mm square racing silhouette with authentic left-hand 9 o’clock winding crown.`
      : watch.hasCoinEdge
        ? `Neoclassical ${watch.caseDiameterMm} mm slim caseband finished with 144 crisp coin-edge flutes.`
        : watch.hasHeliumValve
          ? `${watch.caseDiameterMm} mm diver case paired with a 12-lobe scalloped bezel and 10 o’clock conical helium escape valve.`
          : watch.bezelType === 'overseas'
            ? `Integrated ${watch.caseDiameterMm} mm sport architecture crowned by a 6-notched Maltese Cross bezel.`
            : `${watch.caseDiameterMm} mm × ${watch.caseThicknessMm} mm architecture crafted with beveled chamfers and signature bezel profile.`;

  const complicationStep: AtelierTourStep = watch.hasReversoFlip
    ? {
        id: 'complication',
        chapter: '02 · Duoface Cradle',
        title: '180° Reversible Swivel Case',
        detail: 'Watch the inner carriage glide sideways and swivel 180° to reveal the dark second-timezone dial.',
        cameraPreset: 'dial',
        action: 'reverso-flip',
      }
    : watch.bezelType === 'navitimer'
      ? {
          id: 'complication',
          chapter: '02 · Slide-Rule Instrument',
          title: 'Circular E6B Flight Computer',
          detail: 'Rotating the 72-bead logarithmic bezel aligns speed, fuel burn, and climb calculations on the perimeter track.',
          cameraPreset: 'dial',
          action: 'navitimer-bezel',
        }
      : watch.hasChronoPushers
        ? {
            id: 'complication',
            chapter: '02 · Chronograph Clutch',
            title: `${watch.highBeatHz ? '5 Hz (36,000 vph) High-Beat' : 'Mechanical'} Timing Train`,
            detail: `Column-wheel actuators drive the central chronograph sweep across ${watch.hasChronoSubdials === 2 ? 'bi-compax' : 'tri-compax'} counters.`,
            cameraPreset: 'dial',
            action: 'chrono-demo',
          }
        : watch.bezelType === 'dive-cerachrom' || watch.bezelType === 'seamaster'
          ? {
              id: 'complication',
              chapter: '02 · Dive Timing Bezel',
              title: 'Unidirectional Elapsed Bezel',
              detail: 'Engraved ceramic numerals lock safely counter-clockwise so bottom time can only be conservative.',
              cameraPreset: 'dial',
              action: 'dive-bezel',
            }
          : {
              id: 'complication',
              chapter: '02 · Dial Craft',
              title: `${watch.collection} Dial Work`,
              detail: watch.description,
              cameraPreset: 'dial',
              action: 'reset-hero',
            };

  const caliberStep: AtelierTourStep = {
    id: 'caliber',
    chapter: '03 · Exhibition Caliber',
    title: `${watch.caliber} · ${watch.powerReserve}`,
    detail:
      watch.id === 'lange-1'
        ? 'Reveals the Glashütte untreated German silver 3/4 plate, screwed gold chatons, and blued steel screws.'
        : watch.hasChronoPushers
          ? 'Open sapphire caseback exposes the column-wheel ratchet, horizontal clutch yoke, and oscillating rotor.'
          : watch.id === 'omega-speedmaster' || watch.id === 'jlc-reverso'
            ? 'Manual-wind architecture leaves the Côte de Genève bridges, brass gear train, and balance wheel completely unobstructed.'
            : `Sapphire exhibition back displays ${watch.brand}’s custom rotor silhouette over Côtes de Genève bridges and ${watch.frequency} balance oscillation.`,
    cameraPreset: 'caliber',
    action: 'caliber-flip',
  };

  const closingStep: AtelierTourStep =
    watch.brand === 'BREGUET' ||
    watch.brand === 'CARTIER' ||
    watch.brand === 'A. LANGE & SÖHNE' ||
    watch.brand === 'JAEGER-LECOULTRE'
      ? {
          id: 'architecture',
          chapter: '04 · Exploded Assembly',
          title: '6-Layer Watchmaker Breakdown',
          detail: 'Sapphire crystal, bezel frame, hand stack, dial plate, mechanical caliber, and caseback separated cleanly in space.',
          cameraPreset: 'hero',
          camPos: [4.3, 4.4, 6.6],
          camTarget: [0, 3.45, -0.25],
          action: 'explode-layers',
        }
      : {
          id: 'nocturne',
          chapter: '04 · Night Visibility',
          title:
            watch.id === 'omega-seamaster'
              ? 'Dual-Color Dive Lume Signature'
              : resolveLumePalette(watch).style === 'c3'
                ? 'Super-LumiNova C3 Mint Phosphor'
                : 'BGW9 Ice-Blue Chromalight',
          detail:
            watch.id === 'omega-seamaster'
              ? 'Hour indices emit BGW9 ice-blue while the skeleton minute hand and bezel pip glow mint green for instant dive readability.'
              : 'Hover the cursor in Lume mode to sweep the UV torch and charge phosphor intensity across markers and hands.',
          cameraPreset: 'dial',
          action: 'nocturne-lume',
        };

  return [
    {
      id: 'case',
      chapter: '01 · Case Architecture',
      title: `${watch.brand} ${watch.shortName}`,
      detail: caseNote,
      cameraPreset: 'hero',
      action: 'reset-hero',
    },
    complicationStep,
    caliberStep,
    closingStep,
  ];
}

export function resolveCaliberBeatProfile(watch: WatchSpec): CaliberBeatProfile {
  if (watch.isSpringDrive) {
    return {
      beatHz: 0,
      vph: 0,
      isSpringDrive: true,
      isQuartz: false,
      liftAngleDeg: 52,
      label: 'Spring Drive Glide',
    };
  }
  const freq = watch.frequency.toLowerCase();
  if (freq.includes('32,768') || freq.includes('1/5s') || freq.includes('quartz')) {
    const label = watch.isDigitalDisplay
      ? '32,768 Hz · Digital Quartz'
      : watch.brand === 'CASIO'
        ? '32,768 Hz · Ana-Digi Quartz'
        : 'Meca-Quartz (1 Hz + 1/5s)';
    return {
      beatHz: 0.5,
      vph: 3600,
      isSpringDrive: false,
      isQuartz: true,
      liftAngleDeg: 0,
      label,
    };
  }
  if (watch.highBeatHz === 5 || freq.includes('36,000') || freq.includes('5 hz')) {
    return {
      beatHz: 5,
      vph: 36000,
      isSpringDrive: false,
      isQuartz: false,
      liftAngleDeg: 50,
      label: '36,000 vph (5 Hz High-Beat)',
    };
  }
  if (watch.highBeatHz === 3.5 || freq.includes('25,200') || freq.includes('3.5 hz')) {
    return {
      beatHz: 3.5,
      vph: 25200,
      isSpringDrive: false,
      isQuartz: false,
      liftAngleDeg: 52,
      label: watch.brand === 'OMEGA' ? '25,200 vph (3.5 Hz Co-Axial)' : '25,200 vph (3.5 Hz Silicon)',
    };
  }
  if (freq.includes('18,000') || freq.includes('2.5 hz')) {
    return {
      beatHz: 2.5,
      vph: 18000,
      isSpringDrive: false,
      isQuartz: false,
      liftAngleDeg: 50,
      label: '18,000 vph (2.5 Hz Traditional)',
    };
  }
  if (watch.highBeatHz === 3 || freq.includes('21,600') || freq.includes('(3 hz)')) {
    return {
      beatHz: 3,
      vph: 21600,
      isSpringDrive: false,
      isQuartz: false,
      liftAngleDeg: watch.brand === 'A. LANGE & SÖHNE' ? 50 : 52,
      label: '21,600 vph (3 Hz)',
    };
  }
  const hz = watch.highBeatHz ?? 4;
  return {
    beatHz: hz,
    vph: Math.round(hz * 7200),
    isSpringDrive: false,
    isQuartz: false,
    liftAngleDeg: watch.brand === 'ROLEX' ? 53 : 52,
    label: `${Math.round(hz * 7200).toLocaleString()} vph (${hz} Hz)`,
  };
}

export function getWatchYearNumeric(watch: WatchSpec): number {
  const parsed = parseInt(watch.yearIntroduced, 10);
  return Number.isFinite(parsed) ? parsed : 2000;
}

export function getChronologicalWatches(): WatchSpec[] {
  return WATCH_MODELS.map((watch, idx) => ({ watch, idx }))
    .sort((a, b) => {
      const diff = getWatchYearNumeric(a.watch) - getWatchYearNumeric(b.watch);
      return diff !== 0 ? diff : a.idx - b.idx;
    })
    .map((entry) => entry.watch);
}

export function getWatchById(id: WatchModelId): WatchSpec {
  return WATCH_MODELS.find((w) => w.id === id) ?? WATCH_MODELS[0];
}

export type LugStyle =
  | 'oyster'
  | 'integrated-shoulder'
  | 'cushion-hood'
  | 'panerai-cushion'
  | 'santos-integrated'
  | 'straight-dress'
  | 'wire-breguet'
  | 'brancard'
  | 'reverso-cradle'
  | 'crash-asymmetric'
  | 'casio-shroud';

export type CrownMode =
  | 'none'
  | 'screw-down-3pos'
  | 'screw-down-2pos'
  | 'push-pull-3pos'
  | 'push-pull-2pos'
  | 'meca-quartz';

export type BezelDirection = 'none' | 'unidirectional' | 'bidirectional';

export interface CrownStopOption {
  pos: CrownPosition;
  label: string;
  shortLabel: string;
}

export interface WatchCapabilities {
  lugStyle: LugStyle;
  crownMode: CrownMode;
  isScrewDownCrown: boolean;
  crownStops: CrownStopOption[];
  supportsManualWind: boolean;
  supportsQuickSetDate: boolean;
  supportsHacking: boolean;
  bezelDirection: BezelDirection;
  hasInteractiveBezel: boolean;
  allowedAlloys: AlloyId[];
  allowedDials: DialId[];
  allowedBezels: BezelId[];
  allowedBelts: BeltId[];
  supportsLume: boolean;
  supportsExhibitionBack: boolean;
  supportsTimegrapher: boolean;
  supportsXray: boolean;
  hasMicroAdjustClasp: (beltId: BeltId) => boolean;
}

const ALL_ALLOYS: AlloyId[] = ['default', 'oystersteel', 'yellow-gold', 'everose', 'rolesor'];
const ALL_DIALS: DialId[] = [
  'default',
  'obsidian',
  'panda',
  'emerald',
  'royal-blue',
  'champagne',
  'ice-blue',
  'meteorite',
  'aventurine',
  'mother-of-pearl',
  'snowflake',
];
const ALL_BEZELS: BezelId[] = ['default', 'obsidian', 'emerald', 'pepsi', 'batman', 'sprite'];

export function resolveWatchCapabilities(watch: WatchSpec): WatchCapabilities {
  const beatProfile = resolveCaliberBeatProfile(watch);
  const id = watch.id;

  // 1. Faithful Lug Architecture per Reference
  let lugStyle: LugStyle = 'oyster';
  if (id === 'cartier-tank-louis') {
    lugStyle = 'brancard';
  } else if (id === 'jlc-reverso') {
    lugStyle = 'reverso-cradle';
  } else if (id === 'cartier-crash') {
    lugStyle = 'crash-asymmetric';
  } else if (watch.brand === 'CASIO') {
    lugStyle = 'casio-shroud';
  } else if (
    id === 'ap-royal-oak' ||
    id === 'pp-nautilus' ||
    id === 'bulgari-octo-finissimo' ||
    id === 'gp-laureato' ||
    id === 'vc-overseas' ||
    id === 'piaget-polo-79'
  ) {
    lugStyle = 'integrated-shoulder';
  } else if (id === 'doxa-sub300' || id === 'moser-streamliner' || id === 'rm-tonneau') {
    lugStyle = 'cushion-hood';
  } else if (id === 'panerai-luminor') {
    lugStyle = 'panerai-cushion';
  } else if (id === 'cartier-santos' || id === 'tag-monaco') {
    lugStyle = 'santos-integrated';
  } else if (id === 'breguet-classique') {
    lugStyle = 'wire-breguet';
  } else if (
    id === 'nomos-tangente' ||
    id === 'fpj-chronometre-bleu' ||
    id === 'mbf-lm101' ||
    id === 'lange-1' ||
    id === 'lange-zeitwerk' ||
    id === 'pp-worldtime'
  ) {
    lugStyle = 'straight-dress';
  }

  // 2. Authentic Crown System per Reference
  const isCasio = watch.brand === 'CASIO';
  const hasDateMechanism = Boolean(
    watch.hasDateWindow ||
      watch.hasDayWindow ||
      watch.hasMoonphase ||
      watch.hasCyclops ||
      watch.hasBigDate
  );
  const isScrewDown =
    !isCasio &&
    (watch.brand === 'ROLEX' ||
      id === 'omega-seamaster' ||
      id === 'tudor-bb58' ||
      id === 'vc-overseas' ||
      id === 'panerai-luminor' ||
      id === 'rm-tonneau' ||
      id === 'longines-zulu-time' ||
      id === 'blancpain-fifty-fathoms' ||
      id === 'doxa-sub300' ||
      id === 'moser-streamliner' ||
      id === 'iwc-big-pilot');

  let crownMode: CrownMode;
  if (isCasio) {
    crownMode = 'none';
  } else if (id === 'avi8-spitfire') {
    crownMode = 'meca-quartz';
  } else if (isScrewDown) {
    crownMode = hasDateMechanism ? 'screw-down-3pos' : 'screw-down-2pos';
  } else {
    crownMode = hasDateMechanism ? 'push-pull-3pos' : 'push-pull-2pos';
  }

  const supportsManualWind = !isCasio && !beatProfile.isQuartz;
  const supportsQuickSetDate = !isCasio && hasDateMechanism;
  const supportsHacking =
    !isCasio &&
    !beatProfile.isQuartz &&
    !beatProfile.isSpringDrive &&
    id !== 'ap-royal-oak' &&
    id !== 'pp-worldtime' &&
    id !== 'fpj-chronometre-bleu' &&
    id !== 'cartier-tank-louis' &&
    id !== 'cartier-crash' &&
    id !== 'piaget-polo-79' &&
    id !== 'mbf-lm101';

  const crownStops: CrownStopOption[] = [];
  if (crownMode === 'screw-down-3pos') {
    crownStops.push(
      { pos: 1, label: 'Pos 1 · Wind', shortLabel: 'Wind' },
      { pos: 2, label: watch.hasMoonphase ? 'Pos 2 · Date & Moon' : 'Pos 2 · Date', shortLabel: 'Date' },
      { pos: 3, label: supportsHacking ? 'Pos 3 · Hack & Set' : 'Pos 3 · Time Set', shortLabel: 'Set' }
    );
  } else if (crownMode === 'screw-down-2pos') {
    crownStops.push(
      { pos: 1, label: 'Pos 1 · Wind', shortLabel: 'Wind' },
      { pos: 3, label: supportsHacking ? 'Pos 2 · Hack & Set' : 'Pos 2 · Time Set', shortLabel: 'Set' }
    );
  } else if (crownMode === 'push-pull-3pos') {
    crownStops.push(
      { pos: 1, label: 'Pos 0 · Manual Wind', shortLabel: 'Wind' },
      { pos: 2, label: watch.hasMoonphase ? 'Pos 1 · Date & Moon' : 'Pos 1 · Date', shortLabel: 'Date' },
      { pos: 3, label: supportsHacking ? 'Pos 2 · Hack & Set' : 'Pos 2 · Time Set', shortLabel: 'Set' }
    );
  } else if (crownMode === 'push-pull-2pos') {
    crownStops.push(
      { pos: 1, label: 'Pos 0 · Manual Wind', shortLabel: 'Wind' },
      { pos: 3, label: supportsHacking ? 'Pos 1 · Hack & Set' : 'Pos 1 · Time Set', shortLabel: 'Set' }
    );
  } else if (crownMode === 'meca-quartz') {
    crownStops.push(
      { pos: 2, label: 'Pos 1 · Quick Date', shortLabel: 'Date' },
      { pos: 3, label: 'Pos 2 · Time Set', shortLabel: 'Set' }
    );
  }

  // 3. Authentic Bezel Rotation Mechanics (Unidirectional ISO Divers vs Bidirectional GMT/Slide-Rule/Yacht)
  let bezelDirection: BezelDirection = 'none';
  if (
    watch.bezelType === 'dive-cerachrom' ||
    watch.bezelType === 'seamaster'
  ) {
    bezelDirection = 'unidirectional';
  } else if (
    watch.bezelType === 'gmt-cerachrom' ||
    watch.bezelType === 'navitimer' ||
    watch.bezelType === 'yacht-cerachrom'
  ) {
    bezelDirection = 'bidirectional';
  }

  // 4. Faithful Allowed Belts, Alloys, Dials & Bezels per Watch
  let allowedBelts: BeltId[];
  if (isCasio || id === 'rm-tonneau') {
    allowedBelts = ['oysterflex'];
  } else if (
    id === 'bulgari-octo-finissimo' ||
    id === 'moser-streamliner' ||
    id === 'piaget-polo-79'
  ) {
    allowedBelts = ['bracelet'];
  } else if (
    id === 'ap-royal-oak' ||
    id === 'pp-nautilus' ||
    id === 'gp-laureato'
  ) {
    allowedBelts = ['bracelet', 'oysterflex'];
  } else if (
    id === 'cartier-tank-louis' ||
    id === 'cartier-crash' ||
    id === 'jlc-reverso' ||
    id === 'lange-1' ||
    id === 'lange-zeitwerk' ||
    id === 'fpj-chronometre-bleu' ||
    id === 'mbf-lm101' ||
    id === 'pp-worldtime' ||
    id === 'breguet-classique' ||
    id === 'nomos-tangente'
  ) {
    allowedBelts = ['leather'];
  } else if (
    id === 'omega-speedmaster' ||
    id === 'cartier-santos' ||
    id === 'gs-snowflake' ||
    id === 'gs-white-birch' ||
    id === 'hamilton-murph' ||
    id === 'zenith-el-primero' ||
    id === 'breitling-navitimer' ||
    id === 'iwc-big-pilot' ||
    id === 'tag-monaco' ||
    id === 'avi8-spitfire' ||
    id === 'longines-zulu-time'
  ) {
    allowedBelts = ['bracelet', 'leather'];
  } else {
    allowedBelts = ['bracelet', 'leather', 'oysterflex'];
  }

  let allowedAlloys: AlloyId[];
  if (isCasio) {
    allowedAlloys = ['default'];
  } else if (id === 'fpj-chronometre-bleu') {
    allowedAlloys = ['default'];
  } else if (id === 'bulgari-octo-finissimo' || id === 'rm-tonneau') {
    allowedAlloys = ['default', 'everose'];
  } else if (
    id === 'piaget-polo-79' ||
    id === 'cartier-crash' ||
    id === 'cartier-tank-louis' ||
    id === 'daydate' ||
    id === 'lange-1' ||
    id === 'lange-zeitwerk' ||
    id === 'pp-worldtime' ||
    id === 'breguet-classique' ||
    id === 'mbf-lm101'
  ) {
    allowedAlloys = ['default', 'yellow-gold', 'everose'];
  } else {
    allowedAlloys = ALL_ALLOYS;
  }

  let allowedDials: DialId[];
  if (watch.isDigitalDisplay) {
    allowedDials = ['default'];
  } else if (
    id === 'cartier-crash' ||
    id === 'lange-zeitwerk' ||
    id === 'mbf-lm101' ||
    id === 'pp-worldtime' ||
    id === 'casio-casioak-ga2100'
  ) {
    allowedDials = ['default'];
  } else if (
    id === 'cartier-tank-louis' ||
    id === 'jlc-reverso' ||
    id === 'breguet-classique' ||
    id === 'nomos-tangente' ||
    id === 'fpj-chronometre-bleu'
  ) {
    allowedDials = ['default', 'obsidian', 'royal-blue', 'champagne'];
  } else {
    allowedDials = ALL_DIALS;
  }

  let allowedBezels: BezelId[];
  if (id === 'gmt') {
    allowedBezels = ALL_BEZELS;
  } else if (id === 'submariner' || id === 'yachtmaster') {
    allowedBezels = ['default', 'obsidian', 'emerald'];
  } else {
    allowedBezels = ['default'];
  }

  // 5. True Lume, Exhibition Caseback, Timegrapher & Clasp Micro-Adjust Capabilities
  const noLumeIds: WatchModelId[] = [
    'cartier-tank-louis',
    'cartier-crash',
    'jlc-reverso',
    'breguet-classique',
    'fpj-chronometre-bleu',
    'mbf-lm101',
    'bulgari-octo-finissimo',
    'pp-worldtime',
    'nomos-tangente',
    'piaget-polo-79',
    'gs-snowflake',
    'gs-white-birch',
    'lange-1',
    'lange-zeitwerk',
    'casio-f91w',
    'casio-gshock-dw5600',
  ];
  const supportsLume = !noLumeIds.includes(id);
  const supportsExhibitionBack = !isCasio && !watch.hasReversoFlip;
  const supportsTimegrapher = !beatProfile.isQuartz;
  const supportsXray = true;

  return {
    lugStyle,
    crownMode,
    isScrewDownCrown: isScrewDown,
    crownStops,
    supportsManualWind,
    supportsQuickSetDate,
    supportsHacking,
    bezelDirection,
    hasInteractiveBezel: bezelDirection !== 'none',
    allowedAlloys,
    allowedDials,
    allowedBezels,
    allowedBelts,
    supportsLume,
    supportsExhibitionBack,
    supportsTimegrapher,
    supportsXray,
    hasMicroAdjustClasp: (beltId: BeltId) =>
      beltId === 'bracelet' || (beltId === 'oysterflex' && !isCasio),
  };
}

