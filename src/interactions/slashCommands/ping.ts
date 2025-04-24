import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
} from "discord.js";
import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";

export default class PingCommand extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("ping", client, {
      type: ApplicationCommandType.ChatInput,
      defaultMemberPermissions: "Administrator",
      permissionLevel: "USER",
      description: "Check the bot's ping!",
    });
  }

  async run(interaction: ChatInputCommandInteraction) {
    const message = await interaction
      .reply({
        content: "Ping?",
        // ephemeral: this.client.permHelper.isEphemeral(interaction),
        withResponse: true,
      })
      .catch(console.error);
    if (!message) return {};

    if (!message.resource?.message) return {};
    const hostLatency =
      message.resource.message.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(this.client.ws.ping);

    interaction.editReply({
      content: `Pong! Round trip took ${(
        hostLatency + apiLatency
      ).toLocaleString()}ms. (Host latency is ${hostLatency.toLocaleString()} and API latency is ${apiLatency.toLocaleString()}ms)`,
    });
  }
}
