import {
  Collection,
  Interaction,
  InteractionType,
  MessageFlags,
} from "discord.js";
import { DsuClient } from "lib/core/DsuClient";
import { EventLoader } from "lib/core/loader/EventLoader";
import { SettingsModel } from "models/Settings";
import { TriggerModel } from "models/Trigger";
import { ISettings } from "types/mongodb";

export default class InteractionCreate extends EventLoader {
  constructor(client: DsuClient) {
    super(client, "interactionCreate");
  }

  override async run(interaction: Interaction) {
    if (!interaction.guild) return;
    if (
      interaction.guild &&
      !this.client.settings.has((interaction.guild || {}).id)
    ) {
      // We don't have the settings for this guild, find them or generate empty settings
      const s: ISettings = await SettingsModel.findOneAndUpdate(
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

      this.client.logger.info(
        `Setting sync: Fetch Database -> Client (${interaction.guild.id})`
      );

      this.client.settings.set(interaction.guild.id, s);
      interaction.settings = s;
    } else {
      const s = this.client.settings.get(
        interaction.guild ? interaction.guild.id : "default"
      );
      if (!s) return;
      interaction.settings = s;
    }

    const isAutocomplete = interaction.isAutocomplete();

    if (isAutocomplete) {
      await this.client.utils
        .getUtility("autoPing")
        .onForumTagComplete(interaction);
    }

    //TODO emojis

    const isButton = interaction.isButton();

    // can't be moved since its dynamic
    if (isButton) {
      const triggerIds = interaction.settings.triggers.map(
        (t) => `trigger-${t.id}`
      );

      for (const id of triggerIds) {
        if (interaction.customId != id) {
          continue;
        }

        const user = interaction.user;
        const optedOut = await TriggerModel.exists({
          guildId: interaction.guild.id,
          userId: user.id,
          triggerId: id,
        });

        if (optedOut) {
          // Nuh uh
          await interaction.reply({
            content: "You have already opted out in this guild.",
            flags: [MessageFlags.Ephemeral],
          });
        } else {
          await new TriggerModel({
            guildId: interaction.guild.id,
            userId: user.id,
            triggerId: id,
          }).save();

          await interaction.reply({
            content: "We will not remind you in this guild again.",
            flags: [MessageFlags.Ephemeral],
          });
        }
      }
    }

    try {
      const cooldowns = this.client.applicationCommandLoader.cooldowns;
      this.client.logger.info(
        `${interaction.type} interaction created by ${interaction.user.id}${
          interaction.type === InteractionType.ApplicationCommand
            ? `: ${interaction.toString()}`
            : ""
        }`
      );
      if (interaction.isCommand()) {
        if (!cooldowns.has(interaction.commandName)) {
          cooldowns.set(interaction.commandName, new Collection());
        }
        const command = this.client.applicationCommandLoader.fetchCommand(
          interaction.commandName
        );
        if (!command) {
          return this.client.logger.error(
            `Exception: Cannot find command to add cooldown (${interaction.commandName})`
          );
        }
        const now = Date.now();
        const timestamps = this.client.applicationCommandLoader.cooldowns.get(
          interaction.commandName
        );

        if (!timestamps) {
          return this.client.logger.error(`Exception: No timestamp exists.`);
        }
        const cooldownTimer = (command.options.cooldown ?? 0) * 1000;

        if (timestamps?.has(interaction.user.id)) {
          const expiration =
            timestamps.get(interaction.user.id) ?? 0 + cooldownTimer;
          if (now < expiration) {
            return interaction.reply({
              flags: [MessageFlags.Ephemeral],
              embeds: [
                this.client.utils.getUtility("default").generateEmbed("error", {
                  title: "Command on cooldown",
                  description: `Try again in <t:${Math.round(
                    expiration / 1000
                  )}:R>`,
                }),
              ],
            });
          }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownTimer);

        this.client.applicationCommandLoader.handle(interaction);
      } else if (interaction.isButton()) {
        this.client.buttonLoader.handle(interaction);
      } else if (interaction.isAnySelectMenu()) {
        this.client.selectMenuLoader.handle(interaction);
      } else if (interaction.isModalSubmit()) {
        this.client.modalLoader.handle(interaction);
      } else if (interaction.isMessageContextMenuCommand()) {
        this.client.applicationCommandLoader.handle(interaction);
      } else if (interaction.isUserContextMenuCommand()) {
        this.client.applicationCommandLoader.handle(interaction);
      }
    } catch (error) {
      this.client.logger.error(
        `Failed to handle command ${interaction.id}: ${error}`
      );
    }
  }
}
