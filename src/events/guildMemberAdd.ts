import { Client, GuildMember } from "discord.js";

export default async (client: Client, member: GuildMember): Promise<void> => {
  const name: string = await client.getNameFromMemory(member.id, member.guild.id);
  if (name !== "") {
    await member.setNickname(name);
  }
};
