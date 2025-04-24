import { resolve } from "path";
import { DsuClient } from "../DsuClient";
import { pathToFileURL } from "url";
import TextCommand from "../command/TextCommand";
import { existsSync } from "fs";
import { Collection, Message } from "discord.js";

export class TextCommandLoader {
  public client: DsuClient;
  public cooldowns: Collection<string, Collection<string, number>>;

  constructor(client: DsuClient) {
    this.client = client;
    this.cooldowns = new Collection();
  }

  public async loadFiles() {
    try {
      const textCommandsPath = resolve(
        this.client.__dirname,
        "src",
        "textCommands"
      );

      if (!existsSync(textCommandsPath)) {
        return this.client.logger.error(
          `Failed to read path: ${textCommandsPath}`
        );
      }

      this.client.utils
        .getUtility("default")
        .readFiles(textCommandsPath)
        .forEach(async (textFilePath) => {
          const textCommandClass = await import(
            pathToFileURL(textFilePath).href
          );
          const textCommand = textCommandClass.default
            ? new textCommandClass.default(this.client)
            : null;

          if (textCommand instanceof TextCommand) {
            this.client.textCommands.set(textCommand.name, textCommand);
            return textCommand;
          }
          this.client.logger.warn(
            `Invalid interaction at ${textFilePath}. (Are you missing the default export?) Skipping...`
          );
        });
    } catch (error) {
      this.client.logger.error(`Failed to load files for textCommands.`);
    }
  }

  private fetchCommand(command: string) {
    return this.client.textCommands.get(command) || undefined;
  }
  async handle(message: Message) {
    const prefix = this.client.config.prefix || `<@${this.client.user?.id}>`;

    let prefixMatch: string | undefined;
    if (Array.isArray(prefix)) {
      prefixMatch = prefix.find((p) => message.content.startsWith(p));
    } else {
      prefixMatch = message.content.startsWith(prefix) ? prefix : undefined;
    }

    if (!prefixMatch) return;

    const args = message.content.slice(prefixMatch.length).trim().split(/ +/g);

    const commandName = args.shift()?.toLowerCase();
    const command = this.fetchCommand(commandName || "");
    if (!command) return;

    const missingPermissions = await command.validate(message);
    if (missingPermissions)
      return message.reply({ embeds: [missingPermissions] });

    return this.run(command, message, args);
  }

  private async run(command: TextCommand, message: Message, args: string[]) {
    await command.run(message, args).catch((error) => {
      this.client.logger.error(error);

      const response = this.client.utils
        .getUtility("default")
        .generateEmbed("error", {
          title: "An error has occured!",
          description: "An unexpected error has occured.",
        });

      return message.reply({ embeds: [response] });
    });
  }
}
