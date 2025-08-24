import { AutoPingUtility } from "../utilities/autoPing";
import { DsuClient } from "../../lib/core/DsuClient";
import { EventLoader } from "../../lib/core/loader/EventLoader";
import { GuildChannel } from "discord.js";

export default class ThreadCreate extends EventLoader {
  constructor(client: DsuClient) {
    super(client, "threadCreate");
  }

  override async run(thread: GuildChannel) {
    AutoPingUtility.onThreadCreated(this.client, thread);
  }
}
