import {
  IAutoArchiveForum,
  IAutoArchiveForumBlacklist,
} from "../types/mongodb";
import { Model, Schema, model } from "mongoose";

const AutoArchiveForumSchema = new Schema<IAutoArchiveForum>(
  {
    guildId: { type: String, required: true, unique: true },
    channels: [
      {
        channelId: { type: String, required: true },
        expireDuration: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

const AutoArchiveForumBlacklistSchema = new Schema<IAutoArchiveForumBlacklist>(
  {
    guildId: { type: String, required: true, unique: true },
    threads: [{ type: String, required: true }],
  },
  { timestamps: true }
);

export const AutoArchiveForumModel: Model<IAutoArchiveForum> = model(
  "AutoArchiveForum",
  AutoArchiveForumSchema
);

export const AutoArchiveForumBlacklistModel: Model<IAutoArchiveForumBlacklist> =
  model("AutoArchiveForumBlacklist", AutoArchiveForumBlacklistSchema);
