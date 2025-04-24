import { DsuClient } from "lib/core/DsuClient";
import { EventLoader } from "lib/core/loader";

export default class EventName extends EventLoader {
  constructor(client: DsuClient) {
    /**
     * super call takes client and the eventName as keyof ClientEvents.
     * @see https://discord.js.org/docs/packages/discord.js/14.18.0/ClientEvents:Interface
     */
    //@ts-ignore to ignore the error since "eventName" doesnt exist
    super(client, "eventName");
  }

  /**
   * run arguments relate to the Discord.js event implementation
   * @see https://discord.js.org/docs/packages/discord.js/14.18.0/ClientEvents:Interface
   */
  async run() {}
}
