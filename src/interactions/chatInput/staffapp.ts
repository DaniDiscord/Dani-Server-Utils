import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  CacheType,
  CommandInteraction,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";
import { staffAppCustomId, staffAppQuestions } from "lib/staffapp";

import { ApplicationCommandType } from "discord-api-types/v10";
import { CustomClient } from "lib/client";

export default class SlashCommand extends InteractionCommand {
  /**
   *
   */
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.ChatInput,
      name: "staff",
      options: [
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: "apply",
          description: "apply for staff",
        },
      ],
      description: "apply for staff",
    });
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    const modal = new ModalBuilder().setCustomId(staffAppCustomId).setTitle("Staff App");

    // Add inputs to the modal
    modal.addComponents(staffAppQuestions.map((q) => q.toActionRow()));

    // Show the modal to the user
    await interaction.showModal(modal);
    return {};
  }
}
