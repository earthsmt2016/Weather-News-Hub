import { MINS_PER_HOUR, MINUTES_PER_DAY, MS_PER_MINUTE } from "./constants";

export const SCHEDULED_WINDOW_MINUTES = 2;

export function getLocalHHMM(timezone = "Europe/London"): { hhmm: string; totalMinutes: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = parseInt(parts.find(p => p.type === "hour")?.value ?? "0", 10);
  const m = parseInt(parts.find(p => p.type === "minute")?.value ?? "0", 10);
  const hhmm = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return { hhmm, totalMinutes: h * MINS_PER_HOUR + m };
}

export function isInQuietHours(quietStart: string | null | undefined, quietEnd: string | null | undefined): boolean {
  if (!quietStart || !quietEnd) return false;
  const { totalMinutes: nowMin } = getLocalHHMM();
  const [qs, qsm] = quietStart.split(":").map(Number);
  const [qe, qem] = quietEnd.split(":").map(Number);
  const startMin = qs * MINS_PER_HOUR + qsm;
  const endMin = qe * MINS_PER_HOUR + qem;
  if (startMin <= endMin) {
    return nowMin >= startMin && nowMin < endMin;
  } else {
    return nowMin >= startMin || nowMin < endMin;
  }
}

export function parseActiveTimes(scheduledTimes: string): string[] {
  return scheduledTimes.split(",").map(t => t.trim()).filter(t => t && !t.startsWith("!"));
}

export function isScheduledTimeNow(scheduledTimes: string): boolean {
  if (!scheduledTimes) return false;
  const times = parseActiveTimes(scheduledTimes);
  if (times.length === 0) return false;
  const { totalMinutes: nowMin } = getLocalHHMM();
  for (const t of times) {
    const [hStr, mStr] = t.split(":");
    const schedMin = parseInt(hStr, 10) * MINS_PER_HOUR + parseInt(mStr, 10);
    const diff = nowMin - schedMin;
    if (diff >= 0 && diff < SCHEDULED_WINDOW_MINUTES) return true;
    if (diff < 0 && diff + MINUTES_PER_DAY < SCHEDULED_WINDOW_MINUTES) return true;
  }
  return false;
}

export function getMissedSlotToday(scheduledTimes: string, lastNotifiedAt: string | null): string | null {
  if (!scheduledTimes) return null;
  const times = parseActiveTimes(scheduledTimes);
  if (times.length === 0) return null;

  const { totalMinutes: nowMin } = getLocalHHMM();
  const lastMs = lastNotifiedAt ? new Date(lastNotifiedAt).getTime() : 0;
  const nowMs = Date.now();

  const sorted = [...times].sort((a, b) => {
    const toMin = (t: string) => parseInt(t.split(":")[0], 10) * MINS_PER_HOUR + parseInt(t.split(":")[1], 10);
    return toMin(b) - toMin(a);
  });

  for (const t of sorted) {
    const [hStr, mStr] = t.split(":");
    const schedMin = parseInt(hStr, 10) * MINS_PER_HOUR + parseInt(mStr, 10);
    const diffMin = nowMin - schedMin;
    if (diffMin <= SCHEDULED_WINDOW_MINUTES) continue;
    if (diffMin >= MINUTES_PER_DAY) continue;
    const slotFiredAtMs = nowMs - diffMin * MS_PER_MINUTE;
    if (slotFiredAtMs > lastMs) return t;
  }

  return null;
}
