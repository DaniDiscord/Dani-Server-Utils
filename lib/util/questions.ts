import {
  ActionRowBuilder,
  ModalActionRowComponentBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

export class Question {
  customId: string;
  label: string;
  required: boolean;
  textInputStyle: TextInputStyle;

  constructor(
    customId: string,
    label: string,
    required: boolean,
    textInputStyle: TextInputStyle
  ) {
    this.customId = customId;
    this.label = label;
    this.required = required;
    this.textInputStyle = textInputStyle;
  }

  toActionRow(): ActionRowBuilder<ModalActionRowComponentBuilder> {
    return new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId(this.customId)
        .setLabel(this.label)
        .setRequired(this.required)
        .setStyle(this.textInputStyle)
    );
  }
}

export const staffAppCustomId = "staffApp";
export const staffAppQuestions = [
  new Question(
    "Why",
    "Why should we pick you?",
    true,
    TextInputStyle.Paragraph
  ),
  new Question(
    "Experience",
    "Do you have prior staff/relevant experience?",
    true,
    TextInputStyle.Paragraph
  ),
  new Question("Age", "How old are you?", true, TextInputStyle.Short),
  new Question(
    "Who",
    "Who are you? Give us a brief description.",
    true,
    TextInputStyle.Paragraph
  ),
  new Question(
    "Timezone",
    "Which timezone do you operate under?",
    true,
    TextInputStyle.Short
  ),
];
