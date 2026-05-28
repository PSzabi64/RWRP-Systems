import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { erlc } from "../erlc";

export const data = new SlashCommandBuilder().setName("killlogs").setDescription("Show recent kill logs");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  try {
    const logs = await erlc.getKillLogs();
    if (logs.length === 0) { await interaction.editReply("No kill logs found."); return; }
    const lines = logs.slice(0, 15).map((k) => `💀 **${k.Killer}** killed **${k.Killed}** with \`${k.Weapon || "Unknown"}\` ${k.Timestamp ? `<t:${Math.floor(k.Timestamp / 1000)}:R>` : ""}`);
    const embed = new EmbedBuilder().setTitle("💀 Recent Kill Logs").setDescription(lines.join("\n")).setColor(0xe74c3c).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ Failed to fetch kill logs: ${(err as Error).message}`);
  }
}
