import { BaseInteraction } from "./BaseInteraction";
import { DsuClient } from "../DsuClient";
import { InteractionCommandOptions, InteractionType } from "types/commands";

export class SelectMenu extends BaseInteraction {
  constructor(
    name: string,
    client: DsuClient,
    options: InteractionCommandOptions
  ) {
    super(name, client, InteractionType.SelectMenu, options);
  }
}
