export const checkStringArray = (value: unknown): value is string[] => {
  if (Array.isArray(value) && value.every(item => typeof item === 'string')) return true;
  return false;
};
