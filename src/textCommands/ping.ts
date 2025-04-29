import { DsuClient } from "lib/core/DsuClient";
import { Message } from "discord.js";
import TextCommand from "lib/core/command/TextCommand";

export default class PingTextCommand extends TextCommand {
  constructor(client: DsuClient) {
    super("ping", client, {
      permissionLevel: "USER",
    });
  }

  public async run(message: Message, _args: string[]) {
    message.reply("Pong");
  }
}
