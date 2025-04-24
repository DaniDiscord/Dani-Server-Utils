import { Model, Schema, model } from "mongoose";

import { IAutoSlow } from "../types/mongodb";

const AutoSlowSchema = new Schema<IAutoSlow>({
  channelId: String,
  min: Number,
  max: Number,
  targetMsgsPerSec: Number,
  minChange: Number,
  minChangeRate: Number,
  enabled: Boolean,
});

export const AutoSlowModel: Model<IAutoSlow> = model(
  "AutoSlow",
  AutoSlowSchema
);
