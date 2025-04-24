import { Model, Schema, model } from "mongoose";

import { IAnchor } from "../types/mongodb";

const AnchorSchema = new Schema<IAnchor>({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  originalMessageId: { type: String, required: true },
  originalChannelId: { type: String, required: true },
  content: { type: String },
  embeds: { type: Array, default: [] },
  lastAnchorId: { type: String },
  lastAnchorTime: { type: Date },
  messageCount: { type: Number, default: 0 },
  config: {
    messageThreshold: { type: Number, default: 1 },
    timeThreshold: { type: Number, default: 0 },
    inactivityThreshold: { type: Number, default: 0 },
  },
});

export const AnchorModel: Model<IAnchor> = model("Anchor", AnchorSchema);
