import {
  Client,
  ClientOptions,
  Collection,
  GuildMember,
  Message,
} from "discord.js";
import { clientConfig } from "../config/ClientConfig";
import { Logger } from "./Logger";
import { SettingsModel } from "../../src/models/Settings";
import mongoose from "mongoose";
import { UtilitiesManager } from "lib/util/manager";
import { pathToFileURL } from "url";
import { resolve } from "path";
import { EventLoader } from "./loader/EventLoader";
import { existsSync } from "fs";
import { ISettings } from "../../src/types/mongodb";
import { Button, Modal, SelectMenu, CustomApplicationCommand } from "./command";
import TextCommand from "./command/TextCommand";
import {
  ButtonLoader,
  AutoCompleteLoader,
  SelectMenuLoader,
  ApplicationCommandLoader,
  TextCommandLoader,
  ModalLoader,
} from "./loader";
import { TimeoutHandler } from "./TimeoutHandler";
import { EmojiSuggestions } from "../../src/utilities/emojiSuggestions";

export class DsuClient extends Client {
  /** A more location accurate replacement for __dirname that matches the source correctly. */
  public __dirname: string;

  /** A config file with information for the client. */
  public readonly config: typeof clientConfig;
  /**
   * A more detailed logger than a typical console.log
   */
  public logger: Logger;
  /**
   * Db settings per-guild for MongoDB.
   */
  public settings: Collection<string, ISettings>;

  /**
   * A collection of Discord events which are loaded by the bot.
   * @see https://discord.js.org/docs/packages/discord.js/14.18.0/ClientEvents:Interface
   */
  public events: Map<string, EventLoader>;

  /** A collection of buttons loaded by the client. */
  public buttons: Collection<string, Button>;

  /** The loader used for button interactions. */
  public buttonLoader: ButtonLoader;

  /** The loader used for auto complete interactions. */
  public autoCompleteLoader: AutoCompleteLoader;

  /** A collection of select menus loaded by the client. */
  public selectMenus: Collection<string, SelectMenu>;

  /** The loader used for select menu interactions. */
  public selectMenuLoader: SelectMenuLoader;

  /** A collection of modals loaded by client */
  public modals: Collection<string, Modal>;

  /** The loader used for ModalSubmit interactions */
  public modalLoader: ModalLoader;

  /** A collection of application (slash, user, and message context) commands loaded by the client */
  public applicationCommands: Collection<string, CustomApplicationCommand>;

  /** The loader used for application command interactions. */
  public applicationCommandLoader: ApplicationCommandLoader;

  /** A collection of text commands loaded by the client. */
  public textCommands: Collection<string, TextCommand>;
  /** The loader used for slash command interactions. */
  public textCommandLoader: TextCommandLoader;

  /** Chain message storage */
  public channelMessages: Collection<
    string,
    {
      word: string;
      count: number;
    }[]
  >;

  /** Temporary storage for emoji caching for emoji suggestions. */
  public emojiEventCache: Map<string, EmojiSuggestions>;

  /**
   * A timeout handler for chains.
   */
  public dirtyCooldownHandler: TimeoutHandler;

  /**
   * A helper class where are tools are stored.
   */
  public utils: UtilitiesManager;

  constructor(options: ClientOptions) {
    super(options);

    this.__dirname = resolve();

    this.utils = new UtilitiesManager(this);
    this.config = clientConfig;
    this.logger = new Logger();

    this.settings = new Collection();

    this.events = new Map();
    this.autoCompleteLoader = new AutoCompleteLoader(this);

    this.buttons = new Collection();
    this.buttonLoader = new ButtonLoader(this);

    this.selectMenus = new Collection();
    this.selectMenuLoader = new SelectMenuLoader(this);

    this.modals = new Collection();
    this.modalLoader = new ModalLoader(this);

    this.applicationCommands = new Collection();
    this.applicationCommandLoader = new ApplicationCommandLoader(this);

    this.textCommands = new Collection();
    this.textCommandLoader = new TextCommandLoader(this);

    this.channelMessages = new Collection();
    this.dirtyCooldownHandler = new TimeoutHandler();

    this.emojiEventCache = new Map();

    this._connectMongo();
    this._loadEvents();
    this.autoCompleteLoader.load();
    this.buttonLoader.load();
    this.selectMenuLoader.load();
    this.applicationCommandLoader.load();
    this.modalLoader.load();
    this.textCommandLoader.loadFiles();
  }

  /**
   * Connect our client to the database.
   */
  private async _connectMongo() {
    await mongoose.connect(process.env.MONGODB_URL as string).catch((e) => {
      this.logger.error(e);
      process.exit(1);
    });

    this.settings.set(
      "default",
      await SettingsModel.findOneAndUpdate(
        { _id: "default" },
        { toUpdate: true },
        { upsert: true, setDefaultsOnInsert: true, new: true }
      )
    );
  }

  /**
   * Load all the event files and map them to our collection.
   */
  private _loadEvents() {
    const eventsPath = resolve(this.__dirname, "src", "events");
    if (!existsSync(eventsPath)) {
      return this.logger.error(`Failed to read path: ${eventsPath}`);
    }

    this.utils
      .getUtility("default")
      .readFiles(eventsPath)
      .forEach(async (eventFilePath) => {
        const eventModule = await import(pathToFileURL(eventFilePath).href);
        const eventClass = eventModule.default;
        if (eventClass && typeof eventClass === "function") {
          const event = new eventClass(this);
          if (event instanceof EventLoader) {
            this.logger.info("Loaded event ", event.name);
            event.listen();
            this.events.set(event.name, event);
          } else {
            this.logger.warn(
              `Event file ${eventFilePath} does not export a valid EventLoader class.`
            );
          }
        }
      });
  }
  /**
   * Returns an integer representing the GuildMembers current permission level.
   * @param message The message sent within the command
   * @param member The represented GuildMember
   * @returns {number}
   */
  getPermLevel(message?: Message, member?: GuildMember) {
    let permLevel = 0;
    if (!member && !message) return 0;

    if (member) {
      const settings = this.settings.get(member.guild.id);
      if (settings) member.settings;
    }

    const permOrder = this.config.permLevels
      .slice(0)
      .sort((p, c) => (p.level < c.level ? 1 : -1));

    while (permOrder.length > 0) {
      const currentLevel = permOrder.shift();

      if (currentLevel === undefined) break;
      if ((message?.guild || member?.guild) && currentLevel.guildOnly) {
        continue;
      }

      if (currentLevel.check(message, member)) {
        permLevel = currentLevel.level;
        break;
      }
    }
    return permLevel;
  }
}
