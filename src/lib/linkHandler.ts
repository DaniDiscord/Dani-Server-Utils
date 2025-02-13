import { LinkPermissionModel } from "models/Links";
import TLDS from "../json/tlds.json";

function isIP(address: string): boolean {
  const ipv4Pattern = /^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?$/;
  const ipv6Pattern = /^(?:\[[a-f0-9:]+])(?::\d+)?$/i;

  return ipv4Pattern.test(address) || ipv6Pattern.test(address);
}

function getTLDCandidates(hostname: string): string[] {
  const parts = hostname.split(".");
  const candidates: string[] = [];
  for (let i = parts.length - 1; i >= 0; i--) {
    const candidate = parts.slice(i).join(".");
    candidates.push(candidate);
  }
  return candidates;
}

export function readMsgForLink(content: string) {
  const urlPattern =
    /\b(?:https?):\/\/[^\s/$.?#-][^\s]*|(?:www\.|[\p{L}0-9-]+\.)+[\p{L}0-9-]+(?:[^\s]*)?/giu;
  const matches = Array.from(
    content.matchAll(urlPattern),
    (match) => decodeURIComponent(match[0]) // Decode URL-encoded characters beacuse mfs can do http://example%2Ecom to bypass
  );

  const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b|\[[a-f0-9:]+\](?::\d+)?/gi;
  const ipMatches = Array.from(content.matchAll(ipPattern), (match) => match[0]);

  if (matches.length === 0 && ipMatches.length === 0) {
    return { hasUrls: false, urls: [] };
  }

  const validUrls = matches.filter((url) => {
    try {
      const parsedUrl = new URL(
        url.startsWith("http") || url.startsWith("ftp") ? url : `http://${url}`
      );
      const hostname = parsedUrl.hostname.replace(/^www\./, "");

      if (isIP(hostname)) return false;

      const candidates = getTLDCandidates(hostname);
      return candidates.some((candidate) => TLDS.includes(candidate.toLowerCase()));
    } catch (e) {
      return false;
    }
  });

  return {
    hasUrls: validUrls.length > 0 || ipMatches.length > 0,
    urls: [...validUrls, ...ipMatches],
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
