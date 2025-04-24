import {
  AnySelectMenuInteraction,
  ApplicationCommandData,
  ApplicationCommandOptionData,
  AutocompleteInteraction,
  ButtonInteraction,
  CommandInteraction,
  ModalSubmitInteraction,
} from "discord.js";

export enum PermissionLevels {
  USER,
  MENTOR,
  HELPER,
  MODERATOR,
  ADMINISTRATOR,
  SERVER_OWNER,
  BOT_OWNER,
}

export type BaseCommandOptions = {
  description?: string;
};

export type InteractionCommandOptions = BaseCommandOptions & {
  guildOnly?: boolean;
  cooldown?: number;
  permissionLevel: PermissionLevels | keyof typeof PermissionLevels;
  applicationData?: ApplicationCommandOptionData[];
  defaultMemberPermissions?: ApplicationCommandData["defaultMemberPermissions"];
  type?: ApplicationCommandData["type"];
};

export type TextCommandOptions = Omit<
  InteractionCommandOptions,
  "applicationData"
>;

export enum InteractionType {
  AutoComplete,
  SelectMenu,
  ApplicationCommand,
  Button,
  ModalSubmit,
}
export type InteractionGroups =
  | AnySelectMenuInteraction
  | CommandInteraction
  | ButtonInteraction
  | AutocompleteInteraction
  | ModalSubmitInteraction;

export const BaseInteractionType: Map<InteractionType, string> = new Map<
  InteractionType,
  string
>([
  [InteractionType.Button, "Button"],
  [InteractionType.ModalSubmit, "Modal Submit"],
  [InteractionType.ApplicationCommand, "Application Command"],
  [InteractionType.SelectMenu, "Select Menu"],
  [InteractionType.AutoComplete, "Auto-complete"],
]);
