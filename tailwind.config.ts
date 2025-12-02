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
        // Modern warm earth tones
        terracotta: {
          50: '#FFF5F0',
          100: '#FFE8DC',
          200: '#FFD4C4',
          300: '#FFB8A0',
          400: '#FF9B7C',
          500: '#E07A5F',
          600: '#C86A50',
          700: '#A85642',
          800: '#884435',
          900: '#6B3529',
          950: '#4D251D',
        },
        sand: {
          50: '#FDFCFB',
          100: '#F9F6F3',
          200: '#F3EDE7',
          300: '#EAE0D5',
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