import { MessageReaction, User } from "discord.js";

import { DsuClient } from "lib/core/DsuClient";
import { EmojiSuggestionsUtility } from "../utilities/emojiSuggestions";
import { EventLoader } from "lib/core/loader";
import { ServerEventUtility } from "../utilities/serverEvent";

export default class MessageReactionAdd extends EventLoader {
  constructor(client: DsuClient) {
    super(client, "messageReactionAdd");
  }

  async run(messageReaction: MessageReaction, user: User) {
    await EmojiSuggestionsUtility.onReaction(this.client, messageReaction, user);
    await ServerEventUtility.onReaction(messageReaction, user).catch((error) =>
      this.client.logger.error("Event vote reaction failed", { error }),
    );
  }
}
