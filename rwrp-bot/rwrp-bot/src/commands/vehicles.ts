import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { erlc } from "../erlc";

export const data = new SlashCommandBuilder().setName("vehicles").setDescription("Show all spawned vehicles");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  try {
    const vehicles = await erlc.getVehicles();
    if (vehicles.length === 0) { await interaction.editReply("No vehicles are currently spawned."); return; }
    const lines = vehicles.slice(0, 20).map((v) => `🚗 **${v.Owner}** — \`${v.Model}\`${v.Color ? ` (${v.Color})` : ""}`);
    if (vehicles.length > 20) lines.push(`… and ${vehicles.length - 20} more`);
    const embed = new EmbedBuilder().setTitle(`🚗 Spawned Vehicles (${vehicles.length})`).setDescription(lines.join("\n")).setColor(0x1abc9c).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ Failed to fetch vehicles: ${(err as Error).message}`);
  }
}
