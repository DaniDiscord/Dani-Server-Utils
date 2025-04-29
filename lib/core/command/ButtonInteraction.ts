import { InteractionCommandOptions, InteractionType } from "types/commands";

import { BaseInteraction } from "./BaseInteraction";
import { ButtonInteraction } from "discord.js";
import { DsuClient } from "../DsuClient";

export class Button extends BaseInteraction {
  global?: boolean;

  constructor(
    name: string,
    client: DsuClient,
    options: InteractionCommandOptions & { global?: boolean },
  ) {
    super(name, client, InteractionType.Button, options);
    this.global = options.global;
  }

  public override run(interaction: ButtonInteraction) {
    return super.run(interaction);
  }
}
