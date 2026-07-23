import type { absence } from "@/models/types";

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getWeekdayLeaveDayCount(
  startDate: Date,
  endDate: Date,
  hasHalfDay: boolean,
  isHoliday?: (date: Date) => boolean,
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
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Leave days exclude weekends (Sat/Sun) and public holidays.
    if (!isWeekend && !isHoliday?.(currentDay)) {
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

export function getabsenceTextValue(data: absence | null | undefined, keys: string[]) {
  if (!data || typeof data !== "object") {
    return "";
  }

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
  halfDayOptions: readonly (string | { value: string; label: string })[],
) {
  if (!selectedHalfDay) {
    return "0";
  }

  const selectedOption = halfDayOptions.find((option) =>
    typeof option === "string"
      ? option === selectedHalfDay
      : option.value === selectedHalfDay || option.label === selectedHalfDay,
  );

  if (!selectedOption) {
    return selectedHalfDay;
  }

  return typeof selectedOption === "string"
    ? String(halfDayOptions.indexOf(selectedOption) + 1)
    : selectedOption.value;
}

export function isRetryableInitialError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("unable to load") ||
    normalizedMessage.includes("unable to connect") ||
    normalizedMessage.includes("cannot connect") ||
    normalizedMessage.includes("server") ||
    normalizedMessage.includes("timeout") ||
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("ไม่สามารถโหลด") ||
    normalizedMessage.includes("ไม่สามารถเชื่อมต่อ") ||
    normalizedMessage.includes("เซิร์ฟเวอร์")
  );
}
