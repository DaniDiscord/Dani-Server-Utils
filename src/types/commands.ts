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
  USER = 0,
  MENTOR = 1,
  HELPER = 2,
  MODERATOR = 3,
  ADMINISTRATOR = 4,
  SERVER_OWNER = 5,
  BOT_OWNER = 10,
}

export type BaseCommandOptions = {
  description?: string;
};

export type InteractionCommandOptions = BaseCommandOptions & {
  guildOnly?: boolean;
  cooldown?: number;
  applicationData?: CustomApplicationCommandOptionData[];
  defaultMemberPermissions?: ApplicationCommandData["defaultMemberPermissions"];
  type?: ApplicationCommandData["type"];
  permissionLevel: PermissionLevels;
};

type CustomApplicationCommandOptionData = ApplicationCommandOptionData & {
  level: PermissionLevels;
};

export type TextCommandOptions = Omit<InteractionCommandOptions, "applicationData">;

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
