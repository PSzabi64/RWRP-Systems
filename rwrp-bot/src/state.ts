import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const STATE_FILE = join(process.cwd(), "bot-state.json");

export interface BotState {
  sessionChannelId: string | null;
  boosterChannelId: string | null;
  sessionState: "idle" | "voting" | "open" | "closed";
  voteMessageId: string | null;
  neededVotes: number;
  voters: string[];
  sessionMessageId: string | null;
  autoBoosterEnabled: boolean;
  pingEnabled: boolean;
  pingRoleId: string | null;
  scheduledVoteTime: number | null;
  scheduledVoteNeeded: number;
  pingSubscribers: string[];
  bannerUrl: string | null;
}

const DEFAULT_STATE: BotState = {
  sessionChannelId: null,
  boosterChannelId: null,
  sessionState: "idle",
  voteMessageId: null,
  neededVotes: 15,
  voters: [],
  sessionMessageId: null,
  autoBoosterEnabled: false,
  pingEnabled: false,
  pingRoleId: null,
  scheduledVoteTime: null,
  scheduledVoteNeeded: 15,
  pingSubscribers: [],
  bannerUrl: null,
};

export let state: BotState = DEFAULT_STATE;

export function loadState(): BotState {
  if (!existsSync(STATE_FILE)) return { ...DEFAULT_STATE };
  try {
    const parsed = JSON.parse(readFileSync(STATE_FILE, "utf-8")) as Partial<BotState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function updateState(updates: Partial<BotState>): void {
  state = { ...state, ...updates };
  saveState();
}

state = loadState();
