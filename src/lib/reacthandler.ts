import { GuildEmoji, Message, MessageReaction, ReactionEmoji, User } from "discord.js";

import { CustomClient } from "./client";
import { message } from "gelf-pro";

class AutoPollCache {
  channels: Map<string, string[]>;
  roles: Map<string, string[]>;

  constructor() {
    this.channels = new Map();
    this.roles = new Map();
  }

  addChannel(guildId: string, channel: string) {
    const channels = this.channels.get(guildId) ?? [];
    channels.push(channel);
    this.channels.set(guildId, channels);
  }

  setChannels(guildId: string, channels: string[]) {
    this.channels.set(guildId, channels);
  }

  removeChannel(guildId: string, channel: string) {
    const channels = this.channels.get(guildId) ?? [];
    channels.filter((v) => v != channel);
    this.roles.set(guildId, channels);
  }

  getChannels(guildId: string): string[] | undefined {
    return this.channels.get(guildId);
  }

  addRole(guildId: string, role: string) {
    const roles = this.roles.get(guildId) ?? [];
    roles.push(role);
    this.roles.set(guildId, roles);
  }

  setRoles(guildId: string, roles: string[]) {
    this.roles.set(guildId, roles);
  }

  removeRole(guildId: string, role: string) {
    const roles = this.roles.get(guildId) ?? [];
    roles.filter((v) => v != role);
    this.roles.set(guildId, roles);
  }

  getRoles(guildId: string): string[] | undefined {
    return this.roles.get(guildId);
  }
}

export const autoPollCache = new AutoPollCache();

export class ReactionHandler {
  client: CustomClient;
  autoReactions = ["👍", "👎", "❌"];
  /**
   *
   */
  constructor(client: CustomClient) {
    this.client = client;
  }

  async onNewMessage(message: Message): Promise<void> {
    const autoReactChannels = await this.client.getAutoPollChannels(
      message.guildId ?? ""
    );
    if (autoReactChannels === undefined) {
      return;
    }
    if (autoReactChannels.indexOf(message.channelId) < 0) return;
    // Just add the autoreactions
    for (const reaction of this.autoReactions) {
      const success = await message.react(reaction).catch(() => {});
      if (!success) break;
    }
  }

  async onNewReaction(reaction: MessageReaction, user: User): Promise<void> {
    if (!this.isReactionEmoji(reaction.emoji) || reaction.message.guildId == null) return;

    const member = await reaction.message.guild?.members.fetch(user.id).catch(() => {});
    if (!member) return;

    if (this.autoReactions.indexOf(reaction.emoji.name as string) != 2) {
      return;
    }
    let roles = await this.client.getClosePollRoles(reaction.message.guildId ?? "");
    roles = roles ?? [];
    if (!member.roles.cache.hasAny(...roles)) {
      return;
    }
    const shouldRemove = reaction.message.reactions.cache.size > 1;
    if (!shouldRemove) return;
    const removed = await reaction.message.reactions.removeAll().catch(() => {});
    if (removed) await reaction.message.react(this.autoReactions[2]);
  }

  private isReactionEmoji(emoji: ReactionEmoji | GuildEmoji): emoji is ReactionEmoji {
    return emoji.id == null;
  }
}
