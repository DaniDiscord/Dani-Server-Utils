import { Model, Schema, model } from "mongoose";

import { ICommand } from "../types/mongodb";

const CommandSchema = new Schema<ICommand>({
  guild: { type: String, ref: "Settings" },
  trigger: { type: String, index: true },
  content: String,
});

export const CommandModel: Model<ICommand> = model("Command", CommandSchema);
