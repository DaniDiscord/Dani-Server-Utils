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
  started: Boolean,
  endAt: { type: Date },
  name: { type: String, required: true, unique: true },
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

export const ServerEventModel: Model<IServerEvent> = model(
  "ServerEvent",
  ServerEventSchema,
);
