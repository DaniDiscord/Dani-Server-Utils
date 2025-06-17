import {
  APIEmbed,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ColorResolvable,
  Colors,
  CommandInteraction,
  EmbedBuilder,
} from "discord.js";

import { NameModel } from "models/Name";
import { clientConfig } from "lib/config/ClientConfig";
import { readdirSync } from "fs";
import { resolve } from "path";

export default class DefaultClientUtilities {
  /**
   * Recursively reads all files from a directory and returns their absolute paths.
   * @param directory - The directory to scan for files.
   * @param extension - The file extension
   * @returns {string[]} An array of absolute paths to the matching files.
   */
  public static readFiles(directory: string, extension: string = ""): string[] {
    const files: string[] = [];
    readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      const entryPath = resolve(directory, entry.name);

      if (entry.isDirectory()) {
        files.push(...this.readFiles(entryPath, extension));
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        files.push(entryPath);
      }
    });

    return files;
  }

  /**
   * Converts a unicode name to an ASCII representation
   * @param name The name to change
   * @returns string
   */
  public static unicodeToAscii(name: string): string {
    const asciiNameNfkd = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    const finalNameNfkd = this.eliminateUnicode(asciiNameNfkd);
    if (finalNameNfkd.length > 2) {
      return finalNameNfkd;
    }
    return "";
  }

  /**
   * Removes any unicode representations within the string
   * @param name The name to change
   * @returns string
   */
  public static eliminateUnicode(name: string): string {
    let finalName = "";
    for (let char = 0; char < name.length; char++) {
      if (name.charCodeAt(char) < 128) {
        finalName += name[char];
      }
    }
    return finalName;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static isColor(value: any): value is ColorResolvable {
    if (value == null || value == undefined) {
      return false;
    }

    if (value in Colors) {
      return true;
    }

    if (typeof value === "string" && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
      return true;
    }

    if (value === "Random") {
      return true;
    }

    if (typeof value === "number") {
      return true;
    }

    if (
      Array.isArray(value) &&
      value.length === 3 &&
      value.every((num) => typeof num === "number")
    ) {
      return true;
    }

    return false;
  }
  /**
   * A function to match strings, based loosely on Levenshtein distance.
   * @param message The original message, left side argument
   * @param phrase The phrase to match it to, right side argument.
   * @see https://en.wikipedia.org/wiki/Levenshtein_distance
   * @returns numeric representation of distance between strings.
   */
  public static fuzzyMatch(message: string, phrase: string): number {
    const msg = message.toLowerCase();
    const phr = phrase.toLowerCase();

    const lenA = msg.length;
    const lenB = phr.length;

    if (lenA === 0) return lenB === 0 ? 100 : 0;
    if (lenB === 0) return 0;

    if (msg.includes(phr)) {
      return (lenB / lenA) * 100;
    }

    const dp = Array.from({ length: lenA + 1 }, () => Array(lenB + 1).fill(0));

    for (let i = 1; i <= lenA; i++) {
      for (let j = 1; j <= lenB; j++) {
        const areSimilar = this.isSimilar(msg[i - 1], phr[j - 1]);

        const cost = msg[i - 1] === phr[j - 1] ? 0 : areSimilar ? 0.5 : 1;

        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }

    const editDistance = dp[lenA][lenB];

    const maxLen = Math.max(lenA, lenB);
    const similarity = ((maxLen - editDistance) / maxLen) * 100;

    return Math.max(0, similarity);
  }
  /**
   * Helper function to check similar string replacements (like 3 -> E)
   * @param a Left side argument
   * @param b Right side argument
   * @returns boolean
   */
  static isSimilar = (a: string, b: string) => {
    const similarPairs = [
      ["rn", "m"],
      ["0", "o"],
      ["1", "l"],
      ["5", "s"],
      ["2", "z"],
      ["ph", "f"],
      ["c", "k"],
      ["v", "w"],
      ["u", "v"],
      ["3", "e"],
      ["4", "a"],
    ];

    return similarPairs.some(
      ([x, y]) => (a === x[0] && b === x[1]) || (a === y[0] && b === y[1]),
    );
  };

  /**
   * Creates a colored embed
   * @param type The type of embed to show
   * @param data The embed content
   * @returns APIEmbed
   */
  static generateEmbed(
    type: "success" | "warning" | "error" | "general",
    data: APIEmbed,
  ) {
    const embed = new EmbedBuilder(data);
    switch (type) {
      case "success":
        embed.setColor(clientConfig.colors.success);
        break;
      case "warning":
        embed.setColor(clientConfig.colors.warning);
        break;
      case "error":
        embed.setColor(clientConfig.colors.error);
        break;
      case "general":
        embed.setColor(clientConfig.colors.primary);
        break;
    }
    return embed;
  }

  /**
   * Retrieve name from DB
   * @param userId the id of the user.
   * @param guildId the id of the guild.
   * @returns Promise\<string\>
   */
  static async getNameFromMemory(userId: string, guildId: string) {
    const response = await NameModel.findOne({
      userId,
      guildId,
    });

    if (!response) return "";

    return response.name;
  }

  /**
   * Push name to DB
   * @param userId the id of the user.
   * @param guildId the id of the guild.
   * @param name the name to add
   * @returns Promise\<void\>
   */
  static async setNameInMemory(userId: string, guildId: string, name: boolean) {
    const filter = {
      userId,
      guildId,
    };

    await NameModel.findOne(filter, { name }, { upsert: true });
  }
  /**
   * Builds button pagination onto an embed.
   * @param interaction The interaction to run this with.
   * @param items Generic type grouping of items to display.
   * @param totalPages  The max amount of pages to show.
   * @param currentPage The starting page.
   * @param itemsPerPage How many items should be displayed per page.
   * @param formatPage A function to show the page format.
   * @returns Promise\<void\>
   */
  static async buildPagination<T>(
    interaction: CommandInteraction,
    items: T[],
    currentPage: number,
    itemsPerPage: number,
    formatPage: (pageItems: T[], index: number) => string,
  ) {
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const createEmb = (page: number) => {
      const embed = new EmbedBuilder()
        .setTitle(`Page ${page + 1} of ${totalPages}`)
        .setColor("Blurple")
        .setDescription(
          formatPage(items.slice(page * itemsPerPage, (page + 1) * itemsPerPage), page) ||
            "No items to display.",
        );
      return embed;
    };

    const createActionRow = () => {
      return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("page_back")
          .setLabel("Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId("page_fwd")
          .setLabel("Next")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === totalPages - 1),
      );
    };

    const initalResponse = await interaction.reply({
      embeds: [createEmb(currentPage)],
      components: [createActionRow()],
      withResponse: true,
    });

    const collector = initalResponse.resource?.message?.createMessageComponentCollector({
      time: 6000000,
      filter: (msg) => msg.user.id == interaction.user.id,
    });

    collector?.on("collect", async (btn: ButtonInteraction) => {
      if (!btn.isButton()) return;

      if (btn.customId === "page_back" && currentPage > 0) {
        currentPage--;
      } else if (btn.customId === "page_fwd" && currentPage < totalPages - 1) {
        currentPage++;
      }

      await btn.update({
        embeds: [createEmb(currentPage)],
        components: [createActionRow()],
      });
    });

    collector?.on("end", async () => {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("page_back")
          .setLabel("Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("page_fwd")
          .setLabel("Next")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
      );

      await interaction.editReply({
        components: [disabledRow],
      });
    });
  }
}
