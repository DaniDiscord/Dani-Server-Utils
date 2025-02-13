import {
  CacheType,
  CommandInteraction,
  EmbedBuilder,
  MessageContextMenuCommandInteraction,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";

import { ApplicationCommandType } from "discord-api-types/v10";
import { CustomClient } from "lib/client";

export default class CodeblockContext extends InteractionCommand {
  /**
   *
   */
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.Message,
      name: "Convert to Codeblock",
      defaultMemberPermissions: null,
    });
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    const int = interaction as MessageContextMenuCommandInteraction;

    const cdsKey = `Codeblock-${int.user.id}`;
    const lastUsed = this.client.cds.get(cdsKey);
    const duration = 20000;
    if (lastUsed && Date.now() - lastUsed < duration) {
      const expiresAt = Math.floor((lastUsed + duration) / 1000);
      return {
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setDescription(`That command will be available again <t:${expiresAt}:R>.`),
        ],
        eph: true,
      };
    }

    let content = int.targetMessage.content.trim();
    let begin;
    for (begin = 0; begin < content.length; begin++) {
      if (content[begin] != "`") {
        break;
      }
    }
    let end;
    for (end = content.length - 1; end >= begin; end--) {
      if (content[end] != "`") {
        break;
      }
    }

    content = "```\n" + content.substring(begin, end + 1) + "```";

    // Prevent spamming the command
    this.client.cds.set(cdsKey, Date.now());

    setTimeout(() => {
      this.client.cds.delete(cdsKey);
    }, duration);

    return {
      content,
    };
  }
}
