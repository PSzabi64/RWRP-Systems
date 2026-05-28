import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, ChannelType } from "discord.js";
import { updateState, state } from "../state";

export const data = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Configure RWRP Systems bot settings (Admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) => sub.setName("channel").setDescription("Set the session info channel")
    .addChannelOption((opt) => opt.setName("session").setDescription("Channel for session votes and status").addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addChannelOption((opt) => opt.setName("booster").setDescription("Channel for booster messages (defaults to session channel)").addChannelTypes(ChannelType.GuildText).setRequired(false)))
  .addSubcommand((sub) => sub.setName("banner").setDescription("Set the banner image URL shown in embeds")
    .addStringOption((opt) => opt.setName("url").setDescription("Direct image URL (https://...)").setRequired(true)))
  .addSubcommand((sub) => sub.setName("status").setDescription("Show current bot configuration"));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const sub = interaction.options.getSubcommand();
  if (sub === "channel") {
    const session = interaction.options.getChannel("session", true);
    const booster = interaction.options.getChannel("booster");
    updateState({ sessionChannelId: session.id, boosterChannelId: booster?.id ?? null });
    await interaction.editReply(`✅ Saved!\nSession channel: <#${session.id}>${booster ? `\nBooster channel: <#${booster.id}>` : "\nBooster channel: same as session"}`);
  } else if (sub === "banner") {
    const url = interaction.options.getString("url", true);
    if (!url.startsWith("https://")) { await interaction.editReply("❌ URL must start with https://"); return; }
    updateState({ bannerUrl: url });
    await interaction.editReply("✅ Banner image set.");
  } else {
    await interaction.editReply([
      "**RWRP Systems — Bot Configuration**",
      `Session Channel: ${state.sessionChannelId ? `<#${state.sessionChannelId}>` : "Not set"}`,
      `Booster Channel: ${state.boosterChannelId ? `<#${state.boosterChannelId}>` : "Same as session"}`,
      `Session State: \`${state.sessionState}\``,
      `Auto Booster: ${state.autoBoosterEnabled ? "✅ Enabled" : "❌ Disabled"}`,
      `Session Ping: ${state.pingEnabled ? "✅ Enabled" : "❌ Disabled"}`,
      `Ping Role: ${state.pingRoleId ? `<@&${state.pingRoleId}>` : "Not set"}`,
      `Banner: ${state.bannerUrl ? "✅ Set" : "❌ Not set"}`,
    ].join("\n"));
  }
}
