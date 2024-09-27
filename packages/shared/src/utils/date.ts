export function formatDate(date: Date): string;
export function formatDate(date: string): string;
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') date = new Date(date);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}
