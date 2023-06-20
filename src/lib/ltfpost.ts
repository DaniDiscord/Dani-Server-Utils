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
  
  export const lftPostCustomId = "lftPost";
  export const lftPostQuestions = [
    new Question("Looking For", "What are you looking for", true, TextInputStyle.Paragraph),
    new Question("Experience", "Do you have prior staff/relevant experience?", true, TextInputStyle.Paragraph),
    new Question("Project Name", "What is the project's name?", true, TextInputStyle.Paragraph),
    new Question("Job", "What will they/you do?", true, TextInputStyle.Paragraph),
    new Question("Requirements", "Are there any requirements?", true, TextInputStyle.Short),
  ];
  