/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Цвета задаются через CSS-переменные (см. src/index.css).
      // Используем rgb(var(--name) / <alpha-value>) — Tailwind подставит alpha
      // при использовании суффикса /N (например, bg-accent/15).
      colors: {
        bg: {
          DEFAULT: 'rgb(var(--bg) / <alpha-value>)',
          elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
          hover: 'rgb(var(--bg-hover) / <alpha-value>)',
          card: 'rgb(var(--bg-card) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
        },
        text: {
          DEFAULT: 'rgb(var(--text) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
          dim: 'rgb(var(--text-dim) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          dim: 'rgb(var(--accent-dim) / <alpha-value>)',
          bg: 'rgb(var(--accent-bg) / <alpha-value>)',
        },
        success: 'rgb(var(--success) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.875rem' }],
      },
      maxWidth: {
        app: '640px',
      },
    },
  },
  plugins: [],
};
