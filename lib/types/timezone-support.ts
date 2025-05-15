// FILE: lib/types/timezone-support.d.ts
// (Content from finalcodebase.txt - verified)
declare module "timezone-support/lookup-convert" {
  /** Represents a timezone object */
  interface TimeZone { name: string; /* Add other properties if needed */ }

  /** Finds a timezone by its identifier (e.g., 'America/New_York') */
  export function findTimeZone(identifier: string): TimeZone | null;

  /** Gets the UTC offset in minutes for a timezone at a specific date */
  export function getUTCOffset(timezone: TimeZone, date?: Date): number;

  /** Converts a date to a specific timezone */
  export function getZonedTime(date: Date, timezone: TimeZone): { year: number; month: number; day: number; hours: number; minutes: number; seconds: number; milliseconds: number; epoch: number; };

  /** Converts parts of a date in a specific timezone back to a Date object */
  export function getUnixTime(dateTime: { year: number; month: number; day: number; hours?: number; minutes?: number; seconds?: number; milliseconds?: number; }, timezone: TimeZone): number;

  /** Formats a date according to a pattern in a specific timezone */
  // Note: date-fns-tz is generally preferred for formatting, but declare if used
  // export function format(date: Date, formatString: string, timezone: TimeZone): string;

  /** Lists all available timezone identifiers */
  export function listTimeZones(): string[];
}