import { MessageReaction, User } from "discord.js";

import { DsuClient } from "lib/core/DsuClient";
import { EventLoader } from "lib/core/loader";

export default class MessageReactionAdd extends EventLoader {
  constructor(client: DsuClient) {
    super(client, "messageReactionAdd");
  }

  async run(messageReaction: MessageReaction, user: User) {
    const emojiUtility = this.client.utils.getUtility("emoji");
    emojiUtility.onReaction(messageReaction, user);
  }
}
