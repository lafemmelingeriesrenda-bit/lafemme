import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: ['./app/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wine: {
          50: '#fcf1f4',
          100: '#f9e2e8',
          200: '#f2c3cf',
          300: '#e698ab',
          400: '#d96680',
          500: '#c93a5c',
          600: '#a5213f',
          700: '#7f1530',
          800: '#5a0b22',
          900: '#3d0016',
          950: '#29000f'
        },
        brand: '#3d0016',
        'brand-light': '#7f1530',
        'brand-dark': '#29000f',
        cream: '#faf6f1',
        champagne: '#f3e9dc',
        ink: '#1a0a10'
      },
      fontFamily: {
        display: ['"Playfair Display"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        luxe: '1.25rem'
      },
      boxShadow: {
        soft: '0 4px 20px -4px rgb(61 0 22 / 0.12)',
        luxe: '0 12px 40px -8px rgb(61 0 22 / 0.28)'
      }
    }
  }
}
