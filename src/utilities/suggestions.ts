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
import { ClientUtilities } from "lib/core/ClientUtilities";
import { DsuClient } from "lib/core/DsuClient";
import { SuggestionConfigModel, SuggestionModel } from "models/Suggestion";
import { ISuggestionConfig } from "types/mongodb";

export class SuggestionUtility extends ClientUtilities {
  modalContextCache = new Map<string, string>();

  constructor(client: DsuClient) {
    super(client);
    this.modalContextCache = new Map();
  }

  async isSuggestionMessage(target: Message) {
    const model = await SuggestionModel.findOne({ messageId: target.id });

    return !!model;
  }

  async deny(interaction: ModalSubmitInteraction, reason: string) {
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
      suggestionConfig.channelId
    );
    const originalMessage = await (
      originalChannel as TextChannel
    ).messages.fetch(messageId);

    if (!originalMessage) {
      return interaction.reply({
        content: "Original message not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const thread = (await interaction.guild!.channels.fetch(
      suggestionConfig.deniedThreadId!
    )) as ThreadChannel;

    // Lock suggestion discussion thread
    await originalMessage.thread?.setLocked(true);

    // Remove reactions, forward message, and edit the original embed to notify users.
    await originalMessage.reactions.removeAll();
    await originalMessage.edit({
      embeds: [this.generateDenialEmbed(suggestion.content, thread.id)],
    });

    await originalMessage.forward(thread.id);
    await thread.send(
      `The above submission has been denied!\nReason: ${reason}`
    );

    suggestionConfig.existingSubmissions =
      suggestionConfig.existingSubmissions.filter(
        (id) => !id.equals(suggestion._id as string)
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

  async createDeniedSuggestionThread(channel: GuildTextBasedChannel) {
    const msg = await channel.send({
      embeds: [
        {
          title: "Denied Suggestions",
          description: "This thread contains denied threads.",
          color: this.client.config.colors.error,
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
      }
    );
  }

  async sendAnonymousSuggestion(
    interaction: ChatInputCommandInteraction,
    content: string,
    model: ISuggestionConfig
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
          this.client.utils.getUtility("default").generateEmbed("error", {
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
        }
      );
    } catch (error) {
      console.error("Failed to send anonymous suggestion:", error);
      return interaction.reply({
        embeds: [
          this.client.utils.getUtility("default").generateEmbed("error", {
            title: "Failed to send suggestion",
            description: "There was an error while processing the suggestion.",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  generateAnonymousEmbed(content: string) {
    return {
      title: "New Suggestion",
      color: this.client.config.colors.success,
      description: `Suggestion: \n ${content}`,
    } as APIEmbed;
  }

  generateDenialEmbed(content: string, denialThreadId: string) {
    return {
      title: `This submission has been denied! View reason in <#${denialThreadId}>`,
      color: this.client.config.colors.error,
      description: `Suggestion: \n ${content}`,
    } as APIEmbed;
  }
}
