import { Message, TextChannel } from "discord.js";
import { DsuClient } from "lib/core/DsuClient";
import { ClientUtilities } from "lib/core/ClientUtilities";
import { AnchorModel } from "models/Anchor";
import { Times } from "../types/index";

export class AnchorUtility extends ClientUtilities {
  constructor(client: DsuClient) {
    super(client);
  }

  async handleAnchor(message: Message) {
    if (message.author.bot) return;
    if (!message.guild || !(message.channel instanceof TextChannel)) return;

    const anchors = await AnchorModel.find({
      guildId: message.guild.id,
      channelId: message.channel.id,
      "config.inactivityThreshold": { $eq: 0 },
    });
    if (!anchors || anchors.length === 0) return;

    const now = Date.now();

    for (const anchor of anchors) {
      anchor.messageCount++;

      const timeThresholdMs = anchor.config.timeThreshold;
      const lastAnchorTime = anchor.lastAnchorTime
        ? anchor.lastAnchorTime.getTime()
        : 0;

      if (now - lastAnchorTime < timeThresholdMs) {
        await anchor.save();
        continue;
      }

      if (anchor.messageCount < anchor.config.messageThreshold) {
        await anchor.save();
        continue;
      }

      try {
        if (anchor.lastAnchorId) {
          try {
            const oldAnchor = await message.channel.messages.fetch(
              anchor.lastAnchorId
            );
            if (oldAnchor) await oldAnchor.delete();
          } catch (err) {
            this.client.logger.error(
              "Failed to delete the old anchor message:",
              err
            );
          }
        }

        let sentMessage;
        if (anchor.embeds && anchor.embeds.length > 0) {
          sentMessage = await message.channel.send({ embeds: anchor.embeds });
        } else if (anchor.content) {
          sentMessage = await message.channel.send(anchor.content);
        } else {
          continue;
        }

        anchor.lastAnchorId = sentMessage.id;
        anchor.lastAnchorTime = new Date();
        anchor.messageCount = 0;
        await anchor.save();
      } catch (err) {
        this.client.logger.error("Error during reanchoring process:", err);
      }
    }
  }

  async checkAnchorInactivity() {
    const now = Date.now();

    const anchors = await AnchorModel.find({
      "config.inactivityThreshold": { $gt: 0 },
    });
    if (!anchors || anchors.length === 0) {
      setTimeout(() => this.checkAnchorInactivity(), Times.MINUTE * 5);
      return;
    }

    for (const anchor of anchors) {
      try {
        const channel = await this.client.channels.fetch(anchor.channelId);
        if (!channel || !(channel instanceof TextChannel)) continue;

        const messages = await channel.messages.fetch({ limit: 1 });
        let lastMessageTime = 0;
        if (messages.size >= anchor.config.messageThreshold) {
          const latestMessage = messages.first();
          if (latestMessage) {
            lastMessageTime = latestMessage.createdTimestamp;
          }
        } else if (anchor.lastAnchorTime) {
          lastMessageTime = anchor.lastAnchorTime.getTime();
        }

        const inactivityThresholdMs = anchor.config.inactivityThreshold;
        if (now - lastMessageTime < inactivityThresholdMs) continue;

        if (anchor.lastAnchorId) {
          try {
            const oldAnchor = await channel.messages.fetch(anchor.lastAnchorId);
            if (oldAnchor) await oldAnchor.delete();
          } catch (err) {
            this.client.logger.error(
              "Error deleting old anchor on inactivity check:",
              err
            );
          }
        }

        let sentMessage;
        if (anchor.embeds && anchor.embeds.length > 0) {
          sentMessage = await channel.send({ embeds: anchor.embeds });
        } else if (anchor.content) {
          sentMessage = await channel.send(anchor.content);
        } else {
          continue;
        }

        anchor.lastAnchorId = sentMessage.id;
        anchor.lastAnchorTime = new Date();
        anchor.messageCount = 0;
        await anchor.save();
      } catch (err) {
        this.client.logger.error(
          `Error processing inactivity for anchor ${anchor._id}:`,
          err
        );
      }
    }

    const nextAnchor = anchors
      .filter((a) => a.config.inactivityThreshold > 0)
      .sort(
        (a, b) => a.config.inactivityThreshold - b.config.inactivityThreshold
      )[0];

    if (nextAnchor) {
      const lastAnchorTime = nextAnchor.lastAnchorTime
        ? nextAnchor.lastAnchorTime.getTime()
        : now;
      const nextCheck =
        nextAnchor.config.inactivityThreshold - (now - lastAnchorTime);
      setTimeout(() => this.checkAnchorInactivity(), nextCheck);
    } else {
      setTimeout(() => this.checkAnchorInactivity(), Times.MINUTE * 5);
    }
  }
}
