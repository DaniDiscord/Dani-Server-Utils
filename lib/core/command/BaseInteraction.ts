import { APIEmbed, GuildMember } from "discord.js";
import {
  BaseInteractionType,
  InteractionCommandOptions,
  InteractionGroups,
  InteractionType,
  PermissionLevels,
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
    options?: InteractionCommandOptions,
  ) {
    this.name = name;
    this.client = client;
    this.description = options?.description ?? "";
    this.options = options ?? { permissionLevel: 0 };
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

    let level = this.client.getPermLevel(undefined, interaction.member as GuildMember);

    if (this.options.guildOnly && !interaction.inGuild()) {
      emb.description = `${interactionType} must be ran in a guild.`;
      return emb;
    } else if (
      this.options.permissionLevel === PermissionLevels.SERVER_OWNER &&
      interaction.guild?.ownerId != interaction.user.id
    ) {
      emb.description = `${interactionType} can only be ran by the guild owner.`;
      return emb;
    } else if (
      this.options.permissionLevel === PermissionLevels.BOT_OWNER &&
      interaction.user.id != process.env.OWNER_ID
    ) {
      emb.description = "Must be the bot developer to use this command";
      return emb;
    } else if (this.options.permissionLevel > level) {
      emb.description = `Incorrect permission. (${this.options.permissionLevel} vs ${level})`;
      return emb;
    }

    return null;
  }

  /** The base function to run the interaction*/
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async run(_interaction: InteractionGroups): Promise<any> {}
}
