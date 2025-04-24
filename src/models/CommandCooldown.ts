import { Model, Schema, model } from "mongoose";

import { ICommandCooldown } from "../types/mongodb";

const CommandCooldownSchema = new Schema<ICommandCooldown>({
  commandId: String,
  guildId: String,
  userId: String,
  lastUse: {
    default: 0,
    type: Number,
  },
  banned: {
    default: false,
    type: Boolean,
  },
  reason: {
    default: undefined,
    type: String,
  },
});

export const CommandCooldownModel: Model<ICommandCooldown> = model(
  "CommandCooldown",
  CommandCooldownSchema
);
