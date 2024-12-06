import baseConfig from '@extension/tailwindcss-config';

/** @type {import('tailwindcss').Config} */
export default {
  ...baseConfig,
  content: ['index.html', './src/**/*.{js,ts,jsx,tsx}'],
};
