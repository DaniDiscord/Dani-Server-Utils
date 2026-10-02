import {
  APILabelComponent,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  ContainerBuilder,
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { DsuClient } from "lib/core/DsuClient";
import { ServerEventModel } from "models/ServerEvent";
import { Times } from "types/index";

export type FieldType = "text" | "file";

export class ServerEventUtility {
  static generateEventContainer(eventName: string, fields: APILabelComponent[]) {
    const fieldList = fields.length
      ? fields
          .map((field, i) => {
            const kind =
              field.component.type === ComponentType.FileUpload
                ? "File Upload"
                : "Text Input";
            return `${i + 1}. **${field.label}** (${kind})`;
          })
          .join("\n")
      : "*No fields added yet.*";

    const menuOptions = [
      new StringSelectMenuOptionBuilder().setLabel("Text Input").setValue("text"),
      new StringSelectMenuOptionBuilder().setLabel("File Upload").setValue("file"),
    ];

    return new ContainerBuilder()
      .addTextDisplayComponents((td) =>
        td.setContent(`# Creating event: ${eventName}\n${fieldList}`),
      )
      .addSeparatorComponents((s) => s)
      .addActionRowComponents((ar) =>
        ar.addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("add-component-menu")
            .setPlaceholder("Add a field...")
            .addOptions(menuOptions),
        ),
      );
  }

  static generateCreateEventActionRow() {
    const cancelButton = new ButtonBuilder()
      .setCustomId("cancel-event-button")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger);

    const submitButton = new ButtonBuilder()
      .setCustomId("submit-event-button")
      .setLabel("Submit")
      .setStyle(ButtonStyle.Success);
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      cancelButton,
      submitButton,
    );
  }

  static async handleAddField(
    interaction: StringSelectMenuInteraction,
    eventName: string,
    fields: APILabelComponent[],
    type: FieldType,
  ) {
    const labelId = "field-label";
    const styleId = "field-style";

    const modal = new ModalBuilder()
      .setCustomId("add-event-field-modal")
      .setTitle("Add a field");

    const labelQuestion = new LabelBuilder({
      label: "Field label",
    }).setTextInputComponent(
      new TextInputBuilder()
        .setCustomId(labelId)
        .setStyle(TextInputStyle.Short)
        .setRequired(true),
    );

    if (type === "file") {
      modal.addLabelComponents(labelQuestion);
    } else {
      modal.addLabelComponents(
        labelQuestion,
        new LabelBuilder({
          label: 'Style: "short" or "paragraph"',
        }).setStringSelectMenuComponent(
          new StringSelectMenuBuilder()
            .setCustomId(styleId)
            .addOptions([
              { label: "Short", value: "short" },
              { label: "Paragraph", value: "paragraph" },
            ])
            .setRequired(true),
        ),
      );
    }

    await interaction.showModal(modal);

    const submitted = await interaction
      .awaitModalSubmit({
        time: Times.MINUTE,
        filter: (i) => i.user.id === interaction.user.id,
      })
      .catch(() => null);

    if (!submitted) return;

    const label = submitted.fields.getTextInputValue(labelId);
    const customId = `field-${fields.length}`;

    const field: APILabelComponent =
      type === "file"
        ? new LabelBuilder({ label })
            .setFileUploadComponent(
              new FileUploadBuilder()
                .setCustomId(customId)
                .setMinValues(1)
                .setMaxValues(1)
                .setRequired(true),
            )
            .toJSON()
        : new LabelBuilder({ label })
            .setTextInputComponent(
              new TextInputBuilder()
                .setCustomId(customId)
                .setStyle(
                  submitted.fields.getStringSelectValues(styleId)[0] === "paragraph"
                    ? TextInputStyle.Paragraph
                    : TextInputStyle.Short,
                )
                .setRequired(true),
            )
            .toJSON();

    fields.push(field);

    if (!submitted.isFromMessage()) return;

    await submitted.update({
      components: [
        ServerEventUtility.generateEventContainer(eventName, fields),
        ServerEventUtility.generateCreateEventActionRow(),
      ],
      flags: "IsComponentsV2",
    });
  }

  static async handleFinalize(
    client: DsuClient,
    component: ButtonInteraction,
    interaction: ChatInputCommandInteraction,
    eventName: string,
    fields: APILabelComponent[],
  ): Promise<boolean> {
    const winnersId = "max-winners";
    const submissionsId = "max-submissions";
    const countOptions = Array.from({ length: 25 }, (_, i) => ({
      label: `${i + 1}`,
      value: `${i + 1}`,
    }));

    const modal = new ModalBuilder()
      .setCustomId("finalize-event-modal")
      .setTitle("Finalize event")
      .addLabelComponents(
        new LabelBuilder({ label: "Max winners" }).setStringSelectMenuComponent(
          new StringSelectMenuBuilder()
            .setCustomId(winnersId)
            .addOptions(countOptions)
            .setRequired(true),
        ),
        new LabelBuilder({
          label: "Max submissions per user",
        }).setStringSelectMenuComponent(
          new StringSelectMenuBuilder()
            .setCustomId(submissionsId)
            .addOptions(countOptions)
            .setRequired(true),
        ),
      );

    await component.showModal(modal);

    const submitted = await component
      .awaitModalSubmit({
        time: Times.MINUTE,
        filter: (i) => i.user.id === interaction.user.id,
      })
      .catch(() => null);

    if (!submitted) return false;

    const maxWinners = Number.parseInt(
      submitted.fields.getStringSelectValues(winnersId)[0],
    );
    const maxUserSubmissions = Number.parseInt(
      submitted.fields.getStringSelectValues(submissionsId)[0],
    );

    await ServerEventModel.create({
      guildId: interaction.guildId,
      name: eventName,
      started: false,
      fields,
      maxWinners,
      maxUserSubmissions,
    });

    const cache = client.stringKeyCache.get("events");
    if (cache) {
      cache.add(eventName);
    } else {
      client.stringKeyCache.set("events", new Set([eventName]));
    }

    if (!submitted.isFromMessage()) return true;

    await submitted.update({
      components: [
        new TextDisplayBuilder({
          content: `Event \`${eventName}\` created with ${fields.length} field(s), ${maxWinners} max winner(s), and ${maxUserSubmissions} max submission(s) per user.`,
        }),
      ],
      flags: "IsComponentsV2",
    });

    return true;
  }
}
