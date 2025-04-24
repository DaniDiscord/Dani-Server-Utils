import { Message } from "discord.js";
import { DsuClient } from "lib/core/DsuClient";
import { EventLoader } from "lib/core/loader";

export default class MessageUpdate extends EventLoader {
  constructor(client: DsuClient) {
    super(client, "messageUpdate");
  }

  async run(_: Message, newMessage: Message) {
    if (newMessage.author.bot) return;
    const linkUtility = this.client.utils.getUtility("linkHandler");

    const level = this.client.getPermLevel(newMessage, newMessage.member!);
    const link = linkUtility.parseMessageForLink(newMessage.content);

    const canSendLinks = await linkUtility.checkLinkPermissions(
      newMessage.guildId ?? "",
      newMessage.channelId,
      newMessage.author.id,
      newMessage.member?.roles.cache.map((role) => role.id) ?? []
    );

    if ((!canSendLinks && link.hasUrls) || level < 3) {
      await newMessage
        .delete()
        .catch(() =>
          this.client.logger.error(`Failed to delete message containing link.`)
        );
      return;
    }
  }
}
