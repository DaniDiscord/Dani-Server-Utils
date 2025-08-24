import { ISettings } from "./mongodb";
declare module "discord.js" {
  export interface GuildMember {
    settings: ISettings;
  }

  export interface Base {
    settings: ISettings;
  }

  export interface User {
    permLevel: number;
  }
}
