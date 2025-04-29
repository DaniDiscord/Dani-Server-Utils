import { DsuClient } from "lib/core/DsuClient";
import { InteractionCommandOptions } from "types/commands";
import { Modal } from "lib/core/command";
import { ModalSubmitInteraction } from "discord.js";

// Needs to be default export if you plan to add it.

export class SubmitExample extends Modal {
  /**
   * Constructor call takes 3 arguments (customId, client, options)
   * {@link InteractionCommandOptions} for options
   */
  constructor(client: DsuClient) {
    super("name", client, {
      permissionLevel: "USER",
    });
  }

  /**
   * @param interaction the submit interaction
   * @returns void, return AFTER interaction.reply(), not the interaction.reply() itself.
   */
  async run(_interaction: ModalSubmitInteraction) {}
}
