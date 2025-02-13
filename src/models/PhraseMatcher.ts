import { Model, Schema, model } from "mongoose";

import { IPhraseMatcher } from "types/mongodb";

const PhraseMatcherSchema = new Schema({
  logChannelId: String,
  matchThreshold: { type: Number, default: 100 },
  phrase: { type: String, required: true },
});

export const PhraseMatcherModel: Model<IPhraseMatcher> = model(
  "PhraseMatcher",
  PhraseMatcherSchema
);
