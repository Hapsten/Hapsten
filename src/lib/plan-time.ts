export type DayOption = {
  offset: number;
  label: string;
  date: Date;
};

export const TIME_STEP_MIN = 30;
export const MIN_START_MIN = 6 * 60; // 06:00
export const MAX_START_MIN = 23 * 60; // 23:00
export const DURATION_OPTIONS = [60, 90, 120] as const;

export function formatMinutes(minutes: number): string {
  const hours24 = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${mins.toString().padStart(2, '0')} ${suffix}`;
}

export function formatTime(value: Date | { toDate: () => Date } | null | undefined): string {
  const date = toDate(value);
  if (!date) return '--:--';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatWindow(
  start: Date | { toDate: () => Date } | null | undefined,
  end: Date | { toDate: () => Date } | null | undefined,
): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatDayLabel(value: Date | { toDate: () => Date } | null | undefined): string {
  const date = toDate(value);
  if (!date) return '';
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function dayOptions(count = 5): DayOption[] {
  return Array.from({ length: count }, (_, offset) => {
    const date = startOfDay(new Date());
    date.setDate(date.getDate() + offset);
    const label =
      offset === 0
        ? 'Today'
        : offset === 1
          ? 'Tomorrow'
          : date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
    return { offset, label, date };
  });
}

export function defaultStartMinutes(): number {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const nextSlot = Math.ceil((current + 60) / TIME_STEP_MIN) * TIME_STEP_MIN;
  return Math.min(Math.max(nextSlot, 18 * 60), MAX_START_MIN);
}

/** Late at night the first sensible slot is tomorrow evening. */
export function defaultDayOffset(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() >= MAX_START_MIN ? 1 : 0;
}

export function buildWindow(
  dayOffset: number,
  startMinutes: number,
  durationMin: number,
): { startAt: Date; endAt: Date } {
  const startAt = startOfDay(new Date());
  startAt.setDate(startAt.getDate() + dayOffset);
  startAt.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
  const endAt = new Date(startAt.getTime() + durationMin * 60_000);
  return { startAt, endAt };
}

export function isWindowInFuture(startAt: Date): boolean {
  return startAt.getTime() > Date.now() + 5 * 60_000;
}

export function clampStartMinutes(minutes: number): number {
  return Math.min(Math.max(minutes, MIN_START_MIN), MAX_START_MIN);
}

export function toDate(value: Date | { toDate: () => Date } | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  return null;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
