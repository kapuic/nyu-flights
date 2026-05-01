import { Temporal } from "temporal-polyfill";

// ---------------------------------------------------------------------------
// Date-only helpers (DOB, passport expiration, manufacturing date, card exp)
// ---------------------------------------------------------------------------

/** Parse a YYYY-MM-DD string into a PlainDate, or return undefined. */
export function toPlainDate(value: string): Temporal.PlainDate | undefined {
  try {
    return Temporal.PlainDate.from(value);
  } catch {
    return undefined;
  }
}

/** Today as a PlainDate. */
export function todayDate(): Temporal.PlainDate {
  return Temporal.Now.plainDateISO();
}

/** Today as a YYYY-MM-DD string. */
export function todayString(): string {
  return todayDate().toString();
}

/** Format a YYYY-MM-DD string for display (e.g. "Jan 15, 2026"). */
export function formatPlainDate(value: string): string {
  const plainDate = toPlainDate(value);
  if (!plainDate) return value;
  return plainDate.toLocaleString("en-US", { dateStyle: "medium" });
}

/** Format a YYYY-MM-DD string as short date (e.g. "May 1, 2026"). */
export function formatDateOnlyShort(value: string): string {
  return formatPlainDate(value);
}

// ---------------------------------------------------------------------------
// DateTime helpers (flight departure/arrival, purchase time)
// ---------------------------------------------------------------------------

/** Parse a datetime string into PlainDateTime. */
export function toPlainDateTime(value: string): Temporal.PlainDateTime | undefined {
  try {
    const normalized = value.replace(" ", "T").replace(/\.\d+$/, "");
    return Temporal.PlainDateTime.from(normalized);
  } catch {
    return undefined;
  }
}

/** Current local PlainDateTime. */
export function nowDateTime(): Temporal.PlainDateTime {
  return Temporal.Now.plainDateTimeISO();
}

/** Compare two datetime strings. Returns <0, 0, or >0. */
export function compareDateTimes(a: string, b: string): number {
  return Temporal.PlainDateTime.compare(
    Temporal.PlainDateTime.from(a.replace(" ", "T").replace(/\.\d+$/, "")),
    Temporal.PlainDateTime.from(b.replace(" ", "T").replace(/\.\d+$/, "")),
  );
}

/** Check if a datetime string is in the past. */
export function isDateTimePast(value: string): boolean {
  const pdt = toPlainDateTime(value);
  if (!pdt) return false;
  return Temporal.PlainDateTime.compare(pdt, nowDateTime()) < 0;
}

/** Duration between two datetime strings as { hours, minutes }. */
export function getFlightDuration(
  departure: string,
  arrival: string,
): { hours: number; minutes: number } {
  const dep = toPlainDateTime(departure);
  const arr = toPlainDateTime(arrival);
  if (!dep || !arr) return { hours: 0, minutes: 0 };
  const dur = dep.until(arr, { largestUnit: "hour" });
  return { hours: dur.hours, minutes: dur.minutes };
}

/** Format a datetime string as time (e.g. "6:04 PM"). */
export function formatTime(value: string): string {
  const pdt = toPlainDateTime(value);
  if (!pdt) return value;
  return pdt.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Format a datetime as short date+time (e.g. "Apr 25, 6:04 PM"). */
export function formatDateTimeShort(value: string): string {
  const pdt = toPlainDateTime(value);
  if (!pdt) return value;
  return pdt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Format a datetime as medium date+time (e.g. "Apr 25, 2026, 6:04 PM"). */
export function formatDateTimeMedium(value: string): string {
  const pdt = toPlainDateTime(value);
  if (!pdt) return value;
  return pdt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Format a datetime as "Mon, Apr 25" style short date. */
export function formatShortDate(value: string): string {
  const pdt = toPlainDateTime(value);
  if (!pdt) return value;
  return pdt.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Format a PlainDate for date picker trigger labels. */
export function formatPickerDate(value: string): string {
  const plainDate = toPlainDate(value);
  if (!plainDate) return value;
  return plainDate.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Format a PlainDateTime for date-time picker trigger labels. */
export function formatPickerDateTime(value: string): string {
  const plainDateTime = toPlainDateTime(value);
  if (!plainDateTime) return value;
  return plainDateTime.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Serialize a PlainDateTime as a local datetime input string. */
export function formatDateTimeInputValue(value: string): string {
  const plainDateTime = toPlainDateTime(value);
  if (!plainDateTime) return "";
  return plainDateTime.toString({ smallestUnit: "minute" });
}

/** Return HH:mm from a datetime string. */
export function formatTimeInputValue(value: string): string {
  const plainDateTime = toPlainDateTime(value);
  if (!plainDateTime) return "09:00";
  return plainDateTime.toPlainTime().toString({ smallestUnit: "minute" });
}

/** Merge a date-only value and HH:mm time into a local PlainDateTime string. */
export function combineDateAndTimeValues(dateValue: string, timeValue: string): string {
  const plainDate = toPlainDate(dateValue);
  if (!plainDate) return "";

  const [hourPart = "0", minutePart = "0"] = timeValue.split(":");
  const hour = Number.parseInt(hourPart, 10);
  const minute = Number.parseInt(minutePart, 10);
  return plainDate
    .toPlainDateTime({
      hour: Number.isNaN(hour) ? 0 : hour,
      minute: Number.isNaN(minute) ? 0 : minute,
    })
    .toString({ smallestUnit: "minute" });
}

/** Return today's date plus `years` as YYYY-MM-DD. */
export function todayPlusYearsString(years: number): string {
  return todayDate().add({ years }).toString();
}

// ---------------------------------------------------------------------------
// Serialization helpers (server/SQL boundaries)
// ---------------------------------------------------------------------------

/** Serialize a DB Date or string to YYYY-MM-DDTHH:mm:ss (second precision). */
export function serializeTimestamp(value: Date | string): string {
  if (value instanceof Date) {
    const pd = Temporal.PlainDateTime.from({
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
      hour: value.getHours(),
      minute: value.getMinutes(),
      second: value.getSeconds(),
    });
    return pd.toString({ smallestUnit: "second" });
  }
  const pdt = toPlainDateTime(value);
  return pdt ? pdt.toString({ smallestUnit: "second" }) : value;
}

/** Serialize a DB Date or string to YYYY-MM-DD (date only). */
export function serializeDateOnly(value: Date | string): string {
  if (value instanceof Date) {
    return Temporal.PlainDate.from({
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    }).toString();
  }
  return value.split(/[ T]/)[0];
}

/** Normalize a UI datetime string to SQL-safe format (YYYY-MM-DD HH:mm:ss). */
export function normalizeTimestampForSql(value: string): string {
  return serializeTimestamp(value).replace("T", " ");
}

// ---------------------------------------------------------------------------
// Boundary helpers (react-day-picker needs JS Date)
// ---------------------------------------------------------------------------

/** Convert YYYY-MM-DD to JS Date for react-day-picker. */
export function plainDateToJsDate(value: string): Date | undefined {
  const pd = toPlainDate(value);
  if (!pd) return undefined;
  return new Date(pd.year, pd.month - 1, pd.day);
}

/** Convert JS Date from react-day-picker to YYYY-MM-DD string. */
export function jsDateToPlainDateString(date: Date | undefined): string {
  if (!date) return "";
  return Temporal.PlainDate.from({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  }).toString();
}

/** Today as a JS Date for react-day-picker minDate. */
export function todayJsDate(): Date {
  const t = todayDate();
  return new Date(t.year, t.month - 1, t.day);
}

export { Temporal };
