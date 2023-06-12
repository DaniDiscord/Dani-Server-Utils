import { ForumChannel, GuildChannel, TextChannel, ThreadChannel } from "discord.js";

import { CustomClient } from "./client";

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
  const appliedTags = forum.availableTags
    .filter((tag) => thread.appliedTags.includes(tag.id))
    .map((tag) => tag.name.toLowerCase().match("[a-z0-9_]*")?.join("").trim());

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

    if (
      autoPing.tag !== "all" &&
      appliedTags.find((value) => value === autoPing.tag) === undefined
    ) {
      continue;
    }
    const tag = autoPing.tag.length === 0 ? "" : `with tag ${autoPing.tag}`;
    const message = `<@&${pingRole.id}> New post <#${thread.id}> under <#${thread.parentId}>  ${tag}`;
    await pingChannel.send({ content: message });
  }
}
