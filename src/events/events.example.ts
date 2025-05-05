import { DsuClient } from "lib/core/DsuClient";
import { EventLoader } from "lib/core/loader";

// Needs to be default export if you plan to add it.

export class EventName extends EventLoader {
  constructor(client: DsuClient) {
    /**
     * super call takes client and the eventName as keyof ClientEvents.
     * @see https://discord.js.org/docs/packages/discord.js/14.18.0/ClientEvents:Interface
     */
    // @ts-expect-error "eventName" doesnt exist
    super(client, "eventName");
  }

  /**
   * run arguments relate to the Discord.js event implementation
   * @see https://discord.js.org/docs/packages/discord.js/14.18.0/ClientEvents:Interface
   */
  async run() {}
}
