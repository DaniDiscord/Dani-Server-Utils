import { Model, Schema, model } from "mongoose";

import { IName } from "../types/mongodb";

const NameSchema = new Schema<IName>({
  _id: String,
  guildId: {
    type: String,
    default: "",
  },
  userId: {
    type: String,
    default: "",
  },
  name: {
    type: String,
    default: "",
  },
});

export const NameModel: Model<IName> = model("Names", NameSchema);
