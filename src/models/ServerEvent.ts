import { Model, Schema, model } from "mongoose";
import { IServerEvent, IServerEventConfig } from "types/mongodb";

const ServerEventConfigSchema = new Schema<IServerEventConfig>({
  guildId: String,
  staffApprovalChannelId: String,
  votingChannelId: String,
  events: [{ type: Schema.Types.ObjectId, ref: "ServerEvent" }],
});

ServerEventConfigSchema.index({ guildId: 1 }, { unique: true });

export const ServerEventConfigModel: Model<IServerEventConfig> = model(
  "ServerEventConfig",
  ServerEventConfigSchema,
);

const ServerEventSchema = new Schema<IServerEvent>({
  guildId: { type: String, required: true },
  started: Boolean,
  endAt: { type: Date },
  name: { type: String, required: true },
  fields: [{ type: Schema.Types.Mixed }],
  maxUserSubmissions: { type: Number, default: 1 },
  maxWinners: { type: Number, default: 1 },
  bannedUsers: [
    {
      userId: { type: String, required: true },
      reason: { type: String },
    },
  ],
});

ServerEventSchema.index({ guildId: 1, name: 1 }, { unique: true });

export const ServerEventModel: Model<IServerEvent> = model(
  "ServerEvent",
  ServerEventSchema,
);
