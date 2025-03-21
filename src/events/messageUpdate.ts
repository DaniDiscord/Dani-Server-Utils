import { canUserSendLinks, readMsgForLink } from "lib/linkHandler";

import { CustomClient } from "lib/client";
import { Message } from "discord.js";

export default async (
  client: CustomClient,
  oldMessage: Message,
  newMessage: Message
): Promise<void> => {
  if (newMessage.author.bot) return;

  const level = client.permlevel(newMessage, newMessage!.member!);

  const hasLink = readMsgForLink(newMessage.content);

  const canSendLinks = await canUserSendLinks(
    newMessage.guildId ?? "",
    newMessage.channelId,
    newMessage.author.id,
    newMessage.member?.roles.cache.map((role) => role.id) ?? []
  );

  if ((!canSendLinks && hasLink.hasUrls) || level < 3) {
    await newMessage.delete().catch(() => {});
    return;
  }
};
