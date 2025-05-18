import { Document, Types } from "mongoose";

import { APIEmbed } from "discord.js";

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
  pollsAllowed: string[];
  triggers: {
    id: string;
    keywords: string[][];
    cooldown: number;
    enabled: boolean;
    message: {
      embed: boolean;
      content: string;
      title: string;
      description: string;
      color: string;
    };
  }[];
  phrases: [
    {
      logChannelId: string;
      matchThreshold: number;
      phrase: string;
    },
  ];
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
  triggerId: string;
}

export interface ITrigger extends RawTrigger, Document {}

interface RawLinkPermission {
  guildId: string;
  channels: Array<{
    channelId: string;
    roles: Array<{
      roleId: string;
      enabled: boolean;
    }>;
  }>;
  userAccess: Array<{
    userId: string;
    hasAccess: boolean;
    modifiedBy: string;
    modifiedAt: Date;
    reason?: string;
  }>;
}

export interface ILinkPermission extends RawLinkPermission, Document {}

export interface IAutoArchiveForum {
  guildId: string;
  channels: {
    channelId: string;
    expireDuration: number;
  }[];
}

export interface IAutoArchiveForumBlacklist {
  guildId: string;
  threads: string[];
}

export interface IAnchor {
  guildId: string;
  channelId: string;
  originalMessageId: string;
  originalChannelId: string;
  content?: string;
  embeds?: APIEmbed[];
  lastAnchorId?: string;
  lastAnchorTime?: Date;
  messageCount: number;
  config: {
    messageThreshold: number;
    timeThreshold: number;
    inactivityThreshold: number;
  };
}

export interface IPhraseMatcher {
  phrases: {
    phraseId: string;
    content: string;
    matchThreshold: number;
  }[];
  logChannelId: string;
  guildId: string;
}

interface RawEmojiUsage {
  guildId: string;
  name: string;
  count: number;
  lastUsage: Date;
}

export interface IEmojiUsage extends RawEmojiUsage, Document {}

interface RawSuggestionConfig {
  guildId: string;
  channelId: string;
  cooldown: number;
  deniedThreadId: string;
  existingSubmissions: Types.ObjectId[];
  deniedSubmissions: { messageId: string; reason?: string }[];
}

export interface ISuggestionConfig extends RawSuggestionConfig, Document {}

export interface ISuggestion extends Document {
  messageId: string;
  content: string;
  status: "approved" | "pending";
  userId: string;
}

export interface IXp extends Document {
  messageCount: number;
  expAmount: number;
  level: number;
  userId: string;
  guildId: string;
  lastXpTimestamp?: number;
}
