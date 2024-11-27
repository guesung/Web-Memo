export const isProduction = process.env.NODE_ENV === 'production';
export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
