import { Times } from "types/index";
import { DsuClient } from "../../lib/core/DsuClient";
import { SettingsModel } from "models/Settings";
import { ISettings } from "types/mongodb";
import { EventLoader } from "../../lib/core/loader/EventLoader";
import _ from "lodash";

export default class Ready extends EventLoader {
  constructor(client: DsuClient) {
    super(client, "ready");
  }

  private async ensureGuildConfig(
    client: DsuClient,
    guildId: string
  ): Promise<ISettings> {
    const existing = await SettingsModel.findById(guildId)
      .populate("commands")
      .populate("mentorRoles");

    if (existing) return existing;

    try {
      return await new SettingsModel({ _id: guildId })
        .save()
        .then((doc) => doc.populate("mentorRoles"))
        .then((doc) => doc.populate("commands"));
    } catch (error: any) {
      if (error.code === 11000) {
        const existingConfig = await SettingsModel.findById(guildId)
          .populate("commands")
          .populate("mentorRoles");

        if (!existingConfig) {
          throw new Error(
            `Failed to find config for guild ${guildId} after duplicate key error`
          );
        }
        return existingConfig;
      }
      client.logger.error("Failed to ensure guild config", { guildId, error });
      throw error;
    }
  }

  private async syncSettings(client: DsuClient, guildId: string) {
    const dbSettings = await this.ensureGuildConfig(client, guildId);
    const cachedSettings = client.settings.get(guildId);

    if (
      !cachedSettings ||
      !_.isEqual(cachedSettings, dbSettings) ||
      dbSettings.toUpdate
    ) {
      if (
        cachedSettings?.mentorRoles.toString() !==
        dbSettings.mentorRoles.toString()
      ) {
        client.logger.info("Setting sync", {
          action: "Fetch",
          message: `Database.mentorRoles -> Client.mentorRoles (${guildId})`,
        });
        client.settings.set(guildId, dbSettings);
      }
    }
  }

  override async run(client: DsuClient) {
    const updateSettings = async () => {
      client.user?.setPresence({
        activities: [{ name: `v${process.env.npm_package_version}` }],
      });

      await Promise.all(
        Array.from(client.settings.keys()).map((guildId) =>
          this.syncSettings(client, guildId).catch((e) =>
            client.logger.error("Sync failed for guild", { guildId, error: e })
          )
        )
      );
    };

    await updateSettings();

    const interval = setInterval(
      () =>
        updateSettings().catch((e) =>
          client.logger.error("Periodic update failed", e)
        ),
      Times.SECOND * 3
    );

    client.once("destroy", () => clearInterval(interval));

    this.client.utils.getUtility("autoArchive").handleAutoArchive();
    this.client.utils.getUtility("anchors").checkAnchorInactivity();

    client.logger.info(`Bot logged in as ${client.user?.tag}.`);
  }
}
