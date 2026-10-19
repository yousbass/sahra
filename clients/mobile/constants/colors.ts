/**
 * Semantic design tokens for MUKHYMAT mobile app.
 * "Camp Glow" identity: lantern amber light against a night-indigo sky,
 * with Gulf teal as the kashta (beachfront) category accent.
 */

const colors = {
  light: {
    text: '#0A1128',
    tint: '#F0A03C', // Lantern amber for tint/active states
    background: '#FDFBF7', // Warm ivory light surfaces
    foreground: '#0A1128', // Night indigo text/icons
    card: '#FFFFFF',
    cardForeground: '#0A1128',
    primary: '#F0A03C', // Lantern amber for CTAs/ratings
    primaryForeground: '#0A1128', // Indigo on amber (amber is too light for white text)
    secondary: '#EAE0D5', // Muted sand
    secondaryForeground: '#0A1128',
    muted: '#F2ECE4',
    mutedForeground: '#7A7F8D',
    accent: '#0A1128', // Indigo accents
    accentForeground: '#FFFFFF',
    destructive: '#D9534F',
    destructiveForeground: '#FFFFFF',
    border: '#EAE0D5',
    input: '#EAE0D5',
    kashta: '#177E89', // Gulf teal — kashta category accent
    kashtaSoft: '#E3F1F3',
    kashtaText: '#136A75', // Darker teal: ≥4.5:1 on kashtaSoft for small text
    // Accessible success (≥4.5:1 on successBg, WCAG AA)
    success: '#047857',           // emerald-800 — confirmed/paid/active status text
    successBg: '#D1FAE5',         // emerald-100 — confirmed/paid/active status background
    successForeground: '#FFFFFF', // white text on dark emerald (#047857) fills
  },
  dark: {
    text: '#FDFBF7',
    tint: '#F0A03C',
    background: '#0A1128', // Night indigo background
    foreground: '#FDFBF7', // Cream text
    card: '#121A3B', // Slightly lighter indigo for cards
    cardForeground: '#FDFBF7',
    primary: '#F0A03C', // Lantern amber for CTAs
    primaryForeground: '#0A1128',
    secondary: '#1A2345',
    secondaryForeground: '#FDFBF7',
    muted: '#1A2345',
    mutedForeground: '#A0A6BB',
    accent: '#1D274A',
    accentForeground: '#FFFFFF',
    destructive: '#E06B67',
    destructiveForeground: '#FFFFFF',
    border: '#2B355A',
    input: '#2B355A',
    kashta: '#2BA3AF', // Brighter Gulf teal for dark surfaces
    kashtaSoft: '#12333A',
    kashtaText: '#3FB6C2', // Lighter teal: ≥4.5:1 on kashtaSoft for small text
    // Accessible success for dark mode (dark text on light success background)
    success: '#6EE7B7',           // emerald-300 — readable on dark surfaces
    successBg: '#064E3B',         // emerald-900 — confirmed/paid/active bg on dark
    successForeground: '#064E3B', // dark emerald text on light emerald (#6EE7B7) fills
  },
  radius: 16,
};

export default colors;
