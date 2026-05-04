import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Base Colors (Dark Theme) — using rgb() pattern for opacity modifier support
        background: 'var(--bg-dark)',
        surface: 'rgb(var(--surface-dark-rgb) / <alpha-value>)',
        'surface-light': 'rgb(var(--surface-hover-rgb) / <alpha-value>)',
        border: 'rgba(255, 255, 255, 0.07)',

        // Brand Colors — #4A9EFF (Zenbourg Blue)
        primary: {
          DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
          hover: '#3A8EEF',
          light: 'var(--primary-glow)',
        },

        // Status Colors
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',

        // Text Colors
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-disabled': '#4B5563',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['11px', { lineHeight: '16px' }],
        sm: ['12px', { lineHeight: '18px' }],
        base: ['14px', { lineHeight: '20px' }],
        lg: ['16px', { lineHeight: '24px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['32px', { lineHeight: '40px' }],
      },
      spacing: {
        '18': '72px',
        '22': '88px',
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        full: '9999px',
      },
      boxShadow: {
        'card': '0 6px 16px rgba(0,0,0,0.08)',
        'card-hover': '0 6px 20px rgba(0,0,0,0.12)',
        'subtle': '0 1px 2px rgba(0,0,0,0.05)',
      },
      screens: {
        'xs': '480px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}

export default config
