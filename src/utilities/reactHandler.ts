import {
  GuildEmoji,
  Message,
  MessageReaction,
  ReactionEmoji,
  User,
} from "discord.js";
import { DsuClient } from "lib/core/DsuClient";
import { ClientUtilities } from "lib/core/ClientUtilities";

export class ReactionHandler extends ClientUtilities {
  closePollsRoles = [
    "707248297290629120",
    "580770272521617446",
    "502973976428150784",
  ];
  autoReactChannels = [
    "664579652261773333",
    "601476169312763904",
    "843762959607791676",
    "675650786838970368",
    "907004131456221235",
    "849283795484147763",
  ];
  autoReactions = ["👍", "👎", "❌"];
  /**
   *
   */
  constructor(client: DsuClient) {
    super(client);
  }

  async onNewMessage(message: Message): Promise<void> {
    if (this.autoReactChannels.indexOf(message.channelId) < 0) return;
    // Just add the autoreactions
    for (const reaction of this.autoReactions) {
      const success = await message.react(reaction).catch(() => {});
      if (!success) break;
    }
  }

  async onNewReaction(reaction: MessageReaction, user: User): Promise<void> {
    if (
      !this.isReactionEmoji(reaction.emoji as ReactionEmoji) ||
      reaction.message.guildId == null
    )
      return;

    const member = await reaction.message.guild?.members
      .fetch(user.id)
      .catch(() => {});
    if (!member) return;

    if (
      this.autoReactions.indexOf(reaction.emoji.name as string) == 2 &&
      member.roles.cache.hasAny(...this.closePollsRoles)
    ) {
      const shouldRemove = reaction.message.reactions.cache.size > 1;
      if (!shouldRemove) return;
      const removed = await reaction.message.reactions
        .removeAll()
        .catch(() => {});
      if (removed) await reaction.message.react(this.autoReactions[2]);
    }
  }

  private isReactionEmoji(
    emoji: ReactionEmoji | GuildEmoji
  ): emoji is ReactionEmoji {
    return emoji.id == null;
  }
}
