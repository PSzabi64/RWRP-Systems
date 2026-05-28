import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { erlc } from "../erlc";

export const data = new SlashCommandBuilder().setName("joinlogs").setDescription("Show recent player join/leave logs");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  try {
    const logs = await erlc.getJoinLogs();
    if (logs.length === 0) { await interaction.editReply("No join/leave logs found."); return; }
    const lines = logs.slice(0, 15).map((l) => `${l.Join ? "🟢" : "🔴"} **${l.Player}** ${l.Join ? "joined" : "left"} ${l.Timestamp ? `<t:${Math.floor(l.Timestamp / 1000)}:R>` : ""}`);
    const embed = new EmbedBuilder().setTitle("📋 Recent Join/Leave Logs").setDescription(lines.join("\n")).setColor(0x9b59b6).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ Failed to fetch join logs: ${(err as Error).message}`);
  }
}
