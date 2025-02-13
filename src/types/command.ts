import { Client, Message, TextChannel } from "discord.js";

export enum PermissionLevels {
  USER = "User",
  MENTOR = "Mentor",
  HELPER = "Helper",
  MODERATOR = "Moderator",
  ADMINISTRATOR = "Administrator",
  SERVER_OWNER = "Server Owner",
  BOT_OWNER = "Bot Owner",
}

export interface GuardTextMessage extends Message {
  channel: TextChannel;
}

export interface Command {
  run: (client: Client, message: GuardTextMessage, args: string[]) => Promise<any>;
  init?: (client: Client) => any;
  conf: {
    aliases: string[];
    /**
     * Takes in enum values.
     * Possible values are: <br/>
     * USER,
     * MENTOR,
     * HELPER,
     * MODERATOR,
     * ADMINISTRATOR,
     * SERVER_OWNER,
     * BOT_OWNER
     * @example
     * ```ts
     * permLevel: PermissionLevels.USER;
     * ```
     **/
    permLevel: PermissionLevels | string;
  };
  help: {
    name: string;
    description: string;
    category?: string;
  };
}
