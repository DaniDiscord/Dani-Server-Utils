import { Model, Schema, model } from "mongoose";

import { IEmojiSuggestions } from "../types/mongodb";

const EmojiSuggestionsSchema = new Schema<IEmojiSuggestions>({
  guildId: {
    type: String,
    default: "",
  },
  sourceId: {
    type: String,
    default: "",
  },
  voteId: {
    type: String,
    default: "0",
  },
  threshold: {
    type: Number,
    default: 0,
  },
  bias: {
    type: Number,
    default: 0,
  },
  emojiCap: {
    type: Number,
    default: 0,
  },
  cooldown: {
    type: Number,
    default: 0,
  },
});

export const EmojiSuggestionsModel: Model<IEmojiSuggestions> = model(
  "EmojiSuggestions",
  EmojiSuggestionsSchema
);
