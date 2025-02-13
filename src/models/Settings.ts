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
    pollsAllowed: [String],
    triggers: [
      {
        id: String,
        keywords: [[String]],
        cooldown: Number,
        enabled: Boolean,
        message: {
          embed: Boolean,
          content: String,
          title: String,
          description: String,
          color: String,
        },
      },
    ],
    phrases: [
      {
        logChannelId: String,
        matchThreshold: { type: Number, default: 100 },
        phrase: { type: String, required: true },
      },
    ],
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
