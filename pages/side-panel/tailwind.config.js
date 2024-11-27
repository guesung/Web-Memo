import baseConfig from '@extension/tailwindcss-config';
import { withUI } from '@extension/ui';

/** @type {import('tailwindcss').Config} */
export default withUI({
  ...baseConfig,
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
});
