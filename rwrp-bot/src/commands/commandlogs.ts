import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { erlc } from "../erlc";

export const data = new SlashCommandBuilder().setName("commandlogs").setDescription("Show recently executed in-game commands");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  try {
    const logs = await erlc.getCommandLogs();
    if (logs.length === 0) { await interaction.editReply("No command logs found."); return; }
    const lines = logs.slice(0, 15).map((c) => `⌨️ **${c.Player}**: \`${c.Command}\` ${c.Timestamp ? `<t:${Math.floor(c.Timestamp / 1000)}:R>` : ""}`);
    const embed = new EmbedBuilder().setTitle("⌨️ Recent Command Logs").setDescription(lines.join("\n")).setColor(0x2980b9).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ Failed to fetch command logs: ${(err as Error).message}`);
  }
}
