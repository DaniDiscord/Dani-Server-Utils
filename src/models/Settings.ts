import { Model, Schema, model } from "mongoose";

import { ISettings } from "../types/mongodb";
import { CommandModel } from "./Command";
import { MentorModel } from "./Mentor";

const SettingsSchema = new Schema<ISettings>(
  {
    _id: String,
    prefix: { type: String, default: "!" },
    mentorRoles: [{ type: Schema.Types.ObjectId, ref: MentorModel.modelName }],
    commands: [{ type: Schema.Types.ObjectId, ref: CommandModel.modelName }],
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

export const SettingsModel: Model<ISettings> = model(
  "Settings",
  SettingsSchema
);
