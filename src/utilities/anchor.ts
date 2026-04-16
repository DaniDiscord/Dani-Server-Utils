import { Message, TextChannel } from "discord.js";

import { AnchorModel } from "models/Anchor";
import { DsuClient } from "lib/core/DsuClient";
import { Times } from "../types/index";

export class AnchorUtility {
  static async handleAnchor(client: DsuClient, message: Message) {
    if (message.author.bot) return;
    if (!message.guild || !message.channel.isTextBased() || message.channel.isDMBased())
      return;

    const anchors = await AnchorModel.find({
      guildId: message.guild.id,
      channelId: message.channel.id,
    });
    if (!anchors || anchors.length === 0) return;

    const now = Date.now();

    for (const anchor of anchors) {
      anchor.messageCount++;

      const timeThresholdMs = anchor.config.timeThreshold || 0;
      const messageThreshold = anchor.config.messageThreshold || 0;

      if (timeThresholdMs === 0 && messageThreshold === 0) {
        await anchor.save();
        continue;
      }

      const lastAnchorTime = anchor.lastAnchorTime ? anchor.lastAnchorTime.getTime() : 0;

      if (timeThresholdMs > 0 && now - lastAnchorTime < timeThresholdMs) {
        await anchor.save();
        continue;
      }

      if (messageThreshold > 0 && anchor.messageCount < messageThreshold) {
        await anchor.save();
        continue;
      }

      try {
        if (anchor.lastAnchorId) {
          try {
            const oldAnchor = await message.channel.messages.fetch(anchor.lastAnchorId);
            if (oldAnchor) await oldAnchor.delete();
          } catch (err) {
            client.logger.error("Failed to delete the old anchor message:", err);
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
        client.logger.error("Error during reanchoring process:", err);
      }
    }
  }

  static async checkAnchorInactivity(client: DsuClient) {
    const now = Date.now();

    const anchors = await AnchorModel.find({
      "config.inactivityThreshold": { $gt: 0 },
    });

    let nextCheckDelay = Times.MINUTE * 2;

    if (!anchors || anchors.length === 0) {
      setTimeout(() => this.checkAnchorInactivity(client), nextCheckDelay);
      return;
    }

    for (const anchor of anchors) {
      try {
        const channel = await client.channels.fetch(anchor.channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) continue;

        const messages = await channel.messages.fetch({ limit: 1 }).catch(() => null);
        if (!messages) continue;

        const latestMessage = messages.first();
        if (!latestMessage) continue;

        if (anchor.lastAnchorId && latestMessage.id === anchor.lastAnchorId) {
          continue;
        }

        const lastMessageTime = latestMessage.createdTimestamp;
        const inactivityThresholdMs = anchor.config.inactivityThreshold;

        const timeUntilInactive = inactivityThresholdMs - (now - lastMessageTime);

        if (timeUntilInactive > 0) {
          if (timeUntilInactive < nextCheckDelay) {
            nextCheckDelay = timeUntilInactive;
          }
          continue;
        }

        if (anchor.lastAnchorId) {
          try {
            const oldAnchor = await channel.messages.fetch(anchor.lastAnchorId);
            if (oldAnchor) await oldAnchor.delete();
          } catch (err) {
            client.logger.error("Error deleting old anchor on inactivity check:", err);
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
        client.logger.error(`Error processing inactivity for anchor ${anchor._id}:`, err);
      }
    }

    setTimeout(() => this.checkAnchorInactivity(client), Math.max(nextCheckDelay, 5000));
  }
}
