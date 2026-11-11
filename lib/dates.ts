// The workspace lives in Asia/Seoul; every "today", overdue check and displayed
// time uses it, whatever the server or browser time zone is.
export const TZ = "Asia/Seoul";

const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const monthDay = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const weekdayMonthDay = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "short", day: "numeric" });
const hhmm = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

/** Today in KST as YYYY-MM-DD. */
export function todayKst(now = new Date()): string {
  return ymd.format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "Nov 6" for a YYYY-MM-DD date. */
export function formatDue(date: string): string {
  return monthDay.format(new Date(`${date}T00:00:00Z`));
}

export function formatDueLong(date: string): string {
  return weekdayMonthDay.format(new Date(`${date}T00:00:00Z`));
}

export function isOverdue(due: string | null, status: string, today = todayKst()): boolean {
  return due !== null && status !== "done" && due < today;
}

/** "14:02" in KST. */
export function formatTime(iso: string | Date): string {
  return hhmm.format(typeof iso === "string" ? new Date(iso) : iso);
}

/** "5 min ago", "3 h ago", "Nov 8" (older than a day). */
export function formatRelative(iso: string, now = new Date()): string {
  const mins = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return formatDue(ymd.format(new Date(iso)));
}

/** Start of today in KST as an ISO timestamp (for "runs today"). */
export function startOfKstDay(now = new Date()): string {
  return new Date(`${todayKst(now)}T00:00:00+09:00`).toISOString();
}

/** "Good morning" / "Good afternoon" / "Good evening" by the KST hour. */
export function greeting(now = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Seoul" }).format(now));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}
