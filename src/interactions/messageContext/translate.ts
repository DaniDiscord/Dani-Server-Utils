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

//translation provider must be LibreTranslate format
async function translate(message: string): Promise<string>{
    const req = axios.post("https://lt.blitzw.in/translate", {
        q: message,
        source: 'auto',
        target: 'en',
        format: 'text',
        alternatives: 3
    });

    const dataPromise = req.then((response) => response.data)
    return dataPromise
}

export default class ContextCommand extends InteractionCommand {
  /**
   *
   */
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
    const msg = int.targetMessage.content.trim()

    const translated = await translate(msg);

    const translatedText = translated['translatedText'];
    const detectedLanguage = translated['detectedLanguage']['language'];
    const confidence = translated['detectedLanguage']['confidence']
    const alternatives = translated['alternatives']

  return { content: `${`Text: "${translatedText}" \nLanguage: ${detectedLanguage} \nConfidence: ${confidence}% \nAlternatives: ${alternatives}`}` };
  }
}
