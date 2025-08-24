import {
  APIEmbed,
  ChannelType,
  ChatInputCommandInteraction,
  GuildTextBasedChannel,
  Message,
  MessageFlags,
  ModalSubmitInteraction,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import { SuggestionConfigModel, SuggestionModel } from "models/Suggestion";

import DefaultClientUtilities from "lib/util/defaultUtilities";
import { ISuggestionConfig } from "types/mongodb";
import { clientConfig } from "lib/config/ClientConfig";

export class SuggestionUtility {
  static modalContextCache = new Map<string, string>();

  static async isSuggestionMessage(target: Message) {
    const model = await SuggestionModel.findOne({ messageId: target.id });

    return !!model;
  }

  static async deny(interaction: ModalSubmitInteraction, reason: string) {
    const userId = interaction.user.id;
    const messageId = this.modalContextCache.get(userId);

    if (!messageId) {
      return interaction.reply({
        content: "No suggestion context found. Try again.",
        flags: MessageFlags.Ephemeral,
      });
    }

    this.modalContextCache.delete(userId);

    const suggestionConfig = await SuggestionConfigModel.findOne({
      guildId: interaction.guildId,
    });

    if (!suggestionConfig) {
      return interaction.reply({
        content: "Suggestion config not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const suggestion = await SuggestionModel.findOne({ messageId });

    if (!suggestion) {
      return interaction.reply({
        content: "Suggestion not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const originalChannel = await interaction.guild!.channels.fetch(
      suggestionConfig.channelId,
    );
    const originalMessage = await (originalChannel as TextChannel).messages.fetch(
      messageId,
    );

    if (!originalMessage) {
      return interaction.reply({
        content: "Original message not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const thread = (await interaction.guild!.channels.fetch(
      suggestionConfig.deniedThreadId!,
    )) as ThreadChannel;

    await originalMessage.thread?.setLocked(true);

    await originalMessage.reactions.removeAll();
    await originalMessage.edit({
      embeds: [this.generateDenialEmbed(suggestion.content, reason)],
    });

    await originalMessage.forward(thread.id);

    suggestionConfig.existingSubmissions = suggestionConfig.existingSubmissions.filter(
      (id) => !id.equals(suggestion._id as string),
    );

    suggestionConfig.deniedSubmissions.push({
      messageId,
      reason,
    });

    await suggestionConfig.save();

    await interaction.reply({
      content: "Suggestion denied.",
      flags: MessageFlags.Ephemeral,
    });
  }

  static async createDeniedSuggestionThread(channel: GuildTextBasedChannel) {
    const msg = await channel.send({
      embeds: [
        {
          title: "Denied Suggestions",
          description: "This thread contains denied threads.",
          color: clientConfig.colors.error,
        },
      ],
    });

    const thread = await msg.startThread({ name: "Denied Suggestions" });

    await msg.pin("Allow for easy access to thread.");

    await SuggestionConfigModel.updateOne(
      {
        guildId: msg.guildId,
      },
      {
        deniedThreadId: thread.id,
      },
    );
  }

  static async sendAnonymousSuggestion(
    interaction: ChatInputCommandInteraction,
    content: string,
    model: ISuggestionConfig,
  ) {
    const channelId = model.channelId;

    const resolvedChannel = await interaction.guild?.channels.fetch(channelId);

    if (
      !resolvedChannel ||
      resolvedChannel.type !== ChannelType.GuildText ||
      !resolvedChannel.isSendable()
    ) {
      return interaction.reply({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "Invalid data.",
            description: `Channel <#${channelId}> is not valid: Unsendable or does not exist.`,
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const message = await resolvedChannel.send({
        embeds: [this.generateAnonymousEmbed(content)],
      });

      await Promise.all([message.react("👍"), message.react("👎")]);

      await message.startThread({
        name: "Suggestion Discussion",
      });
      const suggestion = await SuggestionModel.create({
        messageId: message.id,
        content,
        status: "pending",
        userId: interaction.user.id,
      });

      await SuggestionConfigModel.updateOne(
        { guildId: interaction.guildId },
        {
          $push: { existingSubmissions: suggestion._id },
        },
      );
    } catch (error) {
      console.error("Failed to send anonymous suggestion:", error);
      return interaction.reply({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "Failed to send suggestion",
            description: "There was an error while processing the suggestion.",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  static generateAnonymousEmbed(content: string) {
    return {
      title: "New Suggestion",
      color: clientConfig.colors.success,
      description: `${content}`,
    } as APIEmbed;
  }

  static generateDenialEmbed(content: string, reason?: string) {
    return {
      title: `Submission Denied! The reason is: \`${reason ?? "No reason specified"}\``,
      color: clientConfig.colors.error,
      description: `Suggestion: \n ${content}`,
    } as APIEmbed;
  }
}
