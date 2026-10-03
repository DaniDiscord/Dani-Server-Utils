import { Model, Schema, model } from "mongoose";
import { IServerEventSubmission } from "types/mongodb";

const ServerEventSubmissionSchema = new Schema<IServerEventSubmission>({
  guildId: { type: String, required: true },
  eventId: { type: Schema.Types.ObjectId, ref: "ServerEvent", required: true },
  userId: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "denied"], default: "pending" },
  staffMessageId: String,
  voteMessageId: String,
  entries: [
    {
      label: { type: String, required: true },
      customId: { type: String, required: true },
      kind: { type: String, enum: ["text", "file"], required: true },
      text: String,
      fileUrls: [String],
    },
  ],
});

ServerEventSubmissionSchema.index({ eventId: 1, userId: 1 });

export const ServerEventSubmissionModel: Model<IServerEventSubmission> = model(
  "ServerEventSubmission",
  ServerEventSubmissionSchema,
);
