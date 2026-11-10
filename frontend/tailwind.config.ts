/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1320px' },
    },
    extend: {
      colors: {
        border: '#E2E8F0',
        input: '#E2E8F0',
        ring: '#2563EB',
        background: '#F8FAFC',
        foreground: '#0F172A',
        primary: {
          DEFAULT: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          900: '#1E3A8A',
          foreground: '#FFFFFF',
        },
        soft: '#EFF6FF',
        muted: {
          DEFAULT: '#F1F5F9',
          foreground: '#64748B',
        },
        success: { DEFAULT: '#16A34A', soft: '#DCFCE7', foreground: '#166534' },
        warning: { DEFAULT: '#D97706', soft: '#FEF3C7', foreground: '#92400E' },
        danger: { DEFAULT: '#DC2626', soft: '#FEE2E2', foreground: '#991B1B' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: [
          'Plus Jakarta Sans',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'Segoe UI',
          'sans-serif',
        ],
      },
      borderRadius: {
        xl: '0.85rem',
        '2xl': '1.15rem',
        '3xl': '1.6rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 30px -18px rgba(15, 23, 42, 0.18)',
        pop: '0 18px 50px -20px rgba(15, 23, 42, 0.3)',
        focus: '0 0 0 4px rgba(37, 99, 235, 0.12)',
        glass:
          '0 18px 44px -24px rgba(30, 64, 175, 0.38), 0 2px 10px -6px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.72)',
        'glass-lg':
          '0 30px 80px -30px rgba(30, 64, 175, 0.45), 0 4px 16px -8px rgba(15, 23, 42, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.78)',
        'glass-sm':
          '0 8px 24px -16px rgba(30, 64, 175, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.65)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(0, -18px, 0) scale(1.04)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '33%': { transform: 'translate3d(16px, -12px, 0)' },
          '66%': { transform: 'translate3d(-12px, 10px, 0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
        float: 'float 9s ease-in-out infinite',
        drift: 'drift 16s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
