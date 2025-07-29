import {
  ApplicationCommandType,
  ChannelType,
  EmbedBuilder,
  GuildMember,
  MessageContextMenuCommandInteraction,
  MessageFlags,
  ThreadChannel,
} from "discord.js";

import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";

export default class UnlockThread extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("Unlock Thread", client, {
      type: ApplicationCommandType.Message,
      permissionLevel: "USER",
      defaultMemberPermissions: null,
    });
  }

  async run(interaction: MessageContextMenuCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const thread = interaction.channel as ThreadChannel;

    if (thread.type !== ChannelType.PublicThread) {
      return interaction.editReply({
        content: "This is not a thread.",
      });
    }

    if (!thread.locked) {
      return interaction.editReply({
        content: "Thread is not locked.",
      });
    }

    if (
      this.client.getPermLevel(undefined, interaction.member! as GuildMember) < 2 &&
      thread.ownerId !== interaction.user.id
    ) {
      return interaction.editReply({
        content: "You do not have permission to unlock this thread.",
      });
    }

    const messages = await thread.messages.fetch({ limit: 1 });
    const message = messages.first();
    if (message && message.author.id === this.client.user?.id) {
      await message.delete();
    }

    const embed = new EmbedBuilder()
      .setTitle(`Post Unlocked`)
      .setDescription(`This post has been unlocked.`)
      .setColor("Green");

    await thread.send({ embeds: [embed] });

    await thread.setLocked(false);
    await thread.setArchived(false);
    return interaction.editReply({
      content: "Thread unlocked.",
    });
  }
}
