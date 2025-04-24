import { Model, Schema, model } from "mongoose";

import { IEmojiUsage } from "types/mongodb";

const EmojiUsageSchema = new Schema<IEmojiUsage>({
  guildId: String,
  name: String,
  count: {
    type: Number,
    default: 1,
  },
  lastUsage: Date,
});

export const EmojiUsageModel: Model<IEmojiUsage> = model(
  "EmojiUsage",
  EmojiUsageSchema
);
