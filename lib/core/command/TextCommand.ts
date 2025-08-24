import { PermissionLevels, TextCommandOptions } from "types/commands";

import DefaultClientUtilities from "lib/util/defaultUtilities";
import { DsuClient } from "../DsuClient";
import { Message } from "discord.js";

export default class TextCommand {
  name: string;
  description?: string;
  public readonly client: DsuClient;
  public readonly permLevel: PermissionLevels;

  constructor(name: string, client: DsuClient, options: TextCommandOptions) {
    this.name = name;
    this.description = options.description;
    this.client = client;
    this.permLevel = options.permissionLevel;
  }

  public async validate(message: Message) {
    let level = this.client.getPermLevel(message, message.member!);

    if (
      this.permLevel === PermissionLevels.BOT_OWNER &&
      message.author.id != process.env.OWNER_ID
    ) {
      return DefaultClientUtilities.generateEmbed("error", {
        title: "Missing Permissions",
        description: "Must be the bot developer to use this command",
      });
    } else if (this.permLevel > level) {
      return DefaultClientUtilities.generateEmbed("error", {
        title: "Missing Permissions",
        description: `Invalid permission. (${this.permLevel} vs ${level})`,
      });
    }
  }

  /** The base function to run the command */
  public async run(_message: Message, _args: string[]): Promise<void> {}
}
