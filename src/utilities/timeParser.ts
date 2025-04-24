import { DsuClient } from "lib/core/DsuClient";
import { ClientUtilities } from "lib/core/ClientUtilities";
import { Times, units } from "../types/index";

export class TimeParserUtility extends ClientUtilities {
  constructor(client: DsuClient) {
    super(client);
  }

  parseDuration(durationString: string): number {
    const durationRegex = /(\d+)([smhdwMy]?)/;
    const matches = durationString.match(durationRegex);

    if (!matches) return 0;

    const value = parseInt(matches[1]);
    const unit = matches[2];

    switch (unit) {
      case "s":
        return value * Times.SECOND; // seconds
      case "m":
        return value * Times.MINUTE; // minutes
      case "h":
        return value * Times.HOUR; // hours
      case "d":
        return value * Times.DAY; // days
      case "w":
        return value * Times.WEEK; // weeks
      case "M":
        return value * Times.MONTH; // months (approximately)
      case "y":
        return value * Times.YEAR; // years (approximately)
      default:
        return 0;
    }
  }

  parseDurationToString(duration: number) {
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
}
