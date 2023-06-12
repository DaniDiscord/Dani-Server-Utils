import {
  AutocompleteInteraction,
  ForumChannel,
  GuildChannel,
  TextChannel,
  ThreadChannel,
} from "discord.js";

import { CustomClient } from "./client";
import { tag } from "interactions/chatInput/autoping";

export async function threadCreated(client: CustomClient, thread: GuildChannel) {
  if (thread.parentId === null) {
    return;
  }
  if (!(thread instanceof ThreadChannel)) {
    return;
  }
  const forum = await thread.guild.channels.fetch(thread.parentId);
  if (!(forum instanceof ForumChannel)) {
    return;
  }

  const autoPings = await client.getAutoPing(thread.guildId, thread.parentId);
  for (const autoPing of autoPings) {
    const pingChannel = await client.channels.fetch(autoPing.targetChannelId);
    if (!(pingChannel instanceof TextChannel)) {
      continue;
    }
    const pingRole = await thread.guild.roles.fetch(autoPing.roleId);
    if (pingRole === null) {
      continue;
    }
    const tagId = forum.availableTags.find((tag) => autoPing.tag == tag.id);
    if (tagId === undefined || autoPing.tag !== "all") {
      continue;
    }
    const tag = autoPing.tag.length === 0 ? "" : `with tag ${tagId.name} ${tagId.emoji}`;
    const message = `<@&${pingRole.id}> New post <#${thread.id}> under <#${thread.parentId}>  ${tag}`;
    await pingChannel.send({ content: message });
  }
}

export async function forumTagComplete(
  interaction: AutocompleteInteraction
): Promise<void> {
  const focus = interaction.options.getFocused(true);
  if (focus.name !== tag) {
    return;
  }
  const channels = interaction.guild?.channels.cache;
  if (channels === undefined) {
    return;
  }
  const suggestions = [{ name: "all", value: "all" }];
  for (const [id, channel] of channels) {
    if (!(channel instanceof ForumChannel)) {
      continue;
    }
    suggestions.push(
      ...channel.availableTags.map((tag) => ({ name: tag.name, value: tag.id }))
    );
  }
  await interaction.respond(
    suggestions.filter((suggestion) => suggestion.name.startsWith(focus.value))
  );
}
