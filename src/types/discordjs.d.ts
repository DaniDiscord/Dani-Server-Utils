import { Collection, EmbedBuilder, Message } from "discord.js";
import { IAutoSlow, ISettings } from "./mongodb";

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
      enabled: boolean
    ): Promise<void>;

    removeAutoSlow(channelId: string): Promise<void>;

    getAutoSlow(channelId: string): Promise<AutoSlowManager | null>;

    addAutoPollChannel(guildId: string, channelId: string): Promise<void>;

    removeAutoPollChannel(guildId: string, channelId: string): Promise<void>;

    addClosePollRole(guildId: string, roleId: string): Promise<void>;

    removeClosePollRole(guildId: string, roleId: string): Promise<void>;

    getAutoPollChannels(guildId: string): Promise<string[] | undefined>;

    getClosePollRoles(guildId: string): Promise<string[] | undefined>;

    setEmojiSuggestions(emojiSuggestions: EmojiSuggestions): Promise<void>;

    getEmojiSuggestions(guildId: string): Promise<EmojiSuggestions | null>;

    removeEmojiSuggestions(guildId: string): Promise<EmojiSuggestions | null>;

    registerCommandUsage(
      guildId: string,
      commandId: string,
      userId: string
    ): Promise<void>;

    getLastCommandUse(
      guildId: string,
      commandId: string,
      userId: string
    ): Promise<number | null>;
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
