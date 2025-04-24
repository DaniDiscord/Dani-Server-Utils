import { Collection } from "discord.js";

export class TimeoutHandler {
  coll: Collection<
    string,
    { set: Date; duration: number; timeout: NodeJS.Timeout }
  > = new Collection();
  has(str: string) {
    return this.coll.has(str);
  }
  hasAny(str: string) {
    return this.coll.hasAny(str);
  }
  set(str: string, duration: number) {
    this.coll.set(str, {
      set: new Date(),
      duration,
      timeout: setTimeout(() => {
        this.coll.delete(str);
      }, duration),
    });
  }
  clear(str: string) {
    if (this.coll.has(str)) {
      clearTimeout(this.coll.get(str)!.timeout);
    }
  }
}
