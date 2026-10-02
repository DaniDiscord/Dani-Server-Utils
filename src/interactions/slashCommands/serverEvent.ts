import {
  ActionRowBuilder,
  APILabelComponent,
  ApplicationCommandOptionType,
  AutocompleteFocusedOption,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonStyle,
  CacheType,
  ChannelType,
  ChatInputCommandInteraction,
  codeBlock,
  ComponentType,
  LabelBuilder,
  MessageComponentInteraction,
  ModalBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  time,
} from "discord.js";
import { CustomApplicationCommand } from "lib/core/command";
import DefaultClientUtilities from "lib/util/defaultUtilities";
import { DsuClient } from "lib/core/DsuClient";
import { PermissionLevels } from "types/commands";
import { ServerEventConfigModel, ServerEventModel } from "models/ServerEvent";
import { Times } from "types/index";
import { FieldType, ServerEventUtility } from "../../utilities/serverEvent";
import dayjs from "dayjs";

export default class EventCommand extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("event", client, {
      description: "Handle server events or submit to an existing one",
      applicationData: [
        {
          name: "submit",
          description: "Open modal to submit to current event, if any.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "event_name",
              description: "The name of the event.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
          level: PermissionLevels.USER,
        },
        {
          name: "create",
          description: "Generate an event modal.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "event_name",
              description: "The name of the event.",
              type: ApplicationCommandOptionType.String,
              required: true,
              autocomplete: true,
            },
          ],
          level: PermissionLevels.MODERATOR,
        },
        {
          name: "start",
          description: "Start an event.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "event_name",
              description: "The name of the event.",
              type: ApplicationCommandOptionType.String,
              required: true,
              autocomplete: true,
            },
          ],
          level: PermissionLevels.MODERATOR,
        },
        {
          name: "cancel",
          description: "Prematurely end an event, if applicable.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "event_name",
              description: "The event to end.",
              type: ApplicationCommandOptionType.String,
              autocomplete: true,
            },
          ],
          level: PermissionLevels.MODERATOR,
        },
        {
          name: "config",
          description: "Setup event channels",
          type: ApplicationCommandOptionType.SubcommandGroup,
          options: [
            {
              name: "get",
              description: "Get current configuration information.",
              type: ApplicationCommandOptionType.Subcommand,
            },
            {
              name: "set",
              description: "The name of the event.",
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                {
                  name: "staff_vote_channel",
                  description: "The channel for staff to approve or deny submissions.",
                  type: ApplicationCommandOptionType.Channel,
                  channel_types: [ChannelType.GuildText],
                },
                {
                  name: "user_vote_channel",
                  description:
                    "The channel where submissions will be sent for users to vote on.",
                  type: ApplicationCommandOptionType.Channel,
                  channel_types: [ChannelType.GuildText],
                },
              ],
            },
          ],
          level: PermissionLevels.MODERATOR,
        },
      ],
      permissionLevel: PermissionLevels.USER,
      defaultMemberPermissions: "Administrator",
    });
  }

  async run(interaction: ChatInputCommandInteraction) {
    const subcommandGroup = interaction.options.getSubcommandGroup();
    if (!subcommandGroup) {
      const subcommand = interaction.options.getSubcommand(true);
      switch (subcommand) {
        case "start":
          await this.handleStart(interaction);
          break;
        case "cancel":
          await this.handleCancel(interaction);
          break;
        case "create":
          await this.handleCreate(interaction);
          break;
        case "submit":
          await this.handleSubmit(interaction);
          break;
        default:
          await interaction.reply("Unknown subcommand");
      }

      return;
    }
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case "get":
        await this.handleConfigGet(interaction);
        break;
      case "set":
        await this.handleConfigSet(interaction);
        break;
      default:
        await interaction.reply("Unknown subcommand");
    }
  }

  async handleCancel(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({});
    const eventName = interaction.options.getString("event_name", true);

    const event = await ServerEventModel.findOne({ name: eventName });

    if (!event) {
      await interaction.editReply({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "Failed to find event",
            description: `Couldn't find an event under name \`${eventName}\``,
          }),
        ],
      });
      return;
    }

    if (!event.started) {
      await interaction.editReply({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "Cannot submit to event",
            description: `This event is currently not running`,
          }),
        ],
      });
      return;
    }

    await event.updateOne({
      started: false,
      endAt: Date.now(),
    });

    // TODO: handle event ending similar to main event ending. Either tie it to the endAt change in the DB or
    // call whatever method will actually handle the voting and finishing cleanup.

    await interaction.editReply({
      embeds: [
        DefaultClientUtilities.generateEmbed("success", {
          title: "Cancelled event",
          description: `The ${event.name} event has been cancelled.`,
        }),
      ],
    });
  }

  async handleSubmit(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const eventName = interaction.options.getString("event_name", true);

    const event = await ServerEventModel.findOne({ name: eventName });

    if (!event) {
      await interaction.editReply({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "Failed to find event",
            description: `Couldn't find an event under name \`${eventName}\``,
          }),
        ],
      });
      return;
    }

    if (!event.started) {
      await interaction.editReply({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "Cannot submit to event",
            description: `This event is currently not running`,
          }),
        ],
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`event-submit-${event.id}`)
      .setTitle(event.name)
      .addLabelComponents(...event.fields);

    await interaction.showModal(modal);
  }

  async handleCreate(interaction: ChatInputCommandInteraction) {
    const defer = await interaction.deferReply({ withResponse: true });
    const eventName = interaction.options.getString("event_name", true);

    const existing = await ServerEventModel.findOne({
      guildId: interaction.guildId,
      name: eventName,
    });

    if (existing) {
      await interaction.editReply({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "Event already exists",
            description: `An event named \`${eventName}\` already exists.`,
          }),
        ],
      });
      return;
    }

    const fields: APILabelComponent[] = [];

    await interaction.editReply({
      components: [
        ServerEventUtility.generateEventContainer(eventName, fields),
        ServerEventUtility.generateCreateEventActionRow(),
      ],
      flags: "IsComponentsV2",
    });

    const message = defer.resource?.message;
    if (!message) return;

    const collector = message.createMessageComponentCollector({
      time: Times.MINUTE * 10,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on("collect", async (component: MessageComponentInteraction) => {
      if (component.isStringSelectMenu() && component.customId === "add-component-menu") {
        await ServerEventUtility.handleAddField(
          component,
          eventName,
          fields,
          component.values[0] as FieldType,
        );
        return;
      }

      if (!component.isButton()) return;

      if (component.customId === "cancel-event-button") {
        collector.stop("cancelled");
        await component.update({
          components: [
            new TextDisplayBuilder({
              content: `Cancelled creating event \`${eventName}\`.`,
            }),
          ],
          flags: "IsComponentsV2",
        });
        return;
      }

      if (component.customId === "submit-event-button") {
        if (fields.length === 0) {
          await component.reply({
            content: "Add at least one field before submitting.",
            flags: "Ephemeral",
          });
          return;
        }

        const created = await ServerEventUtility.handleFinalize(
          this.client,
          component,
          interaction,
          eventName,
          fields,
        );
        if (created) collector.stop("submitted");
      }
    });

    collector.on("end", async (_collected, reason) => {
      if (reason !== "time") return;
      await message
        .edit({
          components: [
            new TextDisplayBuilder({
              content: `Timed out creating event \`${eventName}\`.`,
            }),
          ],
          flags: "IsComponentsV2",
        })
        .catch(() => {});
    });
  }

  async handleStart(interaction: ChatInputCommandInteraction) {
    const eventName = interaction.options.getString("event_name", true);

    const [event, eventConfig] = await Promise.all([
      ServerEventModel.findOne({ name: eventName }),
      ServerEventConfigModel.findOne({ guildId: interaction.guildId }),
    ]);

    if (!event) {
      await interaction.reply({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "Couldnt find event",
            description: `Could not find \`${eventName}\`.`,
          }),
        ],
        flags: "Ephemeral",
      });
      return;
    }

    if (event.started) {
      await interaction.reply({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "Event already started",
          }),
        ],
        flags: "Ephemeral",
      });
      return;
    }

    const endDateCustomId = "end-date-input";
    const endDateTextInput = new LabelBuilder()
      .setLabel("Set End Date")
      .setDescription("Event will last this long from today (e.g. 1w)")
      .setTextInputComponent((textInput) =>
        textInput
          .setCustomId(endDateCustomId)
          .setRequired(true)
          .setPlaceholder("valid options: d, w, y")
          .setStyle(TextInputStyle.Short),
      );

    const startModal = new ModalBuilder()
      .setCustomId("start-event-modal")
      .setTitle(`Prepare to start \`${event.name}\``)
      .addLabelComponents(endDateTextInput);

    await interaction.showModal(startModal);

    const submitted = await interaction
      .awaitModalSubmit({
        time: Times.MINUTE,
        filter: (i) => i.user.id === interaction.user.id,
      })
      .catch(() => null);

    if (!submitted) return;

    const label = submitted.fields.getTextInputValue(endDateCustomId);

    const match = label.trim().match(/^(\d+)(d|w|y)$/i);
    if (!match) {
      await submitted.reply({
        content:
          "Invalid end date. Use a number followed by `d`, `w`, or `y` (e.g. `1w`).",
        flags: "Ephemeral",
      });
      return;
    }

    const [, amount, unit] = match;
    const unitMap = { d: "day", w: "week", y: "year" } as const;
    const endDate = dayjs().add(
      Number(amount),
      unitMap[unit.toLowerCase() as "d" | "w" | "y"],
    );

    const errorEmbed = DefaultClientUtilities.generateEmbed("error", {
      title: "Cannot start event.",
    });

    if (!endDate.isValid() || !endDate.isAfter(dayjs())) {
      await submitted.reply({
        embeds: [errorEmbed.setDescription("That end date isn't valid.")],
        flags: "Ephemeral",
      });
      return;
    }

    let errors = [];

    if (!eventConfig?.staffApprovalChannelId) {
      errors.push("Missing staff approval channel");
    }

    if (!eventConfig?.votingChannelId) {
      errors.push("Missing voting channel id");
    }

    if (errors.length > 0) {
      await submitted.reply({
        embeds: [
          errorEmbed.setDescription(
            `One or more errors have occured:\n${errors.map((msg) => codeBlock(msg)).join("\n")}\n\nRun ${codeBlock("event config set")} to add configuration info.`,
          ),
        ],
        flags: "Ephemeral",
      });
      return;
    }

    const confirmId = "confirm-start-event";
    const cancelId = "cancel-start-event";

    const response = await submitted.reply({
      content: `Event will end on ${time(endDate.toDate(), "f")}. Is this correct?`,
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(confirmId)
            .setLabel("Confirm")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(cancelId)
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Danger),
        ),
      ],
      withResponse: true,
    });

    const confirmation = await response.resource?.message
      ?.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: Times.MINUTE,
        filter: (i) => i.user.id === interaction.user.id,
      })
      .catch(() => null);

    if (!confirmation || confirmation.customId === cancelId) {
      await submitted.editReply({
        content: "Event start cancelled.",
        components: [],
      });
      return;
    }

    event.started = true;
    event.endAt = endDate.toDate();
    await event.save();

    await confirmation.update({
      content: `Event \`${event.name}\` started, ending ${time(endDate.toDate(), "R")}.`,
      components: [],
    });

    // TODO send message about event starting, remaining length, and max submissions/command to run.
    // will also need to wire-up autoreactions and similar.. all of which can be re-used from emoji suggestions.
  }

  async handleConfigGet(interaction: ChatInputCommandInteraction) {
    const eventConfig = await ServerEventConfigModel.findOne({
      guildId: interaction.guildId,
    });

    if (!eventConfig) {
      await interaction.editReply({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "Error",
            description: "Missing configuration",
          }),
        ],
      });
      return;
    }

    const embed = DefaultClientUtilities.generateEmbed("success", {
      title: "Server Event Configuration",
    });

    const fields = [];

    if (eventConfig.votingChannelId) {
      fields.push({ name: "Voting channel ID", value: eventConfig.votingChannelId });
    } else {
      fields.push({ name: "Voting channel ID", value: "Not set" });
    }
    if (eventConfig.staffApprovalChannelId) {
      fields.push({
        name: "Staff approval channel ID",
        value: eventConfig.staffApprovalChannelId,
      });
    } else {
      fields.push({
        name: "Staff approval channel ID",
        value: "Not set",
      });
    }

    await interaction.editReply({
      embeds: [embed.addFields(fields)],
    });
  }

  async handleConfigSet(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({});

    const staffApprovalChannel = interaction.options.getChannel(
      "staff_vote_channel",
      false,
      [ChannelType.GuildText],
    );
    const userVoteChannel = interaction.options.getChannel("user_vote_channel", false, [
      ChannelType.GuildText,
    ]);

    if (!staffApprovalChannel && !userVoteChannel) {
      await interaction.editReply({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "No data",
            description: "No data was provided.",
          }),
        ],
      });
      return;
    }

    const eventConfig = await ServerEventConfigModel.findOne({
      guildId: interaction.guildId,
    });

    if (!eventConfig) {
      await ServerEventConfigModel.create({
        guildId: interaction.guildId,
        staffApprovalChannelId: staffApprovalChannel?.id,
        votingChannelId: userVoteChannel?.id,
      });

      await interaction.editReply({
        embeds: [
          DefaultClientUtilities.generateEmbed("success", {
            title: "Created config model",
            description: `Staff approval channel: ${staffApprovalChannel != null ? `<#${staffApprovalChannel.id}>` : "Not set"}\nUser voting channel: ${userVoteChannel != null ? `<#${userVoteChannel.id}>` : "Not set"}`,
          }),
        ],
      });
      return;
    }
    const {
      staffApprovalChannelId: existingApprovalChannel,
      votingChannelId: existingVotingChannel,
    } = eventConfig;

    const newApprovalChannelId = staffApprovalChannel?.id ?? existingApprovalChannel;
    const newVotingChannelId = userVoteChannel?.id ?? existingVotingChannel;

    await eventConfig.updateOne({
      staffApprovalChannelId: newApprovalChannelId,
      votingChannelId: newVotingChannelId,
    });
    await interaction.editReply({
      embeds: [
        DefaultClientUtilities.generateEmbed("success", {
          title: "Updated config model",
          description: `Staff approval channel: <#${newApprovalChannelId}>\nUser voting channel: <#${newVotingChannelId}>`,
        }),
      ],
    });
  }

  public async autoComplete(
    interaction: AutocompleteInteraction,
    option: AutocompleteFocusedOption,
  ) {
    const query = option.value.toLowerCase();

    const cache = this.client.stringKeyCache.get("events");

    if (!cache) {
      return;
    }

    const filtered = cache.values().filter((word) => word.includes(query));

    await interaction.respond([
      ...filtered.map((trigger) => ({ name: trigger, value: trigger })),
    ]);
  }
}
