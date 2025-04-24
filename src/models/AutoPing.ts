import { Model, Schema, model } from "mongoose";

import { IAutoPing } from "../types/mongodb";

const AutoPingSchema = new Schema<IAutoPing>({
  guildId: String,
  roleId: String,
  forumId: String,
  tag: String,
  targetChannelId: String,
});

export const AutoPingModel: Model<IAutoPing> = model(
  "AutoPing",
  AutoPingSchema
);
