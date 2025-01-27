import { Client } from "discord.js";
import { ISettings } from "types/mongodb";
import { SettingsModel as Settings } from "../models/Settings";
import _ from "lodash";
import { handleAutoArchive } from "lib/autoarchive";

export default (client: Client): void => {
  updateStuff();
  async function updateStuff() {
    client.user?.setPresence({
      activities: [{ name: `v${process.env.npm_package_version}` }],
    });

    for (const [k] of client.settings) {
      let s: ISettings | null = null;

      try {
        s = await Settings.findOne({
          _id: k,
        })
          .populate("commands")
          .populate("mentorRoles");
      } catch (e) {}

      if (s) {
        const cachedSettings = client.settings.get(k);
        if (_.isEqual(cachedSettings, s) && !s.toUpdate) {
          continue;
        }
        if (cachedSettings) {
          // If they're not equal, first check if the difference lies in the mentorRoles
          if (cachedSettings.mentorRoles.toString() != s.mentorRoles.toString()) {
            // The mentor roles are different. Mentor roles aren't changed clientside so just set the settings to the pulled ones
            log.debug("Setting sync", {
              action: "Fetch",
              message: `Database.mentorRoles -> Client.mentorRoles (${k})`,
            });
            client.settings.set(k, s);
          } else {
            if (s.toUpdate) {
              // The server updated last. Grab that shit
              log.debug("Setting sync", {
                action: "Fetch",
                message: `Database -> Client (${k})`,
              });
              const newSettings = await Settings.findOneAndUpdate(
                { _id: s._id },
                { toUpdate: false },
                { new: true }
              )
                .populate("commands")
                .populate("mentorRoles");
              if (newSettings) client.settings.set(k, newSettings);
            } else if (cachedSettings.toUpdate) {
              // The server hasn't updated. We gotta update dat bish
              const ourThing = { ...cachedSettings };
              delete ourThing._id;
              ourThing.toUpdate = false;

              log.debug("Setting sync", {
                action: "Push",
                message: `Client -> Database (${k})`,
              });
              await Settings.updateOne({ _id: s._id }, ourThing);

              const newSettings = await Settings.findOne({ _id: s._id })
                .populate("commands")
                .populate("mentorRoles");
              if (newSettings) client.settings.set(k, newSettings);
            }
          }
        }
      } else {
        log.debug("Config generation", {
          action: "Fetch",
          message: `Guild with ID:${k} had no config, generating`,
        });
        client.settings.set(
          k,
          (
            await new Settings({
              _id: k,
            }).save()
          )
            .populate("mentorRoles")
            .populate("commands")
        );
        log.debug("Config generation", {
          action: "Fetch",
          message: `Finished generating config for guild with ID:${k}`,
        });
      }
    }
  }
  setInterval(updateStuff, 3000);
  handleAutoArchive(client);

  log.info("Logged in", {
    action: `Ready`,
    message: `Bot logged in as ${client.user?.tag}.`,
  });
};
