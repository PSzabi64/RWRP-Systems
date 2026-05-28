import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { updateState, state } from "../state";

export const data = new SlashCommandBuilder()
  .setName("sessionping")
  .setDescription("Enable or disable role pings for session events (Admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) => sub.setName("enable").setDescription("Enable session role pings"))
  .addSubcommand((sub) => sub.setName("disable").setDescription("Disable session role pings"))
  .addSubcommand((sub) => sub.setName("status").setDescription("Check current session ping status"));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const sub = interaction.options.getSubcommand();
  if (sub === "enable") {
    if (!state.pingRoleId) { await interaction.editReply("❌ No ping role set. Use `/setrole` first."); return; }
    updateState({ pingEnabled: true });
    await interaction.editReply(`✅ Session pings enabled. <@&${state.pingRoleId}> will be pinged on session events.`);
  } else if (sub === "disable") {
    updateState({ pingEnabled: false });
    await interaction.editReply("✅ Session pings disabled.");
  } else {
    await interaction.editReply(`**Session Ping Status**\nState: ${state.pingEnabled ? "✅ Enabled" : "❌ Disabled"}\nRole: ${state.pingRoleId ? `<@&${state.pingRoleId}>` : "Not set"}`);
  }
}
