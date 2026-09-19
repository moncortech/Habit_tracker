export function toDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(date);
}

export function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(new Date());
}

export function calculateStreak(completions: string[], today: string) {
  const set = new Set(completions);
  const yesterday = addDays(today, -1);
  if (!set.has(today) && !set.has(yesterday)) return 0;

  let cursor = set.has(today) ? today : yesterday;
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
