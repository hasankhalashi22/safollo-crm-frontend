/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#E6F4F1',
          100: '#C0E4DD',
          200: '#96D2C8',
          300: '#6BBFB2',
          400: '#47B0A1',
          500: '#1A7A6E',
          600: '#156B60',
          700: '#0F5950',
          800: '#0A4740',
          900: '#053530',
        },
        accent: {
          DEFAULT: '#E07B28',
          light: '#FEF3E8',
        },
        dark: '#1C2B2A',
      },
      fontFamily: {
        sans: ['Hind Siliguri', 'sans-serif'],
        display: ['Tiro Bangla', 'serif'],
      },
      boxShadow: {
        'card': '0 2px 12px rgba(26, 122, 110, 0.08)',
        'card-hover': '0 8px 24px rgba(26, 122, 110, 0.15)',
      },
    },
  },
  plugins: [],
}
