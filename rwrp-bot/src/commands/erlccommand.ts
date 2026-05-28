import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { erlc } from "../erlc";

export const data = new SlashCommandBuilder()
  .setName("erlccommand")
  .setDescription("Execute an in-game command remotely (Admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((opt) => opt.setName("command").setDescription('The command to run (e.g. ":kick BadUser")').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const command = interaction.options.getString("command", true);
  try {
    await erlc.runCommand(command);
    await interaction.editReply(`✅ Command executed: \`${command}\``);
  } catch (err) {
    await interaction.editReply(`❌ Failed to run command: ${(err as Error).message}`);
  }
}
