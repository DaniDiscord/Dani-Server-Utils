import { Collection, EmbedBuilder, Message } from "discord.js";
import { IAutoPing, IAutoSlow, IEmojiUsage, ISettings } from "./mongodb";

import { AutoSlowManager } from "lib/autoslow";
import { Command } from "./command";
import { Config } from "config";
import { EmojiSuggestions } from "lib/emojiSuggestions";
import { InteractionCommand } from "classes/CustomInteraction";
import { ReactionHandler } from "lib/reacthandler";

declare module "discord.js" {
  export interface Client {
    /* VARIABLES */
    embColor: string;
    prefix: string;
    commands: Collection<string, Command>;
    slashCommands: Collection<string, InteractionCommand>;
    autocompleteOptions: Collection<string, AutocompleteOptionGenerators>;
    settings: Collection<string, ISettings>;
    aliases: Collection<string, string>;
    channelMessages: Collection<string, { word: string; count: number }[]>;
    cds: Collection;
    config: Config;
    reactionHandler: ReactionHandler;
    levelCache: {
      [key: string]: number;
    };

    /* FUNCTIONS */
    errEmb(errnum?: number, extra?: string): EmbedBuilder;
    permlevel(message?: Message, member?: GuildMember): number;
    gradient(start_color: string, end_color: string, steps?: number): string[];
    loadCommand(
      category: string,
      commandName: string,
      dontLog: boolean
    ): { err: string; res?: undefined } | { res: boolean; err?: undefined };
    setMemberName(member: GuildMember, newName: string): Promise<void>;
    getNameFromMemory(userId: string, guildId: string): Promise<string>;
    setNameInMemory(userId: string, guildId: string, name: string): Promise<void>;
    getNextCounter(id: string): Promise<number>;

    addAutoSlow(
      channelId: string,
      min: number,
      max: number,
      targetMsgsPerSec: number,
      minChange: number,
      minChangeRate: number,
      enabled: boolean
    ): Promise<AutoSlowManager>;

    removeAutoSlow(channelId: string): Promise<void>;

    getAutoSlow(channelId: string): Promise<AutoSlowManager | null>;

    setEmojiSuggestions(emojiSuggestions: EmojiSuggestions): Promise<void>;

    getEmojiSuggestions(guildId: string): Promise<EmojiSuggestions | null>;

    removeEmojiSuggestions(guildId: string): Promise<EmojiSuggestions | null>;

    registerCommandUsage(
      guildId: string,
      commandId: string,
      userId: string
    ): Promise<void>;

    banFromCommand(
      guildId: string,
      commandId: string,
      userId: string,
      banReason: string
    ): Promise<void>;

    unbanFromCommand(guildId: string, commandId: string, userId: string): Promise<void>;

    banReason(
      guildId: string,
      commandId: string,
      reason: string
    ): Promise<string | undefined>;

    getLastCommandUse(
      guildId: string,
      commandId: string,
      userId: string
    ): Promise<number | null>;

    addAutoPing(
      guildId: string,
      roleId: string,
      forumId: string,
      tag: string,
      targetChannelId: string
    ): Promise<void>;

    getAutoPing(guildId: string, forumId: string): Promise<IAutoPing[]>;

    removeAutoPings(
      guildId: string,
      roleId: string,
      forumId: string,
      tag: string,
      targetChannelId: string
    ): Promise<void>;

    getAllAutoPing(guildId: string): Promise<IAutoPing[]>;

    addEmoji(guildId: string, name: string): Promise<void>;

    listEmoji(guildId: string): Promise<EmojiUsage[]>;
  }

  export interface Base {
    client: Client;
    settings: ISettings;
  }

  export interface GuildMember {
    settings: ISettings;
  }

  export interface User {
    permLevel: number;
  }
}
