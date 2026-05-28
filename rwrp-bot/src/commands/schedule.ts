import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, ChannelType } from "discord.js";
import { scheduleVote, cancelScheduledVote } from "../session";
import { state } from "../state";

export const data = new SlashCommandBuilder()
  .setName("schedule")
  .setDescription("Schedule a session vote (Admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) => sub.setName("set").setDescription("Schedule a vote to start in X minutes")
    .addIntegerOption((opt) => opt.setName("delay_minutes").setDescription("Minutes from now to start the vote").setRequired(true).setMinValue(1).setMaxValue(1440))
    .addIntegerOption((opt) => opt.setName("needed_votes").setDescription("Votes needed to open the session").setRequired(true).setMinValue(1).setMaxValue(100))
    .addChannelOption((opt) => opt.setName("channel").setDescription("Channel for the vote").addChannelTypes(ChannelType.GuildText).setRequired(false)))
  .addSubcommand((sub) => sub.setName("cancel").setDescription("Cancel the scheduled vote"))
  .addSubcommand((sub) => sub.setName("status").setDescription("Check the current scheduled vote"));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const sub = interaction.options.getSubcommand();
  if (sub === "set") {
    const delayMinutes = interaction.options.getInteger("delay_minutes", true);
    const neededVotes = interaction.options.getInteger("needed_votes", true);
    const channel = interaction.options.getChannel("channel");
    const channelId = channel?.id ?? state.sessionChannelId;
    if (!channelId) { await interaction.editReply("❌ No session channel configured."); return; }
    const delayMs = delayMinutes * 60 * 1000;
    scheduleVote(interaction.client, delayMs, neededVotes, channelId);
    const ts = Math.floor((Date.now() + delayMs) / 1000);
    await interaction.editReply(`✅ Vote scheduled for <t:${ts}:F> (<t:${ts}:R>) in <#${channelId}> needing **${neededVotes}** votes.`);
  } else if (sub === "cancel") {
    if (!state.scheduledVoteTime) { await interaction.editReply("❌ No vote is currently scheduled."); return; }
    cancelScheduledVote();
    await interaction.editReply("✅ Scheduled vote cancelled.");
  } else {
    if (!state.scheduledVoteTime) { await interaction.editReply("No vote is currently scheduled."); return; }
    const ts = Math.floor(state.scheduledVoteTime / 1000);
    await interaction.editReply(`**Scheduled Vote**\nStarts: <t:${ts}:F> (<t:${ts}:R>)\nNeeded: **${state.scheduledVoteNeeded}** votes\nChannel: ${state.sessionChannelId ? `<#${state.sessionChannelId}>` : "Not set"}`);
  }
}
