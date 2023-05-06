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
    const modal = new ModalBuilder().setCustomId("s").setTitle("Staff App");

    // Add components to modal

    // Create the text input components
    const goodPersonInput = new TextInputBuilder()
      .setCustomId("goodPersonInput")
      .setLabel("Are you a good person?")
      .setRequired(true)
      .setStyle(TextInputStyle.Paragraph);

    const soWhyInput = new TextInputBuilder()
      .setCustomId("soWhyInput")
      .setLabel("So why be staff?")
      .setRequired(true)
      .setStyle(TextInputStyle.Paragraph);

    // An action row only holds one text input,
    // so you need one action row per text input.
    const firstActionRow =
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        goodPersonInput
      );
    const secondActionRow =
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(soWhyInput);

    // Add inputs to the modal
    modal.addComponents(firstActionRow, secondActionRow);

    // Show the modal to the user
    await interaction.showModal(modal);
    return {};
  }
}
