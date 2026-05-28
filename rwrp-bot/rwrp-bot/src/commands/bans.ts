import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { erlc } from "../erlc";

export const data = new SlashCommandBuilder().setName("bans").setDescription("Show the server ban list");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  try {
    const bans = await erlc.getBans();
    if (bans.length === 0) { await interaction.editReply("No players are currently banned."); return; }
    const lines = bans.slice(0, 20).map((b) => `🔨 **${b.Username}** (ID: \`${b.UserID}\`)`);
    if (bans.length > 20) lines.push(`… and ${bans.length - 20} more`);
    const embed = new EmbedBuilder().setTitle(`🔨 Server Bans (${bans.length})`).setDescription(lines.join("\n")).setColor(0xc0392b).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ Failed to fetch bans: ${(err as Error).message}`);
  }
}
