// Single source of truth for brand values (GDD §9.1, §9.2, §9.6).
// A future rebrand should only need edits in this file.

export const brand = {
  orange: '#FF5B23',
  orangeLight: '#FF8A63',
  black: '#000000',
  white: '#FFFFFF',
  charcoal: '#232323',
  gray: '#A3A1A8',
  grayDark: '#6E6C73', // small secondary text (a11y-safe alternative to gray)
  fontHeading: "'Open Sans', system-ui, sans-serif", // used with font-stretch: 75% (condensed)
  fontBody: "'Open Sans', system-ui, sans-serif",
} as const;

/** Pixel ramps, ordered dark → light. */
export const ramps = {
  orange: ['#8A2A0B', '#C9401A', '#FF5B23', '#FF8A63', '#FFC4AE'],
  neutral: ['#000000', '#141414', '#232323', '#3A393E', '#6E6C73', '#A3A1A8', '#D6D5D9', '#F2F2F2', '#FFFFFF'],
  // Part ramps used by the Pip generator.
  body: ['#141414', '#232323', '#3A393E', '#6E6C73'],
  brain: ['#C9401A', '#FF8A63', '#FFC4AE', '#FFFFFF'],
  heart: ['#8A2A0B', '#C9401A', '#FF5B23', '#FF8A63'],
  steel: ['#3A393E', '#6E6C73', '#A3A1A8', '#D6D5D9'],
  paper: ['#A3A1A8', '#D6D5D9', '#FFFFFF', '#FFFFFF'],
  // Stat accent ramps (approved accents are the middle value).
  intellect: ['#5E4F8F', '#8E7CC3', '#B7AADD', '#DAD2F0'],
  craft: ['#3D5670', '#5C7C99', '#86A2BC', '#B5C8DA'],
  heartAccent: ['#A3304B', '#E0506E', '#F08BA0', '#F8C2CD'],
  authority: ['#1D6E68', '#2FA39A', '#6CCBC3', '#B0E6E1'],
} as const;

export type RampName = keyof typeof ramps;

export const statAccent = {
  intellect: '#8E7CC3',
  craft: '#5C7C99',
  heart: '#E0506E',
  authority: '#2FA39A',
} as const;

export const outlineColor = '#000000';
export const roomColors = { wall: '#F2F2F2', wallDot: '#E6E5E8', floor: '#D6D5D9', floorLine: '#232323' } as const;
