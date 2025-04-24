import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import { DsuClient } from "lib/core/DsuClient";
import { Button } from "lib/core/command";
import { SuggestionAction } from "../../utilities/emojiSuggestions";

const confirmationTimeoutPeriod = 15000;

export default class EmojiSuggestionDeny extends Button {
  constructor(client: DsuClient) {
    super("deny", client, {
      permissionLevel: "USER",
      global: true,
    });
  }

  public async run(interaction: ButtonInteraction) {
    const emojiUtility = this.client.utils.getUtility("emoji");
    const config = await emojiUtility.getEmojiSuggestions(interaction.guildId!);
    if (!config || interaction.channelId !== config.sourceId) return;

    if (interaction.message.partial) await interaction.message.fetch();
    const message = interaction.message;
    const attachment = Array.from(message.attachments.values())[0];
    let author = message.content.split(" ")[2];
    author = author.substring(2, author.length - 1);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm")
        .setLabel("Remove Emoji from Voting")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: "Please confirm your action.",
      components: [row],
      flags: MessageFlags.Ephemeral,
    });

    let confirmed = false;

    const collector = interaction.channel!.createMessageComponentCollector({
      filter: (i) =>
        i.user.id === interaction.user.id &&
        ["confirm", "cancel"].includes(i.customId),
      time: confirmationTimeoutPeriod,
      max: 1,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "cancel") {
        await i.update({
          content: "Cancelled.",
          components: [],
        });
        return;
      }

      confirmed = true;
      await i.update({
        content: "Removing emoji from channel...",
        components: [],
      });
    });

    collector.on("end", async (_, reason) => {
      if (!confirmed && reason === "time") {
        try {
          await interaction.editReply({
            content: "Confirmation not received in time. Cancelling.",
            components: [],
          });
        } catch {}
      }

      if (!confirmed) return;

      const embed = emojiUtility.generateEmojiEmbed(
        SuggestionAction.Deny,
        interaction.user.id,
        attachment.url,
        author
      );
      await message.edit({
        content: "",
        attachments: [],
        embeds: [embed],
        components: [],
      });
    });
  }
}
