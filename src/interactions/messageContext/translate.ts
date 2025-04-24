import {
  ApplicationCommandType,
  MessageContextMenuCommandInteraction,
  MessageFlags,
} from "discord.js";
import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { z } from "zod";
import axios from "axios";

const translationData = z.object({
  alternatives: z.array(z.string()),
  detectedLanguage: z.object({
    confidence: z.number(),
    language: z.string(),
  }),
  translatedText: z.string(),
});

type TranslationDataType = z.infer<typeof translationData>;

async function translate(message: string): Promise<TranslationDataType> {
  const req = await axios.post("https://lt.blitzw.in/translate", {
    q: message,
    source: "auto",
    target: "en",
    format: "text",
    alternatives: 3,
  });

  let ret: TranslationDataType = req.data;

  try {
    translationData.parse(ret);
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.log(err.issues);

      ret.translatedText = "Error";
    }
  }

  return ret;
}

export default class Codeblock extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("Translate Message", client, {
      type: ApplicationCommandType.Message,
      permissionLevel: "USER",
    });
  }

  async run(interaction: MessageContextMenuCommandInteraction) {
    const msg = interaction.targetMessage.content.trim();

    let embed = this.client.utils
      .getUtility("default")
      .generateEmbed("success", {
        title: "Translated Text!",
      });

    const response = await translate(msg);

    if (response.translatedText === "Error") {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [
          embed
            .setTitle("Failed to translate text")
            .setColor(this.client.config.colors.primary),
        ],
      });
    } else {
      const translatedText = response.translatedText;
      const languageCode = response.detectedLanguage.language;
      const languageNames = new Intl.DisplayNames(["en"], { type: "language" });
      const language = languageNames.of(languageCode);

      const confidence = response.detectedLanguage.confidence;

      if (language) embed.addFields([{ name: "Language", value: language }]);

      embed.addFields([
        { name: "Text", value: translatedText },
        { name: "Confidence", value: `${confidence}%` },
      ]);

      return interaction.reply({
        embeds: [embed],
      });
    }
  }
}
