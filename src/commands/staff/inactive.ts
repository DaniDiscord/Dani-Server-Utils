import { Command, PermissionLevels } from "types/command";

import { TextChannel } from "discord.js";

const inactiveHelper = "744621091372400780"; // Inactive Helper boi
const activeHelper = "671088508458237952"; // Helper Boi
const trialHelper = "707248805887606854";

const inactive: Command = {
  run: async (client, message) => {
    if (message.member?.roles.cache.has(trialHelper)) return;
    const inactive = message.member?.roles.cache.has(inactiveHelper);
    const active = message.member?.roles.cache.has(activeHelper);
    if (inactive) {
      await message.member?.roles.remove(
        inactiveHelper,
        `[DSU] Staff Activity Change. [Remove inactive Helper boi]`
      );
      await message.member?.roles.add(
        activeHelper,
        `[DSU] Staff Activity Change. [Re-add Helper boi]`
      );
      (message.channel as TextChannel).send(
        `${message.author}, you are now an active member of staff.`
      );
    } else if (active) {
      await message.member?.roles.add(
        inactiveHelper,
        `[DSU] Staff Activity Change. [Add inactive Helper boi]`
      );
      await message.member?.roles.remove(
        activeHelper,
        `[DSU] Staff Activity Change. [Remove Helper boi]`
      );
      (message.channel as TextChannel).send(
        `${message.author}, you are now an inactive member of staff.`
      );
    }
  },
  conf: {
    aliases: [""],
    permLevel: PermissionLevels.HELPER,
  },
  help: {
    name: "inactive",
    description: "Toggle between inactive and active staff roles.",
  },
};

export default inactive;
