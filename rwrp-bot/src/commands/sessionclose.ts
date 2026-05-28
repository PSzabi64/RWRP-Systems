import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { closeSession } from "../session";
import { state } from "../state";

export const data = new SlashCommandBuilder()
  .setName("sessionclose")
  .setDescription("Close the session — PMs all players and kicks them after 5 minutes (Admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (state.sessionState !== "open" && state.sessionState !== "voting") {
    await interaction.reply({ content: "❌ There is no active session or vote to close.", ephemeral: true });
    return;
  }
  await interaction.reply({ content: "⏳ Session close initiated. All players will be PM'd in-game and kicked in **5 minutes**." });
  closeSession(interaction.client).catch(() => {});
}
