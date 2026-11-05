export type SealParts = {
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
};

const YEARS_AHEAD = 24;

export const toDate = ({ day, month, year, hour, minute }: SealParts) =>
  new Date(year, month, day, hour, minute);

export const monthHasDay = (day: number, month: number) =>
  new Date(2024, month + 1, 0).getDate() >= day;

const dateExists = (day: number, month: number, year: number) =>
  new Date(year, month, day).getMonth() === month;

export function openYears(day: number, month: number, now: Date): number[] {
  const years: number[] = [];
  for (let year = now.getFullYear(); years.length < YEARS_AHEAD; year++) {
    if (dateExists(day, month, year) && new Date(year, month, day, 23, 59) > now) {
      years.push(year);
    }
  }
  return years;
}

export const isHourOpen = (parts: SealParts, hour: number, now: Date) =>
  toDate({ ...parts, hour, minute: 59 }) > now;

export const isMinuteOpen = (parts: SealParts, minute: number, now: Date) =>
  toDate({ ...parts, minute }) > now;

export function settle(parts: SealParts, now: Date): SealParts {
  let { month, hour, minute } = parts;

  while (!monthHasDay(parts.day, month)) month = (month + 1) % 12;

  const years = openYears(parts.day, month, now);
  const year = years.includes(parts.year) ? parts.year : (years[0] as number);

  const dated = { ...parts, month, year };
  while (!isHourOpen({ ...dated, hour }, hour, now)) hour++;
  while (!isMinuteOpen({ ...dated, hour, minute }, minute, now)) minute++;

  return { ...dated, hour, minute };
}

export function firstParts(now: Date): SealParts {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    day: tomorrow.getDate(),
    month: tomorrow.getMonth(),
    year: tomorrow.getFullYear(),
    hour: tomorrow.getHours(),
    minute: tomorrow.getMinutes(),
  };
}
