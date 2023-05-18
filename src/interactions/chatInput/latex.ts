import {
  ApplicationCommandOptionType,
  CacheType,
  CommandInteraction,
  EmbedBuilder,
  Snowflake,
  ThreadChannel,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";

import { ApplicationCommandType } from "discord-api-types/v10";
import { CustomClient } from "lib/client";
import { PermissionsBitField } from "discord.js";
import html2image from "node-html-to-image";
import katex from "katex";

require("katex/contrib/mhchem");

const latex = "latex";

const includeKatex = `<!DOCTYPE html>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.7/dist/katex.min.css" integrity="sha384-3UiQGuEI4TTMaFmGIZumfRPtfKQ3trwQE2JgosJxCnGmQpL/lJdjpcHkaaFwHlcI" crossorigin="anonymous">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.7/dist/katex.min.js" integrity="sha384-G0zcxDFp5LWZtDuRMnBkk3EphCK1lhEf4UEyEM693ka574TZGwo4IWwS6QLzM/2t" crossorigin="anonymous">
</script>
<body style="width:fit-content">
<p style="font-size:20px; padding: 10px; width: fit-content; display: flex; margin: 0">`;

const useCooldownMillis = 5000;
const renderCooldownMillis = 45000;

const useCooldown: Map<Snowflake, number> = new Map();
const renderCooldown: Map<Snowflake, number> = new Map();

export default class SlashCommand extends InteractionCommand {
  /**
   *
   */
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.ChatInput,
      name: "latex",
      description: "Render Latex",
      options: [
        {
          description: "LaTeX",
          name: latex,
          required: true,
          type: ApplicationCommandOptionType.String,
        },
      ],
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    const userId = interaction.user.id;
    const currentMillis = Date.now();

    // 0 is unix epoch
    const userUseCooldown = useCooldown.get(userId) ?? 0;
    const userRenderCooldown = renderCooldown.get(userId) ?? 0;

    const timeSinceUse = currentMillis - userUseCooldown;
    const timeSinceRender = currentMillis - userRenderCooldown;
    const maxTimeLeft = Math.max(
      useCooldownMillis - timeSinceUse,
      renderCooldownMillis - timeSinceRender
    );

    if (maxTimeLeft > 0) {
      const reuseTime = Math.floor((currentMillis + maxTimeLeft) / 1000);
      const timeLeft = new EmbedBuilder().addFields([
        {
          name: "Command cooldown",
          value: `you can use this command again <t:${reuseTime}:R>`,
        },
      ]);

      await interaction.reply({ embeds: [timeLeft], ephemeral: true });
      return {};
    }
    useCooldown.set(userId, currentMillis);
    const message = await interaction
      .reply({
        content: "Rendering...",
        fetchReply: true,
      })
      .catch(console.error);
    if (!message) return {};
    const stringLatex = interaction.options.get(latex)?.value;
    if (stringLatex === null || typeof stringLatex !== "string") {
      await interaction.editReply({
        content: "No Latex Provided",
      });
      return {};
    }
    try {
      let html = katex.renderToString(stringLatex, {
        displayMode: true,
        throwOnError: true,
        minRuleThickness: 0.1,
        output: "html",
      });
      html = includeKatex + html;

      const image = (await html2image({
        html: html,
      })) as Buffer;

      await interaction.editReply({
        content: "",
        files: [{ attachment: image }],
      });
      renderCooldown.set(userId, currentMillis);
    } catch (error) {
      console.error(error);
      log.warn("Latex error", error as Error);
      interaction.editReply("You really put the L in your Latex (Error rendering latex)");
    }

    return {};
  }
}
