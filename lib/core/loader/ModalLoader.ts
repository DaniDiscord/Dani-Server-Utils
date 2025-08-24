import {
  ComponentType,
  InteractionResponse,
  Message,
  MessageFlags,
  ModalSubmitInteraction,
} from "discord.js";

import { BaseInteractionLoader } from "./BaseInteractionLoader";
import DefaultClientUtilities from "lib/util/defaultUtilities";
import { DsuClient } from "../DsuClient";
import { InteractionType } from "types/commands";
import { Modal } from "../command";

export class ModalLoader extends BaseInteractionLoader {
  constructor(client: DsuClient) {
    super(client);
  }

  public override load() {
    return super.load("modalSubmit");
  }

  private fetchModal(customId: string) {
    return this.client.modals.find((modal) => customId.startsWith(modal.name));
  }

  public async handle(interaction: ModalSubmitInteraction) {
    const modal = this.fetchModal(interaction.customId);

    if (!modal) {
      console.log("no modal");
      return;
    }
    const missingPermissions = modal.validate(interaction, InteractionType.ModalSubmit);

    if (missingPermissions)
      return interaction.reply({
        embeds: [DefaultClientUtilities.generateEmbed("error", missingPermissions)],
        flags: "Ephemeral",
      });

    return this.runModal(modal, interaction);
  }

  private async runModal(modal: Modal, interaction: ModalSubmitInteraction) {
    const optionData = interaction.components
      .map((rowData) => {
        const component = rowData.components[0];
        if (component.type === ComponentType.TextInput) {
          return `${component.customId}: ${component.value}`;
        }
      })
      .join("\n");

    this.client.logger.info(
      `${interaction.user.tag} [${interaction.user.id} submitted modal ${modal.name}:\n ${optionData}]`,
    );

    modal
      .run(interaction)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .catch(async (error: any): Promise<InteractionResponse | Message> => {
        this.client.logger.error(`Error when submitting modal interaction: ${error}\n`);
        const embed = DefaultClientUtilities.generateEmbed("error", {
          title: "An error has occured!",
          description: "An unexpected error has occured.",
        });
        if (interaction.replied)
          return interaction.followUp({
            embeds: [embed],
            flags: [MessageFlags.Ephemeral],
          });

        return interaction.reply({
          embeds: [embed],
          flags: [MessageFlags.Ephemeral],
        });
      });
  }
}
