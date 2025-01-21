import { Model, Schema, model } from "mongoose";

import { IAutoArchiveForum } from "types/mongodb";

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

export const AutoArchiveForumModel: Model<IAutoArchiveForum> = model(
  "AutoArchiveForum",
  AutoArchiveForumSchema
);
