import { Model, Schema, model } from "mongoose";

import { IXp } from "../types/mongodb";

const XpSchema = new Schema<IXp>({
  guildId: String,
  userId: String,
  messageCount: { type: Number, default: 0 },
  expAmount: { type: Number, default: 0 },
  lastXpTimestamp: Number,
});

XpSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export const XpModel: Model<IXp> = model("Xp", XpSchema);
