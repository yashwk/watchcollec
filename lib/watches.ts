import type { StaticImageData } from 'next/image';
import submarinerImg from '@/src/assets/images/watch_submariner_macro_1794940069206.jpg';
import daytonaImg from '@/src/assets/images/watch_daytona_macro_1794940069486.jpg';
import datejustImg from '@/src/assets/images/watch_datejust_macro_1794940070792.jpg';
import gmtImg from '@/src/assets/images/watch_gmt_macro_1794940071849.jpg';

export type WatchCategoryId = 'rolex' | 'others';
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
  | 'ap-royal-oak'
  | 'pp-nautilus'
  | 'cartier-santos'
  | 'jlc-reverso'
  | 'gs-snowflake'
  | 'lange-1'
  | 'rm-tonneau';

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
export type CameraPresetId = 'hero' | 'dial' | 'profile' | 'caliber';
export type LightingModeId = 'atelier' | 'vault' | 'nocturne' | 'alpine' | 'bronze';

export type WatchBrand =
  | 'ROLEX'
  | 'AVI-8'
  | 'OMEGA'
  | 'AUDEMARS PIGUET'
  | 'PATEK PHILIPPE'
  | 'CARTIER'
  | 'JAEGER-LECOULTRE'
  | 'GRAND SEIKO'
  | 'A. LANGE & SÖHNE'
  | 'RICHARD MILLE';

export interface WatchHotspot {
  id: string;
  label: string;
  title: string;
  detail: string;
  camPos: [number, number, number];
  camTarget: [number, number, number];
}

export interface WatchSpec {
  id: WatchModelId;
  category: WatchCategoryId;
  brand: WatchBrand;
  name: string;
  collection: string;
  reference: string;
  yearIntroduced: string;
  tagline: string;
  description: string;
  caseShape?: 'round' | 'octagonal' | 'cushion' | 'square' | 'rectangular' | 'tonneau';
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
    | 'royal-oak'
    | 'nautilus'
    | 'santos'
    | 'reverso'
    | 'tonneau';
  braceletType: 'oyster' | 'jubilee' | 'president' | 'royal-oak' | 'nautilus' | 'santos';
  hasCyclops: boolean;
  hasDateWindow?: boolean;
  hasDayWindow?: boolean;
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
  gmtHandColorHex?: number;
  defaultAlloy: Exclude<AlloyId, 'default'>;
  defaultDial: Exclude<DialId, 'default'>;
  defaultBezel: Exclude<BezelId, 'default'>;
  defaultBelt?: BeltId;
  bezelPrimaryHex: string;
  bezelSecondaryHex?: string;
  image: StaticImageData;
}

export const WATCH_CATEGORIES: { id: WatchCategoryId; label: string }[] = [
  { id: 'rolex', label: 'Rolex' },
  { id: 'others', label: 'Others' },
];

export const WATCH_MODELS: WatchSpec[] = [
  {
    id: 'submariner',
    category: 'rolex',
    brand: 'ROLEX',
    name: 'Submariner Date',
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
    category: 'rolex',
    brand: 'ROLEX',
    name: 'Cosmograph Daytona',
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
    category: 'rolex',
    brand: 'ROLEX',
    name: 'Datejust 36',
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
    category: 'rolex',
    brand: 'ROLEX',
    name: 'GMT-Master II',
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
    category: 'rolex',
    brand: 'ROLEX',
    name: 'Day-Date 40',
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
    category: 'rolex',
    brand: 'ROLEX',
    name: 'Explorer II',
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
    category: 'rolex',
    brand: 'ROLEX',
    name: 'Milgauss',
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
    category: 'rolex',
    brand: 'ROLEX',
    name: 'Sky-Dweller',
    collection: 'Oyster Perpetual',
    reference: '336934',
    yearIntroduced: '2012',
    tagline: 'Dual time zones and Saros annual calendar.',
    description:
      'Rolex’s most intricate traveler timepiece uniting an off-center 24-hour rotating GMT disc, twelve outer month indicator apertures, and the fluted Ring Command bezel.',
    caseDiameterMm: 42,
    caseThicknessMm: 13.8,
    caliber: 'Caliber 9002',
    frequency: '28,800 vph (4 Hz)',
    powerReserve: '72 hours',
    waterResistance: '100 m / 330 ft',
    bezelType: 'fluted',
    braceletType: 'jubilee',
    hasCyclops: true,
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
    category: 'rolex',
    brand: 'ROLEX',
    name: 'Yacht-Master 42',
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
    category: 'others',
    brand: 'AVI-8',
    name: 'Spitfire Lock Chronograph',
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
    category: 'others',
    brand: 'OMEGA',
    name: 'Speedmaster Moonwatch',
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
    category: 'others',
    brand: 'AUDEMARS PIGUET',
    name: 'Royal Oak "Jumbo"',
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
    category: 'others',
    brand: 'PATEK PHILIPPE',
    name: 'Nautilus 5711',
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
    category: 'others',
    brand: 'CARTIER',
    name: 'Santos de Cartier',
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
    category: 'others',
    brand: 'JAEGER-LECOULTRE',
    name: 'Reverso Tribute Duoface',
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
    defaultAlloy: 'oystersteel',
    defaultDial: 'royal-blue',
    defaultBezel: 'obsidian',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#D8DCE0',
    image: datejustImg,
  },
  {
    id: 'gs-snowflake',
    category: 'others',
    brand: 'GRAND SEIKO',
    name: 'Heritage "Snowflake"',
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
    category: 'others',
    brand: 'A. LANGE & SÖHNE',
    name: 'Lange 1 Moonphase',
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
    defaultAlloy: 'everose',
    defaultDial: 'panda',
    defaultBezel: 'obsidian',
    defaultBelt: 'leather',
    bezelPrimaryHex: '#D79880',
    image: datejustImg,
  },
  {
    id: 'rm-tonneau',
    category: 'others',
    brand: 'RICHARD MILLE',
    name: 'RM 11-03 Tonneau',
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
    title: 'Winding Crown & Pushers',
    detail: 'Pull crown to wind time across midnight, or click piston/screw pushers to run the chronograph.',
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
    detail: 'Integrated links, folding deployant Oysterlock, or stitched leather strap with sculpted pin tang buckle.',
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
  { id: 'oysterflex', label: 'Oysterflex' },
];

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
  const effective = alloyId === 'default' ? watch.defaultAlloy : alloyId;
  return ALLOY_OPTIONS.find((a) => a.id === effective) ?? ALLOY_OPTIONS[1];
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
  const effective = dialId === 'default' ? watch.defaultDial : dialId;
  return DIAL_OPTIONS.find((d) => d.id === effective) ?? DIAL_OPTIONS[1];
}

export function resolveBezel(watch: WatchSpec, bezelId: BezelId): BezelOption {
  const effective = bezelId === 'default' ? watch.defaultBezel : bezelId;
  return BEZEL_OPTIONS.find((b) => b.id === effective) ?? BEZEL_OPTIONS[1];
}

export function getWatchById(id: WatchModelId): WatchSpec {
  return WATCH_MODELS.find((w) => w.id === id) ?? WATCH_MODELS[0];
}
