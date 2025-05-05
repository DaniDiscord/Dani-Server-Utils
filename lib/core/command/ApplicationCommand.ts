import {
  ApplicationCommandType,
  AutocompleteFocusedOption,
  AutocompleteInteraction,
  CommandInteraction,
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

  public override run(
    interaction:
      | CommandInteraction
      | UserContextMenuCommandInteraction
      | MessageContextMenuCommandInteraction,
  ) {
    return super.run(interaction);
  }

  public async autoComplete(
    _interaction: AutocompleteInteraction,
    _option: AutocompleteFocusedOption,
  ): Promise<void> {}
}
