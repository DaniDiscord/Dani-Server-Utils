import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  MessageFlags,
  TextChannel,
} from "discord.js";
import { Button } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import {
  approveSync,
  SuggestionAction,
} from "../../utilities/emojiSuggestions";
import { EMOJI_APPROVE, EMOJI_DENY } from "types/constants/emoji";

const confirmationTimeoutPeriod = 15000;

export default class EmojiSuggestionApprove extends Button {
  constructor(client: DsuClient) {
    super("approve", client, {
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
        .setLabel("Send Emoji to Voting")
        .setStyle(ButtonStyle.Primary),
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

    const messageComponentCollector =
      interaction.channel!.createMessageComponentCollector({
        filter: (i) =>
          i.user.id === interaction.user.id &&
          ["confirm", "cancel"].includes(i.customId),
        time: confirmationTimeoutPeriod,
        max: 1,
      });

    let confirmed = false;

    messageComponentCollector.on("collect", async (i) => {
      if (i.customId === "cancel") {
        await i.update({
          content: "Cancelled.",
          components: [],
        });
        return;
      }

      confirmed = true;
      await i.update({
        content: "Directing emoji to voting...",
        components: [],
      });
    });

    messageComponentCollector.on("end", async (_, reason) => {
      if (!confirmed && reason === "time") {
        try {
          await interaction.editReply({
            content: "Confirmation not received in time. Cancelling.",
            components: [],
          });
        } catch {}
      }

      if (!confirmed) return;

      const channel = message.channel;
      if (!channel.isSendable()) return;

      const voteChannel = interaction.guild?.channels.cache.get(config.voteId);
      if (!(voteChannel instanceof TextChannel)) {
        await channel.send("Error initiating vote");
        return;
      }

      await approveSync.doSynchronized(message.id, async () => {
        if (!attachment) {
          await channel.send("Error accessing emoji");
          return;
        }

        const voteMessage = await voteChannel.send({
          content: message.content,
          files: [{ attachment: attachment.proxyURL }],
        });

        await voteMessage.react(EMOJI_APPROVE);
        await voteMessage.react(EMOJI_DENY);

        const embed = emojiUtility.generateEmojiEmbed(
          SuggestionAction.Approve,
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
    });
  }
}
