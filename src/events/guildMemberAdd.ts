import DefaultClientUtilities from "lib/util/defaultUtilities";
import { DsuClient } from "../../lib/core/DsuClient";
import { EventLoader } from "../../lib/core/loader/EventLoader";
import { GuildMember } from "discord.js";

export default class GuildMemberAdd extends EventLoader {
  constructor(client: DsuClient) {
    super(client, "guildMemberAdd");
  }

  override async run(member: GuildMember) {
    const name = await DefaultClientUtilities.getNameFromMemory(
      member.id,
      member.guild.id,
    );
    if (name) {
      await member.setNickname(name);
    }
  }
}
