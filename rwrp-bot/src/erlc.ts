import { logger } from "./logger";

const ERLC_BASE = "https://api.erlc.gg/v2";

function getHeaders(): Record<string, string> {
  const serverKey = process.env["ERLC_SERVER_KEY"];
  if (!serverKey) throw new Error("ERLC_SERVER_KEY is not set");
  return { "Server-Key": serverKey };
}

async function erlcGet<T>(path: string): Promise<T> {
  const res = await fetch(`${ERLC_BASE}${path}`, { headers: getHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ERLC API error ${res.status} on ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

async function erlcPost(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${ERLC_BASE}${path}`, {
    method: "POST",
    headers: { ...getHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ERLC API error ${res.status} on POST ${path}: ${text}`);
  }
}

export interface ServerInfo {
  Name: string;
  OwnerId: number;
  CoOwnerIds: number[];
  CurrentPlayers: number;
  MaxPlayers: number;
  JoinKey: string;
  AccVerifiedReq: string;
  TeamBalance: boolean;
}

export interface Player {
  Player: string;
  Permission: string;
  Team: string;
  Callsign?: string;
}

export interface JoinLog {
  Join: boolean;
  Player: string;
  Timestamp: number;
}

export interface KillLog {
  Killed: string;
  Killer: string;
  Weapon: string;
  Timestamp: number;
}

export interface ModCall {
  Caller: string;
  Moderator: string;
  Timestamp: number;
}

export interface CommandLog {
  Player: string;
  Command: string;
  Timestamp: number;
}

export interface Ban {
  UserID: number;
  Username: string;
}

export interface Vehicle {
  Owner: string;
  Model: string;
  Color?: string;
  Texture?: string;
}

export const erlc = {
  getServer: () => erlcGet<ServerInfo>("/server"),
  getPlayers: () => erlcGet<Player[]>("/server/players"),
  getJoinLogs: () => erlcGet<JoinLog[]>("/server/joinlogs"),
  getKillLogs: () => erlcGet<KillLog[]>("/server/killlogs"),
  getModCalls: () => erlcGet<ModCall[]>("/server/modcalls"),
  getCommandLogs: () => erlcGet<CommandLog[]>("/server/commandlogs"),
  getBans: () => erlcGet<Ban[]>("/server/bans"),
  getVehicles: () => erlcGet<Vehicle[]>("/server/vehicles"),
  runCommand: (command: string) => erlcPost("/server/command", { command }),
};

export { logger };
