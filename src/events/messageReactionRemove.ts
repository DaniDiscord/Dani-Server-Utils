import { Client, MessageReaction, User } from "discord.js";

import { onReactionEvent } from "lib/emojiSuggestions";

export default async (
  client: Client,
  reaction: MessageReaction,
  user: User
): Promise<void> => {
  onReactionEvent(client, reaction, user);
};
