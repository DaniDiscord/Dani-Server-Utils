import path from "path";
import { readdirSync } from "fs";
import {
  ApplicationCommandType,
  Collection,
  CommandInteraction,
  MessageFlags,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";
import { DsuClient } from "../DsuClient";
import { BaseInteractionLoader } from "./BaseInteractionLoader";
import { InteractionType } from "types/commands";
import { CustomApplicationCommand } from "../command";

export class ApplicationCommandLoader extends BaseInteractionLoader {
  public cooldowns = new Collection<string, Collection<string, number>>();

  constructor(client: DsuClient) {
    super(client);
  }

  public override async load() {
    const basePath = path.join(this.client.__dirname, "src", "interactions");
    await Promise.all([
      this.loadFrom(
        path.join(basePath, "slashCommands"),
        ApplicationCommandType.ChatInput
      ),
      this.loadFrom(
        path.join(basePath, "userContext"),
        ApplicationCommandType.User
      ),
      this.loadFrom(
        path.join(basePath, "messageContext"),
        ApplicationCommandType.Message
      ),
    ]);

    setTimeout(async () => {
      const commandData = this.buildCommandData();

      if (process.env.NODE_ENV === "development") {
        await this.registerGuildCommands(commandData);
      } else {
        await this.registerGlobalCommands(commandData);
      }
    }, 5000);
  }

  private buildCommandData(): RESTPostAPIApplicationCommandsJSONBody[] {
    return Array.from(this.client.applicationCommands.values()).map(
      (cmd): RESTPostAPIApplicationCommandsJSONBody => {
        switch (cmd.commandType) {
          case ApplicationCommandType.ChatInput:
            return {
              name: cmd.name,
              type: ApplicationCommandType.ChatInput,
              description: cmd.description,
              // @ts-ignore
              options: cmd.options.applicationData ?? [],
            };

          case ApplicationCommandType.User:
            return {
              name: cmd.name,
              type: ApplicationCommandType.User,
            };

          case ApplicationCommandType.Message:
            return {
              name: cmd.name,
              type: ApplicationCommandType.Message,
            };

          default:
            throw new Error(`Unknown command type: ${cmd.commandType}`);
        }
      }
    );
  }

  private async registerGuildCommands(
    commandData: RESTPostAPIApplicationCommandsJSONBody[]
  ) {
    this.client.logger.info(`[DEVELOPMENT] Registering commands to guilds.`);

    await Promise.all(
      this.client.guilds.cache.map(async (guild) => {
        try {
          await guild.commands.set(commandData);
          this.client.logger.info(`Registered guild commands in ${guild.name}`);
        } catch (error: any) {
          if (error.code === 50001) {
            this.client.logger.error(
              null,
              `Missing access in ${guild.name} (${guild.id}) when setting commands.`
            );
          } else {
            this.client.logger.error(error);
          }
        }
      })
    );
  }

  private async registerGlobalCommands(
    commandData: RESTPostAPIApplicationCommandsJSONBody[]
  ) {
    try {
      await this.client.application?.commands.set(commandData);
      this.client.logger.info(`Registered global commands.`);
    } catch (error) {
      this.client.logger.error(`Failed to register global commands:`, error);
    }
  }

  private async loadFrom(
    dirPath: string,
    expectedType: ApplicationCommandType
  ) {
    try {
      const files = readdirSync(dirPath).filter(
        (f) => f.endsWith(".ts") || f.endsWith(".js")
      );

      for (const file of files) {
        try {
          const module = await import(path.join(dirPath, file));
          const CommandClass = module.default;
          if (!CommandClass) continue;
          const command: CustomApplicationCommand = new CommandClass(
            this.client
          );
          if (command.type !== InteractionType.ApplicationCommand) continue;
          if (command.commandType !== expectedType) {
            this.client.logger.warn(
              `Command ${command.name} in ${dirPath} has type ${command.commandType} but expected ${expectedType}`
            );
            continue;
          }

          this.client.applicationCommands.set(command.name, command);
        } catch (error) {
          this.client.logger.error(
            `Error loading command from ${file}:`,
            error
          );
        }
      }
    } catch (error: any) {
      if (error.code === "ENOENT") {
        this.client.logger.warn(`Command directory not found: ${dirPath}`);
      } else {
        this.client.logger.error(
          `Error loading commands from ${dirPath}:`,
          error
        );
      }
    }
  }

  public reload() {
    this.client.applicationCommands.clear();
    this.load();
  }

  public fetchCommand(name: string): CustomApplicationCommand | undefined {
    return this.client.applicationCommands.get(name);
  }

  public handle(interaction: CommandInteraction) {
    const command = this.fetchCommand(interaction.commandName);
    if (!command) {
      return this.client.logger.error(
        `${interaction.user.tag} [${interaction.user.id}] invoked unknown command ${interaction.commandName}`
      );
    }

    const missingPermissions = command.validate(
      interaction,
      InteractionType.ApplicationCommand
    );
    if (missingPermissions) {
      return interaction.reply({
        embeds: [
          this.client.utils
            .getUtility("default")
            .generateEmbed("error", missingPermissions),
        ],
      });
    }

    this.run(command, interaction);
  }

  private run(
    command: CustomApplicationCommand,
    interaction: CommandInteraction
  ) {
    command.run(interaction).catch((error): Promise<any> => {
      this.client.logger.error(error);

      const embed = this.client.utils
        .getUtility("default")
        .generateEmbed("error", {
          title: "An error has occurred!",
          description: "Something went wrong executing the command.",
        });

      interaction.deferReply();

      if (interaction.replied) {
        return interaction.followUp({
          flags: [MessageFlags.Ephemeral],
          embeds: [embed],
        });
      } else if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
      } else {
        return interaction.reply({
          flags: [MessageFlags.Ephemeral],
          embeds: [embed],
        });
      }
    });
  }
}
