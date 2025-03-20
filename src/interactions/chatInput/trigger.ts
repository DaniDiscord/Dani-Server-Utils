import {
  ApplicationCommandOptionType,
  CacheType,
  ChatInputCommandInteraction,
  CommandInteraction,
  EmbedBuilder,
  PermissionsBitField,
} from "discord.js";
import { ApplicationCommandType, MessageFlags } from "discord-api-types/v10";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";

import { CustomClient } from "lib/client";
import { SettingsModel } from "models/Settings";
import { TriggerModel } from "models/Trigger";
import { isColor } from "lib/utils";

export default class SlashCommand extends InteractionCommand {
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.ChatInput,
      name: "trigger",
      description: "Manage the guild's triggers.",
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
      options: [
        {
          name: "add",
          description: "Add a trigger.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "id",
              description: "The id of the trigger",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
            {
              name: "cooldown",
              description: "The cooldown of the trigger",
              type: ApplicationCommandOptionType.Number,
              required: true,
            },
            {
              name: "content",
              description: "The content of the reply message.",
              type: ApplicationCommandOptionType.String,
              required: false,
            },
            {
              name: "title",
              description: "The title of the reply message's embed.",
              type: ApplicationCommandOptionType.String,
              required: false,
            },
            {
              name: "description",
              description: "The description of the reply message's embed.",
              type: ApplicationCommandOptionType.String,
              required: false,
            },
            {
              name: "color",
              description: "The color of the reply message's embed.",
              type: ApplicationCommandOptionType.String,
              required: false,
            },
            {
              name: "keywords1",
              description:
                "The first group of keywords of the trigger, separated by ','.",
              type: ApplicationCommandOptionType.String,
              required: false,
            },
            {
              name: "keywords2",
              description:
                "The second group of keywords of the trigger, separated by ','.",
              type: ApplicationCommandOptionType.String,
              required: false,
            },
            {
              name: "keywords3",
              description:
                "The third group of keywords of the trigger, separated by ','.",
              type: ApplicationCommandOptionType.String,
              required: false,
            },
            {
              name: "keywords4",
              description:
                "The fourth group of keywords of the trigger, separated by ','.",
              type: ApplicationCommandOptionType.String,
              required: false,
            },
            {
              name: "keywords5",
              description:
                "The fifth group of keywords of the trigger, separated by ','.",
              type: ApplicationCommandOptionType.String,
              required: false,
            }, // so ugly
          ],
        },
        {
          name: "remove",
          description: "Remove a trigger.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "id",
              description: "The id of the trigger.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
            {
              name: "clear",
              description: "If set to true, deletes opt outs.",
              type: ApplicationCommandOptionType.Boolean,
              required: true,
            },
          ],
        },
        {
          name: "enable",
          description: "Enable a trigger.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "id",
              description: "The id of the trigger.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "disable",
          description: "Disable a trigger.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "id",
              description: "The id of the trigger.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "get",
          description: "Get information about a trigger.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "id",
              description: "The id of the trigger.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "ignore",
          description: "Opts out a user from a trigger",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "user",
              description: "The user to opt out.",
              type: ApplicationCommandOptionType.User,
              required: true,
            },
            {
              name: "id",
              description: "The id of the trigger.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "list",
          description: "Get a list of triggers for this guild.",
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
    });
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    if (!(interaction instanceof ChatInputCommandInteraction)) {
      return { content: "Internal Error", eph: true };
    }

    const subcommand = interaction.options.getSubcommand();
    const permLevel = this.client.permlevel(undefined, interaction.member);

    const adminOnly = ["add", "remove", "enable", "disable", "get"];
    const staffOnly = ["ignore", "list"];

    if (permLevel < 4 && adminOnly.includes(subcommand)) {
      return { content: "Insufficient Permissions", eph: true };
    }

    if (permLevel < 2 && staffOnly.includes(subcommand)) {
      return { content: "Insufficient Permissions", eph: true };
    }

    if (subcommand == "add") {
      const id = interaction.options.getString("id", true);
      const exists = interaction.settings.triggers.some((t) => t.id == id);

      if (exists) {
        await interaction.reply({
          embeds: [this.client.errEmb(2, `Trigger \`${id}\` already exists`)],
        });

        return {};
      }

      const cooldown = interaction.options.getNumber("cooldown", true);
      const content = interaction.options.getString("content", false);
      const title = interaction.options.getString("title", false);
      const description = interaction.options.getString("description", false);
      const color = interaction.options.getString("color", false);
      const embed = title != null || description != null || color != null;

      const keywords: string[][] = [];

      for (let i = 1; i <= 5; i++) {
        const group = interaction.options.getString(`keywords${i}`, false);

        if (group) {
          keywords.push(group.split(",").map((s) => s.trim()));
        }
      }

      const trigger = {
        id: id,
        keywords: keywords,
        cooldown: cooldown,
        enabled: true,
        message: {
          embed: embed,
          content: content || "",
          title: title || "",
          description: description || "",
          color: isColor(color) ? color : "Red",
        },
      };

      this.client.settings.set(
        interaction.settings._id,
        await SettingsModel.findOneAndUpdate(
          { _id: interaction.settings._id },
          { $push: { triggers: trigger }, toUpdate: true },
          { upsert: true, setDefaultsOnInsert: true, new: true }
        )
      );

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`Added new trigger \`${id}\``)
            .setColor("Green"),
        ],
      });
    } else if (subcommand == "remove") {
      const id = interaction.options.getString("id", true);
      const clear = interaction.options.getBoolean("clear", true);

      if (interaction.settings.triggers.some((t) => t.id == id)) {
        this.client.settings.set(
          interaction.settings._id,
          await SettingsModel.findOneAndUpdate(
            { _id: interaction.settings._id },
            { $pull: { triggers: { id: id } }, toUpdate: true },
            { upsert: true, setDefaultsOnInsert: true, new: true }
          )
        );

        if (clear) {
          await TriggerModel.deleteMany({
            guildId: interaction.guild.id,
            triggerId: `trigger-${id}`,
          });
        }

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(`Removed trigger \`${id}\``)
              .setColor("Green"),
          ],
        });
      } else {
        await interaction.reply({
          embeds: [this.client.errEmb(2, `Trigger \`${id}\` already does not exist`)],
        });
      }
    } else if (subcommand == "enable") {
      const id = interaction.options.getString("id", true);
      const trigger = interaction.settings.triggers.find((t) => t.id == id);

      if (trigger && !trigger.enabled) {
        const newTriggers = interaction.settings.triggers.map((t) => {
          if (t.id != id) {
            return t;
          } else {
            t.enabled = true;
            return t;
          }
        });

        this.client.settings.set(
          interaction.settings._id,
          await SettingsModel.findOneAndUpdate(
            { _id: interaction.settings._id },
            { triggers: newTriggers, toUpdate: true },
            { upsert: true, setDefaultsOnInsert: true, new: true }
          )
        );

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(`Enabled trigger \`${id}\``)
              .setColor("Green"),
          ],
        });
      } else if (trigger) {
        await interaction.reply({
          embeds: [this.client.errEmb(2, `Trigger \`${id}\` already enabled`)],
        });
      } else {
        await interaction.reply({
          embeds: [this.client.errEmb(2, `Trigger \`${id}\` does not exist`)],
        });
      }
    } else if (subcommand == "disable") {
      const id = interaction.options.getString("id", true);
      const trigger = interaction.settings.triggers.find((t) => t.id == id);

      if (trigger && trigger.enabled) {
        const newTriggers = interaction.settings.triggers.map((t) => {
          if (t.id != id) {
            return t;
          } else {
            t.enabled = false;
            return t;
          }
        });

        this.client.settings.set(
          interaction.settings._id,
          await SettingsModel.findOneAndUpdate(
            { _id: interaction.settings._id },
            { triggers: newTriggers, toUpdate: true },
            { upsert: true, setDefaultsOnInsert: true, new: true }
          )
        );

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(`Disabled trigger \`${id}\``)
              .setColor("Green"),
          ],
        });
      } else if (trigger) {
        await interaction.reply({
          embeds: [this.client.errEmb(2, `Trigger \`${id}\` already disabled`)],
        });
      } else {
        await interaction.reply({
          embeds: [this.client.errEmb(2, `Trigger \`${id}\` does not exist`)],
        });
      }
    } else if (subcommand == "get") {
      const id = interaction.options.getString("id", true);
      const trigger = interaction.settings.triggers.find((t) => t.id == id);

      if (trigger) {
        const keywords = trigger.keywords
          .map((g) => `[${g.map((s) => `\`${s}\``).join(", ")}]`)
          .join(", ");

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("Green")
              .setDescription(
                `**ID**: ${trigger.id}\n**Cooldown**: ${trigger.cooldown}\n**Enabled**: ${trigger.enabled}\n**Keywords**: ${keywords}`
              ),
          ],
        });
      } else {
        await interaction.reply({
          embeds: [this.client.errEmb(2, `Trigger \`${id}\` does not exist`)],
        });
      }
    } else if (subcommand == "ignore") {
      const member = interaction.options.getMember("user");
      const id = interaction.options.getString("id", true);
      const triggerId = `trigger-${id}`;

      if (!member) {
        return { content: "User is not a member of this guild", eph: true };
      }

      if (!interaction.settings.triggers.some((t) => t.id == id)) {
        await interaction.reply({
          embeds: [this.client.errEmb(2, `Trigger \`${id}\` does not exist.`)],
          flags: [MessageFlags.Ephemeral],
        });

        return {};
      }

      const optedOut = await TriggerModel.exists({
        guildId: interaction.guild.id,
        userId: member.id,
        triggerId: triggerId,
      });

      if (optedOut) {
        await interaction.reply({
          content: "User has already opted out in this guild",
          flags: [MessageFlags.Ephemeral],
        });
      } else {
        await new TriggerModel({
          guildId: interaction.guild.id,
          userId: member.id,
          triggerId: triggerId,
        }).save();

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("Green")
              .setDescription(`${member} will not trigger \`${id}\` again`),
          ],
        });
      }
    } else if (subcommand == "list") {
      const triggers = interaction.settings.triggers;
      const str =
        triggers.length == 0
          ? "No triggers in guild"
          : triggers.map((t) => `\`${t.id}\``).join(", ");

      await interaction.reply({
        embeds: [new EmbedBuilder().setColor("Green").setDescription(str)],
      });
    }

    return {};
  }
}
