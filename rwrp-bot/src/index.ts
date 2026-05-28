import {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  ButtonInteraction,
} from "discord.js";
import { logger } from "./logger";
import { startPoller } from "./poller";
import { castVote, resumeSessionIfNeeded } from "./session";
import { state, updateState } from "./state";

import * as serverCmd from "./commands/server";
import * as playersCmd from "./commands/players";
import * as killlogsCmd from "./commands/killlogs";
import * as joinlogsCmd from "./commands/joinlogs";
import * as modcallsCmd from "./commands/modcalls";
import * as bansCmd from "./commands/bans";
import * as vehiclesCmd from "./commands/vehicles";
import * as commandlogsCmd from "./commands/commandlogs";
import * as erlccommandCmd from "./commands/erlccommand";
import * as startvoteCmd from "./commands/startvote";
import * as autoboostermsgCmd from "./commands/autoboostermsg";
import * as sessioncloseCmd from "./commands/sessionclose";
import * as sessionpingCmd from "./commands/sessionping";
import * as setroleCmd from "./commands/setrole";
import * as scheduleCmd from "./commands/schedule";
import * as setupCmd from "./commands/setup";

type AnySlashBuilder =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

interface Command {
  data: AnySlashBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commands: Command[] = [
  serverCmd,
  playersCmd,
  killlogsCmd,
  joinlogsCmd,
  modcallsCmd,
  bansCmd,
  vehiclesCmd,
  commandlogsCmd,
  erlccommandCmd,
  startvoteCmd,
  autoboostermsgCmd,
  sessioncloseCmd,
  sessionpingCmd,
  setroleCmd,
  scheduleCmd,
  setupCmd,
];

async function handleVoteButton(
  interaction: ButtonInteraction,
  client: Client,
): Promise<void> {
  if (state.sessionState !== "voting") {
    await interaction.reply({ content: "❌ There is no active vote right now.", ephemeral: true });
    return;
  }
  const result = await castVote(client, interaction.user.id);
  if (!result.ok) {
    await interaction.reply({ content: "❌ Could not register your vote.", ephemeral: true });
    return;
  }
  if (result.alreadyVoted) {
    await interaction.reply({ content: "❌ You have already voted!", ephemeral: true });
    return;
  }
  if (result.opened) {
    await interaction.reply({ content: "✅ Your vote pushed us over the threshold! The session is now **opening**! 🟢", ephemeral: true });
  } else {
    const remaining = state.neededVotes - state.voters.length;
    await interaction.reply({ content: `✅ Vote registered! **${remaining}** more vote${remaining === 1 ? "" : "s"} needed.`, ephemeral: true });
  }
}

async function handlePingSubscribe(interaction: ButtonInteraction): Promise<void> {
  const userId = interaction.user.id;
  const subs = state.pingSubscribers ?? [];
  const alreadySubbed = subs.includes(userId);
  if (alreadySubbed) {
    updateState({ pingSubscribers: subs.filter((id) => id !== userId) });
    await interaction.reply({ content: "🔕 You've unsubscribed from session pings.", ephemeral: true });
  } else {
    updateState({ pingSubscribers: [...subs, userId] });
    await interaction.reply({ content: "🔔 You've subscribed to session pings!", ephemeral: true });
  }
}

async function main(): Promise<void> {
  const token = process.env["DISCORD_TOKEN"];
  if (!token) {
    logger.error("DISCORD_TOKEN is not set. Exiting.");
    process.exit(1);
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  const commandMap = new Collection<string, (i: ChatInputCommandInteraction) => Promise<void>>();

  for (const cmd of commands) {
    commandMap.set(cmd.data.name, cmd.execute);
  }

  client.once("clientReady", async (c) => {
    logger.info({ tag: c.user.tag }, "RWRP Systems bot online");
    const rest = new REST().setToken(token);
    try {
      const body = commands.map((cmd) => cmd.data.toJSON());
      await rest.put(Routes.applicationCommands(c.user.id), { body });
      logger.info(`Registered ${commands.length} slash commands`);
    } catch (err) {
      logger.error({ err }, "Failed to register slash commands");
    }
    startPoller(client);
    await resumeSessionIfNeeded(client);
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const handler = commandMap.get(interaction.commandName);
      if (!handler) return;
      try {
        await handler(interaction);
      } catch (err) {
        logger.error({ err, command: interaction.commandName }, "Command error");
        const msg = "❌ An error occurred while executing this command.";
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(msg).catch(() => {});
        } else {
          await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
        }
      }
    } else if (interaction.isButton()) {
      try {
        if (interaction.customId === "session_vote") {
          await handleVoteButton(interaction, client);
        } else if (interaction.customId === "session_ping_subscribe") {
          await handlePingSubscribe(interaction);
        }
      } catch (err) {
        logger.error({ err }, "Button interaction error");
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "❌ Something went wrong.", ephemeral: true }).catch(() => {});
        }
      }
    }
  });

  await client.login(token);
}

main().catch((err) => {
  logger.error({ err }, "Fatal error");
  process.exit(1);
});
