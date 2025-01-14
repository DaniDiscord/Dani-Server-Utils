import { LinkPermissionModel } from "models/Links";

export function readMsgForLink(content: string) {
  const urlPattern = /(https?:\/\/|www\.|discord\.|[a-zA-Z0-9-]+\.)[^\s/$.?#]*\.[^\s]*/gi;
  const matches = Array.from(content.matchAll(urlPattern), (match) => match[0]);

  return {
    hasUrls: matches.length > 0,
    urls: matches,
  };
}

export async function canUserSendLinks(
  guildId: string,
  channelId: string,
  userId: string,
  memberRoles: string[]
): Promise<boolean> {
  const shouldLog = process.env.NODE_ENV === "development";
  const permissions = await LinkPermissionModel.findOne({ guildId });
  if (shouldLog) console.log(permissions);
  if (!permissions) return true;

  const userAccess = permissions.userAccess.find((a) => a.userId === userId);
  if (shouldLog) console.log("User access: ", userAccess);
  if (userAccess?.hasAccess === false) return false;

  const channelConfig = permissions.channels.find((c) => c.channelId === channelId);
  if (shouldLog) console.log("Channel settings: ", channelConfig);
  if (!channelConfig) return true;

  return memberRoles.some((roleId) =>
    channelConfig.roles.some((r) => r.roleId === roleId && r.enabled)
  );
}
