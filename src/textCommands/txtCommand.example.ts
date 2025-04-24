import { Message } from "discord.js";
import TextCommand from "lib/core/command/TextCommand";
import { DsuClient } from "lib/core/DsuClient";
import { TextCommandOptions } from "types/commands";
export default class ExampleTextCommand extends TextCommand {
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
