import {
  ApplicationCommand,
  ApplicationCommandType,
  Embed,
  EmbedBuilder,
  Interaction,
  ReactionCollector,
  TextChannel,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  interpretInteractionResponse,
} from "../classes/CustomInteraction";

import { CustomClient } from "lib/client";
import { InteractionType } from "discord-api-types/v10";

export default async function (client: CustomClient, interaction: Interaction) {
  // if (interaction.guildId) {
  //   await client.loadGuildSettings(interaction.guildId);
  // }

  // if (interaction.isButton()) {
  //   const [buttonType, command] = interaction.customId.split(":");
  //   const existingButtonHandler = client.buttons.get(buttonType);
  //   if (existingButtonHandler) {
  //     await existingButtonHandler.execute(interaction);
  //   }
  // }

  if (interaction.isModalSubmit()) {
    const goodPerson = interaction.fields.getTextInputValue("goodPersonInput");
    const soWhy = interaction.fields.getTextInputValue("soWhyInput");
    await interaction.reply("Application sent successfully.");
    const username = interaction.user.username;
    const discriminator = interaction.user.discriminator;
    const authorId = interaction.user.id;
    const embed = new EmbedBuilder()
      .setColor(0xaa00aa)
      .setTitle(`Application of ${username}#${discriminator} (${authorId})`)
      .addFields(
        { name: "Are you a good person?", value: goodPerson },
        { name: "So why do you want to be staff?", value: soWhy }
      );

    await (client.channels.cache.get("787154722209005629") as TextChannel).send({
      embeds: [embed],
    });
  }

  if (interaction.isCommand()) {
    const cmd = client.slashCommands.get(
      `${interaction.commandType}-${interaction.commandName}`
    );
    if (!cmd) return;
    let log = `User ${interaction.user.username} executed ${
      ApplicationCommandType[interaction.commandType]
    } command ${interaction.commandName}`;
    if (interaction.user) log += ` targeting ${interaction.user.username}`;
    else if (interaction.isMessageContextMenuCommand()) {
      log += ` targeting ${interaction.targetMessage.id}`;
    }

    client.log("CMD", log);

    const response = await cmd.execute(interaction).catch(
      (e: Error) =>
        ({
          content: `Error: ${e.message}`,
          ephemeral: true,
        } as CustomInteractionReplyOptions)
    );
    if (interaction.replied || interaction.deferred || response == null) return;
    const send = interpretInteractionResponse(response);
    if (Object.keys(send).length > 0) interaction.reply(send);
    else interaction.reply({ content: "Error: No response", ephemeral: true });
  } else if (interaction.isAutocomplete()) {
    const ret = client.autocompleteOptions.get(interaction.commandName);
    if (ret) {
      const focused = interaction.options.getFocused(true);
      const a = ret[focused.name](focused.value, interaction);
      interaction.respond(a);
    }
  }
}
