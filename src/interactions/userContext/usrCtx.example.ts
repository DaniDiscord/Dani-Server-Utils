import {
  ApplicationCommandType,
  UserContextMenuCommandInteraction,
} from "discord.js";
import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { InteractionCommandOptions } from "types/commands";
export default class Example extends CustomApplicationCommand {
  /**
   * Constructor call takes 3 arguments (name, client, options)
   * See {@link InteractionCommandOptions} for options
   */
  constructor(client: DsuClient) {
    super("Name", client, {
      // **MAKE SURE THIS TYPE IS DEFINED! It will NOT be loaded correctly.**
      type: ApplicationCommandType.User,
      permissionLevel: "USER",
    });
  }
  /**
   * @param interaction the context menu interaction
   * @returns void, return AFTER interaction.reply(), not the interaction.reply() itself.
   */
  async run(_: UserContextMenuCommandInteraction) {}
}
