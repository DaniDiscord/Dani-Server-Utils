import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
} from "discord-api-types/v10";
import {
  CacheType,
  ChatInputCommandInteraction,
  CommandInteraction,
  EmbedBuilder,
  PermissionsBitField,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";

import { CustomClient } from "lib/client";
import { LinkPermissionModel } from "models/Links";

export default class SlashCommand extends InteractionCommand {
  /**
   *
   */
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.ChatInput,
      name: "links",
      description:
        "Configure links per-role, or permit/disallow users from sending them.",
      options: [
        {
          // This needs a "reset" option to reset all permissions for a channel

          name: "enable",
          type: ApplicationCommandOptionType.Subcommand,
          description: "Enable links in a channel for a role.",
          options: [
            {
              name: "channel",
              description: "The channel to allow links in.",
              required: true,
              type: ApplicationCommandOptionType.Channel,
              channel_types: [ChannelType.GuildText, ChannelType.GuildForum],
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
          description: "Disable links in a channel for a role.",
          options: [
            {
              name: "channel",
              description: "The channel to disallow links in.",
              required: true,
              type: ApplicationCommandOptionType.Channel,
              channel_types: [ChannelType.GuildText, ChannelType.GuildForum],
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
      ],
      // defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    if (!(interaction instanceof ChatInputCommandInteraction)) {
      return { content: "Internal Error", eph: true };
    }

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    let permissions = await LinkPermissionModel.findOne({ guildId });
    if (!permissions) {
      permissions = await LinkPermissionModel.create({
        guildId,
        channels: [],
        userAccess: [],
      });
    }
    const embed = new EmbedBuilder().setTitle("Updated Link Permissions");
    const permLevel = this.client.permlevel(undefined, interaction.member);

    const highestRole = interaction.member.roles.cache
      .sort((a, b) => b.position - a.position)
      .first();

    if (permLevel < 2) {
      return {
        embeds: [
          embed
            .setColor("Red")
            .setTitle("Insufficient Permissions")
            .setDescription("Must be perm level 2 (Helper) to use this command."),
        ],
        eph: true,
      };
    }

    switch (subcommand) {
      case "enable": {
        const channel = interaction.options.getChannel("channel", true);
        const role = interaction.options.getRole("role", true);

        if (role.position >= highestRole?.position) {
          return {
            embeds: [
              embed
                .setTitle("Insufficient Permissions")
                .setDescription(
                  "You can not edit the permissions of a role equal to or higher than your highest role."
                ),
            ],
          };
        }
        const channelConfig = permissions.channels.find(
          (c) => c.channelId === channel.id
        );

        if (channelConfig) {
          const roleConfig = channelConfig.roles.find((r) => r.roleId === role.id);
          if (roleConfig?.enabled) {
            return {
              embeds: [
                embed
                  .setDescription(
                    `Links are already enabled in ${channel} for role ${role}.`
                  )
                  .setColor("Red"),
              ],
              eph: true,
            };
          }
        }

        await LinkPermissionModel.findOneAndUpdate(
          { guildId },
          {
            $push: channelConfig
              ? {
                  "channels.$[channel].roles": {
                    roleId: role.id,
                    enabled: true,
                  },
                }
              : {
                  channels: {
                    channelId: channel.id,
                    roles: [
                      {
                        roleId: role.id,
                        enabled: true,
                      },
                    ],
                  },
                },
          },
          channelConfig
            ? {
                arrayFilters: [{ "channel.channelId": channel.id }],
              }
            : {}
        );

        return {
          embeds: [
            embed
              .setDescription(`Links have been enabled in ${channel} for role ${role}.`)
              .setColor("Green"),
          ],
        };
      }

      case "disable": {
        const channel = interaction.options.getChannel("channel", true);
        const role = interaction.options.getRole("role", true);

        if (role.position >= highestRole?.position) {
          return {
            embeds: [
              embed
                .setTitle("Insufficient Permissions")
                .setDescription(
                  "You can not edit the permissions of a role equal to or higher than your highest role."
                ),
            ],
          };
        }

        const channelConfig = permissions.channels.find(
          (c) => c.channelId === channel.id
        );
        const roleConfig = channelConfig?.roles.find((r) => r.roleId === role.id);

        if (!channelConfig || !roleConfig?.enabled) {
          return {
            embeds: [
              embed
                .setDescription(
                  `${channel} does not have a configuration for role ${role}.`
                )
                .setColor("Red"),
            ],
            eph: true,
          };
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
          }
        );

        return {
          embeds: [
            embed
              .setDescription(
                `Links have been disabled in ${channel} for role <@&${role.id}.>`
              )
              .setColor("Green"),
          ],
        };
      }

      case "revoke": {
        const user = interaction.options.getUser("user", true);
        const reason = interaction.options.getString("reason");
        const userAccess = permissions.userAccess.find((a) => a.userId === user.id);

        if (user.permLevel >= permLevel)
          return {
            embeds: [
              embed
                .setTitle("Insufficient perms.")
                .setDescription(
                  `Cannot manage user with same or higher permission level (${user.permLevel} vs ${permLevel})`
                )
                .setColor("Red"),
            ],
            eph: true,
          };
        if (userAccess?.hasAccess === false) {
          return {
            embeds: [
              embed
                .setDescription(`Link access is already revoked for user ${user}.`)
                .setColor("Red"),
            ],
            eph: true,
          };
        }

        await LinkPermissionModel.findOneAndUpdate(
          { guildId },
          {
            $pull: {
              userAccess: { userId: user.id },
            },
          }
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
          }
        );

        return {
          embeds: [
            embed
              .setDescription(`Link access has been revoked for user ${user}.`)
              .setColor("Green"),
          ],
        };
      }

      case "allow": {
        const user = interaction.options.getUser("user", true);

        const userAccess = permissions.userAccess.find((a) => a.userId === user.id);

        if (user.permLevel >= permLevel)
          return {
            embeds: [
              embed
                .setTitle("Insufficient perms.")
                .setDescription(
                  `Cannot manage user with same or higher permission level (${user.permLevel} vs ${permLevel})`
                )
                .setColor("Red"),
            ],
            eph: true,
          };

        if (!userAccess || userAccess.hasAccess) {
          return {
            embeds: [
              embed
                .setDescription(`User ${user} already has link access.`)
                .setColor("Red"),
            ],
            eph: true,
          };
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
          }
        );

        return {
          embeds: [
            embed
              .setDescription(`Link access has been restored for user ${user}.`)
              .setColor("Green"),
          ],
        };
      }

      case "check": {
        const user = interaction.options.getUser("user", true);
        const channel = interaction.options.getChannel("channel", true);
        const member = await interaction.guild?.members.fetch(user.id);

        if (!member) {
          return {
            embeds: [
              embed
                .setTitle("No Member Found")
                .setDescription("Could not find member in the server.")
                .setColor("Red"),
            ],
            eph: true,
          };
        }

        const userAccess = permissions.userAccess.find((a) => a.userId === user.id);

        if (userAccess?.hasAccess === false) {
          return {
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
                    value: `${new Date(userAccess.modifiedAt).toLocaleDateString()}`,
                    inline: true,
                  },
                  {
                    name: "Reason?",
                    value: userAccess.reason ? userAccess.reason : "No reason specified.",
                    inline: true,
                  },
                ])
                .setColor("Red"),
            ],
          };
        }

        const channelConfig = permissions.channels.find(
          (c) => c.channelId === channel.id
        );

        if (!channelConfig) {
          return {
            embeds: [
              embed
                .setTitle("No Link Permissions")
                .setDescription(
                  `No link permissions are configured for channel ${channel}.`
                )
                .setColor("Red"),
            ],
          };
        }

        const allowedRoles = channelConfig.roles
          .filter((r) => r.enabled)
          .map((r) => r.roleId);

        const hasPermission = member.roles.cache.some((role) =>
          allowedRoles.includes(role.id)
        );

        return {
          embeds: [
            embed
              .setTitle("Viewing Link Permissions")
              .setDescription(
                hasPermission
                  ? `User ${user} can send links in ${channel}.`
                  : `User ${user} cannot send links in ${channel}. (Role not allowed)`
              )
              .setColor(hasPermission ? "Green" : "Red"),
          ],
        };
      }

      default:
        return {
          embeds: [
            embed.setDescription("Invalid subcommand. Please try again.").setColor("Red"),
          ],
          eph: true,
        };
    }
  }
}
