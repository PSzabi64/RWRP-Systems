import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { updateState } from "../state";

export const data = new SlashCommandBuilder()
  .setName("setrole")
  .setDescription("Set the role to ping for session events (Admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addRoleOption((opt) => opt.setName("role").setDescription("The role to ping").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const role = interaction.options.getRole("role", true);
  updateState({ pingRoleId: role.id });
  await interaction.editReply(`✅ Session ping role set to <@&${role.id}>. Use \`/sessionping enable\` to activate pings.`);
}
