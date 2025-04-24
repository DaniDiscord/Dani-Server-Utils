import { Message } from "discord.js";
import { PermissionLevels, TextCommandOptions } from "types/commands";
import { DsuClient } from "../DsuClient";

export default class TextCommand {
  name: string;
  description?: string;
  public readonly client: DsuClient;
  public readonly permLevel?: PermissionLevels | keyof typeof PermissionLevels;

  constructor(name: string, client: DsuClient, options: TextCommandOptions) {
    this.name = name;
    this.description = options.description;
    this.client = client;
    this.permLevel = options.permissionLevel;
  }

  public async validate(message: Message) {
    if (
      this.permLevel === "BOT_OWNER" &&
      message.author.id != process.env.OWNER_ID
    ) {
      return this.client.utils.getUtility("default").generateEmbed("error", {
        title: "Missing Permissions",
        description: "Must be bot developer to use this command",
      });
    }
  }

  /** The base function to run the command */
  public async run(_message: Message, _args: string[]): Promise<void> {}
}
