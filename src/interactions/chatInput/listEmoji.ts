import {
  CacheType,
  ChatInputCommandInteraction,
  CommandInteraction,
  EmbedBuilder,
  PermissionsBitField,
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
      name: "listemoji",
      description: "Rank community emojis by popularity",
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    if (!(interaction instanceof ChatInputCommandInteraction)) {
      return { content: "Internal Error", eph: true };
    }
    const emojis = await this.client.listEmoji(interaction.guildId);

    const embedFields = [];

    emojis.sort((a, b) => b.count - a.count);

    const total = emojis.map((emoji) => emoji.count).reduce((x, y) => x + y, 0);
    if (total === 0) {
      return { content: "Internal Error", eph: true };
    }
    const avg = total / emojis.length;
    let index = 1;
    for (const emoji of emojis) {
      let percentPopularity = ((emoji.count - avg) / avg) * 100;

      let message = "more popular than average";
      if (percentPopularity < 0) {
        percentPopularity = -percentPopularity;
        message = "less popular than average";
      }
      if (percentPopularity < 1) {
        message = "is average";
      }

      if (percentPopularity)
        embedFields.push({
          name: `#${index} ${emoji.name}`,
          value: `${percentPopularity.toFixed(1)}% ${message}`,
        });
      index++;
    }
    const embed = new EmbedBuilder()
      .setTitle("Most used community emojis")
      .setFields(embedFields);

    return { embeds: [embed], eph: true };
  }
}
