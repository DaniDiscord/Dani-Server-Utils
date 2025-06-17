import DefaultClientUtilities from "lib/util/defaultUtilities";
import { DsuClient } from "../../lib/core/DsuClient";
import { EventLoader } from "../../lib/core/loader/EventLoader";
import { GuildMember } from "discord.js";

export default class GuildMemberUpdate extends EventLoader {
  constructor(client: DsuClient) {
    super(client, "guildMemberUpdate");
  }

  override async run(oldMember: GuildMember, newMember: GuildMember) {
    const newNickName = newMember.nickname ?? newMember.user.username;
    if (oldMember.nickname !== newNickName) {
      const nameInMemory = await DefaultClientUtilities.getNameFromMemory(
        newMember.id,
        newMember.guild.id,
      );
      if (nameInMemory !== "" && nameInMemory !== newNickName) {
        await DefaultClientUtilities.setNameInMemory(
          newMember.id,
          newMember.guild.id,
          "",
        );
      }
    }
  }
}
