import { Model, Schema, model } from "mongoose";

import { ISettings } from "types/mongodb";

const SettingsSchema = new Schema(
  {
    _id: String,
    prefix: { type: String, default: "!" },
    mentorRoles: [{ type: Schema.Types.ObjectId, ref: "Mentor" }],
    commands: [{ type: Schema.Types.ObjectId, ref: "Command" }],
    chains: {
      ignored: [String],
    },
    roles: {
      helper: String,
      moderator: String,
      admin: String,
    },
    toUpdate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const SettingsModel: Model<ISettings> = model("Settings", SettingsSchema);
