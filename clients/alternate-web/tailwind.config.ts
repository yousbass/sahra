import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Cairo', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Cairo', 'sans-serif'],
      },
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
        // Legacy scales overridden with Camp Glow equivalents
        terracotta: {
          50: '#FEF8F0',
          100: '#FDEEDC',
          200: '#FCD7AE',
          300: '#F9BC7A',
          400: '#F6A44F',
          500: '#F0A03C', // Lantern Amber
          600: '#E08323',
          700: '#BB651E',
          800: '#95501E',
          900: '#78431C',
          950: '#41200D',
        },
        sand: {
          50: '#141829',
          100: '#111524',
          200: '#0E111F',
          300: '#0B0E1A',
          400: '#0A0C16',
          500: '#0A1128', // Night Indigo
          600: '#080E21',
          700: '#060B1A',
          800: '#040713',
          900: '#02040C',
          950: '#010206',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'warm': '0 4px 30px -10px rgba(0, 0, 0, 0.5), 0 0 10px rgba(240, 160, 60, 0.2)',
        'warm-hover': '0 8px 40px -10px rgba(0, 0, 0, 0.6), 0 0 15px rgba(240, 160, 60, 0.4)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;