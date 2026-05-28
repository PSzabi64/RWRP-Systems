import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, ChannelType } from "discord.js";
import { startVote } from "../session";
import { state } from "../state";

export const data = new SlashCommandBuilder()
  .setName("startvote")
  .setDescription("Start a session vote (Admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addIntegerOption((opt) => opt.setName("needed_votes").setDescription("How many votes are needed to open the session").setRequired(true).setMinValue(1).setMaxValue(100))
  .addChannelOption((opt) => opt.setName("channel").setDescription("Channel to post the vote in").addChannelTypes(ChannelType.GuildText).setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const needed = interaction.options.getInteger("needed_votes", true);
  const channel = interaction.options.getChannel("channel");
  const channelId = channel?.id ?? state.sessionChannelId;
  if (!channelId) { await interaction.editReply("❌ No session channel configured. Use `/setup` to set one, or pass a channel here."); return; }
  const result = await startVote(interaction.client, channelId, needed);
  if (!result.ok) { await interaction.editReply(`❌ ${result.error}`); return; }
  await interaction.editReply(`✅ Session vote started in <#${channelId}>! Needs **${needed}** votes to open.`);
}
