import { ButtonInteraction } from "discord.js";
import { InteractionCommandOptions, InteractionType } from "types/commands";
import { DsuClient } from "../DsuClient";
import { BaseInteraction } from "./BaseInteraction";

export class Button extends BaseInteraction {
  global?: boolean;

  constructor(
    name: string,
    client: DsuClient,
    options: InteractionCommandOptions & { global?: boolean }
  ) {
    super(name, client, InteractionType.Button, options);
    this.global = options.global;
  }

  public override run(interaction: ButtonInteraction) {
    return super.run(interaction);
  }
}
