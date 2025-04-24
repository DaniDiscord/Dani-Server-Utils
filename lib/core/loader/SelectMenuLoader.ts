import { AnySelectMenuInteraction, MessageFlags } from "discord.js";
import { DsuClient } from "../DsuClient";
import { BaseInteractionLoader } from "./BaseInteractionLoader";
import { SelectMenu } from "../command/SelectMenu";
import { InteractionType } from "types/commands";

export class SelectMenuLoader extends BaseInteractionLoader {
  constructor(client: DsuClient) {
    super(client);
  }

  public override load() {
    return super.load("selectMenus");
  }
  private fetchMenu(customId: string) {
    return this.client.selectMenus.find((menu) =>
      customId.startsWith(menu.name)
    );
  }

  public handle(interaction: AnySelectMenuInteraction) {
    const menu = this.fetchMenu(interaction.customId);

    if (!menu) {
      return this.client.logger.error(
        `${interaction.user.tag} [${interaction.user.id}] invoked select menu ${interaction.customId} even though it doesn't exist.`
      );
    }

    const missingPermissions = menu.validate(
      interaction,
      InteractionType.SelectMenu
    );

    if (missingPermissions) {
      return interaction.reply({
        embeds: [
          this.client.utils
            .getUtility("default")
            .generateEmbed("error", missingPermissions),
        ],
      });
    }

    this.run(menu, interaction);
  }

  async run(menu: SelectMenu, interaction: AnySelectMenuInteraction) {
    await menu.run(interaction).catch((error) => {
      this.client.logger.error(error);

      const embed = this.client.utils
        .getUtility("default")
        .generateEmbed("error", {
          title: "An error has occured!",
          description: "An unexpected error has occured.",
        });

      interaction.deferReply();
      return interaction.followUp({
        flags: [MessageFlags.Ephemeral],
        embeds: [embed],
      });
    });
  }
}
