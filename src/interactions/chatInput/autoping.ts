import {
  ApplicationCommandOptionType,
  CacheType,
  ChatInputCommandInteraction,
  CommandInteraction,
  EmbedBuilder,
  ForumChannel,
  PermissionsBitField,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";

import { ApplicationCommandType } from "discord-api-types/v10";
import { CustomClient } from "lib/client";

const register = "register";
const remove = "remove";
const list = "list";
const clear = "clear";

const role = "role";
const forum = "forum";
export const tag = "tag";
const ping = "ping";

export const allTag = "all";

export default class SlashCommand extends InteractionCommand {
  /**
   *
   */
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.ChatInput,
      name: "autoping",
      description: "Set up automatic pings!",
      options: [
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
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    if (!(interaction instanceof ChatInputCommandInteraction)) {
      return { content: "Internal Error", eph: true };
    }
    const guildId = interaction.guildId;
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case register:
        const forumChannel = interaction.options.getChannel(forum, true);
        const roleId = interaction.options.getRole(role, true).id;
        const tagId = interaction.options.getString(tag, true);
        const targetChannelId = interaction.options.getChannel(ping, true);

        let validTag = tagId === allTag;
        if (forumChannel instanceof ForumChannel) {
          validTag =
            forumChannel.availableTags.find((tag) => tag.id === tagId) !== undefined;
        }

        if (!validTag) {
          return {
            content: "The tag ID is not valid for this forum",
            eph: true,
          };
        }

        await this.client.addAutoPing(
          guildId,
          roleId,
          forumChannel.id,
          tagId,
          targetChannelId.id
        );
        return {
          content: "Successfully registered automatic pings",
          eph: true,
        };
      case list:
        const autoPings = await this.client.getAllAutoPing(guildId);

        const tags = new Map<string, string>();
        for (const [id, channel] of interaction.guild.channels.cache) {
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
            value: `<#${autoPing.forumId}> with tag ${tags.get(autoPing.tag)} pings <@&${
              autoPing.roleId
            }> in <#${autoPing.targetChannelId}>\n`,
          });
          index += 1;
        }
        const embed = new EmbedBuilder().setTitle(title).addFields(autoPingMessage);
        return {
          embeds: [embed],
          eph: true,
        };
      case remove:
        const roleId2 = interaction.options.getRole(role, false)?.id;
        const forumId2 = interaction.options.getChannel(forum, false)?.id;
        const tagId2 = interaction.options.getString(tag, false) ?? undefined;
        const targetChannelId2 = interaction.options.getChannel(ping, false);
        await this.client.removeAutoPings(
          guildId,
          roleId2,
          forumId2,
          tagId2,
          targetChannelId2?.id
        );
        return { content: "Removed automatic pings", eph: true };
    }

    return {};
  }
}
