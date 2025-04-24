import {
  ActivityType,
  GatewayIntentBits,
  GuildMember,
  IntentsBitField,
  Message,
  PermissionsString,
  PresenceData,
  Role,
} from "discord.js";
import { ClientConfig } from "../../src/types/index";
import { IMentor } from "types/mongodb";

const pkgFile = await Bun.file("./package.json").text();
const pkg = JSON.parse(pkgFile);

export const clientConfig = {
  colors: {
    primary: parseInt("6749d6", 16),
    success: parseInt("3deb54", 16),
    warning: parseInt("fff714", 16),
    error: parseInt("d92323", 16),
  },
  intents: [
    IntentsBitField.Flags.DirectMessages,
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildIntegrations,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
  ],

  presence: {
    activities: [
      {
        type: ActivityType.Playing,
        name: pkg.version || "1.0.0",
      },
    ],

    status: "online",
  } as PresenceData,

  ownerId: process.env.OWNER_ID,

  prefix: ["!"],

  /**
   * The permissions the client will take advantage of.
   */
  requiredPermissions: ["Administrator"] as PermissionsString[],

  ownerID: process.env.OWNER_ID as string,

  permLevels: [
    {
      level: 0,
      name: "User",
      check: () => true,
    },
    {
      level: 1,
      name: "Mentor",
      check: (msg, member): boolean => {
        let mentorRoles: IMentor[] = [];
        const data: Message | GuildMember | undefined | null = msg || member;
        // If somehow either Message or GuildMember is not provided we'll just return that the user is not a mentor.
        if (!data) return false;
        mentorRoles = data!.settings.mentorRoles.filter(
          (r) => data?.guild && data?.guild.roles.resolve(r.roleID)
        );

        const mentorRoleIDs = mentorRoles.map((r) => r.roleID);

        return mentorRoleIDs.some((id) => {
          return "member" in data!
            ? data?.member?.roles?.cache.has(id)
            : data?.roles?.cache.has(id);
        });
      },
    },
    {
      level: 2,
      name: "Helper",
      check: (msg, member) => {
        let helperRole: Role | null;
        if (msg && msg.guild) {
          helperRole = msg.guild.roles.resolve(msg.settings.roles.helper);
        } else if (member && member.guild) {
          helperRole = member.guild.roles.resolve(member.settings.roles.helper);
        } else return false;
        return Boolean(
          helperRole &&
            ((msg && msg.member && msg.member.roles.cache.has(helperRole.id)) ||
              (member && member.roles.cache.has(helperRole.id)))
        );
      },
    },
    {
      level: 3,
      name: "Moderator",
      check: (msg, member) => {
        let modRole: Role | null;
        if (msg && msg.guild) {
          modRole = msg.guild.roles.resolve(msg.settings.roles.moderator);
        } else if (member && member.guild) {
          modRole = member.guild.roles.resolve(member.settings.roles.moderator);
        } else return false;
        return Boolean(
          modRole &&
            ((msg && msg.member && msg.member.roles.cache.has(modRole.id)) ||
              (member && member.roles.cache.has(modRole.id)))
        );
      },
    },
    {
      level: 4,
      name: "Administrator",
      check: (msg, member) => {
        let admRole: Role | null;
        if (msg && msg.guild) {
          admRole = msg.guild.roles.resolve(msg.settings.roles.admin);
        } else if (member && member.guild) {
          admRole = member.guild.roles.resolve(member.settings.roles.admin);
        } else return false;
        return Boolean(
          (msg && msg.member && msg.member.permissions.has("ManageGuild")) ||
            (member && member.permissions.has("ManageGuild")) ||
            (admRole &&
              ((msg && msg.member && msg.member.roles.cache.has(admRole.id)) ||
                (member && member.roles.cache.has(admRole.id))))
        );
      },
    },
    {
      level: 5,
      name: "Server Owner",
      check: (msg, member) =>
        Boolean(
          (msg && msg.member && msg.guild?.ownerId === msg.author.id) ||
            (member && member.guild.ownerId === member.id)
        ),
    },
    {
      level: 10,
      name: "Bot Owner",
      check: (message, member) =>
        Boolean(
          (message && message.author.id === clientConfig.ownerId) ||
            (member && member.id === clientConfig.ownerId)
        ),
    },
  ],
} as ClientConfig;
