import { Button } from "lib/core/command";
import { ButtonInteraction } from "discord.js";
import { DsuClient } from "lib/core/DsuClient";
import { InteractionCommandOptions } from "types/commands";

// Needs to be default export if you plan to add it.

export class ExampleButton extends Button {
  /**
   * super call takes 3 args (customId, client, options);
   * See {@link InteractionCommandOptions} for data, only permissionLevel is required.
   * Global defines if button can be used by anyone, or only the interaction author.
   * applicationData defines the options of the interaction.
   */
  constructor(client: DsuClient) {
    super("name", client, {
      permissionLevel: "USER",
      global: true,
    });
  }

  /**
   *
   * @param interaction the button interaction
   * @returns void, return AFTER interaction.reply(), not the interaction.reply() itself.
   */
  public async run(_interaction: ButtonInteraction) {
    return;
  }
}
