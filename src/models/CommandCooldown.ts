import { Model, Schema, model } from "mongoose";

import { ICommandCooldown } from "types/mongodb";

const CommandCooldownSchema = new Schema({
  commandId: String,
  guildId: String,
  userId: String,
  lastUse: Number,
});

export const CommandCooldownModel: Model<ICommandCooldown> = model(
  "CommandCooldown",
  CommandCooldownSchema
);
