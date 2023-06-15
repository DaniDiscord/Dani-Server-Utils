import { CustomClient } from "lib/client";
import { GuildChannel } from "discord.js";
import { threadCreated as forumPostCreated } from "lib/autoping";

export default async (client: CustomClient, thread: GuildChannel): Promise<void> => {
  forumPostCreated(client, thread);
};
