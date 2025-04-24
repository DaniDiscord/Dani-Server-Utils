import { InteractionCommandOptions, InteractionType } from "types/commands";
import { DsuClient } from "../DsuClient";
import { BaseInteraction } from "./BaseInteraction";
import { ModalSubmitInteraction } from "discord.js";

export class Modal extends BaseInteraction {
  constructor(
    name: string,
    client: DsuClient,
    options: InteractionCommandOptions
  ) {
    super(name, client, InteractionType.ModalSubmit, options);
  }

  public override run(interaction: ModalSubmitInteraction) {
    return super.run(interaction);
  }
}
