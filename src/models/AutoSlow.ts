import { Model, Schema, model } from "mongoose";

import { IAutoSlow } from "types/mongodb";

const AutoSlowSchema = new Schema({
  channelId: {
    type: String,
    default: "",
  },
  min: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: 21600,
  },
  targetMsgsPerSec: {
    type: Number,
    default: 1,
  },
});

export const AutoSlowModel: Model<IAutoSlow> = model("AutoSlow", AutoSlowSchema);
