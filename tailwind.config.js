/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // MADAR brand colors (from logo)
        navy: {
          DEFAULT: '#0D1B3E',
          950: '#04091A',
          900: '#080E26',
          800: '#0D1B3E',
          700: '#1A3060',
          600: '#1E3A70',
          500: '#2A4F96',
          400: '#4472C4',
          100: '#D6E4FF',
          50:  '#EBF2FF',
        },
        sky: {
          DEFAULT: '#00BFFF',
          dark:    '#0099CC',
          light:   '#E0F7FF',
          50:      '#E0F7FF',
          100:     '#B3EDFF',
          300:     '#4DD6FF',
          400:     '#19CCFF',
          500:     '#00BFFF',
          600:     '#0099CC',
          700:     '#007399',
        },
        // Keep for dashboard compatibility
        primary: {
          DEFAULT: '#0D1B3E',
          50: '#EBF2FF',
          100: '#D6E4FF',
          200: '#ADC8FF',
          300: '#7AAAFF',
          400: '#4472C4',
          500: '#0D1B3E',
          600: '#0A1630',
          700: '#070F22',
          800: '#040A18',
          900: '#02050E',
        },
        gold: {
          DEFAULT: '#D4A853',
          400: '#E4B86B',
          500: '#D4A853',
        },
      },
      fontFamily: {
        cairo: ['Alexandria', 'sans-serif'],
        tajawal: ['IBM Plex Sans Arabic', 'sans-serif'],
        outfit: ['Sora', 'sans-serif'],
        work: ['Manrope', 'sans-serif'],
        sora: ['Sora', 'sans-serif'],
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(13,27,62,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(13,27,62,0.04) 1px, transparent 1px)',
        'radial-glow': 'radial-gradient(ellipse at center, rgba(0,191,255,0.10) 0%, transparent 70%)',
        'hero-gradient': 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(0,191,255,0.12) 0%, transparent 60%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'brand-gradient': 'linear-gradient(135deg, #0D1B3E, #00BFFF)',
      },
      backgroundSize: { grid: '64px 64px' },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 8s ease infinite',
        'spin-slow': 'spin 20s linear infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'aurora': 'aurora 15s ease infinite',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'blob': 'blob 7s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-18px)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        aurora: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
        },
      },
      boxShadow: {
        'glass': '0 4px 24px rgba(13,27,62,0.08)',
        'glass-lg': '0 8px 48px rgba(13,27,62,0.10)',
        'glow': '0 0 30px rgba(0,191,255,0.25)',
        'glow-sm': '0 0 15px rgba(0,191,255,0.18)',
        'glow-lg': '0 0 60px rgba(0,191,255,0.3)',
        'card': '0 2px 16px rgba(13,27,62,0.06)',
        'card-hover': '0 8px 32px rgba(0,191,255,0.14)',
        'navy': '0 4px 24px rgba(13,27,62,0.18)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
