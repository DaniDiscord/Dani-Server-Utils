import { ModalSubmitInteraction } from "discord.js";
import { Modal } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";

export default class StaffAppModalSubmit extends Modal {
  constructor(client: DsuClient) {
    super("denysubmission", client, {
      permissionLevel: "USER",
    });
  }

  async run(interaction: ModalSubmitInteraction) {
    const suggestionUtility = this.client.utils.getUtility("suggestions");
    let reason = interaction.fields.getTextInputValue("reason");

    if (reason === "") {
      reason = "No reason specified.";
    }

    suggestionUtility.deny(interaction, reason);
  }
}
