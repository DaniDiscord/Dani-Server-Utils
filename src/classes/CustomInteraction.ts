import {
  ActionRowBuilder,
  ApplicationCommandData,
  AutocompleteInteraction,
  CommandInteraction,
  InteractionReplyOptions,
  MessageFlags,
} from "discord.js";

import { CustomClient } from "lib/client";

export class InteractionCommand {
  options: ApplicationCommandData;
  client: CustomClient;
  autocompleteOptions?: AutocompleteOptionGenerators;
  // modalOptions?:
  constructor(client: CustomClient, options?: ApplicationCommandData) {
    this.client = client;
    if (!options) throw new Error("Not given options for interaction");
    this.options = options;
  }

  async execute(interaction: CommandInteraction): Promise<CustomInteractionReplyOptions> {
    throw new Error("Not implemented");
  }
}

export type AutocompleteOptionGenerators = {
  [key: string]: (
    placeHolder: string,
    interaction: AutocompleteInteraction
  ) => { name: string; value: string }[];
};

export type CustomInteractionReplyOptions = {
  content?: string;
  error?: string;
  embeds?: InteractionReplyOptions["embeds"];
  eph?: boolean;
  components?: ActionRowBuilder<any>[];
  files?: InteractionReplyOptions["files"];
};

export function interpretInteractionResponse(
  options: CustomInteractionReplyOptions
): InteractionReplyOptions {
  const replyOptions: InteractionReplyOptions = {};
  if (options.content) replyOptions.content = options.content;
  else if (options.error) {
    replyOptions.content = `Error: ${options.error}`;
    replyOptions.flags = [MessageFlags.Ephemeral];
  }
  if (options.eph) replyOptions.flags = [MessageFlags.Ephemeral];
  if (options.embeds) replyOptions.embeds = options.embeds;
  if (options.components) replyOptions.components = options.components;
  if (options.files) replyOptions.files = options.files;
  return replyOptions;
}
