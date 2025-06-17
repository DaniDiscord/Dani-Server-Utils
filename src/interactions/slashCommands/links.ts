import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  PermissionsBitField,
} from "discord.js";

import { CustomApplicationCommand } from "lib/core/command";
import DefaultClientUtilities from "lib/util/defaultUtilities";
import { DsuClient } from "lib/core/DsuClient";
import { ILinkPermission } from "types/mongodb";
import { LinkPermissionModel } from "models/Links";
import { PermissionLevels } from "types/commands";

export default class Links extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("links", client, {
      permissionLevel: PermissionLevels.HELPER,
      type: ApplicationCommandType.ChatInput,
      description:
        "Configure links per-role, or permit/disallow users from sending them.",
      applicationData: [
        {
          name: "enable",
          type: ApplicationCommandOptionType.Subcommand,
          level: PermissionLevels.MODERATOR,

          description: "Enable links in a channel for a role.",
          options: [
            {
              name: "channel",
              description: "The channel to allow links in.",
              required: true,
              type: ApplicationCommandOptionType.Channel,
              channel_types: [
                ChannelType.GuildText,
                ChannelType.GuildForum,
                ChannelType.GuildVoice,
              ],
            },
            {
              name: "role",
              description: "The role that can send links.",
              required: true,
              type: ApplicationCommandOptionType.Role,
            },
          ],
        },
        {
          name: "disable",
          type: ApplicationCommandOptionType.Subcommand,
          level: PermissionLevels.MODERATOR,

          description: "Disable links in a channel for a role.",
          options: [
            {
              name: "channel",
              description: "The channel to disallow links in.",
              required: true,
              type: ApplicationCommandOptionType.Channel,
              channel_types: [
                ChannelType.GuildText,
                ChannelType.GuildForum,
                ChannelType.GuildVoice,
              ],
            },
            {
              name: "role",
              description: "The role to remove link permissions from.",
              required: true,
              type: ApplicationCommandOptionType.Role,
            },
          ],
        },
        {
          name: "revoke",
          type: ApplicationCommandOptionType.Subcommand,
          description: "Remove link perms from a user.",
          level: PermissionLevels.HELPER,
          options: [
            {
              name: "user",
              description: "The user to remove link permissions from.",
              required: true,
              type: ApplicationCommandOptionType.User,
            },
            {
              name: "reason",
              description: "The reason to remove link permissions",
              type: ApplicationCommandOptionType.String,
            },
          ],
        },
        {
          name: "allow",
          type: ApplicationCommandOptionType.Subcommand,
          level: PermissionLevels.HELPER,
          description: "Allow a previously banned user to use links.",
          options: [
            {
              name: "user",
              description: "The user to give link permissions to.",
              required: true,
              type: ApplicationCommandOptionType.User,
            },
          ],
        },
        {
          name: "check",
          type: ApplicationCommandOptionType.Subcommand,
          description: "Check if a user can send links in a channel.",
          level: PermissionLevels.HELPER,
          options: [
            {
              name: "user",
              description: "The user to check permissions for.",
              required: true,
              type: ApplicationCommandOptionType.User,
            },
            {
              name: "channel",
              description: "the channel to check",
              required: true,
              type: ApplicationCommandOptionType.Channel,
            },
          ],
        },
        {
          name: "reset",
          type: ApplicationCommandOptionType.Subcommand,
          level: PermissionLevels.BOT_OWNER,
          description: "Reset a channel's data for link settings",
          options: [
            {
              name: "channel",
              description: "The channel to reset values for.",
              type: ApplicationCommandOptionType.Channel,
              channel_types: [
                ChannelType.GuildText,
                ChannelType.GuildForum,
                ChannelType.GuildVoice,
              ],
              required: true,
            },
          ],
        },
        {
          name: "list",
          type: ApplicationCommandOptionType.Subcommand,
          description:
            "List each existing channels permission and the minimum role for it.",
          level: PermissionLevels.HELPER,
        },
      ],
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  async run(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const permLevel = this.client.getPermLevel(
      undefined,
      interaction.member as GuildMember,
    );
    let permissions = await LinkPermissionModel.findOne({ guildId });
    if (!permissions) {
      permissions = await LinkPermissionModel.create({
        guildId,
        channels: [],
        userAccess: [],
      });
    }

    const embed = DefaultClientUtilities.generateEmbed("success", {
      title: "Updated Link Permissions",
    });

    const highestRole = (interaction.member as GuildMember)!.roles.cache
      .sort((a, b) => b.position - a.position)
      .first() ?? { position: 0 };

    switch (subcommand) {
      case "enable": {
        const channel = interaction.options.getChannel("channel", true);
        const role = interaction.options.getRole("role", true);

        if (role.position >= highestRole?.position) {
          return interaction.reply({
            embeds: [
              embed
                .setTitle("Insufficient Permissions")
                .setDescription(
                  "You can not edit the permissions of a role equal to or higher than your highest role.",
                ),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        const channelConfig = permissions.channels.find(
          (c) => c.channelId === channel.id,
        );
        if (channelConfig) {
          const roleConfig = channelConfig.roles.find((r) => r.roleId === role.id);
          if (roleConfig?.enabled) {
            return interaction.reply({
              embeds: [
                embed
                  .setDescription(
                    `Links are already enabled in ${channel} for role ${role}.`,
                  )
                  .setColor("Red"),
              ],
              flags: MessageFlags.Ephemeral,
            });
          }
        }

        await LinkPermissionModel.findOneAndUpdate(
          { guildId },
          channelConfig
            ? {
                $push: {
                  "channels.$[channel].roles": {
                    roleId: role.id,
                    enabled: true,
                  },
                },
              }
            : {
                $push: {
                  channels: {
                    channelId: channel.id,
                    roles: [{ roleId: role.id, enabled: true }],
                  },
                },
              },
          channelConfig
            ? {
                arrayFilters: [{ "channel.channelId": channel.id }],
              }
            : {},
        );

        return interaction.reply({
          embeds: [
            embed
              .setDescription(`Links have been enabled in ${channel} for role ${role}.`)
              .setColor("Green"),
          ],
        });
      }

      case "disable": {
        const channel = interaction.options.getChannel("channel", true);
        const role = interaction.options.getRole("role", true);

        if (role.position >= highestRole?.position) {
          return interaction.reply({
            embeds: [
              embed
                .setTitle("Insufficient Permissions")
                .setDescription(
                  "You can not edit the permissions of a role equal to or higher than your highest role.",
                ),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        const channelConfig = permissions.channels.find(
          (c) => c.channelId === channel.id,
        );
        const roleConfig = channelConfig?.roles.find((r) => r.roleId === role.id);

        if (!channelConfig || !roleConfig?.enabled) {
          return interaction.reply({
            embeds: [
              embed
                .setDescription(
                  `${channel} does not have a configuration for role ${role}.`,
                )
                .setColor("Red"),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        await LinkPermissionModel.findOneAndUpdate(
          {
            guildId,
            "channels.channelId": channel.id,
            "channels.roles.roleId": role.id,
          },
          {
            $set: {
              "channels.$[channel].roles.$[role].enabled": false,
            },
          },
          {
            arrayFilters: [
              { "channel.channelId": channel.id },
              { "role.roleId": role.id },
            ],
          },
        );

        return interaction.reply({
          embeds: [
            embed
              .setDescription(
                `Links have been disabled in ${channel} for role <@&${role.id}>.`,
              )
              .setColor("Green"),
          ],
        });
      }

      case "revoke": {
        const user = interaction.options.getUser("user", true);
        const reason = interaction.options.getString("reason");
        const userAccess = permissions.userAccess.find((a) => a.userId === user.id);

        if (user.permLevel >= permLevel) {
          return interaction.reply({
            embeds: [
              embed
                .setTitle("Insufficient perms.")
                .setDescription(
                  `Cannot manage user with same or higher permission level (${user.permLevel} vs ${permLevel})`,
                )
                .setColor("Red"),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        if (userAccess?.hasAccess === false) {
          return interaction.reply({
            embeds: [
              embed
                .setDescription(`Link access is already revoked for user ${user}.`)
                .setColor("Red"),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        await LinkPermissionModel.findOneAndUpdate(
          { guildId },
          {
            $pull: { userAccess: { userId: user.id } },
          },
        );

        await LinkPermissionModel.findOneAndUpdate(
          { guildId },
          {
            $push: {
              userAccess: {
                userId: user.id,
                hasAccess: false,
                modifiedBy: interaction.user.id,
                modifiedAt: new Date(),
                reason,
              },
            },
          },
        );

        return interaction.reply({
          embeds: [
            embed
              .setDescription(`Link access has been revoked for user ${user}.`)
              .setColor("Green"),
          ],
        });
      }

      case "allow": {
        const user = interaction.options.getUser("user", true);
        const userAccess = permissions.userAccess.find((a) => a.userId === user.id);

        if (user.permLevel >= permLevel) {
          return interaction.reply({
            embeds: [
              embed
                .setTitle("Insufficient perms.")
                .setDescription(
                  `Cannot manage user with same or higher permission level (${user.permLevel} vs ${permLevel})`,
                )
                .setColor("Red"),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        if (!userAccess || userAccess.hasAccess) {
          return interaction.reply({
            embeds: [
              embed
                .setDescription(`User ${user} already has link access.`)
                .setColor("Red"),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        await LinkPermissionModel.findOneAndUpdate(
          {
            guildId,
            "userAccess.userId": user.id,
          },
          {
            $set: {
              "userAccess.$.hasAccess": true,
              "userAccess.$.modifiedBy": interaction.user.id,
              "userAccess.$.modifiedAt": new Date(),
              "userAccess.$.reason": "",
            },
          },
        );

        return interaction.reply({
          embeds: [
            embed
              .setDescription(`Link access has been restored for user ${user}.`)
              .setColor("Green"),
          ],
        });
      }

      case "check": {
        const user = interaction.options.getUser("user", true);
        const channel = interaction.options.getChannel("channel", true);
        const member = await interaction.guild?.members.fetch(user.id);

        if (!member) {
          return interaction.reply({
            embeds: [
              embed
                .setTitle("No Member Found")
                .setDescription("Could not find member in the server.")
                .setColor("Red"),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        const userAccess = permissions.userAccess.find((a) => a.userId === user.id);

        if (userAccess?.hasAccess === false) {
          return interaction.reply({
            embeds: [
              embed
                .setTitle("No Link Permissions")
                .setDescription(`User ${user} has had their link access revoked.`)
                .addFields([
                  {
                    name: "Updated by:",
                    value: `<@${userAccess.modifiedBy}>`,
                    inline: true,
                  },
                  {
                    name: "On",
                    value: new Date(userAccess.modifiedAt).toLocaleDateString(),
                    inline: true,
                  },
                  {
                    name: "Reason?",
                    value: userAccess.reason || "No reason specified.",
                    inline: true,
                  },
                ])
                .setColor("Red"),
            ],
          });
        }

        const channelConfig = permissions.channels.find(
          (c) => c.channelId === channel.id,
        );

        if (!channelConfig) {
          return interaction.reply({
            embeds: [
              embed
                .setTitle("No Link Permissions")
                .setDescription(
                  `No link permissions are configured for channel ${channel}.`,
                )
                .setColor("Red"),
            ],
          });
        }

        const allowedRoles = channelConfig.roles
          .filter((r) => r.enabled)
          .map((r) => r.roleId);

        const hasPermission = member.roles.cache.some((role) =>
          allowedRoles.includes(role.id),
        );

        return interaction.reply({
          embeds: [
            embed
              .setTitle("Viewing Link Permissions")
              .setDescription(
                hasPermission
                  ? `User ${user} can send links in ${channel}.`
                  : `User ${user} cannot send links in ${channel}. (Role not allowed)`,
              )
              .setColor(hasPermission ? "Green" : "Red"),
          ],
        });
      }

      case "reset": {
        const channel = interaction.options.getChannel("channel", true);

        const existingModel = await LinkPermissionModel.findOne({
          "channels.channelId": channel.id,
        });

        if (!existingModel) {
          return interaction.reply({
            embeds: [
              embed
                .setTitle("Not found.")
                .setDescription(`Cannot find data for ${channel.id}.`)
                .setColor("Red"),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        await LinkPermissionModel.updateOne(
          { guildId },
          {
            $pull: { channels: { channelId: channel.id } },
            $set: {
              userAccess: [],
            },
          },
        );

        return interaction.reply({
          embeds: [
            embed
              .setTitle("Reset Successful")
              .setDescription(`Configuration for ${channel} has been reset to default.`)
              .setColor("Green"),
          ],
        });
      }
      case "list":
        // should only be one document
        const linkModel = await LinkPermissionModel.findOne(
          { guildId },
          {},
          { limit: 1 },
        );
        if (!linkModel) {
          return interaction.reply({
            embeds: [
              embed
                .setTitle("Not found.")
                .setDescription(`Cannot find document data for ${guildId}.`)
                .setColor("Red"),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        return this.buildLinkPagination(interaction, linkModel);
      default:
        return interaction.reply({
          embeds: [
            embed.setDescription("Invalid subcommand. Please try again.").setColor("Red"),
          ],
          flags: MessageFlags.Ephemeral,
        });
    }
  }

  private async buildLinkPagination(
    interaction: ChatInputCommandInteraction,
    linkPermissions: ILinkPermission,
  ) {
    // This data is stored a little weirdly
    // since we're pulling per one guild, the channels and user access are both arrays, we need to grab that data there, from a single document entry
    // rather than iterating over multiple documents that may store each entry separately

    const format = (channels: ILinkPermission["channels"], _: number) => {
      return channels
        .map((channel) => {
          const resolvedChannel = interaction.guild?.channels.resolve(channel.channelId);
          let channelName = "";
          if (!resolvedChannel) {
            channelName = channel.channelId;
          } else {
            channelName = resolvedChannel.name;
          }

          return `
          ## **${channelName[0].toUpperCase() + channelName.substring(1)}**\n
          Minimum role(s): 
          ${channel.roles
            .filter((r) => r.enabled)
            .map((role) => `<@&${role.roleId}>`)
            .join(", ")}
        `;
        })
        .join("\n##");
    };

    await DefaultClientUtilities.buildPagination(
      interaction,
      linkPermissions.channels,
      0,
      5,
      format,
    );
  }
}
