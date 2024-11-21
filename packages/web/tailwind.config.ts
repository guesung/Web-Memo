const baseConfig = require('@extension/tailwindcss-config');
const { withUI } = require('@extension/ui');

/** @type {import('tailwindcss').Config} */
module.exports = withUI({
  ...baseConfig,
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  plugins: [require('@tailwindcss/typography'), require('tailwindcss-animate')],
});
