import { MS_PER_MINUTE, MINS_PER_HOUR, HOURS_PER_DAY } from "@/lib/constants";

const MS_PER_HOUR = MINS_PER_HOUR * MS_PER_MINUTE;

export function getTimeAgo(date: Date): string {
  const diffMs   = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / MS_PER_MINUTE);
  const diffHours = Math.floor(diffMs / MS_PER_HOUR);
  const diffDays  = Math.floor(diffHours / HOURS_PER_DAY);

  if (diffMins < 1)              return "Just now";
  if (diffMins < MINS_PER_HOUR)  return `${diffMins}m ago`;
  if (diffHours < HOURS_PER_DAY) return `${diffHours}h ago`;
  if (diffDays === 1)            return "Yesterday";
  return `${diffDays}d ago`;
}
