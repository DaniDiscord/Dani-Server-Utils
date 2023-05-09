import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  CacheType,
  CommandInteraction,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  Snowflake,
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

const APPLICATION_BANNED: Snowflake[] = [];

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
    if (APPLICATION_BANNED.includes(interaction.user.id)) {
      return { eph: true, content: "You are banned from using this command." };
    }

    const modal = new ModalBuilder().setCustomId(staffAppCustomId).setTitle("Staff App");

    // Add inputs to the modal
    modal.addComponents(staffAppQuestions.map((q) => q.toActionRow()));

    // Show the modal to the user
    await interaction.showModal(modal);
    return {};
  }
}
