import {
  ApplicationCommandType,
  GuildMember,
  MessageFlags,
  PermissionsBitField,
  UserContextMenuCommandInteraction,
} from "discord.js";
import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { CounterModel } from "models/Counter";

export default class RandName extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("Random Name", client, {
      type: ApplicationCommandType.User,
      permissionLevel: "USER",
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  public async run(interaction: UserContextMenuCommandInteraction) {
    const badNameUtility = this.client.utils.getUtility("badName");

    if (!(interaction.targetMember instanceof GuildMember)) {
      return interaction.reply({
        content: "Random name only works on guild members",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (this.client.getPermLevel(undefined, interaction.targetMember) >= 2) {
      return interaction.reply({
        content: "Helper and above cannot be nicknamed",
        flags: MessageFlags.Ephemeral,
      });
    }
    const id = "Badname";
    const res = await CounterModel.findOneAndUpdate(
      {
        _id: id,
      },
      {
        $inc: {
          index: 1,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
    const name = badNameUtility.getName(res.index);
    await badNameUtility.setMemberName(interaction.targetMember, name);
    return interaction.reply({
      content: "User renamed successfully",
      flags: MessageFlags.Ephemeral,
    });
  }
}
