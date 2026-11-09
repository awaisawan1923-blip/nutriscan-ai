import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        fg: 'var(--fg)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        soft: 'var(--soft)',
        primary: { DEFAULT: '#16A36A', dark: '#0f7f52' },
        accent: '#67DDA3',
        ink: '#14251F',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,37,31,.04), 0 8px 24px -12px rgba(20,37,31,.10)',
      },
      borderRadius: { '2xl': '1.25rem', '3xl': '1.75rem' },
    },
  },
  plugins: [],
};
export default config;
