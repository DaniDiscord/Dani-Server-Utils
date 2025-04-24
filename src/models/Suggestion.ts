import { Model, Schema, model } from "mongoose";

import { ISuggestion, ISuggestionConfig } from "../types/mongodb";

const SuggestionGuildConfigSchema = new Schema<ISuggestionConfig>({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  cooldown: { type: Number, required: true },
  deniedThreadId: { type: String },
  existingSubmissions: [{ type: Schema.Types.ObjectId, ref: "Suggestion" }],

  deniedSubmissions: [
    {
      messageId: { type: String, required: true },
      reason: { type: String },
    },
  ],
});

export const SuggestionConfigModel: Model<ISuggestionConfig> = model(
  "SuggestionConfig",
  SuggestionGuildConfigSchema
);

const SuggestionSchema = new Schema<ISuggestion>({
  messageId: { type: String, required: true },
  content: { type: String, required: true },
  status: { type: String, enum: ["approved", "pending"], required: true },
  userId: { type: String, required: true },
});

export const SuggestionModel = model<ISuggestion>(
  "Suggestion",
  SuggestionSchema
);
