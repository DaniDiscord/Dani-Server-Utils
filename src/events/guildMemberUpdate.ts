import { Client, GuildMember } from "discord.js";

export default async (
  client: Client,
  oldMember: GuildMember,
  newMember: GuildMember
): Promise<void> => {
  const newNickName = newMember.nickname ?? newMember.user.username;
  if (oldMember.nickname !== newNickName) {
    const nameInMemory = await client.getNameFromMemory(newMember.id, newMember.guild.id);
    if (nameInMemory !== "" && nameInMemory !== newNickName) {
      await client.setNameInMemory(newMember.id, newMember.guild.id, "");
    }
  }
};
