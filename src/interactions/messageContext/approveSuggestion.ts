import {
  ApplicationCommandType,
  MessageContextMenuCommandInteraction,
  MessageFlags,
  ModalBuilder,
  TextInputStyle,
} from "discord.js";

import { CustomApplicationCommand } from "lib/core/command";
import DefaultClientUtilities from "lib/util/defaultUtilities";
import { DsuClient } from "lib/core/DsuClient";
import { PermissionLevels } from "types/commands";
import { Question } from "lib/util/questions";
import { SuggestionUtility } from "../../utilities/suggestions";
import { SuggestionModel } from "models/Suggestion";

export default class ApproveSuggestion extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("Approve Suggestion", client, {
      type: ApplicationCommandType.Message,
      permissionLevel: PermissionLevels.MODERATOR,
      defaultMemberPermissions: null,
    });
  }

  async run(interaction: MessageContextMenuCommandInteraction) {
    const suggestion = await SuggestionUtility.isSuggestionMessage(
      interaction.targetMessage,
    );
    if (!suggestion.exists || !suggestion.model) {
      return interaction.reply({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "Command cannot be used.",
            description: "This command can only be ran on suggestion messages.",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
   
    
    if(suggestion.model.status !== "pending") {
      return interaction.reply({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "Command cannot be used.",
            description: "This suggestion has already been handled.",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    } 


    SuggestionUtility.approve(interaction);
  }
}
