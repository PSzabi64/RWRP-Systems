import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, ChannelType } from "discord.js";
import { state, updateState } from "../state";
import { buildTicketAdminEmbed, buildTicketSetupButtons } from "../embeds";

export const data = new SlashCommandBuilder()
  .setName("ticketsetup")
  .setDescription("Set up the ticket panel (Admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Channel to post the ticket panel in")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true),
  )
  .addChannelOption((opt) =>
    opt
      .setName("category")
      .setDescription("Category where ticket channels will be created")
      .addChannelTypes(ChannelType.GuildCategory)
      .setRequired(false),
  )
  .addRoleOption((opt) =>
    opt
      .setName("support_role")
      .setDescription("Role that can view and manage tickets")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const channel = interaction.options.getChannel("channel", true);
  const category = interaction.options.getChannel("category");
  const supportRole = interaction.options.getRole("support_role");

  updateState({
    ticketConfig: {
      ...state.ticketConfig,
      panelChannelId: channel.id,
      ticketCategoryId: category?.id ?? state.ticketConfig.ticketCategoryId,
      supportRoleId: supportRole?.id ?? state.ticketConfig.supportRoleId,
    },
  });

  await interaction.reply({
    embeds: [buildTicketAdminEmbed(state.ticketConfig)],
    components: [buildTicketSetupButtons().toJSON()],
    ephemeral: true,
  });
}
