import { Client } from "discord.js";
import { ISettings } from "types/mongodb";
import { SettingsModel as Settings } from "../models/Settings";
import _ from "lodash";
import moment from "moment";

export default (client: Client): void => {
  updateStuff();
  async function updateStuff() {
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
            client.log("Fetch", `Database.mentorRoles -> Client.mentorRoles (${k.red})`);
            client.settings.set(k, s);
          } else {
            if (s.toUpdate) {
              // The server updated last. Grab that shit
              client.log("Fetch", `Database -> Client (${k.red})`);
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

              // console.log(ourThing.chains?.ignored);

              client.log("Push", `Client -> Database (${k.red})`);
              const newSettings = await Settings.findOneAndUpdate(
                { _id: s._id },
                ourThing,
                {
                  new: true,
                }
              )
                .populate("commands")
                .populate("mentorRoles");
              if (newSettings) client.settings.set(k, newSettings);
            }
          }
        }
      } else {
        client.log("Fetch", `Guild with ID:${k.red} had no config, generating`);
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
        client.log("Fetch", `Finished generating config for guild with ID:${k.red}`);
      }
    }
  }
  setInterval(updateStuff, 3000);

  client.log(
    `Ready`,
    `Bot logged in as ${client.user?.username}#${client.user?.discriminator} and ready to go!`
  );
};
