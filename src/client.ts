import { DsuClient } from "lib/core/DsuClient";
import { Partials } from "discord.js";
import { clientConfig } from "lib/config/ClientConfig";

const client = new DsuClient({
  allowedMentions: { parse: ["users"] },
  presence: clientConfig.presence,
  intents: clientConfig.intents,
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.login(process.env.BOT_TOKEN).catch((error) => {
  client.logger.error(error);
});
