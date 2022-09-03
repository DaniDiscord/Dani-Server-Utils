import { CacheType, CommandInteraction } from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";

import { ApplicationCommandType } from "discord-api-types/v10";
import { CustomClient } from "lib/client";

export default class BeepCommand extends InteractionCommand {
  /**
   *
   */
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.Message,
      name: "beep",
      // defaultMemberPermissions: "Administrator",
    });
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    return { content: `Boop (message context command on ${interaction})` };
  }
}
