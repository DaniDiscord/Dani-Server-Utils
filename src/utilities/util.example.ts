import { ClientUtilities } from "lib/core/ClientUtilities";
import { DsuClient } from "lib/core/DsuClient";
import { utilities } from "types/index";

/**
 * This is the only definition.
 * Add any functions you need to.
 * Make sure to add it to the {@link utilities} object so you can actually access it.
 */
export class ExampleUtility extends ClientUtilities {
  constructor(client: DsuClient) {
    super(client);
  }
}
