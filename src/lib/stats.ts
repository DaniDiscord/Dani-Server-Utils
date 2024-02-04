import { CustomClient } from "./client";
import { Message } from "discord.js";
import { emojiSuffix } from "interactions/chatInput/emojiSuggest";

const regex = new RegExp(`:[a-zA-Z1-9_]+${emojiSuffix}:`);

export class EmojiUsage {
  name: string;
  count: number;

  constructor(name: string, count: number) {
    this.name = name;
    this.count = count;
  }
}

export async function countEmoji(client: CustomClient, message: Message): Promise<void> {
  if (message.guildId === null) {
    return;
  }
  const matches = message.content.match(regex);
  if (matches === null) {
    return;
  }

  for (const match of matches) {
    const emojiName = match.substring(1, match.length - 1);
    if (
      message.guild?.emojis.cache.find((value) => value.name === emojiName) === undefined
    ) {
      continue;
    }
    await client.addEmoji(message.guildId, emojiName);
  }
}
