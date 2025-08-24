import {
  APIEmbed,
  ApplicationCommandType,
  AutocompleteFocusedOption,
  AutocompleteInteraction,
  CommandInteraction,
  GuildMember,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
} from "discord.js";
import { InteractionCommandOptions, InteractionType } from "types/commands";

import { BaseInteraction } from "./BaseInteraction";
import { DsuClient } from "../DsuClient";

export class CustomApplicationCommand extends BaseInteraction {
  public readonly description: string;
  public readonly commandType: ApplicationCommandType;
  public readonly options: InteractionCommandOptions;

  constructor(name: string, client: DsuClient, options: InteractionCommandOptions) {
    const type = options.type ?? ApplicationCommandType.ChatInput;
    super(name, client, InteractionType.ApplicationCommand, options);

    this.description = options.description ?? "";
    this.commandType = type;
    this.options = {
      ...options,
      applicationData: options.applicationData ?? [],
    };
  }

  public override validate(interaction: CommandInteraction, type: InteractionType) {
    const subcommand = interaction.isChatInputCommand()
      ? interaction.options.getSubcommand(false)
      : null;

    const requiredLevel = subcommand
      ? this.options.applicationData?.find((c) => c.name === subcommand)?.level
      : this.options.permissionLevel;

    const emb: APIEmbed = {
      title: "Missing Permissions",
    };
    const permLevel = this.client.getPermLevel(
      undefined,
      interaction.member as GuildMember,
    );
    if (requiredLevel && requiredLevel > permLevel) {
      emb.description = `Incorrect permission. (${requiredLevel} vs ${permLevel})`;
      return emb;
    }

    return null;
  }

  public override async run(
    interaction:
      | CommandInteraction
      | UserContextMenuCommandInteraction
      | MessageContextMenuCommandInteraction,
  ) {
    const validationError = this.validate(interaction, this.type);
    if (validationError) {
      return interaction.reply({ embeds: [validationError], ephemeral: true });
    }

    return super.run(interaction);
  }
  public async autoComplete(
    _interaction: AutocompleteInteraction,
    _option: AutocompleteFocusedOption,
  ): Promise<void> {}
}
