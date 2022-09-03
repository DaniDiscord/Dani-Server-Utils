import { ApplicationCommandOptionType, CacheType, CommandInteraction } from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";

import { ApplicationCommandType } from "discord-api-types/v10";
import { CustomClient } from "lib/client";

export default class PingCommand extends InteractionCommand {
  /**
   *
   */
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.ChatInput,
      name: "ping",
      description: "Check the bot's ping!",
      // options: [
      //   { description: "aa", name: "opt1", type: ApplicationCommandOptionType.Boolean },
      // ],
      // defaultMemberPermissions: "Administrator",
    });
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    const message = await interaction
      .reply({
        content: "Ping?",
        // ephemeral: this.client.permHelper.isEphemeral(interaction),
        fetchReply: true,
      })
      .catch(console.error);
    if (!message) return {};

    const hostLatency = message.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(this.client.ws.ping);

    interaction.editReply({
      content: `Pong! Round trip took ${(
        hostLatency + apiLatency
      ).toLocaleString()}ms. (Host latency is ${hostLatency.toLocaleString()} and API latency is ${apiLatency.toLocaleString()}ms)`,
    });
    return {};
  }
}
