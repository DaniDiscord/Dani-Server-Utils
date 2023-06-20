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
  import { lftPostCustomId, lftPostQuestions } from "lib/ltfpost";
  
  import { ApplicationCommandType } from "discord-api-types/v10";
  import { CustomClient } from "lib/client";
  
  const APPLICATION_BANNED: Snowflake[] = ["771103126211919913"];
  
  export default class SlashCommand extends InteractionCommand {
    /**
     *
     */
    constructor(client: CustomClient) {
      super(client, {
        type: ApplicationCommandType.ChatInput,
        name: "LFT",
        options: [
          {
            type: ApplicationCommandOptionType.Subcommand,
            name: "LFT",
            description: "Send a Looking For Team post",
          },
        ],
        description: "Send a Looking For Team post",
      });
    }
  
    async execute(
      interaction: CommandInteraction<CacheType>
    ): Promise<CustomInteractionReplyOptions> {

        const modal = new ModalBuilder().setCustomId(lftPostCustomId).setTitle("LFT Post");
  
      // Add inputs to the modal
      modal.addComponents(lftPostQuestions.map((q) => q.toActionRow()));
  
      // Show the modal to the user
      await interaction.showModal(modal);
      return {};
    }
  }
  