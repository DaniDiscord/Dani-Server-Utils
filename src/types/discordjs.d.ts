import { Collection, Message, MessageEmbed } from "discord.js";
import { IAutoSlow, ISettings } from "./mongodb";

import { Command } from "./command";
import { Config } from "config";
import { ReactionHandler } from "lib/reacthandler";

declare module "discord.js" {
  export interface Client {
    /* VARIABLES */
    embColor: string;
    prefix: string;
    commands: Collection<string, Command>;
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
    log(type: string, msg: any, title?: string): void;
    errEmb(errnum?: number, extra?: string): MessageEmbed;
    permlevel(message?: Message, member?: GuildMember): number;
    randomColor(s?: number, v?: number): [number, number, number];
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
      targetMsgsPerSec: number
    ): Promise<void>;

    removeAutoSlow(channelId: string): Promise<void>;

    getAutoSlow(channelId: string): Promise<AutoSlowManager | null>;
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
