import { Document } from "mongoose";

/* COMMAND */
export interface RawCommand {
  guild: string;
  trigger: string;
  content: string;
}

export interface ICommand extends RawCommand, Document {}

/* MENTOR */
export interface RawMentor {
  guild: string;
  roleID: string;
  mentorName: string;
  assignedChannels: string[];
}

export interface IMentor extends RawMentor, Document {}

/* SETTINGS */
export interface RawSettings {
  prefix: string;
  mentorRoles: IMentor[];
  commands: ICommand[];
  toUpdate: boolean;
  createdAt: number;
  updatedAt: number;
  chains: {
    ignored: string[];
  };
  roles: {
    helper: string;
    moderator: string;
    admin: string;
  };
}

export interface ISettings extends RawSettings, Document {}

/* COUNTER */
interface RawCounter {
  index: number;
}

export interface ITimestamp extends RawTimestamp, Document {}

interface RawTimestamp {
  identifier: string;
  timestamp: Date;
}

export interface ICounter extends RawCounter, Document {}

/* NAME */
interface RawName {
  userId: string;
  guildId: string;
  name: string;
}

export interface IName extends RawName, Document {}

/* AUTOSLOW */
interface RawAutoSlow {
  channelId: string;
  targetMsgsPerSec: number;
  min: number;
  max: number;
  enabled: boolean;
}

export interface IAutoSlow extends RawAutoSlow, Document {}
