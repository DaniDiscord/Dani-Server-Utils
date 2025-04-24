import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
} from "discord.js";
import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { InteractionCommandOptions } from "types/commands";

export default class Name extends CustomApplicationCommand {
  /**
   * Constructor call takes 3 arguments (name, client, options)
   * {@link InteractionCommandOptions} for options
   */
  constructor(client: DsuClient) {
    super("name", client, {
      // **MAKE SURE THIS TYPE IS DEFINED! It will NOT be loaded correctly.**
      type: ApplicationCommandType.ChatInput,
      permissionLevel: "USER",
    });
  }

  /**
   * @param interaction the / command interaction
   * @returns void, return AFTER interaction.reply(), not the interaction.reply() itself.
   */
  async run(_interaction: ChatInputCommandInteraction) {}
}
