import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ForumChannel,
  PermissionsBitField,
} from "discord.js";
import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { AutoPingModel } from "models/AutoPing";
import { PermissionLevels } from "types/commands";

const register = "register";
const remove = "remove";
const list = "list";
const clear = "clear";

const role = "role";
const forum = "forum";
export const tag = "tag";
const ping = "ping";

export const allTag = "all";

export default class AutoPingCommand extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("autoping", client, {
      type: ApplicationCommandType.ChatInput,
      description: "Set up automatic pings!",
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
      applicationData: [
        {
          description: "register a role to automatically notify",
          name: register,
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              description: "Role to ping",
              name: role,
              type: ApplicationCommandOptionType.Role,
              required: true,
            },
            {
              description: "Channel/Forum that pings the role",
              name: forum,
              type: ApplicationCommandOptionType.Channel,
              required: true,
            },
            {
              description: "Channel to ping the role in",
              name: ping,
              type: ApplicationCommandOptionType.Channel,
              required: true,
            },
            {
              description: `Forum tag name to trigger pings, write ${allTag} to be pinged for everything`,
              name: tag,
              type: ApplicationCommandOptionType.String,
              autocomplete: true,
              required: true,
            },
          ],
        },
        {
          description: "Clear all automatic pings",
          name: clear,
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          description: "List all automatic pings",
          name: list,
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          description:
            "Remove every autoping that matches, leave field empty to match all",
          name: remove,
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              description: "Role to ping",
              name: role,
              type: ApplicationCommandOptionType.Role,
            },
            {
              description: "Channel/Forum that pings the role",
              name: forum,
              type: ApplicationCommandOptionType.Channel,
            },
            {
              description: "Channel to ping the role in",
              name: ping,
              type: ApplicationCommandOptionType.Channel,
            },
            {
              description: "Forum tag name to trigger pings",
              name: tag,
              type: ApplicationCommandOptionType.String,
              autocomplete: true,
            },
          ],
        },
      ],
      permissionLevel: PermissionLevels.USER,
    });
  }

  async run(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    const subcommand = interaction.options.getSubcommand();
    if (!interaction.guild)
      return interaction.reply({
        embeds: [
          this.client.utils.getUtility("default").generateEmbed("error", {
            title: "Invalid",
            description: "Command must be ran within a guild.",
          }),
        ],
      });
    switch (subcommand) {
      case register:
        const forumChannel = interaction.options.getChannel(forum, true);
        const roleId = interaction.options.getRole(role, true).id;
        const tagId = interaction.options.getString(tag, true);
        const targetChannelId = interaction.options.getChannel(ping, true);

        let validTag = tagId === allTag;
        if (forumChannel instanceof ForumChannel) {
          validTag =
            forumChannel.availableTags.find((tag) => tag.id === tagId) !==
            undefined;
        }

        if (!validTag) {
          return {
            content: "The tag ID is not valid for this forum",
            eph: true,
          };
        }
        const data = {
          guildId,
          roleId,
          forumId: forumChannel.id,
          tag: tagId,
          targetChannelId: targetChannelId.id,
        };
        await AutoPingModel.replaceOne(data, data, { upsert: true });
        return {
          content: "Successfully registered automatic pings",
          eph: true,
        };
      case list:
        const autoPings = await AutoPingModel.find({
          guildId: guildId,
        });

        const tags = new Map<string, string>();
        for (const [_, channel] of interaction.guild.channels.cache) {
          if (!(channel instanceof ForumChannel)) {
            continue;
          }
          for (const tag of channel.availableTags) {
            tags.set(tag.id, tag.name);
          }
        }

        const autoPingMessage = [];
        let index = 0;
        const title =
          autoPings.length === 0
            ? "No Auto-ping Setup"
            : `${autoPings.length} Auto-pings`;
        for (const autoPing of autoPings) {
          autoPingMessage.push({
            name: `auto-ping ${index}`,
            value: `<#${autoPing.forumId}> with tag ${tags.get(
              autoPing.tag
            )} pings <@&${autoPing.roleId}> in <#${
              autoPing.targetChannelId
            }>\n`,
          });
          index += 1;
        }
        const embed = new EmbedBuilder()
          .setTitle(title)
          .addFields(autoPingMessage);
        return {
          embeds: [embed],
          eph: true,
        };
      case remove:
        const roleId2 = interaction.options.getRole(role, false)?.id;
        const forumId2 = interaction.options.getChannel(forum, false)?.id;
        const tagId2 = interaction.options.getString(tag, false) ?? undefined;
        const targetChannelId2 = interaction.options.getChannel(ping, false);
        type Filter = { [key: string]: string };
        const filter: Filter = {};
        filter.guildId = guildId!;
        if (roleId2) filter.roleId = roleId2;
        if (forumId2) filter.forumId = forumId2;
        if (tagId2) filter.tag = tagId2;
        if (targetChannelId2) filter.targetChannelId = targetChannelId2.id;
        await AutoPingModel.deleteMany(filter);
        return { content: "Removed automatic pings", eph: true };
    }

    return {};
  }
}
