/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        surface: {
          0:   '#ffffff',
          50:  '#f8f9fb',
          100: '#f1f3f7',
          200: '#e4e7ef',
          300: '#d1d5e0',
          400: '#9ca3b0',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'sm':  '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'md':  '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'lg':  '0 10px 30px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04)',
        'xl':  '0 20px 40px rgba(0,0,0,0.12)',
        'brand-sm': '0 2px 8px rgba(79, 70, 229, 0.18)',
        'brand-md': '0 4px 16px rgba(79, 70, 229, 0.25)',
      }
    },
  },
  plugins: [],
}
