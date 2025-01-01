import baseConfig from '@extension/tailwindcss-config';

/** @type {import('tailwindcss').Config} */
export default {
  ...baseConfig,
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@extension/ui/lib/**/*.{tsx,ts,js,jsx}',
    './node_modules/@extension/ui/src/**/*.{tsx,ts,js,jsx}',
  ],
};
