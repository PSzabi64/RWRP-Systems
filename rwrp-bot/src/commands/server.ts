import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { erlc } from "../erlc";

export const data = new SlashCommandBuilder()
  .setName("server")
  .setDescription("Show live ER:LC server status");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  try {
    const info = await erlc.getServer();
    const embed = new EmbedBuilder()
      .setTitle("🚨 RWRP Systems — Server Status")
      .setColor(0x3498db)
      .addFields(
        { name: "Server Name", value: info.Name || "N/A", inline: false },
        { name: "Players", value: `${info.CurrentPlayers} / ${info.MaxPlayers}`, inline: true },
        { name: "Join Key", value: info.JoinKey || "N/A", inline: true },
        { name: "Team Balance", value: info.TeamBalance ? "Enabled" : "Disabled", inline: true },
      )
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ Failed to fetch server status: ${(err as Error).message}`);
  }
}
