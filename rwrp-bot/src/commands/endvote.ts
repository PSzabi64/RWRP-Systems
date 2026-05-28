import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, ChannelType } from "discord.js";
import { endVote } from "../session";

export const data = new SlashCommandBuilder()
  .setName("endvote")
  .setDescription("End the current session vote (Admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Channel to post the cancelled embed in (defaults to session channel)")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const channel = interaction.options.getChannel("channel");
  const result = await endVote(interaction.client, channel?.id);
  if (!result.ok) { await interaction.editReply(`❌ ${result.error}`); return; }
  await interaction.editReply("✅ The session vote has been ended.");
}
