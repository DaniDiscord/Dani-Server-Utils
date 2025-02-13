import { Command, PermissionLevels } from "types/command";

import { PhraseMatcherModel } from "models/PhraseMatcher";

const template: Command = {
  run: async (client, message, args) => {
    if (args[0] !== "add") return;

    let inQuotes = false;
    let phrase: string[] = [];
    let matchThreshold: number | null = null;

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('"') && !inQuotes) {
        inQuotes = true;
        phrase.push(arg.slice(1));
      } else if (arg.endsWith('"') && inQuotes) {
        phrase.push(arg.slice(0, -1));
        inQuotes = false;
      } else if (inQuotes) {
        phrase.push(arg);
      } else if (!isNaN(Number(arg)) && phrase.length > 0) {
        matchThreshold = Number(arg);
        break;
      }
    }

    const fullPhrase = phrase.join(" ");

    if (!fullPhrase) {
      return message.reply("Error: No phrase detected.");
    }
    if (matchThreshold === null) {
      return message.reply("Error: No match percentage provided.");
    }

    // Store the phrase and threshold
    await PhraseMatcherModel.create({
      matchThreshold,
      phrase: fullPhrase,
      logChannelId: message.channelId,
    });

    message.reply(`Stored Phrase: "${fullPhrase}" with ${matchThreshold}% threshold.`);
  },
  conf: {
    aliases: ["match"],
    permLevel: PermissionLevels.USER,
  },
  help: {
    name: "matchphrase",
    description: `Matches two phrases`,
  },
};

export default template;
