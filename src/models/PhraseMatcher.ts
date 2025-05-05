import { Model, Schema, model } from "mongoose";

import { IPhraseMatcher } from "../types/mongodb";

const PhraseMatcherSchema = new Schema<IPhraseMatcher>({
  guildId: { type: String, required: true, unique: true },
  logChannelId: String,
  phrases: [
    {
      phraseId: { type: String },
      content: { type: String, required: true },
      matchThreshold: { type: Number, default: 100 },
    },
  ],
});

export const PhraseMatcherModel: Model<IPhraseMatcher> = model(
  "PhraseMatcher",
  PhraseMatcherSchema,
);
