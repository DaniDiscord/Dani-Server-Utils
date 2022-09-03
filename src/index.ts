// Uses the '.env' file to set process.env vars
import {
  ApplicationCommandData,
  Collection,
  IntentsBitField,
  Partials,
} from "discord.js";
import path, { join } from "path";

import { CustomClient } from "lib/client";
import { InteractionCommand } from "classes/CustomInteraction";
import { ReactionHandler } from "lib/reacthandler";
import { SettingsModel } from "./models/Settings";
import { config } from "./config";
import dotenv from "dotenv";
import klaw from "klaw";
import mongoose from "mongoose";
import { readdir } from "fs/promises";

dotenv.config();

if (!process.env.token) {
  console.error(
    `A token was not found. Please read the README.md file for instructions on how to set up the .env file`
  );

  process.exit(1);
}

if (process.env.mongodb_connection_url) {
  mongoose.connect(process.env.mongodb_connection_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  });
}

const client = new CustomClient({
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  intents: [
    IntentsBitField.Flags.DirectMessages,
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildIntegrations,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
  ],
});

client.prefix = "!";
client.commands = new Collection();
client.settings = new Collection();
client.aliases = new Collection();
client.cds = new Collection();
client.config = config;
client.reactionHandler = new ReactionHandler(client);
client.channelMessages = new Collection();
client.autocompleteOptions = new Collection();

const run = async () => {
  client.settings.set(
    "default",
    await SettingsModel.findOneAndUpdate(
      { _id: "default" },
      { toUpdate: true },
      { upsert: true, setDefaultsOnInsert: true, new: true }
    )
  );
  client.log("Load", "Loading commands");

  klaw(join(__dirname, "commands")).on("data", (item) => {
    const category = item.path.match(/\w+(?=[\\/][\w\-\.]+$)/)![0];
    const cmdFile = path.parse(item.path);

    if (!cmdFile.ext || (cmdFile.ext !== ".ts" && cmdFile.ext !== ".js")) {
      return;
    }

    if (category === "commands") {
      client.log(
        "Load",
        `Did not load command ${cmdFile.name.red} because it has no category`
      );
    } else {
      const { err } = client.loadCommand(category, `${cmdFile.name}${cmdFile.ext}`, true);

      if (err) {
        console.log(err);
      }
    }
  });

  const evtFiles = await readdir(join(__dirname, "events"));

  client.log("Load", `Loading a total of ${evtFiles.length} events`);

  klaw(join(__dirname, "events")).on("data", (item) => {
    const evtFile = path.parse(item.path);

    if (!evtFile.ext || (evtFile.ext !== ".ts" && evtFile.ext !== ".js")) return;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: event } = require(join(
      __dirname,
      "events",
      `${evtFile.name}${evtFile.ext}`
    ));

    client.on(evtFile.name, event.bind(null, client));
  });

  client.levelCache = {};

  for (let i = 0; i < client.config.permLevels.length; i++) {
    const thisLevel = client.config.permLevels[i];
    client.levelCache[thisLevel.name] = thisLevel.level;
  }

  client.login(process.env.token);
};

export default run();
