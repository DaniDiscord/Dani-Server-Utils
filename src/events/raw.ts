import { ChannelType } from "discord.js";
import { CustomClient } from "lib/client";
import { SettingsModel } from "models/Settings";

export default async (client: CustomClient, packet: any): Promise<void> => {
  const data = packet.d;

  const isForwardedMessage =
    packet.t == "MESSAGE_CREATE" && data.message_reference?.type == 1;
  const isSoundMessage =
    packet.t == "MESSAGE_CREATE" && data.hasOwnProperty("soundboard_sounds");

  // For now, let's just block all non-staff forwarded messages. Permlevel 2 is mod, we can probably also allow helpers to forward.
  const permLevelToForwardMessage = 1;

  if (isForwardedMessage || isSoundMessage) {
    const channel = await client.channels.fetch(data.channel_id);

    if (!channel || !channel.isTextBased()) {
      return;
    }

    const message = await channel.messages.fetch(data.id);

    if (!message || message.author.bot || !message.guild) {
      return;
    }
    if (client.permlevel(message, message.member!) >= permLevelToForwardMessage) {
      return;
    }

    const text = isForwardedMessage
      ? "You are not allowed to forward messages to this channel."
      : "You are not allowed to send soundboard emojis in this channel.";

    const msg = await message.reply(text);
    await message.delete();

    setTimeout(async () => {
      await msg.delete();
    }, 5000);
    return;
  }
};
