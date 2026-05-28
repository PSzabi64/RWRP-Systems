import {
  Client,
  TextChannel,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
} from "discord.js";
import { state, updateState, TicketOption } from "./state";
import { buildTicketPanelEmbed, buildTicketAdminEmbed, buildTicketSelectRow, buildTicketSetupButtons } from "./embeds";
import { logger } from "./logger";

async function getTextChannel(client: Client, channelId: string): Promise<TextChannel | null> {
  try {
    const ch = await client.channels.fetch(channelId);
    if (ch instanceof TextChannel) return ch;
  } catch (err) {
    logger.warn({ err, channelId }, "Could not fetch channel");
  }
  return null;
}

export function buildSetupEmbedModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId("ticket_embed_modal")
    .setTitle("Edit Ticket Panel Embed")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("embed_title")
          .setLabel("Panel Title")
          .setStyle(TextInputStyle.Short)
          .setValue(state.ticketConfig.embedTitle)
          .setRequired(true)
          .setMaxLength(256),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("embed_description")
          .setLabel("Panel Description")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(state.ticketConfig.embedDescription)
          .setRequired(true)
          .setMaxLength(2000),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("embed_banner")
          .setLabel("Banner Image URL (leave blank to remove)")
          .setStyle(TextInputStyle.Short)
          .setValue(state.ticketConfig.bannerUrl ?? "")
          .setRequired(false)
          .setMaxLength(512),
      ),
    );
}

export function buildAddOptionModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId("ticket_option_modal")
    .setTitle("Add Ticket Option")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("option_label")
          .setLabel("Option Label (shown in dropdown)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("option_description")
          .setLabel("Short Description (shown in dropdown)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("option_emoji")
          .setLabel("Emoji (optional, e.g. 🎫)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(10),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("option_question")
          .setLabel("Question to ask the user when selected")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000),
      ),
    );
}

export async function handleSetupEmbedModal(interaction: ModalSubmitInteraction): Promise<void> {
  const title = interaction.fields.getTextInputValue("embed_title");
  const description = interaction.fields.getTextInputValue("embed_description");
  const banner = interaction.fields.getTextInputValue("embed_banner").trim() || null;
  updateState({
    ticketConfig: { ...state.ticketConfig, embedTitle: title, embedDescription: description, bannerUrl: banner },
  });
  const payload = {
    embeds: [buildTicketAdminEmbed(state.ticketConfig)],
    components: [buildTicketSetupButtons().toJSON()],
  };
  if (interaction.isFromMessage()) {
    await interaction.update(payload);
  } else {
    await interaction.reply({ ...payload, ephemeral: true });
  }
}

export async function handleAddOptionModal(interaction: ModalSubmitInteraction): Promise<void> {
  const label = interaction.fields.getTextInputValue("option_label");
  const description = interaction.fields.getTextInputValue("option_description");
  const emoji = interaction.fields.getTextInputValue("option_emoji").trim() || undefined;
  const question = interaction.fields.getTextInputValue("option_question");
  const newOption: TicketOption = { label, description, question, ...(emoji ? { emoji } : {}) };
  updateState({
    ticketConfig: { ...state.ticketConfig, options: [...state.ticketConfig.options, newOption] },
  });
  const payload = {
    embeds: [buildTicketAdminEmbed(state.ticketConfig)],
    components: [buildTicketSetupButtons().toJSON()],
  };
  if (interaction.isFromMessage()) {
    await interaction.update(payload);
  } else {
    await interaction.reply({ ...payload, ephemeral: true });
  }
}

export async function handleSetupRemoveLast(interaction: ButtonInteraction): Promise<void> {
  const options = state.ticketConfig.options.slice(0, -1);
  updateState({ ticketConfig: { ...state.ticketConfig, options } });
  await interaction.update({
    embeds: [buildTicketAdminEmbed(state.ticketConfig)],
    components: [buildTicketSetupButtons().toJSON()],
  });
}

export async function handleSetupDeploy(interaction: ButtonInteraction, client: Client): Promise<void> {
  const config = state.ticketConfig;
  if (!config.panelChannelId) {
    await interaction.reply({ content: "❌ No panel channel set. Run `/ticketsetup` again with a channel.", ephemeral: true });
    return;
  }
  if (config.options.length === 0) {
    await interaction.reply({ content: "❌ Add at least one option before deploying.", ephemeral: true });
    return;
  }
  await interaction.deferUpdate();
  const result = await deployTicketPanel(client);
  if (!result.ok) {
    await interaction.followUp({ content: `❌ ${result.error}`, ephemeral: true });
    return;
  }
  await interaction.editReply({
    content: `✅ Ticket panel deployed to <#${config.panelChannelId}>!`,
    embeds: [buildTicketAdminEmbed(state.ticketConfig)],
    components: [buildTicketSetupButtons().toJSON()],
  });
}

export async function deployTicketPanel(client: Client): Promise<{ ok: boolean; error?: string }> {
  const config = state.ticketConfig;
  if (!config.panelChannelId) return { ok: false, error: "No panel channel configured." };
  if (config.options.length === 0) return { ok: false, error: "No ticket options configured." };

  const channel = await getTextChannel(client, config.panelChannelId);
  if (!channel) return { ok: false, error: "Could not find the panel channel." };

  const embed = buildTicketPanelEmbed(config);
  const selectRow = buildTicketSelectRow(config.options).toJSON();

  try {
    if (config.panelMessageId) {
      const existing = await channel.messages.fetch(config.panelMessageId).catch(() => null);
      if (existing) {
        await existing.edit({ embeds: [embed], components: [selectRow] });
        return { ok: true };
      }
    }
    const msg = await channel.send({ embeds: [embed], components: [selectRow] });
    updateState({ ticketConfig: { ...state.ticketConfig, panelMessageId: msg.id } });
    return { ok: true };
  } catch (err) {
    logger.error({ err }, "Failed to deploy ticket panel");
    return { ok: false, error: "Failed to post the panel." };
  }
}

export async function handleTicketSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const optionIndex = parseInt(interaction.values[0] ?? "0", 10);
  const option = state.ticketConfig.options[optionIndex];
  if (!option) {
    await interaction.reply({ content: "❌ Invalid option. Please try again.", ephemeral: true });
    return;
  }
  const labelTruncated = option.question.length > 45 ? option.question.slice(0, 42) + "..." : option.question;
  const modal = new ModalBuilder()
    .setCustomId(`ticket_question_${optionIndex}`)
    .setTitle(option.label.slice(0, 45))
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("ticket_answer")
          .setLabel(labelTruncated)
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000),
      ),
    );
  await interaction.showModal(modal);
}

export async function handleTicketQuestion(
  interaction: ModalSubmitInteraction,
  client: Client,
  optionIndex: number,
): Promise<void> {
  const config = state.ticketConfig;
  const option = config.options[optionIndex];
  if (!option) {
    await interaction.reply({ content: "❌ Invalid ticket option.", ephemeral: true });
    return;
  }

  const answer = interaction.fields.getTextInputValue("ticket_answer");
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ This can only be used in a server.");
    return;
  }

  const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "user";
  const ticketName = `ticket-${safeName}`;

  try {
    const permissionOverwrites: any[] = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
    ];
    if (config.supportRoleId) {
      permissionOverwrites.push({
        id: config.supportRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
        ],
      });
    }

    const channelOptions: any = { name: ticketName, type: ChannelType.GuildText, permissionOverwrites };
    if (config.ticketCategoryId) channelOptions.parent = config.ticketCategoryId;

    const ticketChannel = (await guild.channels.create(channelOptions)) as TextChannel;

    const ticketEmbed = new EmbedBuilder()
      .setTitle(`${option.emoji ? option.emoji + " " : "🎫 "}${option.label}`)
      .setDescription(`**${option.question}**\n\n${answer}`)
      .addFields({ name: "Opened by", value: `<@${interaction.user.id}>`, inline: true })
      .setColor(0xe74c3c)
      .setFooter({ text: "RWRP Systems • Support" })
      .setTimestamp();

    const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_close")
        .setLabel("Close Ticket")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger),
    );

    const pingContent = config.supportRoleId ? `<@&${config.supportRoleId}> ` : "";
    await ticketChannel.send({
      content: `${pingContent}<@${interaction.user.id}>`,
      embeds: [ticketEmbed],
      components: [closeRow.toJSON()],
    });

    await interaction.editReply(`✅ Your ticket has been created: <#${ticketChannel.id}>`);
    logger.info({ option: option.label, user: interaction.user.id }, "Ticket created");
  } catch (err) {
    logger.error({ err }, "Failed to create ticket channel");
    await interaction.editReply("❌ Failed to create your ticket. Please contact an admin.");
  }
}

export async function handleTicketClose(interaction: ButtonInteraction): Promise<void> {
  const channel = interaction.channel;
  if (!channel || !(channel instanceof TextChannel) || !channel.name.startsWith("ticket-")) {
    await interaction.reply({ content: "❌ This can only be used inside a ticket channel.", ephemeral: true });
    return;
  }
  await interaction.reply({ content: "🔒 Ticket is being closed..." });
  await new Promise((r) => setTimeout(r, 3000));
  await channel.delete("Ticket closed by staff").catch(() => {});
}
