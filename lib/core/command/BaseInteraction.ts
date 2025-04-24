import { APIEmbed } from "discord.js";
import {
  BaseInteractionType,
  InteractionGroups,
  InteractionCommandOptions,
  InteractionType,
} from "types/commands";
import { DsuClient } from "../DsuClient";

export class BaseInteraction {
  name: string;
  description: string;
  client: DsuClient;
  options: InteractionCommandOptions;
  type: InteractionType;

  constructor(
    name: string,
    client: DsuClient,
    type: InteractionType,
    options?: InteractionCommandOptions
  ) {
    this.name = name;
    this.client = client;
    this.description = options?.description ?? "";
    this.options = options ?? { permissionLevel: "USER" };
    this.type = type;
  }

  /**
   * Validates interaction based on interaction options.
   * @param interaction the interaction option.
   * @param type The InteractionType of the interaction
   * @returns APIEmbed | null
   */
  public validate(interaction: InteractionGroups, type: InteractionType) {
    let interactionType = BaseInteractionType.get(type);

    let emb: APIEmbed = {
      title: "Missing Permissions",
    };

    if (this.options.guildOnly && !interaction.inGuild()) {
      emb.description = `${interactionType} must be ran in a guild.`;
      return emb;
    } else if (
      this.options.permissionLevel === "SERVER_OWNER" &&
      interaction.guild?.ownerId != interaction.user.id
    ) {
      emb.description = `${interactionType} can only be ran by the guild owner.`;
      return emb;
    }

    return null;
  }

  /** The base function to run the interaction*/
  public async run(_interaction: InteractionGroups): Promise<any> {}
}
