export const formatTime = (value) => (value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—');
export const formatDate = (value) => (value ? new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
export const formatDateTime = (value) => (value ? `${formatDate(value)}, ${formatTime(value)}` : '—');

export function timeAgo(value) {
  if (!value) return '';
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days} day${days === 1 ? '' : 's'} ago` : formatDate(value);
}

export const minutesBetween = (from, to) => (from && to ? Math.max(0, Math.round((new Date(to) - new Date(from)) / 60000)) : null);
export const minutes = (value) => (value === null || value === undefined ? '—' : `${value} min`);
export const initial = (name) => name?.trim()?.[0]?.toUpperCase() || 'U';
const TITLES = /^(dr|mr|mrs|ms|miss|prof|engr|atty|sir|maam|ma'am)\.?$/i;
export const firstName = (name) => name?.trim()?.split(/\s+/).find((part) => !TITLES.test(part)) || 'there';

export function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}
