import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class', "[data-theme='dark']"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'VT323', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
        pixel: ['var(--font-pixel)', 'Press Start 2P', 'monospace'],
        display: ['var(--font-display)', 'Pixelify Sans', 'sans-serif'],
        title: ['var(--font-title, var(--font-display))', 'Pixelify Sans', 'system-ui', 'sans-serif'],
        default: ['var(--font-reading, var(--font-sans))', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
        surface: 'hsl(var(--soft-bg-surface-hsl) / <alpha-value>)',
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
        soft: {
          bg: {
            base: 'hsl(var(--soft-bg-base-hsl) / <alpha-value>)',
            surface: 'hsl(var(--soft-bg-surface-hsl) / <alpha-value>)',
            elevated: 'hsl(var(--soft-bg-elevated-hsl) / <alpha-value>)',
            inset: 'hsl(var(--soft-bg-inset-hsl) / <alpha-value>)',
          },
          text: {
            primary: 'hsl(var(--soft-text-primary-hsl) / <alpha-value>)',
            secondary: 'hsl(var(--soft-text-secondary-hsl) / <alpha-value>)',
            tertiary: 'hsl(var(--soft-text-tertiary-hsl) / <alpha-value>)',
            muted: 'hsl(var(--soft-text-tertiary-hsl) / <alpha-value>)',
          },
          accent: 'hsl(var(--soft-accent-hsl) / <alpha-value>)',
          border: 'hsl(var(--soft-border-hsl) / <alpha-value>)',
          primary: 'hsl(var(--soft-accent-hsl) / <alpha-value>)',
        },
        base: 'var(--bg-app)',
        glass: 'var(--ds-panel)',
        elevated: 'var(--ds-panel-elevated)',
        tertiary: 'var(--ds-panel-soft)',
        'panel-left': 'var(--bg-panel-left)',
        'panel-center': 'var(--bg-panel-center)',
        'panel-right': 'var(--bg-panel-right)',
        container: 'var(--border-light)',
        beam: 'var(--ds-brand-subtle)',
      },
      borderRadius: {
        lg: '0px',
        md: '0px',
        sm: '0px',
        'soft-sm': '0px',
        'soft-md': '0px',
        'soft-lg': '0px',
        xl2: '0px',
      },
      boxShadow: {
        'pixel-sm': '2px 2px 0 0 hsl(var(--pixel-shadow-color))',
        pixel: '4px 4px 0 0 hsl(var(--pixel-shadow-color))',
        'pixel-lg': '6px 6px 0 0 hsl(var(--pixel-shadow-color))',
        'pixel-inset': 'inset 2px 2px 0 0 rgba(0, 0, 0, 0.25)',
        'soft-sm': '2px 2px 0 0 hsl(var(--pixel-shadow-color))',
        'soft-md': '4px 4px 0 0 hsl(var(--pixel-shadow-color))',
        'soft-lg': '6px 6px 0 0 hsl(var(--pixel-shadow-color))',
        'soft-inset': '0 0 0 0 transparent',
        'soft-card': '4px 4px 0 0 hsl(var(--pixel-shadow-color))',
        soft: '8px 8px 0 0 hsl(var(--pixel-shadow-color))',
        card: '4px 4px 0 0 hsl(var(--pixel-shadow-color))',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'collapsible-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-collapsible-content-height)' },
        },
        'collapsible-up': {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(24px, -18px) scale(1.05)' },
          '66%': { transform: 'translate(-18px, 18px) scale(0.95)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
        caret: {
          '0%, 100%': { opacity: '0.2' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'collapsible-down': 'collapsible-down 0.2s ease-out',
        'collapsible-up': 'collapsible-up 0.2s ease-out',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        blob: 'blob 12s ease-in-out infinite',
        breathe: 'breathe 2.6s ease-in-out infinite',
        caret: 'caret 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config
