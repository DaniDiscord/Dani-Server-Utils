export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;
export const MONTH = 30 * DAY;
export const YEAR = 365 * DAY;

const units = [
  { label: "year", value: YEAR },
  { label: "month", value: MONTH },
  { label: "week", value: WEEK },
  { label: "day", value: DAY },
  { label: "hour", value: HOUR },
  { label: "minute", value: MINUTE },
  { label: "second", value: SECOND },
];

export function parseDuration(durationString: string): number {
  const durationRegex = /(\d+)([smhdwMy]?)/;
  const matches = durationString.match(durationRegex);

  if (!matches) return 0;

  const value = parseInt(matches[1]);
  const unit = matches[2];

  switch (unit) {
    case "s":
      return value * SECOND; // seconds
    case "m":
      return value * MINUTE; // minutes
    case "h":
      return value * HOUR; // hours
    case "d":
      return value * DAY; // days
    case "w":
      return value * WEEK; // weeks
    case "M":
      return value * MONTH; // months (approximately)
    case "y":
      return value * YEAR; // years (approximately)
    default:
      return 0;
  }
}

export function parseDurationToString(duration: number): string {
  let remainingDuration = duration;
  const parts: string[] = [];

  for (const unit of units) {
    const count = Math.floor(remainingDuration / unit.value);
    if (count > 0) {
      parts.push(`${count} ${unit.label}${count > 1 ? "s" : ""}`);
      remainingDuration %= unit.value;
    }
  }

  return parts.join(", ") || "0 seconds";
}
