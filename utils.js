export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatUTCTime(date) {
  date = new Date(Date.parse(date)) ?? new Date();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const amOrPm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;

  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

  return `${formattedHours}:${formattedMinutes} ${amOrPm}`;
}