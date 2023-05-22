import { Model, Schema, model } from "mongoose";

import { IAutoPoll } from "types/mongodb";

const AutoPollSchema = new Schema({
  guildId: String,
  channels: {
    type: [String],
    default: [],
  },
  roles: {
    type: [String],
    default: [],
  },
});

export const AutoPollModel: Model<IAutoPoll> = model("AutoPoll", AutoPollSchema);
