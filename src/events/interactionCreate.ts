import {
  ApplicationCommand,
  ApplicationCommandType,
  Embed,
  EmbedBuilder,
  Interaction,
  ReactionCollector,
  TextChannel,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  interpretInteractionResponse,
} from "../classes/CustomInteraction";
import { formatDuration, intervalToDuration } from "date-fns";
import { staffAppCustomId, staffAppQuestions } from "lib/staffapp";

import { CustomClient } from "lib/client";
import { InteractionType } from "discord-api-types/v10";
import { SettingsModel } from "models/Settings";
import { TimestampModel } from "models/Timestamp";
import { onInteraction } from "lib/emojiSuggestions";

export default async function (client: CustomClient, interaction: Interaction) {
  // if (interaction.guildId) {
  //   await client.loadGuildSettings(interaction.guildId);
  // }

  // if (interaction.isButton()) {
  //   const [buttonType, command] = interaction.customId.split(":");
  //   const existingButtonHandler = client.buttons.get(buttonType);
  //   if (existingButtonHandler) {
  //     await existingButtonHandler.execute(interaction);
  //   }
  // }

  if (!interaction.guild) return;
  if (interaction.guild && !client.settings.has((interaction.guild || {}).id)) {
    // We don't have the settings for this guild, find them or generate empty settings
    const s = await SettingsModel.findOneAndUpdate(
      { _id: interaction.guild.id },
      { toUpdate: true },
      {
        upsert: true,
        setDefaultsOnInsert: true,
        new: true,
      }
    )
      .populate("mentorRoles")
      .populate("commands");

    log.debug("Setting sync", {
      action: "Fetch",
      message: `Database -> Client (${interaction.guild.id})`,
    });

    client.settings.set(interaction.guild.id, s);
    interaction.settings = s;
  } else {
    const s = client.settings.get(interaction.guild ? interaction.guild.id : "default");
    if (!s) return;
    interaction.settings = s;
  }

  // Emojis
  await onInteraction(client, interaction);

  const isModalSubmit = interaction.isModalSubmit();
  if (isModalSubmit && interaction.customId == staffAppCustomId) {
    // At this point, impose a cooldown. Lets start with a week
    const TIMESPAN_COOLDOWN = 7 * (24 * 60 * 60 * 1000);
    const identifier = `${interaction.user.id}-staff-application`;
    const lastApplied = await TimestampModel.findOne({ identifier });
    if (
      lastApplied?.timestamp &&
      lastApplied.timestamp.valueOf() + TIMESPAN_COOLDOWN >= Date.now()
    ) {
      // Nah bro, deny that shit
      await interaction.reply({
        ephemeral: true,
        content:
          `Your last staff application was sent ${formatDuration(
            intervalToDuration({ start: lastApplied.timestamp, end: Date.now() })
          )} ago\n` +
          `You can send a new one in ${formatDuration(
            intervalToDuration({
              start: Date.now(),
              end: lastApplied.timestamp.valueOf() + TIMESPAN_COOLDOWN,
            })
          )}`,
      });
      return;
    } else {
      await TimestampModel.updateOne(
        { identifier },
        { timestamp: new Date() },
        { upsert: true }
      );
    }
    const qna = [];
    for (const question of staffAppQuestions) {
      let answer = interaction.fields.getTextInputValue(question.customId);
      if (answer === "") {
        answer = "**N/A**";
        if (question.required) {
          await interaction.reply({
            content: "Issue sending application, please try again.",
            ephemeral: true,
          });

          // Delete this users timeout, they couldn't send the application properly
          await TimestampModel.deleteOne({ identifier });
          return;
        }
      }
      qna.push({ name: question.label, value: answer });
    }

    const authorId = interaction.user.id;

    let embed = new EmbedBuilder();

    try {
      embed = embed
        .setColor(0xaa00aa)
        .setTitle(`Application of ${interaction.user.tag}`)
        .addFields(qna);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "Issue sending application, please try again.",
        ephemeral: true,
      });

      // Delete this users timeout, they couldn't send the application properly
      await TimestampModel.deleteOne({ identifier });
      return;
    }

    await interaction.reply({
      content: "Application sent successfully.",
      ephemeral: true,
    });
    const channel = await client.channels.fetch("995792003726065684");
    if (channel?.isTextBased()) {
      channel.send({
        content: `<@${authorId}> (${interaction.user.tag}) is applying for staff:`,
        embeds: [embed],
      });
    }
  }

  if (interaction.isCommand()) {
    const cmd = client.slashCommands.get(
      `${interaction.commandType}-${interaction.commandName}`
    );
    if (!cmd) return;
    let message = `User ${interaction.user.username} executed ${
      ApplicationCommandType[interaction.commandType]
    } command ${interaction.commandName}`;
    if (interaction.user) message += ` targeting ${interaction.user.username}`;
    else if (interaction.isMessageContextMenuCommand()) {
      message += ` targeting ${interaction.targetMessage.id}`;
    }

    log.debug("Command executed", { action: "Command", message });

    const response = await cmd.execute(interaction).catch(
      (e: Error) =>
        ({
          content: `Error: ${e.message}`,
          ephemeral: true,
        } as CustomInteractionReplyOptions)
    );
    if (interaction.replied || interaction.deferred || response == null) return;
    const send = interpretInteractionResponse(response);
    if (Object.keys(send).length > 0) interaction.reply(send);
    else interaction.reply({ content: "Error: No response", ephemeral: true });
  } else if (interaction.isAutocomplete()) {
    const ret = client.autocompleteOptions.get(interaction.commandName);
    if (ret) {
      const focused = interaction.options.getFocused(true);
      const a = ret[focused.name](focused.value, interaction);
      interaction.respond(a);
    }
  }
}
