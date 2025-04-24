import { Model, Schema, model } from "mongoose";

import { ITimestamp } from "../types/mongodb";

const TimestampSchema = new Schema<ITimestamp>({
  _id: String,
  identifier: String,
  timestamp: Date,
});

export const TimestampModel: Model<ITimestamp> = model(
  "Timestamp",
  TimestampSchema
);
