import { LinkPermissionModel } from "models/Links";

export function readMsgForLink(content: string) {
  // Replace weird formatting to avoid link evasion (eg d i s c o r d . g g)
  // There will probably be false positives, but nothing major.
  let normalizedText = content
    .toLowerCase()
    .replace(/\s*\.\s*/g, ".")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*:\s*/g, ":");

  normalizedText = normalizedText.replace(/([a-z])\s+(?=[a-z](?:\s+[a-z])*)/g, "$1");

  // Common TLDs
  const tlds = [
    "com",
    "net",
    "org",
    "edu",
    "gov",
    "mil",
    "biz",
    "info",
    "io",
    "co",
    "gg",
    "me",
    "tv",
    "app",
    "dev",
    "xyz",
    "site",
    "web",
    "online",
    "tech",
    "store",
    "blog",
    "cloud",
    "ai",
    "live",
    "pro",
    "shop",
    "news",
    "life",
    "network",
  ].join("|");

  const urlPattern = new RegExp(
    "(?:^|\\s|[([{'\"])" + // boundary
      "(" +
      // Protocol
      "(?:https?:\\/\\/" +
      "(?:[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\." +
      `(?:${tlds}))` +
      "(?:[:/?#][^\\s\"'.,!?(){}\\[\\]]*)?)" +
      "|" +
      // WWW
      "(?:www\\." +
      "(?:[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\." +
      `(?:${tlds}))` +
      "(?:[:/?#][^\\s\"'.,!?(){}\\[\\]]*)?)" +
      "|" +
      // IP address
      "(?:\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}" +
      "(?:[:/?#][^\\s\"'.,!?(){}\\[\\]]*)?)" +
      "|" +
      // Domain format
      "(?:[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\." +
      `(?:${tlds})` +
      "(?:[:/?#][^\\s\"'.,!?(){}\\[\\]]*)?)" +
      ")" +
      "(?=$|\\s|[.,!?(){}\\[\\]'\"])", // End with boundary
    "gi"
  );

  const matches = Array.from(normalizedText.matchAll(urlPattern), (match) => match[0]);

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
