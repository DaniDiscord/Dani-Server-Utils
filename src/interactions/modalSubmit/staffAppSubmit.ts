import { MessageFlags, ModalSubmitInteraction } from "discord.js";
import { Modal } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { staffAppQuestions, staffAppCustomId } from "lib/util/questions";
import { TimestampModel } from "models/Timestamp";
import { Times } from "types/index";

export default class StaffAppModalSubmit extends Modal {
  constructor(client: DsuClient) {
    super(staffAppCustomId, client, {
      permissionLevel: "USER",
    });
  }

  async run(interaction: ModalSubmitInteraction) {
    const TIMESPAN_COOLDOWN = Times.WEEK;

    const identifier = `${interaction.user.id}-staff-application`;
    const lastApplied = await TimestampModel.findOne({ identifier });

    if (
      lastApplied?.timestamp &&
      lastApplied.timestamp.valueOf() + TIMESPAN_COOLDOWN >= Date.now()
    ) {
      // use discord relative formatting instead of date-fns formatting
      const lastAppliedUnix = Math.floor(
        lastApplied.timestamp.valueOf() / 1000
      );
      const nextAllowedUnix = Math.floor(
        (lastApplied.timestamp.valueOf() + TIMESPAN_COOLDOWN) / 1000
      );

      await interaction.reply({
        flags: [MessageFlags.Ephemeral],
        content:
          `Your last staff application was sent <t:${lastAppliedUnix}:R>\n` +
          `You can send a new one <t:${nextAllowedUnix}:R>`,
      });

      return;
    } else {
      await TimestampModel.updateOne(
        { identifier },
        { timestamp: new Date() },
        { upsert: true }
      );
    }

    const questions = [];
    for (const question of staffAppQuestions) {
      let answer = interaction.fields.getTextInputValue(question.customId);
      if (answer === "") {
        answer = "**N/A**";
        if (question.required) {
          await interaction.reply({
            content:
              "Issue sending application, please make sure all required fields are completed.",
            flags: [MessageFlags.Ephemeral],
          });

          await TimestampModel.deleteOne({ identifier });
          return;
        }
      }
      questions.push({ name: question.label, value: answer });
    }

    const authorId = interaction.user.id;

    let embed;

    try {
      embed = this.client.utils.getUtility("default").generateEmbed("general", {
        title: `Application of ${interaction.user.tag}`,
        fields: questions,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "Issue sending application, please try again.",
        flags: [MessageFlags.Ephemeral],
      });

      await TimestampModel.deleteOne({ identifier });
      return;
    }

    await interaction.reply({
      content: "Application sent successfully.",
      flags: [MessageFlags.Ephemeral],
    });
    const channel = await this.client.channels.fetch("995792003726065684");
    if (channel && channel.isSendable()) {
      channel.send({
        content: `<@${authorId}> (${interaction.user.tag}) is applying for staff:`,
        embeds: [embed],
      });
    }
  }
}
