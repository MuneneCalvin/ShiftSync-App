import { format, startOfISOWeek, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export function getWeekDays(weekOf: Date): Date[] {
  const monday = startOfISOWeek(weekOf);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function formatShiftTime(isoString: string, timezone: string): string {
  const zoned = toZonedTime(new Date(isoString), timezone);
  return format(zoned, 'h:mm a');
}

export function formatShiftDate(isoString: string, timezone: string): string {
  const zoned = toZonedTime(new Date(isoString), timezone);
  return format(zoned, 'EEE MMM d');
}

export function getCurrentWeekOf(): string {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const daysToMonday = utcDay === 0 ? -6 : 1 - utcDay;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToMonday));
  return monday.toISOString();
}

export function addWeeksToISO(isoString: string, weeks: number): string {
  const date = new Date(isoString);
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return date.toISOString();
}

export function formatWeekLabel(isoString: string): string {
  const d = new Date(isoString);
  const end = new Date(isoString);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${format(d, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
}
