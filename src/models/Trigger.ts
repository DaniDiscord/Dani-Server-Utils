import { Model, Schema, model } from "mongoose";

import { ITrigger } from "types/mongodb";

const TriggerSchema = new Schema({
  guildId: String,
  userId: String,
  triggerId: String,
});

export const TriggerModel: Model<ITrigger> = model("Trigger", TriggerSchema);
