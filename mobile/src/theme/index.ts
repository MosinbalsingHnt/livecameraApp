export const colors = {
  bg: '#0B0F14',
  surface: '#131A22',
  surfaceAlt: '#1B2430',
  border: '#243040',
  text: '#F3F6F9',
  muted: '#8A97A6',
  primary: '#22C55E',
  primarySoft: 'rgba(34,197,94,0.15)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.15)',
  info: '#3B82F6',
  infoSoft: 'rgba(59,130,246,0.15)',
  warn: '#F59E0B',
  warnSoft: 'rgba(245,158,11,0.15)',
  glass: 'rgba(11,15,20,0.72)',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

export const type = {
  title: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.3 },
  h2: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.4 },
};
