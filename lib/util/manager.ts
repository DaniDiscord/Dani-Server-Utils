import { UtilityInstanceMap, UtilityKey, utilities } from "types/index";

import { DsuClient } from "lib/core/DsuClient";

export class UtilitiesManager {
  private client: DsuClient;
  private utils: Partial<UtilityInstanceMap> = {};

  constructor(client: DsuClient) {
    this.client = client;
  }

  /**
   * Gets necessary utility
   * @param key the key of the needed utility, see {@link utilities}
   * @returns Instance of necessary utility
   */
  public getUtility<K extends UtilityKey>(key: K): UtilityInstanceMap[K] {
    if (!this.utils[key]) {
      const UtilityClass = utilities[key];
      // @ts-expect-error VSCode doesn't know what to expect.
      this.utils[key] = new UtilityClass(this.client);
    }

    return this.utils[key]!;
  }
}
