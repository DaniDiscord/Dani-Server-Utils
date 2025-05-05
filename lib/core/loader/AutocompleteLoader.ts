import { AutocompleteInteraction } from "discord.js";
import { BaseInteractionLoader } from "./BaseInteractionLoader";
import { CustomApplicationCommand } from "../command/ApplicationCommand";
import { DsuClient } from "../DsuClient";

export class AutoCompleteLoader extends BaseInteractionLoader {
  constructor(client: DsuClient) {
    super(client);
  }

  public override load() {
    return super.load("autoCompletes");
  }

  private fetchAutoComplete(name: string) {
    return this.client.applicationCommands.find(
      (autoComplete) => autoComplete.name == name,
    );
  }

  public handle(interaction: AutocompleteInteraction) {
    const autoComplete = this.fetchAutoComplete(interaction.commandName);
    if (!autoComplete) return;

    return this.run(autoComplete, interaction);
  }

  async run(
    autoComplete: CustomApplicationCommand,
    interaction: AutocompleteInteraction,
  ) {
    const focused = interaction.options.getFocused(true);

    autoComplete
      .autoComplete(interaction, focused)
      .catch(async (error): Promise<void> => {
        this.client.logger.error(error);
        if (!interaction.responded) return interaction.respond([]);
      });
  }
}
