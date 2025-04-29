import { DsuClient } from "lib/core/DsuClient";
import { Message } from "discord.js";
import TextCommand from "lib/core/command/TextCommand";
import { TextCommandOptions } from "types/commands";

// Needs to be default export if you plan to add it.
export class ExampleTextCommand extends TextCommand {
  /**
   * Constructor takes 3 arguments (name, client, options)
   * see {@link TextCommandOptions} for option types
   */
  constructor(client: DsuClient) {
    super("ping", client, {
      permissionLevel: "USER",
    });
  }

  public async run(_message: Message, _args: string[]) {}
}
