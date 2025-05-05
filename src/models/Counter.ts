import { Model, Schema, model } from "mongoose";

import { ICounter } from "../types/mongodb";

const CounterSchema = new Schema<ICounter>({
  _id: String,
  index: {
    type: Number,
    default: 0,
  },
});

export const CounterModel: Model<ICounter> = model("Counter", CounterSchema);
