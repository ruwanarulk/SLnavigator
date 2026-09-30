/** "4 h 10 m", "45 m", "~7 h" style durations used on the route rail. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} m`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} m`;
}

/**
 * Day labels for each stop given the nights spent at each: "Day 1", "Day 2–3".
 * A stop with 0 nights is a day visit or the departure day.
 */
export function dayLabels(nights: number[]): string[] {
  let day = 1;
  return nights.map((n) => {
    const label = n >= 2 ? `Day ${day}–${day + n - 1}` : `Day ${day}`;
    day += Math.max(0, n);
    return label;
  });
}

/** Trip length in days: every night plus the departure day. */
export function tripDays(nights: number[]): number {
  return nights.reduce((s, n) => s + Math.max(0, n), 0) + 1;
}
