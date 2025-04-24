import { AutocompleteInteraction } from "discord.js";
import { DsuClient } from "../DsuClient";
import { BaseInteractionLoader } from "./BaseInteractionLoader";
import { CustomApplicationCommand } from "../command/ApplicationCommand";

export class AutoCompleteLoader extends BaseInteractionLoader {
  constructor(client: DsuClient) {
    super(client);
  }

  public override load() {
    return super.load("autoCompletes");
  }

  private fetchAutoComplete(name: string) {
    return this.client.applicationCommands.find(
      (autoComplete) => autoComplete.name == name
    );
  }

  public handle(interaction: AutocompleteInteraction) {
    const autoComplete = this.fetchAutoComplete(interaction.commandName);
    if (!autoComplete) return;

    return this.run(autoComplete, interaction);
  }

  async run(
    autoComplete: CustomApplicationCommand,
    interaction: AutocompleteInteraction
  ) {
    const focused = interaction.options.getFocused(true);

    autoComplete
      .autoComplete(interaction, focused)
      .catch(async (error): Promise<any> => {
        this.client.logger.error(error);
        if (!interaction.responded) return interaction.respond([]);
      });
  }
}
