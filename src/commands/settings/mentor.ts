import "moment-precise-range-plugin";

import { Command, PermissionLevels } from "types/command";

import { EmbedBuilder } from "discord.js";
import { MentorModel } from "../../models/Mentor";
import { SettingsModel } from "../../models/Settings";
import _ from "lodash";
import moment from "moment";

const subcmds = ["list", "add", "remove", "assign"];

const mentor: Command = {
  run: async (client, message, [subcmd, ...args]) => {
    try {
      if (message.author.permLevel < 3) {
        if (client.cds.has(`Mentor-${message.channel.id}`)) {
          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor("Red")
                .setDescription(
                  `That command is on a cooldown for another ${moment.preciseDiff(
                    moment(client.cds.get(`Mentor-${message.channel.id}`)).add(10, "m"),
                    moment()
                  )}`
                ),
            ],
          });
        }

        client.cds.set(`Mentor-${message.channel.id}`, Date.now());

        setTimeout(() => {
          client.cds.delete(`Mentor-${message.channel.id}`);
        }, 600000);

        const mentorAssigned = message.settings.mentorRoles.filter((r) =>
          r.assignedChannels.includes(message.channel.id)
        );

        if (mentorAssigned.length == 0) return;

        return message.channel.send(
          `<@&${mentorAssigned[0].roleID}> ${[subcmd, ...args].join(" ")}`
        );
      }
      if (!subcmd) return message.channel.send({ embeds: [client.errEmb(1)] });
      if (!subcmds.includes(subcmd.toLowerCase()))
        return message.channel.send({
          embeds: [
            client.errEmb(2, `Use one of the following: \`${subcmds.join("`, `")}\``),
          ],
        });
      const i = subcmds.indexOf(subcmd.toLowerCase());
      if (i == 0) {
        // They want a list. uhhh
        // Lets just map the current mentors with their roles
        return message.channel.send({
          embeds: [
            {
              title: `Current mentor roles!`,
              color: 0x5763719,
              fields: message.settings.mentorRoles.map((mR) => {
                return {
                  name: `Mentor name: ${mR.mentorName}`,
                  value: `Role: <@&${mR.roleID}>\nChannels assigned: ${mR.assignedChannels
                    .map((aC) => `<#${aC}>`)
                    .join(`, `)}`,
                };
              }),
            },
          ],
        });
      } else if (i == 1) {
        // Add a mentor thing. We need role ID and name
        if (args.length != 2) {
          return message.channel.send({ embeds: [client.errEmb(1)] });
        }

        const match = args[0].match(/\d{17,19}/);
        if (!match) {
          return message.channel.send({
            embeds: [
              client.errEmb(
                2,
                `Argument 2 (\`${args[0]}\`) was not found to be a valid @role or roleID!`
              ),
            ],
          });
        }

        const roleID = match[0];
        if (!message.guild!.roles.cache.has(roleID)) {
          return message.channel.send({
            embeds: [
              client.errEmb(
                2,
                `Argument 2 (\`${args[0]}\`) was not found to be a valid @role or roleID!`
              ),
            ],
          });
        }

        // Got the role. Now the name for the mentor role
        const mentorName = _.startCase(args[1].replace(/[^a-z]/gi, ""));
        // We got the mentor name
        // Just insert this bish i guess?
        const mntr = await new MentorModel({
          mentorName,
          roleID,
          guild: message.guild!.id,
        }).save();

        client.settings.set(
          message.settings._id,
          await SettingsModel.findOneAndUpdate(
            { _id: message.settings._id },
            { $push: { mentorRoles: mntr._id }, toUpdate: true },
            { upsert: true, setDefaultsOnInsert: true, new: true }
          )
            .populate("mentorRoles")
            .populate("commands")
        );

        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor("Green")
              .setDescription(
                `Successfully added <@&${roleID}> as ${mentorName} mentors`
              ),
          ],
        });
      } else if (i == 2) {
        // Remove a mentor thing
        // Honestly can't be arsed. If anyone wants to do this be my guest.
        // HOW-TO:
        // Find the mentioned role in message settings
        // update the Mentor db, deleting the doc with that roleID
        // The bot will automatically re-fetch the new Mentors without the mentor role within 30 sec.
      } else if (i == 3) {
        // Assign a channel to a mentor
        // I guess the args here should be ...channels, mentorName?
        // We need at least 2 args
        if (args.length != 2) {
          return message.channel.send({ embeds: [client.errEmb(1)] });
        }

        // Only 1 arg cannot match the channel regex
        if (args.filter((a) => /@&\d{17,19}/.test(a)).length != 1) {
          return message.channel.send({
            embeds: [
              client.errEmb(
                2,
                `You need to specify which mentor type to assign these channels to (use @mentorrole)`
              ),
            ],
          });
        }

        // Isolate the non-ID arg
        const mN = args.find((a) => /@&\d{17,19}/.test(a))!;
        const found = message.settings.mentorRoles.find(
          (mR) => mR.roleID == mN.match(/\d{17,19}/)![0]
        );

        if (!found) {
          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor("Red")
                .setDescription(`No mentor type matching ${mN}`),
            ],
          });
        }

        // Now that all that is done, lets just replace the old mentor assigned channels with the new ones
        const filtered = args.filter((a) => /[^&]\d{17,19}/.test(a) && a != mN);
        const mapped = filtered.map((v) => v.match(/\d{17,19}/)![0]);
        await MentorModel.updateOne(
          { _id: found._id },
          { assignedChannels: [...mapped] }
        );

        // lets just see how this works for now
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor("Green")
              .setDescription(
                `Successfully assigned ${mapped
                  .map((v) => `<#${v.match(/\d{17,19}/)![0]}>`)
                  .join(", ")} to ${found.mentorName} mentors`
              ),
          ],
        });
      }
    } catch (e) {
      client.log("err", e);
    }
  },
  conf: {
    aliases: [],
    permLevel: PermissionLevels.USER,
  },
  help: {
    name: "mentor",
    description: `Idk, does some mentor shit`,
  },
};

export default mentor;
