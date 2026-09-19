export const nowIso = (): string => new Date().toISOString();
export const nowSec = (): number => Math.floor(Date.now() / 1000);
export const plusMinutes = (minutes: number, from: Date = new Date()): string =>
  new Date(from.getTime() + minutes * 60_000).toISOString();
export const plusDays = (days: number, from: Date = new Date()): string => plusMinutes(days * 1440, from);
