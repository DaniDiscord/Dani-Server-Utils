import { MessageReaction, User } from "discord.js";

import { CustomClient } from "lib/client";

export default async (
  client: CustomClient,
  reaction: MessageReaction,
  user: User
): Promise<void> => {
  client.reactionHandler.onNewReaction(reaction, user);
};
