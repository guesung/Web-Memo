import baseConfig from '@extension/tailwindcss-config';

/** @type {import('tailwindcss').Config} */
export default {
  ...baseConfig,
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
};
