import {
  APILabelComponent,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  ComponentType,
  ContainerBuilder,
  FileUploadBuilder,
  LabelBuilder,
  MessageReaction,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  time,
  User,
} from "discord.js";
import DefaultClientUtilities from "lib/util/defaultUtilities";
import { DsuClient } from "lib/core/DsuClient";
import { EMOJI_APPROVE, EMOJI_BAN, EMOJI_DENY } from "types/constants/emoji";
import { IServerEvent, IServerEventSubmission } from "types/mongodb";
import { ServerEventConfigModel, ServerEventModel } from "models/ServerEvent";
import { ServerEventSubmissionModel } from "models/ServerEventSubmission";
import { Times } from "types/index";

export type FieldType = "text" | "file";

export class ServerEventUtility {
  static timers = new Map<string, NodeJS.Timeout>();

  static generateEventContainer(eventName: string, fields: APILabelComponent[]) {
    const fieldList = fields.length
      ? fields
          .map((field, i) => {
            const kind =
              field.component.type === ComponentType.FileUpload
                ? "File Upload"
                : "Text Input";
            return `${i + 1}. **${field.label}** (${kind})`;
          })
          .join("\n")
      : "*No fields added yet.*";

    const menuOptions = [
      new StringSelectMenuOptionBuilder().setLabel("Text Input").setValue("text"),
      new StringSelectMenuOptionBuilder().setLabel("File Upload").setValue("file"),
    ];

    return new ContainerBuilder()
      .addTextDisplayComponents((td) =>
        td.setContent(`# Creating event: ${eventName}\n${fieldList}`),
      )
      .addSeparatorComponents((s) => s)
      .addActionRowComponents((ar) =>
        ar.addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("add-component-menu")
            .setPlaceholder("Add a field...")
            .addOptions(menuOptions),
        ),
      );
  }

  static generateCreateEventActionRow() {
    const cancelButton = new ButtonBuilder()
      .setCustomId("cancel-event-button")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger);

    const submitButton = new ButtonBuilder()
      .setCustomId("submit-event-button")
      .setLabel("Submit")
      .setStyle(ButtonStyle.Success);
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      cancelButton,
      submitButton,
    );
  }

  static async handleAddField(
    interaction: StringSelectMenuInteraction,
    eventName: string,
    fields: APILabelComponent[],
    type: FieldType,
    modalId: string,
  ) {
    const labelId = "field-label";
    const styleId = "field-style";

    const modal = new ModalBuilder().setCustomId(modalId).setTitle("Add a field");

    const labelQuestion = new LabelBuilder({
      label: "Field label",
    }).setTextInputComponent(
      new TextInputBuilder()
        .setCustomId(labelId)
        .setStyle(TextInputStyle.Short)
        .setRequired(true),
    );

    if (type === "file") {
      modal.addLabelComponents(labelQuestion);
    } else {
      modal.addLabelComponents(
        labelQuestion,
        new LabelBuilder({
          label: 'Style: "short" or "paragraph"',
        }).setStringSelectMenuComponent(
          new StringSelectMenuBuilder()
            .setCustomId(styleId)
            .addOptions([
              { label: "Short", value: "short" },
              { label: "Paragraph", value: "paragraph" },
            ])
            .setRequired(true),
        ),
      );
    }

    await interaction.showModal(modal);

    const submitted = await interaction
      .awaitModalSubmit({
        time: Times.MINUTE,
        filter: (i) => i.user.id === interaction.user.id && i.customId === modalId,
      })
      .catch(() => null);

    if (!submitted) return;

    const label = submitted.fields.getTextInputValue(labelId);
    const customId = `field-${fields.length}`;

    const field: APILabelComponent =
      type === "file"
        ? new LabelBuilder({ label })
            .setFileUploadComponent(
              new FileUploadBuilder()
                .setCustomId(customId)
                .setMinValues(1)
                .setMaxValues(1)
                .setRequired(true),
            )
            .toJSON()
        : new LabelBuilder({ label })
            .setTextInputComponent(
              new TextInputBuilder()
                .setCustomId(customId)
                .setStyle(
                  submitted.fields.getStringSelectValues(styleId)[0] === "paragraph"
                    ? TextInputStyle.Paragraph
                    : TextInputStyle.Short,
                )
                .setRequired(true),
            )
            .toJSON();

    fields.push(field);

    if (!submitted.isFromMessage()) return;

    await submitted
      .update({
        components: [
          ServerEventUtility.generateEventContainer(eventName, fields),
          ServerEventUtility.generateCreateEventActionRow(),
        ],
        flags: "IsComponentsV2",
      })
      .catch(() => {});
  }

  static async handleFinalize(
    client: DsuClient,
    component: ButtonInteraction,
    interaction: ChatInputCommandInteraction,
    eventName: string,
    fields: APILabelComponent[],
  ): Promise<boolean> {
    const winnersId = "max-winners";
    const submissionsId = "max-submissions";
    const countOptions = Array.from({ length: 25 }, (_, i) => ({
      label: `${i + 1}`,
      value: `${i + 1}`,
    }));

    const modalId = `finalize-event-${component.id}`;

    const modal = new ModalBuilder()
      .setCustomId(modalId)
      .setTitle("Finalize event")
      .addLabelComponents(
        new LabelBuilder({ label: "Max winners" }).setStringSelectMenuComponent(
          new StringSelectMenuBuilder()
            .setCustomId(winnersId)
            .addOptions(countOptions)
            .setRequired(true),
        ),
        new LabelBuilder({
          label: "Max submissions per user",
        }).setStringSelectMenuComponent(
          new StringSelectMenuBuilder()
            .setCustomId(submissionsId)
            .addOptions(countOptions)
            .setRequired(true),
        ),
      );

    await component.showModal(modal);

    const submitted = await component
      .awaitModalSubmit({
        time: Times.MINUTE,
        filter: (i) => i.user.id === interaction.user.id && i.customId === modalId,
      })
      .catch(() => null);

    if (!submitted) return false;

    const maxWinners = Number.parseInt(
      submitted.fields.getStringSelectValues(winnersId)[0],
    );
    const maxUserSubmissions = Number.parseInt(
      submitted.fields.getStringSelectValues(submissionsId)[0],
    );

    await ServerEventModel.create({
      guildId: interaction.guildId,
      name: eventName,
      started: false,
      fields,
      maxWinners,
      maxUserSubmissions,
    });

    const cache = client.stringKeyCache.get("events");
    if (cache) {
      cache.add(eventName);
    } else {
      client.stringKeyCache.set("events", new Set([eventName]));
    }

    if (!submitted.isFromMessage()) return true;

    await submitted
      .update({
        components: [
          new TextDisplayBuilder({
            content: `Event \`${eventName}\` created with ${fields.length} field(s), ${maxWinners} max winner(s), and ${maxUserSubmissions} max submission(s) per user.`,
          }),
        ],
        flags: "IsComponentsV2",
      })
      .catch(() => {});

    return true;
  }

  static staffRow(submissionId: string) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`event-approve-${submissionId}`)
        .setEmoji(EMOJI_APPROVE)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`event-deny-${submissionId}`)
        .setEmoji(EMOJI_DENY)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`event-ban-${submissionId}`)
        .setEmoji(EMOJI_BAN)
        .setStyle(ButtonStyle.Danger),
    );
  }

  static submissionEmbed(event: IServerEvent, submission: IServerEventSubmission) {
    const embed = DefaultClientUtilities.generateEmbed("general", {
      title: `${event.name} submission`,
      description: `From <@${submission.userId}>`,
    });

    for (const entry of submission.entries) {
      if (entry.kind === "file") {
        embed.addFields({
          name: entry.label,
          value: entry.fileUrls?.length ? entry.fileUrls.join("\n") : "No file",
        });
      } else {
        const text = entry.text?.length ? entry.text : "N/A";
        embed.addFields({
          name: entry.label,
          value: text.length > 1024 ? `${text.slice(0, 1021)}...` : text,
        });
      }
    }

    return embed;
  }

  static submissionFiles(submission: IServerEventSubmission) {
    return submission.entries.flatMap(
      (entry) => entry.fileUrls?.map((url) => ({ attachment: url })) ?? [],
    );
  }

  static async announceStart(client: DsuClient, event: IServerEvent) {
    const config = await ServerEventConfigModel.findOne({ guildId: event.guildId });
    if (!config?.votingChannelId || !event.endAt) return;

    const channel = await client.channels.fetch(config.votingChannelId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText || !channel.isSendable()) {
      return;
    }

    await channel.send({
      content:
        `# ${event.name} has started\n` +
        `Ends ${time(event.endAt, "R")} (${time(event.endAt, "f")})\n` +
        `Use \`/event submit event_name:${event.name}\` to enter (${event.maxUserSubmissions} per user).`,
    });
  }

  static scheduleEnd(client: DsuClient, eventId: string) {
    const existing = this.timers.get(eventId);
    if (existing) clearTimeout(existing);

    ServerEventModel.findById(eventId)
      .then((event) => {
        if (!event || !event.started || !event.endAt) return;
        const delay = event.endAt.valueOf() - Date.now();
        if (delay <= 0) {
          this.finish(client, eventId, false).catch((e) =>
            client.logger.error("Failed to finish event", { eventId, error: e }),
          );
          return;
        }
        const wait = Math.min(delay, 2 ** 31 - 1);
        this.timers.set(
          eventId,
          setTimeout(() => {
            if (wait < delay) {
              this.scheduleEnd(client, eventId);
              return;
            }
            this.timers.delete(eventId);
            this.finish(client, eventId, false).catch((e) =>
              client.logger.error("Failed to finish event", { eventId, error: e }),
            );
          }, wait),
        );
      })
      .catch((e) => client.logger.error("Failed to schedule event end", { eventId, e }));
  }

  static async restoreSchedules(client: DsuClient) {
    const events = await ServerEventModel.find({ started: true });
    for (const event of events) this.scheduleEnd(client, event.id);
  }

  static async onReaction(reaction: MessageReaction, user: User) {
    if (user.bot) return;

    if (reaction.partial) await reaction.fetch().catch(() => null);
    if (reaction.message.partial) await reaction.message.fetch().catch(() => null);

    const name = reaction.emoji.name;
    if (name !== EMOJI_APPROVE && name !== EMOJI_DENY) return;

    const tracked = await ServerEventSubmissionModel.exists({
      voteMessageId: reaction.message.id,
      status: "approved",
    }).catch(() => null);
    if (!tracked) return;

    const opposite = name === EMOJI_APPROVE ? EMOJI_DENY : EMOJI_APPROVE;
    await reaction.message.reactions.cache
      .get(opposite)
      ?.users.remove(user.id)
      .catch(() => {});
  }

  static async finish(client: DsuClient, eventId: string, cancelled: boolean) {
    const event = await ServerEventModel.findById(eventId);
    if (!event || !event.started) return;

    const timer = this.timers.get(eventId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(eventId);
    }

    event.started = false;
    await event.save();

    const config = await ServerEventConfigModel.findOne({ guildId: event.guildId });
    const channel = config?.votingChannelId
      ? await client.channels.fetch(config.votingChannelId).catch(() => null)
      : null;

    if (!channel || channel.type !== ChannelType.GuildText || !channel.isSendable()) {
      return;
    }

    if (cancelled) {
      await ServerEventSubmissionModel.updateMany(
        { eventId: event._id, status: { $in: ["pending", "approved"] } },
        { status: "denied" },
      );
      await channel.send(`Event \`${event.name}\` has been cancelled.`);
      return;
    }

    const approved = await ServerEventSubmissionModel.find({
      eventId: event._id,
      status: "approved",
    });

    if (!approved.length) {
      await channel.send(
        `Event \`${event.name}\` has ended with no approved submissions.`,
      );
      return;
    }

    const tallied = await Promise.all(
      approved.map(async (submission) => {
        let up = 0;
        let down = 0;
        let url = "";
        try {
          const message = await channel.messages.fetch(submission.voteMessageId ?? "");
          url = message.url;
          up = Math.max(0, (message.reactions.cache.get(EMOJI_APPROVE)?.count ?? 1) - 1);
          down = Math.max(0, (message.reactions.cache.get(EMOJI_DENY)?.count ?? 1) - 1);
        } catch {}
        return { submission, up, down, net: up - down, url };
      }),
    );

    tallied.sort((a, b) => b.net - a.net || b.up - a.up);

    const winners = tallied.slice(0, Math.max(1, event.maxWinners));
    const lines = winners.map(
      (w, i) =>
        `${i + 1}. <@${w.submission.userId}> — ${w.up} votes${w.url ? ` ([jump](${w.url}))` : ""}`,
    );

    const embed = DefaultClientUtilities.generateEmbed("success", {
      title: `${event.name} winners`,
      description: lines.join("\n"),
    });

    await channel.send({ embeds: [embed] });
    await ServerEventSubmissionModel.updateMany(
      { eventId: event._id, status: "pending" },
      { status: "denied" },
    );
  }
}
