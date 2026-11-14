/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta ChAgro: ajustar aquí para cambiar el look global
        brand: {
          50: '#effaf3',
          100: '#d8f3e1',
          200: '#b3e6c6',
          300: '#80d2a3',
          400: '#4bb77d',
          500: '#289b61',
          600: '#1a7d4d',
          700: '#166440',
          800: '#145035',
          900: '#11422d',
        },
        water: {
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        alert: {
          ok: '#22c55e',
          warn: '#f59e0b',
          critical: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
