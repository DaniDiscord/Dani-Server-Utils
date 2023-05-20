import {
  CacheType,
  CommandInteraction,
  GuildMember,
  PermissionsBitField,
  UserContextMenuCommandInteraction,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";

import { ApplicationCommandType } from "discord-api-types/v10";
import { BadNamer } from "lib/badname";
import { CustomClient } from "lib/client";

const badNamer = new BadNamer();

export default class ContextCommand extends InteractionCommand {
  /**
   *
   */
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.User,
      name: "Random Name",
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    const int = interaction as UserContextMenuCommandInteraction;
    if (!(int.targetMember instanceof GuildMember)) {
      return { content: "Random name only works on guild members", eph: true };
    }
    if (this.client.permlevel(undefined, int.targetMember) >= 2) {
      return { content: "Helper and above cannot be nicknamed", eph: true };
    }
    const num = await this.client.getNextCounter("Badname");
    const name = badNamer.get(num);
    await this.client.setMemberName(int.targetMember, name);
    return { content: "User renamed successfully", eph: true };
  }
}
