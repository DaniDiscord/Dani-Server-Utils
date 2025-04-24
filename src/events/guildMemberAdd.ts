import { GuildMember } from "discord.js";
import { DsuClient } from "../../lib/core/DsuClient";
import { EventLoader } from "../../lib/core/loader/EventLoader";

export default class GuildMemberAdd extends EventLoader {
  constructor(client: DsuClient) {
    super(client, "guildMemberAdd");
  }

  override async run(member: GuildMember) {
    const util = this.client.utils.getUtility("default");
    const name = await util.getNameFromMemory(member.id, member.guild.id);
    if (name) {
      await member.setNickname(name);
    }
  }
}
