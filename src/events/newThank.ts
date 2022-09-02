import { GuildMember, Message } from "discord.js";

import { CustomClient } from "lib/client";

export default (
  client: CustomClient,
  {}: {
    message: Message;
    thankedMember: GuildMember;
  }
): void => {
  client.log(`newThank`, `A user thanked someone else, handle this somehow lmao`);
};
