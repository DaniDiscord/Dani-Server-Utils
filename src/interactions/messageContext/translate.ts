import {
  CacheType,
  CommandInteraction,
  MessageContextMenuCommandInteraction,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";

import { ApplicationCommandType } from "discord-api-types/v10";
import { CustomClient } from "lib/client";

import axios from "axios";
import { z } from "zod";

const translatedData = z.object({
  alternatives: z.array(z.string()),
  detectedLanguage: z.object({
    confidence: z.number(),
    language: z.string()
  }),
  translatedText: z.string(),
});

type translatedDataType = z.infer<typeof translatedData>

//translation provider must be LibreTranslate format
async function translate(message: string): Promise<translatedDataType> {  
  const req = await axios.post('https://lt.blitzw.in/translate', {
      q: message,
      source: 'auto',
      target: 'en',
      format: 'text',
      alternatives: 3
  });

  let ret: translatedDataType = req.data;

  try {
    translatedData.parse(ret);
  } catch (err) {
    if (err instanceof z.ZodError) {

      console.log(err.issues);

      ret.translatedText = 'Error';
    }
  }

  return ret;
}

export default class ContextCommand extends InteractionCommand {

  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.Message,
      name: "Translate",
      defaultMemberPermissions: "Administrator",
    });
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    const int = interaction as MessageContextMenuCommandInteraction;
    const msg = int.targetMessage.content.trim();

    const fetchData = await translate(msg)
    let message: string;

    if (fetchData.translatedText === 'Error') {
      message = 'There was an error'
    } else {
      const translatedText = fetchData.translatedText;
      const languageCode = fetchData.detectedLanguage.language;
      const languageNames = new Intl.DisplayNames(['en'], { type: 'language'});
      const language = languageNames.of(languageCode);
  
      const confidence = fetchData.detectedLanguage.confidence;
      const alternatives = fetchData.alternatives;

      message = `**Text:** "${translatedText}" \n**Language:** ${language} \n**Confidence:** ${confidence}% \n**Alternatives:** ${alternatives}`;
    }

  return { content: message, eph: true };
  }
}
