import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { ServerInfo, Player } from "./erlc";
import type { BotState } from "./state";

function progressBar(current: number, needed: number, length = 20): string {
  const filled = Math.round((current / needed) * length);
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

export function buildVoteEmbed(state: BotState): EmbedBuilder {
  const pct = Math.round((state.voters.length / state.neededVotes) * 100);
  const bar = progressBar(state.voters.length, state.neededVotes);
  const embed = new EmbedBuilder()
    .setTitle("🗳️ RWRP Systems — Session Vote")
    .setDescription(
      "A session vote has been started! Click the button below to vote for the server to open.\n\n" +
        "> If you vote, please be ready to join within **10 minutes** of the session starting.\n" +
        "> Please do not vote if you cannot join.",
    )
    .addFields(
      { name: "Votes", value: `**${state.voters.length}** / **${state.neededVotes}**`, inline: true },
      { name: "Progress", value: `${pct}%`, inline: true },
      { name: "\u200b", value: `\`${bar}\``, inline: false },
    )
    .setColor(0xf39c12)
    .setFooter({ text: "RWRP Systems • Session Management" })
    .setTimestamp();
  if (state.bannerUrl) embed.setImage(state.bannerUrl);
  return embed;
}

export function buildSessionOpenEmbed(
  server: ServerInfo,
  players: Player[],
  state: BotState,
): EmbedBuilder {
  const staffCount = players.filter(
    (p) => p.Permission && p.Permission !== "Normal",
  ).length;
  const embed = new EmbedBuilder()
    .setTitle("🟢 RWRP Systems — Session Information")
    .setDescription(
      "Welcome to the RWRP Systems Sessions channel! Here you can view the status of the server, " +
        "current player count, online moderators and more.\n\n" +
        "> Before you join, please review our server guidelines.\n" +
        "> If you voted, please join within **10 minutes** of the session starting.\n" +
        "> Please do not join when the server is experiencing a shutdown.",
    )
    .addFields(
      { name: "Server Name", value: server.Name || "N/A", inline: false },
      { name: "Players", value: `**${server.CurrentPlayers}** / **${server.MaxPlayers}**`, inline: true },
      { name: "Queue", value: `**0**`, inline: true },
      { name: "Staff Online", value: `**${staffCount}**`, inline: true },
      { name: "Join Key", value: `\`${server.JoinKey}\``, inline: true },
      { name: "In-game Status", value: "🟢 **Online**", inline: true },
    )
    .setColor(0x2ecc71)
    .setFooter({ text: "RWRP Systems • Last updated" })
    .setTimestamp();
  if (state.bannerUrl) embed.setImage(state.bannerUrl);
  return embed;
}

export function buildSessionClosedEmbed(state: BotState): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle("🔴 RWRP Systems — Session Closed")
    .setDescription(
      "The server is currently **offline**.\n\n" +
        "> The session has ended. Thank you for playing!\n" +
        "> Check back later for the next session vote.",
    )
    .addFields({ name: "Server Status", value: "🔴 **Offline**", inline: false })
    .setColor(0xe74c3c)
    .setFooter({ text: "RWRP Systems • Session Management" })
    .setTimestamp();
  if (state.bannerUrl) embed.setImage(state.bannerUrl);
  return embed;
}

export function buildBoosterEmbed(server: ServerInfo, roleId: string | null): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("🚀 The server needs more players!")
    .setDescription(
      (roleId ? `<@&${roleId}> ` : "") +
        "The server is **low on players** and needs your help!\n\n" +
        `> **${server.CurrentPlayers}** / **${server.MaxPlayers}** players are online right now.\n` +
        `> Join Key: \`${server.JoinKey}\`\n\n` +
        "Come join us for an awesome session! 🎮",
    )
    .setColor(0xe67e22)
    .setFooter({ text: "RWRP Systems • Auto Booster" })
    .setTimestamp();
}

export function buildVoteRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("session_vote")
      .setLabel("Vote")
      .setEmoji("👍")
      .setStyle(ButtonStyle.Primary),
  );
}

export function buildSessionOpenRow(joinKey: string): ActionRowBuilder<ButtonBuilder> {
  const joinUrl = `https://www.roblox.com/games/2534724415?privateServerLinkCode=${joinKey}`;
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Quick Join")
      .setEmoji("🔗")
      .setStyle(ButtonStyle.Link)
      .setURL(joinUrl),
    new ButtonBuilder()
      .setCustomId("session_ping_subscribe")
      .setLabel("Session Ping")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("session_online_indicator")
      .setLabel("Server Online")
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
  );
}

export function buildSessionClosedRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("session_offline_indicator")
      .setLabel("Server Offline")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true),
  );
}
