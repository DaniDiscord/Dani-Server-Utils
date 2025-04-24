import { DsuClient } from "lib/core/DsuClient";
import { EventLoader } from "lib/core/loader";

export default class Raw extends EventLoader {
  constructor(client: DsuClient) {
    super(client, "raw");
  }

  async run(packet: any) {
    const data = packet.d;

    const isForwardedMessage =
      packet.t == "MESSAGE_CREATE" && data.message_reference?.type == 1;
    const isSoundMessage =
      packet.t == "MESSAGE_CREATE" && data.hasOwnProperty("soundboard_sounds");

    // For now, let's just block all non-staff forwarded messages. Permlevel 2 is mod, we can probably also allow helpers to forward.
    const permLevelToForwardMessage = 1;

    if (isForwardedMessage || isSoundMessage) {
      const channel = await this.client.channels.fetch(data.channel_id);

      if (!channel || !channel.isTextBased()) {
        return;
      }

      const message = await channel.messages.fetch(data.id);

      if (!message || message.author.bot || !message.guild) {
        return;
      }
      if (
        this.client.getPermLevel(message, message.member!) >=
        permLevelToForwardMessage
      ) {
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
  }
}
