/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0908',
          elevated: '#171513',
          hover: '#1f1c19',
          card: '#13110f',
        },
        border: {
          DEFAULT: '#2a2622',
          subtle: '#1f1c19',
        },
        text: {
          DEFAULT: '#f5f1ea',
          muted: '#a0978a',
          dim: '#6b6358',
        },
        accent: {
          DEFAULT: '#f9a826',
          dim: '#c9851d',
          bg: '#3a2810',
        },
        success: '#7cc77a',
        danger: '#e07b6a',
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
