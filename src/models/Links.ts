import { Model, Schema, model } from "mongoose";

import { ILinkPermission } from "../types/mongodb";

const LinkPermissionSchema = new Schema<ILinkPermission>(
  {
    guildId: { type: String, required: true, unique: true },
    channels: [
      {
        channelId: String,
        roles: [
          {
            roleId: String,
            enabled: { type: Boolean, default: true },
          },
        ],
      },
    ],
    userAccess: [
      {
        userId: String,
        hasAccess: { type: Boolean, default: true },
        modifiedBy: String,
        modifiedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
  },
  { timestamps: true }
);

export const LinkPermissionModel: Model<ILinkPermission> = model(
  "LinkPermission",
  LinkPermissionSchema
);
