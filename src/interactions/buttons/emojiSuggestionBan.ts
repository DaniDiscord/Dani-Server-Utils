import { ButtonInteraction, ModalBuilder, TextInputStyle } from "discord.js";
import { DsuClient } from "lib/core/DsuClient";
import { Button } from "lib/core/command";
import { Question } from "lib/util/questions";
import { SuggestionAction } from "../../utilities/emojiSuggestions";

export default class EmojiSuggestionDeny extends Button {
  constructor(client: DsuClient) {
    super("ban", client, {
      permissionLevel: "USER",
      global: true,
    });
  }

  public async run(interaction: ButtonInteraction) {
    if (interaction.message.partial) {
      await interaction.message.fetch();
    }
    const emojiUtility = this.client.utils.getUtility("emoji");
    const message = interaction.message;
    const attachment = Array.from(message.attachments.values())[0];
    let author = message.content.split(" ")[2];
    author = author.substring(2, author.length - 1);
    const reasonId = "reason";
    const reasonField = new Question(
      reasonId,
      "Reason for ban",
      true,
      TextInputStyle.Paragraph
    );
    const modal = new ModalBuilder()
      .setCustomId("emojiBan")
      .setTitle(`Ban from suggestions`)
      .addComponents(reasonField.toActionRow());
    await interaction.showModal(modal);
    const submitted = await interaction
      .awaitModalSubmit({
        time: 60000,
        filter: (i) => i.user.id === interaction.user.id,
      })
      .catch((error) => {
        this.client.logger.error(error);
        return null;
      });
    if (!submitted) {
      return;
    }

    const reason = submitted.fields.getTextInputValue(reasonId);
    await emojiUtility.banFromSuggestion(
      interaction.guildId!,
      "emojisuggest",
      author,
      reason
    );

    await submitted.reply({
      content: `<@${author}> banned from suggesting emojis with reason "${reason}"`,
      flags: [1 << 6], // Ephemeral
    });

    const embed = emojiUtility.generateEmojiEmbed(
      SuggestionAction.Ban,
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
  }
}
