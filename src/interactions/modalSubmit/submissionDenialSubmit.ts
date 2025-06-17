import { DsuClient } from "lib/core/DsuClient";
import { Modal } from "lib/core/command";
import { ModalSubmitInteraction } from "discord.js";
import { PermissionLevels } from "types/commands";
import { SuggestionUtility } from "../../utilities/suggestions";

export default class StaffAppModalSubmit extends Modal {
  constructor(client: DsuClient) {
    super("denysubmission", client, {
      permissionLevel: PermissionLevels.HELPER,
    });
  }

  async run(interaction: ModalSubmitInteraction) {
    let reason = interaction.fields.getTextInputValue("reason");

    if (reason === "") {
      reason = "No reason specified.";
    }

    await SuggestionUtility.deny(interaction, reason);
  }
}
