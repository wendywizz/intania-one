import type { Absent } from "@/models/types";

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getWeekdayLeaveDayCount(
  startDate: Date,
  endDate: Date,
  hasHalfDay: boolean,
) {
  const startDay = startOfDay(startDate);
  const endDay = startOfDay(endDate);
  let fullDayCount = 0;

  for (
    const currentDay = new Date(startDay);
    currentDay <= endDay;
    currentDay.setDate(currentDay.getDate() + 1)
  ) {
    const dayOfWeek = currentDay.getDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      fullDayCount += 1;
    }
  }

  return fullDayCount + (hasHalfDay ? 0.5 : 0);
}

export function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatDateTimeParam(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${formatDateParam(date)} ${hours}:${minutes}:${seconds}`;
}

export function getAbsentTextValue(data: Absent, keys: string[]) {
  for (const key of keys) {
    const value = data[key];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

export function getHalfDayValue(
  selectedHalfDay: string,
  halfDayOptions: readonly string[],
) {
  return selectedHalfDay
    ? String(halfDayOptions.indexOf(selectedHalfDay) + 1)
    : "";
}
