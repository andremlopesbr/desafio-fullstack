/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.tsx', 'node_modules/flowbite-react/lib/esm/**/*.js'],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
        '2xl': '1536px',
        '3xl': '1920px',
      },
    },
  },
  plugins: [require('flowbite/plugin')],
}

