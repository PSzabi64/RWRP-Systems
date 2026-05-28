import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, ChannelType } from "discord.js";
import { startBoosterLoop, stopBoosterLoop, sendBoosterMessage } from "../session";
import { state, updateState } from "../state";

export const data = new SlashCommandBuilder()
  .setName("autoboostermsg")
  .setDescription("Control the auto booster message feature (Admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) => sub.setName("enable").setDescription("Enable auto booster messages").addChannelOption((opt) => opt.setName("channel").setDescription("Channel for booster messages").addChannelTypes(ChannelType.GuildText).setRequired(false)))
  .addSubcommand((sub) => sub.setName("disable").setDescription("Disable auto booster messages"))
  .addSubcommand((sub) => sub.setName("send").setDescription("Manually send a booster message now"));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const sub = interaction.options.getSubcommand();
  if (sub === "enable") {
    const channel = interaction.options.getChannel("channel");
    const channelId = channel?.id ?? state.boosterChannelId ?? state.sessionChannelId;
    if (!channelId) { await interaction.editReply("❌ No channel configured. Pass a channel or use `/setup` first."); return; }
    updateState({ autoBoosterEnabled: true, boosterChannelId: channelId });
    if (state.sessionState === "open") startBoosterLoop(interaction.client);
    await interaction.editReply(`✅ Auto booster enabled in <#${channelId}>. Checks every 15 minutes when players drop below 30.`);
  } else if (sub === "disable") {
    updateState({ autoBoosterEnabled: false });
    stopBoosterLoop();
    await interaction.editReply("✅ Auto booster messages disabled.");
  } else {
    if (!state.boosterChannelId && !state.sessionChannelId) { await interaction.editReply("❌ No channel configured."); return; }
    await sendBoosterMessage(interaction.client);
    await interaction.editReply("✅ Booster message sent!");
  }
}
