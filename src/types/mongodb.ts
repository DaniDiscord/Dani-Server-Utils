import { Document } from "mongoose";

/* COMMAND */
export interface RawCommand {
  guild: string;
  trigger: string;
  content: string;
}

export interface ICommand extends RawCommand, Document {}

/* MENTOR */
export interface RawMentor {
  guild: string;
  roleID: string;
  mentorName: string;
  assignedChannels: string[];
}

export interface IMentor extends RawMentor, Document {}

/* SETTINGS */
export interface RawSettings {
  prefix: string;
  mentorRoles: IMentor[];
  commands: ICommand[];
  toUpdate: boolean;
  createdAt: number;
  updatedAt: number;
  chains: {
    ignored: string[];
  };
  roles: {
    helper: string;
    moderator: string;
    admin: string;
  };
}

export interface ISettings extends RawSettings, Document {}

/* COUNTER */
interface RawCounter {
  index: number;
}

export interface ITimestamp extends RawTimestamp, Document {}

interface RawTimestamp {
  identifier: string;
  timestamp: Date;
}

export interface ICounter extends RawCounter, Document {}

/* NAME */
interface RawName {
  userId: string;
  guildId: string;
  name: string;
}

export interface IName extends RawName, Document {}

/* AUTOSLOW */
interface RawAutoSlow {
  channelId: string;
  targetMsgsPerSec: number;
  min: number;
  max: number;
  minChange: number;
  minChangeRate: number;
  enabled: boolean;
}

export interface IAutoSlow extends RawAutoSlow, Document {}

/* EMOJI SUGGESTIONS */
interface RawEmojiSuggestions {
  guildId: string;
  sourceId: string;
  voteId: string;
  threshold: number;
  bias: number;
  emojiCap: number;
  cooldown: number;
}

export interface IEmojiSuggestions extends RawEmojiSuggestions, Document {}
/* EMOJI SUGGESTIONS */
interface RawCommandCooldown {
  commandId: string;
  guildId: string;
  userId: string;
  lastUse: number;
  banned: boolean;
  reason: string | undefined;
}

export interface ICommandCooldown extends RawCommandCooldown, Document {}

/* AUTOPING */
interface RawAutoPing {
  guildId: string;
  roleId: string;
  forumId: string;
  tag: string;
  targetChannelId: string;
}

export interface IAutoPing extends RawAutoPing, Document {}

/* TRIGGER */
interface RawTrigger {
  guildId: string;
  userId: string;
}

export interface ITrigger extends RawTrigger, Document {}