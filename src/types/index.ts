import {
  PermissionsString,
  PresenceData,
  GatewayIntentBits,
  GuildMember,
  Message,
  ClientEvents,
} from "discord.js";
import DefaultClientUtilities from "../../lib/util/defaultUtilities";
import { AnchorUtility } from "../utilities/anchor";
import { AutoArchiveUtility } from "../utilities/autoArchive";
import { TimeParserUtility } from "../utilities/timeParser";
import { AutoPingUtility } from "../utilities/autoPing";
import { AutoSlowUtility } from "../utilities/autoSlow";
import { BadNameUtility } from "../utilities/badName";
import { LinkHandlerUtility } from "../utilities/linkHandler";
import { EmojiSuggestionsUtility } from "../utilities/emojiSuggestions";
import { SuggestionUtility } from "../utilities/suggestions";

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
      member: GuildMember | undefined | null
    ) => boolean | undefined;
  }[];

  prefix: string[];

  intents: GatewayIntentBits[];

  presence: PresenceData;
}

export const utilities = {
  default: DefaultClientUtilities,
  anchors: AnchorUtility,
  autoArchive: AutoArchiveUtility,
  autoPing: AutoPingUtility,
  autoSlow: AutoSlowUtility,
  badName: BadNameUtility,
  linkHandler: LinkHandlerUtility,
  timeParser: TimeParserUtility,
  emoji: EmojiSuggestionsUtility,
  suggestions: SuggestionUtility,
} as const;

export type UtilityKey = keyof typeof utilities;
export type UtilityInstanceMap = {
  [K in UtilityKey]: InstanceType<(typeof utilities)[K]>;
};
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
