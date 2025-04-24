import { DsuClient } from "../DsuClient";
import { AllEvents } from "types/index";

export class EventLoader {
  /**
   * The name of the event to check for.
   * @see https://discord.js.org/docs/packages/discord.js/14.14.1/Events:Enum
   */
  public readonly name: AllEvents;
  /**
   * Our client
   */
  public readonly client: DsuClient;

  /**
   * The event listener to bind the functional part to.
   */
  private readonly _listener;

  constructor(client: DsuClient, name: AllEvents) {
    this.name = name;
    this.client = client;

    this._listener = this._run.bind(this);
  }

  private async _run(...args: any[]) {
    try {
      await this.run(...args);
    } catch (error) {
      this.client.logger.error(error);
    }
  }

  public async run(..._args: any): Promise<any> {}

  public listen() {
    // The names typings will be fine within each defined class, however "raw" and "voiceServerUpdate" are not provided within ClientEvents.
    // It requires typecasting as a string since they're not strongly typed within discord.js, they only exist as Events, though can still be monitored.
    return this.client.on(this.name as string, this._listener);
  }

  public removeListener() {
    return this.client.off(this.name as string, this._listener);
  }
}
