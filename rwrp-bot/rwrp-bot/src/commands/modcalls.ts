import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { erlc } from "../erlc";

export const data = new SlashCommandBuilder().setName("modcalls").setDescription("View active/recent mod calls");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  try {
    const calls = await erlc.getModCalls();
    if (calls.length === 0) { await interaction.editReply("No active mod calls."); return; }
    const lines = calls.slice(0, 15).map((m) => `📞 **${m.Caller}**${m.Moderator ? ` → handled by **${m.Moderator}**` : ""} ${m.Timestamp ? `<t:${Math.floor(m.Timestamp / 1000)}:R>` : ""}`);
    const embed = new EmbedBuilder().setTitle(`📞 Mod Calls (${calls.length})`).setDescription(lines.join("\n")).setColor(0xf39c12).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ Failed to fetch mod calls: ${(err as Error).message}`);
  }
}
