import { GuildMember } from "discord.js";
import { DsuClient } from "../../lib/core/DsuClient";
import { EventLoader } from "../../lib/core/loader/EventLoader";

export default class GuildMemberUpdate extends EventLoader {
  constructor(client: DsuClient) {
    super(client, "guildMemberUpdate");
  }

  override async run(oldMember: GuildMember, newMember: GuildMember) {
    const util = this.client.utils.getUtility("default");
    const newNickName = newMember.nickname ?? newMember.user.username;
    if (oldMember.nickname !== newNickName) {
      const nameInMemory = await util.getNameFromMemory(
        newMember.id,
        newMember.guild.id
      );
      if (nameInMemory !== "" && nameInMemory !== newNickName) {
        await util.setNameInMemory(newMember.id, newMember.guild.id, "");
      }
    }
  }
}
