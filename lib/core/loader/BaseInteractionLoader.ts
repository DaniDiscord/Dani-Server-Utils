import { resolve, join } from "path";
import { DsuClient } from "../DsuClient";
import { existsSync, readdirSync, statSync } from "fs";
import { BaseInteraction } from "../command/BaseInteraction";
import { InteractionType } from "types/commands";
import { pathToFileURL } from "url";
import { Collection } from "discord.js";

export class BaseInteractionLoader {
  public readonly client: DsuClient;

  constructor(client: DsuClient) {
    this.client = client;
  }

  /**
   * Load all interaction files from the specified directory.
   * @param relPath The relative path to the directory containing interaction files.
   */
  public async load(relPath: string) {
    const basePath = resolve(
      this.client.__dirname,
      "src",
      "interactions",
      relPath
    );
    if (!existsSync(basePath)) {
      return this.client.logger.error(`Failed to read path: ${basePath}`);
    }

    const filePaths = this.getAllFiles(basePath);
    for (const file of filePaths) {
      try {
        const interaction = await this.loadInteraction(file);
        if (interaction) {
          this.registerInteraction(interaction);
        }
      } catch (error) {
        this.client.logger.error(
          `Error loading interaction from ${file}: `,
          error
        );
      }
    }
  }

  /**
   * Recursively reads all files in a directory.
   * @param directory The directory to read.
   * @returns An array of file paths.
   */
  private getAllFiles(dirPath: string, files: string[] = []): string[] {
    const entries = readdirSync(dirPath);

    for (const entry of entries) {
      const entryPath = join(dirPath, entry);
      if (statSync(entryPath).isDirectory()) {
        this.getAllFiles(entryPath, files);
      } else if (entryPath.endsWith(".js") || entryPath.endsWith(".ts")) {
        files.push(entryPath);
      }
    }

    return files;
  }

  /**
   * Dynamically imports and initializes an interaction.
   * @param filePath The path to the interaction file.
   * @returns The loaded interaction or null if invalid.
   */
  private async loadInteraction(
    filePath: string
  ): Promise<BaseInteraction | null> {
    try {
      const interactionModule = await import(pathToFileURL(filePath).href);
      const interaction = interactionModule.default
        ? new interactionModule.default(this.client)
        : null;

      if (interaction instanceof BaseInteraction) {
        return interaction;
      }

      this.client.logger.warn(
        `Invalid interaction at ${filePath}. (Are you missing the default export?) Skipping...`
      );
    } catch (error) {
      this.client.logger.error(
        `Error loading interaction in ${filePath}: ${error}`
      );
    }
    return null;
  }
  /**
   * Registers interaction to client collections
   * @param interaction The interaction to register.
   */
  private registerInteraction(interaction: BaseInteraction) {
    const interactionHandlers: {
      [key: string]: Collection<string, any>;
    } = {
      [InteractionType.Button]: this.client.buttons,
      [InteractionType.SelectMenu]: this.client.selectMenus,
      [InteractionType.ApplicationCommand]: this.client.applicationCommands,
      [InteractionType.ModalSubmit]: this.client.modals,
    };

    const handler = interactionHandlers[interaction.type];
    if (handler) {
      handler.set(interaction.name, interaction);
    } else {
      this.client.logger.warn(`Unknown interaction type: ${interaction.type}`);
    }
  }
}
