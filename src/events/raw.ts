import { ChannelType } from "discord.js";
import { CustomClient } from "lib/client";
import { SettingsModel } from "models/Settings";

export default async (client: CustomClient, packet: any): Promise<void> => {
  const data = packet.d;

  if (!data.poll) {
    return;
  }

  const channel = await client.channels.fetch(data.channel_id);

  if (!channel || !channel.isTextBased()) {
    return;
  }

  const message = await channel.messages.fetch(data.id);

  if (!message || message.author.bot || !message.guild) {
    return;
  }

  if (client.permlevel(message, message.member!) >= 2) {
    return;
  }

  if (!client.settings.has(message.guild.id)) {
    const s = await SettingsModel.findOneAndUpdate(
      { _id: message.guild.id },
      { toUpdate: true },
      {
        upsert: true,
        setDefaultsOnInsert: true,
        new: true,
      }
    )
      .populate("mentorRoles")
      .populate("commands");

    log.debug("Setting sync", {
      action: "Fetch",
      message: `Database -> Client (${message.guild.id})`,
    });

    message.settings = s;
  } else {
    const s = client.settings.get(message.guild.id);

    if (!s) {
      return;
    }

    message.settings = s;
  }

  const pollsAllowed = message.settings.pollsAllowed;
  const isThread = channel.type == ChannelType.PublicThread && channel.parent !== null;

  if (!pollsAllowed.includes(channel.id) && (isThread && !pollsAllowed.includes(channel.parent.id))) {
    await message.reply("You are not allowed to send polls in this channel.");
    await message.delete();
  }
};
