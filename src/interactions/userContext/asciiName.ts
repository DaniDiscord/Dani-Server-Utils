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
import { PermissionLevels } from "types/command";
import permlevel from "commands/system/permlevel";
import { unicode2Ascii } from "lib/utils";

export default class ContextCommand extends InteractionCommand {
  /**
   *
   */
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.User,
      name: "ASCII Name",
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    const int = interaction as UserContextMenuCommandInteraction;

    if (!(int.targetMember instanceof GuildMember)) {
      return { content: "ASCII name only works on guild members", eph: true };
    }
    if (this.client.permlevel(undefined, int.targetMember) >= 2) {
      return { content: "Helper and above cannot be nicknamed", eph: true };
    }
    const unicodeName = int.targetMember.user.username;
    const name = unicode2Ascii(unicodeName);
    if (name.length < 3) {
      return { content: "Name couldn't be converted to ASCII", eph: true };
    }
    await this.client.setMemberName(int.targetMember, name);
    return { content: "User renamed successfully", eph: true };
  }
}
