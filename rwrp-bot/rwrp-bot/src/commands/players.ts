import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { erlc } from "../erlc";

export const data = new SlashCommandBuilder()
  .setName("players")
  .setDescription("List all in-game players");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  try {
    const players = await erlc.getPlayers();
    if (players.length === 0) { await interaction.editReply("No players are currently in the server."); return; }
    const lines = players.slice(0, 25).map((p) => `**${p.Player}** — Team: \`${p.Team || "None"}\` | Perm: \`${p.Permission || "Normal"}\``);
    if (players.length > 25) lines.push(`… and ${players.length - 25} more players`);
    const embed = new EmbedBuilder().setTitle(`👥 In-Game Players (${players.length})`).setDescription(lines.join("\n")).setColor(0x2ecc71).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ Failed to fetch players: ${(err as Error).message}`);
  }
}
