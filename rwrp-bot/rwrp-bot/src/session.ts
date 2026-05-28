import { Client, TextChannel } from "discord.js";
import { erlc } from "./erlc";
import { state, updateState } from "./state";
import {
  buildVoteEmbed,
  buildVoteRow,
  buildSessionOpenEmbed,
  buildSessionOpenRow,
  buildSessionClosedEmbed,
  buildSessionClosedRow,
  buildBoosterEmbed,
} from "./embeds";
import { logger } from "./logger";

let sessionUpdateTimer: ReturnType<typeof setInterval> | null = null;
let boosterTimer: ReturnType<typeof setInterval> | null = null;
let scheduledVoteTimer: ReturnType<typeof setTimeout> | null = null;

const BOOSTER_INTERVAL_MS = 15 * 60 * 1000;
const SESSION_UPDATE_MS = 10_000;
const BOOSTER_PLAYER_THRESHOLD = 30;

async function getTextChannel(client: Client, channelId: string): Promise<TextChannel | null> {
  try {
    const ch = await client.channels.fetch(channelId);
    if (ch instanceof TextChannel) return ch;
  } catch (err) {
    logger.warn({ err, channelId }, "Could not fetch channel");
  }
  return null;
}

export async function sendRolePing(client: Client, message: string): Promise<void> {
  if (!state.pingEnabled || !state.sessionChannelId) return;
  const roleText = state.pingRoleId ? `<@&${state.pingRoleId}> ` : "";
  const channel = await getTextChannel(client, state.sessionChannelId);
  if (channel) await channel.send(`${roleText}${message}`).catch(() => {});
}

export async function startVote(
  client: Client,
  channelId: string,
  neededVotes: number,
): Promise<{ ok: boolean; error?: string }> {
  if (state.sessionState === "voting")
    return { ok: false, error: "A vote is already in progress." };
  if (state.sessionState === "open")
    return { ok: false, error: "A session is already open." };

  const channel = await getTextChannel(client, channelId);
  if (!channel) return { ok: false, error: "Could not find that channel." };

  updateState({ sessionState: "voting", sessionChannelId: channelId, neededVotes, voters: [], voteMessageId: null });

  const embed = buildVoteEmbed(state);
  const row = buildVoteRow();
  const msg = await channel.send({ embeds: [embed], components: [row.toJSON()] });

  updateState({ voteMessageId: msg.id, sessionMessageId: msg.id });
  await sendRolePing(client, "🗳️ A session vote has started! Click the button to vote.");
  logger.info({ neededVotes, channelId }, "Session vote started");
  return { ok: true };
}

export async function castVote(
  client: Client,
  userId: string,
): Promise<{ ok: boolean; alreadyVoted?: boolean; opened?: boolean }> {
  if (state.sessionState !== "voting") return { ok: false };
  if (state.voters.includes(userId)) return { ok: true, alreadyVoted: true };

  const newVoters = [...state.voters, userId];
  updateState({ voters: newVoters });
  await refreshVoteMessage(client);

  if (newVoters.length >= state.neededVotes) {
    await openSession(client);
    return { ok: true, opened: true };
  }
  return { ok: true };
}

async function refreshVoteMessage(client: Client): Promise<void> {
  if (!state.voteMessageId || !state.sessionChannelId) return;
  const channel = await getTextChannel(client, state.sessionChannelId);
  if (!channel) return;
  try {
    const msg = await channel.messages.fetch(state.voteMessageId);
    await msg.edit({ embeds: [buildVoteEmbed(state)], components: [buildVoteRow().toJSON()] });
  } catch (err) {
    logger.warn({ err }, "Failed to refresh vote message");
  }
}

export async function openSession(client: Client): Promise<void> {
  updateState({ sessionState: "open" });

  const channelId = state.sessionChannelId;
  if (!channelId) return;
  const channel = await getTextChannel(client, channelId);
  if (!channel) return;

  let serverInfo: Awaited<ReturnType<typeof erlc.getServer>> | null = null;
  let players: Awaited<ReturnType<typeof erlc.getPlayers>> = [];
  try {
    [serverInfo, players] = await Promise.all([erlc.getServer(), erlc.getPlayers()]);
  } catch {
    serverInfo = null;
    players = [];
  }

  const embed = serverInfo ? buildSessionOpenEmbed(serverInfo, players, state) : buildSessionClosedEmbed(state);
  const components = serverInfo ? [buildSessionOpenRow(serverInfo.JoinKey).toJSON()] : [];

  try {
    if (state.sessionMessageId) {
      const msg = await channel.messages.fetch(state.sessionMessageId);
      await msg.edit({ embeds: [embed], components });
    } else {
      const msg = await channel.send({ embeds: [embed], components });
      updateState({ sessionMessageId: msg.id });
    }
  } catch {
    const msg = await channel.send({ embeds: [embed], components });
    updateState({ sessionMessageId: msg.id });
  }

  await sendRolePing(client, "🟢 The session is now **open**! Join the server now.");
  startSessionUpdateLoop(client);
  if (state.autoBoosterEnabled) startBoosterLoop(client);
  logger.info("Session opened");
}

function startSessionUpdateLoop(client: Client): void {
  if (sessionUpdateTimer) clearInterval(sessionUpdateTimer);
  sessionUpdateTimer = setInterval(async () => {
    if (state.sessionState !== "open") {
      clearInterval(sessionUpdateTimer!);
      sessionUpdateTimer = null;
      return;
    }
    await updateSessionMessage(client);
  }, SESSION_UPDATE_MS);
}

async function updateSessionMessage(client: Client): Promise<void> {
  const channelId = state.sessionChannelId;
  const messageId = state.sessionMessageId;
  if (!channelId || !messageId) return;
  const channel = await getTextChannel(client, channelId);
  if (!channel) return;
  let serverInfo, players;
  try {
    [serverInfo, players] = await Promise.all([erlc.getServer(), erlc.getPlayers()]);
  } catch { return; }
  try {
    const msg = await channel.messages.fetch(messageId);
    await msg.edit({
      embeds: [buildSessionOpenEmbed(serverInfo, players, state)],
      components: [buildSessionOpenRow(serverInfo.JoinKey).toJSON()],
    });
  } catch (err) {
    logger.warn({ err }, "Failed to update session message");
  }
}

export async function closeSession(client: Client): Promise<void> {
  if (state.sessionState !== "open" && state.sessionState !== "voting") return;

  const channelId = state.sessionChannelId;
  if (!channelId) return;
  const channel = await getTextChannel(client, channelId);

  await sendRolePing(client, "🔴 The session is **closing** in 5 minutes!");

  try {
    const players = await erlc.getPlayers();
    for (const player of players) {
      await erlc.runCommand(`:pm ${player.Player} RWRP Systems: Server is shutting down in 5 minutes. Please prepare to leave.`).catch(() => {});
      await new Promise((r) => setTimeout(r, 300));
    }
    await erlc.runCommand(":m RWRP Systems: Server is shutting down in 5 minutes!").catch(() => {});
  } catch (err) {
    logger.warn({ err }, "Failed to PM players");
  }

  logger.info("Session close initiated — waiting 5 minutes");
  await new Promise((r) => setTimeout(r, 5 * 60 * 1000));

  try {
    const players = await erlc.getPlayers();
    for (const player of players) {
      await erlc.runCommand(`:kick ${player.Player}`).catch(() => {});
      await new Promise((r) => setTimeout(r, 300));
    }
  } catch (err) {
    logger.warn({ err }, "Failed to kick players");
  }

  stopSessionUpdateLoop();
  stopBoosterLoop();
  updateState({ sessionState: "closed", autoBoosterEnabled: false });

  if (channel && state.sessionMessageId) {
    try {
      const msg = await channel.messages.fetch(state.sessionMessageId);
      await msg.edit({ embeds: [buildSessionClosedEmbed(state)], components: [buildSessionClosedRow().toJSON()] });
    } catch {
      await channel.send({ embeds: [buildSessionClosedEmbed(state)], components: [buildSessionClosedRow().toJSON()] });
    }
  }

  await sendRolePing(client, "🔴 The session has **ended**. Thanks for playing!");
  logger.info("Session closed");
}

export function startBoosterLoop(client: Client): void {
  if (boosterTimer) clearInterval(boosterTimer);
  boosterTimer = setInterval(async () => {
    if (!state.autoBoosterEnabled || state.sessionState !== "open") {
      stopBoosterLoop();
      return;
    }
    try {
      const server = await erlc.getServer();
      if (server.CurrentPlayers < BOOSTER_PLAYER_THRESHOLD) {
        await sendBoosterMessage(client);
      }
    } catch (err) {
      logger.warn({ err }, "Booster check failed");
    }
  }, BOOSTER_INTERVAL_MS);
  logger.info("Auto booster loop started");
}

export function stopBoosterLoop(): void {
  if (boosterTimer) { clearInterval(boosterTimer); boosterTimer = null; }
}

function stopSessionUpdateLoop(): void {
  if (sessionUpdateTimer) { clearInterval(sessionUpdateTimer); sessionUpdateTimer = null; }
}

export async function sendBoosterMessage(client: Client): Promise<void> {
  const targetChannelId = state.boosterChannelId ?? state.sessionChannelId;
  if (!targetChannelId) return;
  const channel = await getTextChannel(client, targetChannelId);
  if (!channel) return;
  let server;
  try { server = await erlc.getServer(); } catch { return; }
  const embed = buildBoosterEmbed(server, state.pingRoleId);
  const content = state.pingEnabled && state.pingRoleId ? `<@&${state.pingRoleId}>` : undefined;
  await channel.send({ content, embeds: [embed] });
  logger.info("Booster message sent");
}

export function scheduleVote(client: Client, delayMs: number, neededVotes: number, channelId: string): void {
  if (scheduledVoteTimer) clearTimeout(scheduledVoteTimer);
  const fireAt = Date.now() + delayMs;
  updateState({ scheduledVoteTime: fireAt, scheduledVoteNeeded: neededVotes, sessionChannelId: channelId });
  scheduledVoteTimer = setTimeout(async () => {
    updateState({ scheduledVoteTime: null });
    await startVote(client, channelId, neededVotes);
  }, delayMs);
  logger.info({ fireAt, neededVotes, channelId }, "Vote scheduled");
}

export function cancelScheduledVote(): void {
  if (scheduledVoteTimer) { clearTimeout(scheduledVoteTimer); scheduledVoteTimer = null; }
  updateState({ scheduledVoteTime: null });
}

export async function resumeSessionIfNeeded(client: Client): Promise<void> {
  if (state.sessionState === "open") {
    logger.info("Resuming open session update loop after restart");
    startSessionUpdateLoop(client);
    if (state.autoBoosterEnabled) startBoosterLoop(client);
  }
  if (state.scheduledVoteTime && state.scheduledVoteTime > Date.now()) {
    const remaining = state.scheduledVoteTime - Date.now();
    const channelId = state.sessionChannelId;
    if (channelId) {
      logger.info({ remainingMs: remaining }, "Resuming scheduled vote");
      scheduleVote(client, remaining, state.scheduledVoteNeeded, channelId);
    }
  }
}
