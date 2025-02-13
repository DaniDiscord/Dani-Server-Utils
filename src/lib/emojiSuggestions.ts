/* eslint-disable max-len */
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Interaction,
  MessageActionRowComponentBuilder,
  MessageReaction,
  TextChannel,
  TextInputStyle,
  User,
} from "discord.js";
import { approve, approveId, banId, deny, denyId } from "interactions/chatInput/emoji";
import { commandId, emojiSuffix } from "interactions/chatInput/emojiSuggest";

import { CustomClient } from "./client";
import { ModalBuilder } from "@discordjs/builders";
import { Mutex } from "async-mutex";
import { Question } from "./staffapp";
import axios from "axios";

const confirmationTimeoutPeriod = 15000;

const emojiBan = "emojiBan";

export class EmojiSuggestions {
  guildId: string;
  sourceId: string;
  voteId: string;
  threshold: number;
  bias: number;
  emojiCap: number;
  cooldown: number;

  constructor(
    guildId: string,
    sourceId: string,
    voteId: string,
    threshold: number,
    bias: number,
    emojiCap: number,
    cooldown: number
  ) {
    if (sourceId === voteId) {
      throw new Error("Source channel cannot be the same as the Vote channel ");
    }
    if (threshold <= 0 || threshold >= 1) {
      throw new Error("Selection threshold should be > 0 and < 1");
    }
    if (bias <= 0) {
      throw new Error("Bias should be positive");
    }
    if (cooldown < 0) {
      throw new Error("Cooldown should be postiive");
    }
    this.guildId = guildId;
    this.sourceId = sourceId;
    this.voteId = voteId;
    this.threshold = threshold;
    this.bias = bias;
    this.emojiCap = emojiCap;
    this.cooldown = cooldown;
  }
}

export class SynchronizeById {
  private lock: Mutex;
  private lockMap: Map<string, Mutex>;

  constructor() {
    this.lock = new Mutex();
    this.lockMap = new Map();
  }

  async doSynchronized(id: string, fn: () => Promise<void>): Promise<void> {
    const release = await this.lock.acquire();
    let lock = this.lockMap.get(id);
    if (lock === undefined) {
      lock = new Mutex();
      this.lockMap.set(id, lock);
    }
    release();
    if (lock.isLocked()) {
      return;
    }
    const mapRelease = await lock.acquire();

    // If we fail here, we don't want to deadlock
    try {
      await fn();
    } catch (error) {
      console.log(error);
    } finally {
      this.lockMap.delete(id);
      mapRelease();
    }
  }
}

const approveSync = new SynchronizeById();

enum SuggestionAction {
  Approve,
  Deny,
  Ban,
}

function emojiEmbed(
  actionType: SuggestionAction,
  user: string,
  emojiUrl: string,
  creator: string
): EmbedBuilder {
  let action;
  switch (actionType) {
    case SuggestionAction.Approve:
      action = `<@${creator}>'s emoji approved`;
      break;
    case SuggestionAction.Deny:
      action = `<@${creator}>'s emoji denied`;
      break;
    case SuggestionAction.Ban:
      action = `<@${creator}> banned from suggestions`;
      break;
  }

  const time = Math.floor(Date.now() / 1000);
  const embed = new EmbedBuilder()
    .addFields([
      { name: "Reviewed", value: `${action} by <@${user}>` },
      { name: "Time", value: `<t:${time}:f>` },
    ])
    .setThumbnail(emojiUrl);
  return embed;
}

export async function onInteraction(client: CustomClient, interaction: Interaction) {
  if (!interaction.isButton()) {
    return;
  }
  const guildId = interaction.guildId;
  if (guildId === null) {
    return;
  }
  const emojiSuggestionsConfig = await client.getEmojiSuggestions(guildId);
  if (emojiSuggestionsConfig === null) {
    return;
  }

  if (interaction.customId === banId) {
    if (interaction.message.partial) {
      await interaction.message.fetch();
    }
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
      .setCustomId(emojiBan)
      .setTitle(`Ban from suggestions`)
      .addComponents(reasonField.toActionRow());
    await interaction.showModal(modal);
    const submitted = await interaction
      .awaitModalSubmit({
        time: 60000,
        filter: (i) => i.user.id === interaction.user.id,
      })
      .catch((error) => {
        // Catch any Errors that are thrown (e.g. if the awaitModalSubmit times out after 60000 ms)
        console.error(error);
        return null;
      });
    if (submitted === null) {
      return;
    }

    const reason = submitted.fields.getTextInputValue(reasonId);
    await client.banFromCommand(interaction.guildId ?? "", commandId, author, reason);
    await submitted.reply({
      content: `<@${author}> banned from suggesting emojis with reason "${reason}"`,
      ephemeral: true,
    });
    const embed = emojiEmbed(
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
    return;
  }
  if (interaction.customId !== approveId && interaction.customId !== denyId) {
    return;
  }

  if (interaction.message.partial) {
    await interaction.message.fetch();
  }
  const message = interaction.message;
  const attachment = Array.from(message.attachments.values())[0];
  let author = message.content.split(" ")[2];
  author = author.substring(2, author.length - 1);

  if (interaction.channelId === emojiSuggestionsConfig.sourceId) {
    let confirmLabel: string;
    let confirmStyle: ButtonStyle;
    let confirmMessage: string;
    switch (interaction.customId) {
      case approveId:
        confirmLabel = "Send Emoji to Voting";
        confirmStyle = ButtonStyle.Primary;
        confirmMessage = "Directing Emoji to Voting";
        break;
      case denyId:
        confirmLabel = "Remove Emoji from Voting";
        confirmStyle = ButtonStyle.Danger;
        confirmMessage = "Removing Emoji from Channel";
        break;
    }

    const confirmationId = "confirm";
    const cancelId = "cancel";
    const confirm = new ButtonBuilder()
      .setLabel(confirmLabel)
      .setCustomId(confirmationId)
      .setStyle(confirmStyle);
    const cancel = new ButtonBuilder()
      .setLabel("Cancel")
      .setCustomId(cancelId)
      .setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents([
      confirm,
      cancel,
    ]);

    const response = await interaction.reply({ components: [row], ephemeral: true });
    let confirmed = false;
    try {
      const confirmation = await response.awaitMessageComponent({
        time: confirmationTimeoutPeriod,
      });
      if (confirmation.customId == confirmationId) {
        await confirmation.update({
          content: confirmMessage,
          components: [],
        });
        confirmed = true;
      } else if (confirmation.customId == cancelId) {
        await confirmation.update({
          content: "Cancelling",
          components: [],
        });
      }
    } catch (e) {
      await interaction.editReply({
        content: "Confirmation not received, cancelling",
        components: [],
      });
    }

    if (confirmed && interaction.customId == denyId) {
      const embed = emojiEmbed(
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
      return;
    } else if (!confirmed) {
      return;
    }

    const voteChannel = message.guild?.channels.cache.get(emojiSuggestionsConfig.voteId);
    if (voteChannel === undefined || !(voteChannel instanceof TextChannel)) {
      await (message.channel as TextChannel).send("Error initiating vote");
      return;
    }

    await approveSync.doSynchronized(message.id, async () => {
      if (attachment === undefined) {
        await (message.channel as TextChannel).send("Error accessing emoji");
        return;
      }
      const voteMessage = await voteChannel.send({
        content: message.content,
        files: [{ attachment: attachment.proxyURL }],
      });
      await voteMessage.react(approve);
      await voteMessage.react(deny);
      const embed = emojiEmbed(
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
  }
}

const reactionSync = new SynchronizeById();

export async function onReactionEvent(
  client: Client,
  reaction: MessageReaction,
  user: User
): Promise<void> {
  if (user.bot) {
    return;
  }
  const message = reaction.message;
  const guildId = message.guildId;
  if (guildId === null) {
    return;
  }
  const emojiSuggestionsConfig = await client.getEmojiSuggestions(guildId);
  if (emojiSuggestionsConfig === null) {
    return;
  }
  const voteChannelId = emojiSuggestionsConfig.voteId;
  const threshold = emojiSuggestionsConfig.threshold;
  const bias = emojiSuggestionsConfig.bias;

  const guild = message.guild;
  if (guild === null) {
    return;
  }
  const emojiLimitFull = guild.emojis.cache.size >= emojiSuggestionsConfig.emojiCap;
  if (message.channelId === voteChannelId && !emojiLimitFull) {
    if (reaction.partial) {
      await reaction.fetch();
    }
    let thumbsUp = message.reactions.cache.get(approve)?.count ?? 1;
    let thumbsDown = message.reactions.cache.get(deny)?.count ?? 1;

    // The bot already has 1 reaction for each.
    thumbsUp -= 1;
    thumbsDown -= 1;

    const denom = thumbsUp + thumbsDown + bias;
    const pass = thumbsUp / denom > threshold;
    const fail = thumbsDown / denom > threshold;
    await reactionSync.doSynchronized(message.id, async () => {
      if (fail) {
        message.reactions.removeAll();
        await message.react("😔");
      }
      if (pass) {
        // Let the user now their emoji passed the vote
        await message.reactions.removeAll();
        await message.react("✨");

        const emojiName = message.content?.split(" ")[0];
        const attachment = Array.from(message.attachments.values())[0];
        const guild = message.guild;
        if (
          guild === null ||
          attachment === undefined ||
          emojiName === undefined ||
          message.channel.type !== ChannelType.GuildText
        ) {
          return;
        }
        if (guild.emojis.cache.size >= emojiSuggestionsConfig.emojiCap - 1) {
          await message.channel.send(
            `With this emoji, the allocated quota has been filled.
          Next votes will include which emoji you want to replace.`
          );
        }
        const emoji = await axios.get(attachment.proxyURL, {
          responseType: "arraybuffer",
        });
        if (!(emoji.data instanceof Buffer)) {
          // It is guaranteed that it is a buffer
          throw new Error("Axios did not return Buffer");
        }

        const emojiCreate = {
          // @ts-expect-error Data must be, and is known to be a Buffer.
          attachment: Buffer.from(emoji.data),
          name: emojiName + emojiSuffix,
        };
        await guild.emojis.create(emojiCreate);
      }
    });
  }
}
