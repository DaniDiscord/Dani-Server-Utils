import { ModalSubmitInteraction } from "discord.js";
import { Modal } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { InteractionCommandOptions } from "types/commands";
export default class SubmitExample extends Modal {
  /**
   * Constructor call takes 3 arguments (name, client, options)
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
