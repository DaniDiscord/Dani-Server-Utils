import { ApplicationCommandType, ChatInputCommandInteraction } from "discord.js";

import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { InteractionCommandOptions as _ } from "types/commands";

// This needs default if its youre trying to add it.
export class Name extends CustomApplicationCommand {
  /**
   * Constructor call takes 3 arguments (name, client, options)
   * {@link _} for options
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
