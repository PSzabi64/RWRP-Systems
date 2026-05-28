import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { erlc } from "./erlc";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 20_000;

const seenJoinTimestamps = new Set<number>();
const seenKillTimestamps = new Set<number>();

async function getChannel(
  client: Client,
  envKey: string,
): Promise<TextChannel | null> {
  const channelId = process.env[envKey];
  if (!channelId) return null;
  try {
    const ch = await client.channels.fetch(channelId);
    if (ch && ch.isTextBased() && ch instanceof TextChannel) return ch;
  } catch {
    logger.warn({ envKey, channelId }, "Could not fetch channel");
  }
  return null;
}

async function pollJoinLogs(client: Client): Promise<void> {
  const channel = await getChannel(client, "JOIN_LOG_CHANNEL_ID");
  if (!channel) return;
  const logs = await erlc.getJoinLogs();
  const newLogs = logs.filter(
    (l) => l.Timestamp && !seenJoinTimestamps.has(l.Timestamp),
  );
  for (const log of newLogs) {
    seenJoinTimestamps.add(log.Timestamp);
    const icon = log.Join ? "🟢" : "🔴";
    const action = log.Join ? "joined" : "left";
    await channel.send(`${icon} **${log.Player}** ${action} the server`);
  }
}

async function pollKillLogs(client: Client): Promise<void> {
  const channel = await getChannel(client, "KILL_LOG_CHANNEL_ID");
  if (!channel) return;
  const logs = await erlc.getKillLogs();
  const newLogs = logs.filter(
    (l) => l.Timestamp && !seenKillTimestamps.has(l.Timestamp),
  );
  for (const log of newLogs) {
    seenKillTimestamps.add(log.Timestamp);
    const embed = new EmbedBuilder()
      .setDescription(
        `💀 **${log.Killer}** killed **${log.Killed}** with \`${log.Weapon || "Unknown"}\``,
      )
      .setColor(0xe74c3c)
      .setTimestamp(log.Timestamp ? new Date(log.Timestamp) : new Date());
    await channel.send({ embeds: [embed] });
  }
}

export function startPoller(client: Client): void {
  const poll = async () => {
    try {
      await Promise.allSettled([pollJoinLogs(client), pollKillLogs(client)]);
    } catch (err) {
      logger.error({ err }, "Poller error");
    }
  };
  setInterval(poll, POLL_INTERVAL_MS);
  logger.info({ intervalMs: POLL_INTERVAL_MS }, "ERLC log poller started");
}
