export type NavStyleId = 'wheel' | 'spine';

export const NAV_STYLE_OPTIONS: {
  id: NavStyleId;
  label: string;
  hint: string;
}[] = [
  { id: 'wheel', label: 'Bezel Wheel', hint: 'Continuous rotating radial complication wheel' },
  { id: 'spine', label: 'Edge Spine', hint: 'Floating right-edge Maison accordion (Backup)' },
];
