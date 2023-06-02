import {} from "./3vilCommon/Logger";

// Uses the '.env' file to set process.env vars
import { Client, Collection, IntentsBitField, Partials } from "discord.js";
import { argv, exit } from "process";
import path, { join } from "path";

import { CustomClient } from "lib/client";
import { ReactionHandler } from "lib/reacthandler";
import { SettingsModel } from "./models/Settings";
import { config } from "./config";
import klaw from "klaw";
import mongoose from "mongoose";
import { readdir } from "fs/promises";
import readlineSync from "readline-sync";

const clientSettings = new Map<string, (c: CustomClient) => void>([
  [
    "--unload",
    (client) => {
      client.unloadCommands = true;
    },
  ],
]);

if (!process.env.token) {
  console.error(
    `A token was not found. Please read the README.md file for instructions on how to set up the .env file`
  );

  process.exit(1);
}

if (!process.env.mongodb_connection_url) {
  console.error(
    `A mongodb connection string was not found. Please read the README.md file for instructions on how to set up the .env file`
  );
  process.exit(1);
}

const client = new CustomClient({
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  intents: [
    IntentsBitField.Flags.DirectMessages,
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildIntegrations,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
  ],
});

const unknownOptions = [];
for (let i = 2; i < argv.length; i++) {
  const settings = clientSettings.get(argv[i]);
  if (settings === undefined) {
    unknownOptions.push(argv[i]);
    continue;
  }
  settings(client);
}
if (unknownOptions.length !== 0) {
  console.log(`Encountered unknown options: ${unknownOptions}`);

  let alternatives = "Alternatives are:\n";
  for (const [key] of clientSettings) {
    alternatives += `${key}\n`;
  }
  console.log(alternatives);

  const answer = readlineSync.question("Do you wish to proceed? (y/N)");
  if (answer.toLowerCase().trim() !== "y") {
    exit();
  }
}
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
  await mongoose
    .connect(process.env.mongodb_connection_url as string, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
  client.settings.set(
    "default",
    await SettingsModel.findOneAndUpdate(
      { _id: "default" },
      { toUpdate: true },
      { upsert: true, setDefaultsOnInsert: true, new: true }
    )
  );
  log.debug("Commands", { action: "Load", message: "Loading commands" });
  klaw(join(__dirname, "commands")).on("data", (item: any) => {
    const category = item.path.match(/\w+(?=[\\/][\w\-\.]+$)/)![0];
    const cmdFile = path.parse(item.path);

    if (!cmdFile.ext || (cmdFile.ext !== ".ts" && cmdFile.ext !== ".js")) {
      return;
    }

    if (category !== "commands") {
      const { err } = client.loadCommand(category, `${cmdFile.name}${cmdFile.ext}`);

      if (err) {
        console.log(err);
      }
    }
  });

  const evtFiles = await readdir(join(__dirname, "events"));
  log.debug("Events", { action: "Load", message: `Loading ${evtFiles.length} events` });

  klaw(join(__dirname, "events")).on("data", (item: any) => {
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

  try {
    await client.login(process.env.token);
  } catch (err) {
    console.error(err);
    console.log("Failed trying to login with bot");
    process.exit(1);
  }
};

export default run();
