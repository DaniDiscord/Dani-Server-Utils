import { ApplicationCommandType, ChatInputCommandInteraction } from "discord.js";

import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";

export default class test extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("test", client, {
      type: ApplicationCommandType.ChatInput,
      defaultMemberPermissions: "Administrator",
      permissionLevel: "USER",
      description: "t!",
    });
  }

  async run(interaction: ChatInputCommandInteraction) {
    return await interaction.reply("test");
  }
}
