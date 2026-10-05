import {
  ClientEvents,
  GatewayIntentBits,
  GuildMember,
  Message,
  PermissionsString,
  PresenceData,
} from "discord.js";

export interface ClientConfig {
  ownerId: string;
  requiredPermissions: PermissionsString[];
  colors: {
    primary: number;
    warning: number;
    error: number;
    success: number;
  };
  permLevels: {
    guildOnly?: boolean;
    level: number;
    name: string;
    check: (
      message: Message | undefined | null,
      member: GuildMember | undefined | null,
    ) => boolean | undefined;
  }[];

  prefix: string[];

  intents: GatewayIntentBits[];

  presence: PresenceData;
}

export enum Times {
  SECOND = 1000,
  MINUTE = 60 * SECOND,
  HOUR = 60 * MINUTE,
  DAY = 24 * HOUR,
  WEEK = 7 * DAY,
  MONTH = 30 * DAY,
  YEAR = 52 * WEEK,
}

export const units = [
  { label: "year", value: Times.YEAR },
  { label: "month", value: Times.MONTH },
  { label: "week", value: Times.WEEK },
  { label: "day", value: Times.DAY },
  { label: "hour", value: Times.HOUR },
  { label: "minute", value: Times.MINUTE },
  { label: "second", value: Times.SECOND },
];

export type AllEvents = keyof ClientEvents | "raw" | "voiceServerUpdate";
