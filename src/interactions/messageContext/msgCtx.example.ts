import {
  ApplicationCommandType,
  MessageContextMenuCommandInteraction,
} from "discord.js";
import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { InteractionCommandOptions } from "types/commands";
export default class Example extends CustomApplicationCommand {
  /**
   * Constructor call takes 3 arguments (name, client, options)
   * {@link InteractionCommandOptions} for options
   */
  constructor(client: DsuClient) {
    super("Name", client, {
      // **MAKE SURE THIS TYPE IS DEFINED! It will NOT be loaded correctly.**
      type: ApplicationCommandType.Message,
      permissionLevel: "USER",
    });
  }
  /**
   * @param interaction the context menu interaction
   * @returns void, return AFTER interaction.reply(), not the interaction.reply() itself.
   */
  async run(_interaction: MessageContextMenuCommandInteraction) {}
}
