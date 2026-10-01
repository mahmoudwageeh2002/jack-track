export const lightColors = {
  background: '#F8FBF9',
  surface: '#FFFFFF',
  surfaceMuted: '#EEFAEE',
  evergreen: '#0F3A32',
  primary: '#0B9868',
  active: '#2CBD8E',
  mint: '#49C2A3',
  softMint: '#D8F9DD',
  text: '#0F3A32',
  textMuted: '#506760',
  border: '#DDE8E2',
  danger: '#D9485F',
  warning: '#D68B22',
  white: '#FFFFFF',
} as const;

export const darkColors = {
  background: '#071A17',
  surface: '#0D2722',
  surfaceMuted: '#12352D',
  evergreen: '#DDF7EA',
  primary: '#31C891',
  active: '#47D7A6',
  mint: '#58CBB0',
  softMint: '#174B3D',
  text: '#ECFFF6',
  textMuted: '#A8C4B9',
  border: '#24473E',
  danger: '#FF7588',
  warning: '#F3B45C',
  white: '#FFFFFF',
} as const;

export type AppColors = { [K in keyof typeof lightColors]: string };
