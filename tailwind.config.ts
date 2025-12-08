import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // MUKHYMAT warm earth tones - browns and oranges
        terracotta: {
          50: '#FFF5F0',
          100: '#FFE8DC',
          200: '#FFD4C4',
          300: '#FFB8A0',
          400: '#FF9B7C',
          500: '#8B5A3C',
          600: '#6B4423',
          700: '#5A3820',
          800: '#4A2F1A',
          900: '#3A2515',
          950: '#2A1A10',
        },
        sand: {
          50: '#F5E6D3',
          100: '#FFE4B5',
          200: '#FFA566',
          300: '#FF8C42',
          400: '#DED0C0',
          500: '#C9B8A5',
          600: '#B09A84',
          700: '#8F7D68',
          800: '#6F6250',
          900: '#544A3D',
          950: '#3A342B',
        },
        sage: {
          50: '#F7F9F8',
          100: '#EDF2F0',
          200: '#D9E5E0',
          300: '#BDD4CB',
          400: '#9EBFB3',
          500: '#7FA89A',
          600: '#648C7E',
          700: '#4F7165',
          800: '#3D5850',
          900: '#2E433D',
          950: '#1F2E2A',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;