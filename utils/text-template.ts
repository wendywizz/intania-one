/**
 * Fills `{name}` placeholders in a `TEXT` template: `fill(TEXT.BOOKING_ROOM_SLOT_TOTAL, { count: 3 })`.
 * Templates rather than concatenation because word order differs between the two languages.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}
