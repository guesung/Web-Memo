import baseConfig from '@extension/tailwindcss-config';
import { withUI } from '@extension/ui';

/** @type {import('tailwindcss').Config} */
export default withUI({
  ...baseConfig,
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  plugins: [require('@tailwindcss/typography'), require('tailwindcss-animate')],
});
