export function formatDate(date: Date | string | number, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-IE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options
  }).format(new Date(date))
}
