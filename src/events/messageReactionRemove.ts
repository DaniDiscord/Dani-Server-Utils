import { MessageReaction, User } from "discord.js";

import { DsuClient } from "lib/core/DsuClient";
import { EmojiSuggestionsUtility } from "../utilities/emojiSuggestions";
import { EventLoader } from "lib/core/loader";

export default class MessageReactionRemove extends EventLoader {
  constructor(client: DsuClient) {
    super(client, "messageReactionRemove");
  }

  async run(messageReaction: MessageReaction, user: User) {
    await EmojiSuggestionsUtility.onReaction(this.client, messageReaction, user);
  }
}
