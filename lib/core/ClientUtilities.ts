import { DsuClient } from "./DsuClient";

export class ClientUtilities {
  public client: DsuClient;

  constructor(client: DsuClient) {
    this.client = client;
  }
}
