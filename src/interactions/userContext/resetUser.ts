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
import { CustomClient } from "lib/client";

export default class ContextCommand extends InteractionCommand {
  /**
   *
   */
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.User,
      name: "Reset To User Name",
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    const int = interaction as UserContextMenuCommandInteraction;

    if (!(int.targetMember instanceof GuildMember)) {
      return { content: "Resetting to tag only works on guild members", eph: true };
    }
    if (this.client.permlevel(undefined, int.targetMember) >= 2) {
      return { content: "Helper and above cannot be nicknamed", eph: true };
    }
    const tag = int.targetUser.tag;
    let newName = tag.replace(/#\d+$/, "");

    if (newName.length >= 32) {
      newName = newName.substring(0, 31);
    }
    newName += "*";
    await this.client.setMemberName(int.targetMember, newName);
    return { content: "Nickname reset successfully", eph: true };
  }
}
