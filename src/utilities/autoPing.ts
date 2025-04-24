import {
  AutocompleteInteraction,
  ForumChannel,
  GuildChannel,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import { ClientUtilities } from "lib/core/ClientUtilities";
import { AutoPingModel } from "models/AutoPing";
import { IAutoPing } from "../types/mongodb";

export class AutoPingUtility extends ClientUtilities {
  async onThreadCreated(thread: GuildChannel) {
    if (thread.parentId === null) {
      return;
    }
    if (!(thread instanceof ThreadChannel)) {
      return;
    }
    const threadExists = thread as ThreadChannel;
    const forum = await threadExists.guild.channels.fetch(
      threadExists.parentId!
    );
    if (!(forum instanceof ForumChannel)) {
      return;
    }

    const autoPings = await this.getAutoPing(
      threadExists.guildId,
      threadExists.parentId!
    );
    for (const autoPing of autoPings) {
      const pingChannel = await this.client.channels.fetch(
        autoPing.targetChannelId
      );
      if (!(pingChannel instanceof TextChannel)) {
        continue;
      }
      const pingRole = await threadExists.guild.roles.fetch(autoPing.roleId);
      if (pingRole === null) {
        continue;
      }
      const tagId = forum.availableTags.find((tag) => autoPing.tag == tag.id);
      if (tagId === undefined || autoPing.tag !== "all") {
        continue;
      }
      const tag =
        autoPing.tag.length === 0
          ? ""
          : `with tag ${tagId.name} ${tagId.emoji}`;
      const message = `<@&${pingRole.id}> New post <#${threadExists.id}> under <#${threadExists.parentId}>  ${tag}`;
      await pingChannel.send({ content: message });
    }
  }

  async getAutoPing(guildId: string, forumId: string): Promise<IAutoPing[]> {
    return await AutoPingModel.find({
      guildId: guildId,
      forumId: forumId,
    });
  }

  async onForumTagComplete(interaction: AutocompleteInteraction) {
    const focus = interaction.options.getFocused(true);
    if (focus.name !== "tag") {
      return;
    }
    const channels = interaction.guild?.channels.cache;
    if (channels === undefined) {
      return;
    }
    const suggestions = [{ name: "all", value: "all" }];
    for (const [_, channel] of channels) {
      if (!(channel instanceof ForumChannel)) {
        continue;
      }
      suggestions.push(
        ...channel.availableTags.map((tag) => ({
          name: tag.name,
          value: tag.id,
        }))
      );
    }
    await interaction.respond(
      suggestions.filter((suggestion) =>
        suggestion.name.startsWith(focus.value)
      )
    );
  }
}
