import { InteractionCommandOptions, InteractionType } from "types/commands";

import { BaseInteraction } from "./BaseInteraction";
import { DsuClient } from "../DsuClient";
import { ModalSubmitInteraction } from "discord.js";

export class Modal extends BaseInteraction {
  constructor(name: string, client: DsuClient, options: InteractionCommandOptions) {
    super(name, client, InteractionType.ModalSubmit, options);
  }

  public override run(interaction: ModalSubmitInteraction) {
    return super.run(interaction);
  }
}
