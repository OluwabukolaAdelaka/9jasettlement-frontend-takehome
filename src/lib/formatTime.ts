const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

//Local time of day, e.g. "10:15:05", in the user's own locale and timezone.
export function formatTime(ms: number): string {
  return timeFormatter.format(ms);
}
