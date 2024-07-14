import { ChannelType } from "discord.js";
import { CustomClient } from "lib/client";
import { SettingsModel } from "models/Settings";

export default async (client: CustomClient, packet: any): Promise<void> => {
  const data = packet.d;

  const isForwardedMessage = packet.t == "MESSAGE_CREATE" && data.message_reference?.type == 1;
  // For now, let's just block all non-staff forwarded messages. Permlevel 2 is mod, we can probably also allow helpers to forward.
  const permLevelToForwardMessage = 1;

  if(isForwardedMessage){
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

    const msg = await message.reply("You are not allowed to send polls in this channel.");
    await message.delete();

    setTimeout(async () => {
      await msg.delete();
    }, 5000);
    return;
  }
};
