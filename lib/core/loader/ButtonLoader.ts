import { ButtonInteraction, MessageFlags } from "discord.js";

import { BaseInteractionLoader } from "./BaseInteractionLoader";
import { Button } from "../command/";
import DefaultClientUtilities from "lib/util/defaultUtilities";
import { DsuClient } from "../DsuClient";
import { InteractionType } from "types/commands";

export class ButtonLoader extends BaseInteractionLoader {
  constructor(client: DsuClient) {
    super(client);
  }

  public override load() {
    return super.load("buttons");
  }

  /**
   *
   * @param customId The custom id of the button (matches \<Button\>.name)
   * @returns The found button, or undefined.
   */
  private fetchButton(customId: string): Button | undefined {
    return this.client.buttons.find((button) => customId.startsWith(button.name));
  }

  handle(interaction: ButtonInteraction) {
    const button = this.fetchButton(interaction.customId);

    if (!button) return;
    if (
      interaction.message.interactionMetadata?.user.id !== interaction.user.id &&
      !button.global
    ) {
      return interaction.reply({
        content: "You cannot use this button.",
        flags: [MessageFlags.Ephemeral],
      });
    }

    const missingPermissions = button.validate(interaction, InteractionType.Button);
    if (missingPermissions)
      return interaction.reply({
        embeds: [DefaultClientUtilities.generateEmbed("error", missingPermissions)],
        flags: "Ephemeral",
      });

    return this.run(button, interaction);
  }

  async run(button: Button, interaction: ButtonInteraction) {
    await button.run(interaction).catch((error) => {
      this.client.logger.error(error);

      const embed = DefaultClientUtilities.generateEmbed("error", {
        title: "An error has occured!",
        description: "An unexpected error has occured.",
      });

      interaction.deferReply();
      return interaction.followUp({
        flags: [MessageFlags.Ephemeral],
        embeds: [embed],
      });
    });
  }
}
