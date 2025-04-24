import { Model, Schema, model } from "mongoose";

import { IMentor } from "../types/mongodb";
const MentorSchema = new Schema<IMentor>({
  guild: { type: String, ref: "Settings" },
  roleID: String,
  mentorName: String,
  assignedChannels: [String],
});

export const MentorModel: Model<IMentor> = model("Mentor", MentorSchema);
