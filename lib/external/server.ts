import express from "express";
import bodyParser from "body-parser";
import TurndownService from "turndown";
import { ChannelType, ForumChannel, EmbedBuilder, Colors } from "discord.js";
import { DsuClient } from "lib/core/DsuClient.ts";
import { SettingsModel } from "models/Settings.ts";

const TASK_URL_BASE = process.env.TASK_URL_BASE!;
const PORT = process.env.VIKUNJA_PORT || 3000;

const colors: Record<string, number> = {
  "task.created": Colors.Green,
  "task.updated": Colors.Yellow,
  "task.deleted": Colors.Red,
  "task.assigned": Colors.Yellow,
  "task.comment.created": Colors.Green,
  "task.comment.updated": Colors.Yellow,
  "task.comment.deleted": Colors.Red,
  "task.attachment.created": Colors.Green,
  "task.attachment.deleted": Colors.Red,
  "task.relation.created": Colors.Green,
  "task.relation.deleted": Colors.Red,
  default: Colors.Grey,
};



const td = new TurndownService({ bulletListMarker: "-" });

function md(html: string): string {
  if (!html) return "";
  try {
    return td.turndown(html);
  } catch {
    return html;
  }
}

function trunc(text: string, max = 1000): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

function formatUser(u?: { name?: string; username?: string }): string {
  return u?.name || u?.username || "Unknown";
}


function dueTimestamp(iso?: string): string | null {
  if (!iso || iso === "0001-01-01T00:00:00Z") return null;
  return `<t:${Math.floor(new Date(iso).getTime() / 1000)}:D>`;
}

function buildEmbed(payload: any): EmbedBuilder {
  const event = payload.event_name as string;
  const d = payload.data;
  const task = d?.task;
  const doer = d?.doer;
  const color = colors[event];
  const time = payload.time ? new Date(payload.time) : new Date();
  const taskLink = task?.id && TASK_URL_BASE ? `${TASK_URL_BASE}${task.id}` : null;

  switch (event) {
    case "task.created":
    case "task.updated": {
      const created = event === "task.created";
      const embed = new EmbedBuilder()
        .setTitle(`${created ? "Task Created" : "Task Updated"}: ${task.title}`)
        .setURL(taskLink)
        .setDescription(trunc(md(task.description || "")) || "No description")
        .setColor(task.done ? Colors.Green : color)
        .setTimestamp(time)
        .addFields(
          { name: "Status", value: task.done ? "Done" : "Active", inline: true },
          { name: "By", value: formatUser(doer), inline: true },
        );
      const due = dueTimestamp(task.due_date);
      if (due) embed.addFields({ name: "Due", value: due, inline: true });
      if (task.assignees?.length)
        embed.addFields({
          name: "Assignees",
          value: task.assignees.map(formatUser).join(", "),
          inline: false,
        });
      if (task.labels?.length)
        embed.addFields({
          name: "Labels",
          value: task.labels.map((l: any) => l.title).join(", "),
          inline: false,
        });
      if (task.percent_done > 0 && !task.done)
        embed.addFields({
          name: "Progress",
          value: `${task.percent_done}%`,
          inline: true,
        });
      if (task.project?.title)
        embed.setFooter({ text: `Project: ${task.project.title}  ·  #${task.id}` });
      return embed;
    }

    case "task.deleted":
      return new EmbedBuilder()
        .setTitle(`Task Deleted: ${task.title}`)
        .setDescription(`Task #${task.id} has been deleted`)
        .setColor(color)
        .setTimestamp(time)
        .addFields(
          { name: "Deleted By", value: formatUser(doer), inline: true },
          { name: "Project", value: task.project?.title || "Unknown", inline: true },
        );

    case "task.assigned": {
      const embed = new EmbedBuilder()
        .setTitle(`Task Assigned: ${task.title}`)
        .setURL(taskLink)
        .setDescription(`Assigned to **${formatUser(d.assigned_user)}**`)
        .setColor(color)
        .setTimestamp(time)
        .addFields(
          { name: "Assigned By", value: formatUser(doer), inline: true },
        );
      const due = dueTimestamp(task.due_date);
      if (due) embed.addFields({ name: "Due", value: due, inline: true });
      return embed;
    }

    case "task.comment.created": {
      const comment = d.comment;
      return new EmbedBuilder()
        .setTitle(`Comment on: ${task.title}`)
        .setURL(taskLink)
        .setDescription(trunc(md(comment.comment || ""), 2000))
        .setAuthor({
          name: formatUser(comment.author ?? doer),
        })
        .setColor(color)
        .setTimestamp(new Date(Date.now()))
        .setFooter({ text: `Comment ID: ${comment.id}` });
    }

    case "task.comment.updated":
    case "task.comment.deleted": {
      const comment = d.comment;
      const deleted = event === "task.comment.deleted";
      return new EmbedBuilder()
        .setTitle(
          `${deleted ? "Comment Deleted" : "Comment Updated"} on: ${task.title}`,
        )
        .setURL(taskLink)
        .setDescription(trunc(md(comment?.comment || ""), 500) || "")
        .setColor(color)
        .setTimestamp(time)
        .addFields({ name: "By", value: formatUser(doer), inline: true });
    }

    default:
      return new EmbedBuilder()
        .setTitle(`${event.replace(/\./g, " ")}`)
        .setDescription(task?.title || "No details")
        .setColor(colors["default"])
        .setTimestamp(time)
        .addFields({ name: "By", value: formatUser(doer), inline: true });
  }
}

const threadCache = new Map<number, string>();

async function getOrCreateThread(client: DsuClient, guildId: string, project: any): Promise<string> {
  const settings = await SettingsModel.findById(guildId);

  if(!settings) {
    client.logger.error(`Settings configuration not found for: ${guildId}`);
  }

  const vikunjaConfig = settings?.vikunja;

  if(!vikunjaConfig) {
    client.logger.error(`Vikunja configuration not set for: ${guildId}`);
  }
  const cached = threadCache.get(project.id);
  if (cached) {
    try {
      await client.channels.fetch(cached);
      return cached;
    } catch {
      threadCache.delete(project.id);
    }
  }

  const forum = await client.channels.fetch(vikunjaConfig?.forumChannelId!);
  if (!forum || forum.type !== ChannelType.GuildForum)
    throw new Error(`Channel ${vikunjaConfig?.forumChannelId} is not a Forum channel or doesnt exist`);

  const f = forum as ForumChannel;
  const threadName = `Project: ${project.title}`;

  const active = await f.threads.fetchActive();
  const found = active.threads.find((t) => t.name === threadName);
  if (found) {
    threadCache.set(project.id, found.id);
    return found.id;
  }

  const archived = await f.threads.fetchArchived({ limit: 100 });
  const archivedFound = archived.threads.find((t) => t.name === threadName);
  if (archivedFound) {
    threadCache.set(project.id, archivedFound.id);
    return archivedFound.id;
  }

  const newThread = await f.threads.create({
    name: threadName,
    message: {
      embeds: [
        new EmbedBuilder()
          .setTitle(project.title)
          .setDescription(project.description || "No description")
          .setColor(Colors.Green)
          .addFields(
            { name: "Project ID", value: String(project.id), inline: true },
            ...(project.created_by
              ? [
                  {
                    name: "Created By",
                    value: formatUser(project.created_by),
                    inline: true,
                  },
                ]
              : []),
          )
          .setTimestamp(project.created ? new Date(project.created) : new Date())
          .toJSON(),
      ],
    },
  });

  threadCache.set(project.id, newThread.id);
  return newThread.id;
}

export function startServer(client: DsuClient) {

  const app = express();
  app.use(bodyParser.json());

    app.post("/webhook", async (req, res) => {
    const guildId = req.query.guild as string;
    const payload = req.body;

    if (!payload.event_name) return res.status(400).send("Missing event_name");

    const project = payload.data?.project;
    if (!project?.id || !project?.title)
      return res.status(400).send("Missing data.task.project in payload");

    res.status(200).send("OK");

    try {
      const threadId = await getOrCreateThread(client, guildId, project);
      const thread = await client.channels.fetch(threadId);
      if (!thread?.isTextBased() || !thread.isSendable())
        throw new Error("Thread not sendable");

      await thread.send({ embeds: [buildEmbed(payload)] });
    } catch (err) {
      console.error("[Vikunja] Delivery error:", err);
    }
  });

  app.get("/health", (_req, res) =>
    res.json({ status: "ok", timestamp: new Date().toISOString() }),
  );

  app.listen(PORT, () => console.log(`[Vikunja] Listening on :${PORT}`));
}
