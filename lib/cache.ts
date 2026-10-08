// Shared Redis cache for the read functions in lib/db.ts (cache-aside). CLAUDE.md section 4.
//
//   cached(name, args, load): look in Redis first; on a miss, run `load` (PostgreSQL), return its
//   result and save it in Redis for CACHE_TTL_SECONDS (15 minutes).
//   bumpCacheVersion(): called whenever jobs or category pages change (Payload hooks, the sync job,
//   the load script). Every key contains the current version, so a new version means every old
//   entry is never read again (it simply expires).
//
// Keys: fc:<SCHEMA>:<version>:<function name>:<arguments as JSON>; the version lives in fc:ver.
// Settings: REDIS_URL (redis:// or rediss:// for TLS, password inside; empty = cache off),
// REDIS_CA_CERT (optional PEM certificate for clouds whose TLS uses their own CA),
// CACHE_TTL_SECONDS (optional, default 900).
//
// Fail-open: if Redis is missing, down or slow, log a warning and read PostgreSQL directly.
// The site must never break because of Redis.

import { randomUUID } from "node:crypto";
import { createClient } from "@redis/client";
import { cache as perRequest } from "react";

const PREFIX = "fc:";
const VERSION_KEY = `${PREFIX}ver`;
// Raise this when a lib/db.ts function changes its return shape, so a new deploy never reads
// entries written by the old code.
const SCHEMA = 1;
const TTL_SECONDS = positiveInt(process.env.CACHE_TTL_SECONDS, 900);
const OP_TIMEOUT_MS = 250; // longest we wait for one Redis command
const CONNECT_TIMEOUT_MS = 1000;
const PAUSE_MS = 30_000; // after a failure, skip Redis for this long (no waiting on a dead Redis)
const SECOND_BUMP_MS = 3000; // see bumpCacheVersionTwice()

function positiveInt(value: string | undefined, fallback: number): number {
	const n = Number.parseInt(String(value ?? ""), 10);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

function newClient(url: string) {
	return createClient({
		url,
		disableOfflineQueue: true, // fail at once while disconnected instead of queueing
		socket: {
			connectTimeout: CONNECT_TIMEOUT_MS,
			reconnectStrategy: (retries) => Math.min(1000 * 2 ** retries, 30_000),
			...(process.env.REDIS_CA_CERT ? { ca: process.env.REDIS_CA_CERT.replace(/\\n/g, "\n") } : {}),
		},
	});
}

type Client = ReturnType<typeof newClient>;
type State = { client: Client | null; connecting: Promise<void> | null; pausedUntil: number; everReady: boolean };

// One client per process (kept on globalThis so every bundle and dev reloads share it).
const g = globalThis as typeof globalThis & { __fcCache?: State };
const state: State = (g.__fcCache ??= { client: null, connecting: null, pausedUntil: 0, everReady: false });

function warn(message: string, err?: unknown) {
	const detail = err instanceof Error ? `: ${err.message}` : "";
	console.warn(`[cache] ${message}${detail}`);
}

// Stop using Redis for PAUSE_MS (one warning per pause).
function pause(message: string, err?: unknown) {
	if (Date.now() >= state.pausedUntil) warn(`${message}, reading PostgreSQL directly for ${PAUSE_MS / 1000}s`, err);
	state.pausedUntil = Date.now() + PAUSE_MS;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	let timer: ReturnType<typeof setTimeout>;
	return Promise.race([
		promise,
		new Promise<never>((_, reject) => {
			timer = setTimeout(() => reject(new Error(`Redis did not answer within ${ms} ms`)), ms);
		}),
	]).finally(() => clearTimeout(timer));
}

// The connected client, or null (cache off, connecting, or Redis unavailable). Never throws.
async function redis(): Promise<Client | null> {
	const url = process.env.REDIS_URL;
	if (!url) return null;
	if (!state.client) {
		try {
			const client = newClient(url);
			// Without an "error" listener, a lost connection would crash the process.
			client.on("error", (err) => pause("Redis unavailable", err));
			client.on("ready", () => {
				// After an outage, a change made meanwhile may not have reached Redis: start a new version.
				if (state.everReady) void bumpCacheVersion();
				state.everReady = true;
			});
			state.client = client;
			state.connecting = client.connect().then(
				() => undefined,
				(err) => pause("Could not connect to Redis", err),
			);
		} catch (err) {
			pause("Invalid Redis settings", err);
			return null;
		}
	}
	if (state.connecting) await withTimeout(state.connecting, CONNECT_TIMEOUT_MS).catch(() => undefined);
	return state.client?.isReady ? state.client : null;
}

// Run one Redis command with a timeout; null on any problem (and Redis is paused).
async function attempt<T>(run: (client: Client) => Promise<T>, ignorePause = false): Promise<T | null> {
	if (!process.env.REDIS_URL) return null;
	if (!ignorePause && Date.now() < state.pausedUntil) return null;
	try {
		const client = await redis();
		if (!client) {
			if (Date.now() >= state.pausedUntil) pause("Redis not connected");
			return null;
		}
		return await withTimeout(run(client), OP_TIMEOUT_MS);
	} catch (err) {
		pause("Redis error", err);
		return null;
	}
}

// The current cache version, read once per page request. null = don't use the cache this time.
const currentVersion = perRequest(async (): Promise<string | null> => {
	const version = await attempt((c) => c.get(VERSION_KEY));
	if (version !== null) return version;
	// No version yet (new or restarted Redis): create one, unless another server just did.
	return attempt(async (c) => {
		await c.set(VERSION_KEY, randomUUID(), { condition: "NX" });
		return c.get(VERSION_KEY);
	});
});

// JSON with object keys sorted, so { a, b } and { b, a } give the same cache key.
function stableJson(value: unknown): string {
	return JSON.stringify(value, (_key, v) =>
		v && typeof v === "object" && !Array.isArray(v)
			? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
			: v,
	);
}

// Cache-aside around one read. `name` + `args` must identify the result exactly.
export async function cached<T>(name: string, args: unknown[], load: () => Promise<T>): Promise<T> {
	const version = await currentVersion();
	if (version === null) return load();
	const key = `${PREFIX}${SCHEMA}:${version}:${name}:${stableJson(args)}`;

	const hit = await attempt((c) => c.get(key));
	if (hit !== null) {
		try {
			return JSON.parse(hit) as T;
		} catch {
			// Unreadable entry: fall through and replace it.
		}
	}

	const value = await load();
	// Save in the background: the page never waits for it, and errors are ignored.
	void attempt((c) => c.set(key, JSON.stringify(value) ?? "null", { expiration: { type: "EX", value: TTL_SECONDS } }));
	return value;
}

// Start a new cache version: every cached read is fetched fresh from PostgreSQL again.
// Never throws; tries even while Redis is paused (a missed bump would show old data for 15 min).
export async function bumpCacheVersion(): Promise<boolean> {
	if (!process.env.REDIS_URL) return false;
	const ok = await attempt((c) => c.set(VERSION_KEY, randomUUID()), true);
	if (ok === null) warn("Could not start a new cache version; changes may take up to 15 minutes to show");
	return ok !== null;
}

// For Payload hooks: bump now, and again after SECOND_BUMP_MS. Payload runs afterChange/afterDelete
// BEFORE the database commit, so a visitor reading in between could save the old data under the
// new version; the second bump (after the commit) makes sure that entry is never used.
export async function bumpCacheVersionTwice(): Promise<void> {
	if (!process.env.REDIS_URL) return;
	await bumpCacheVersion();
	setTimeout(() => void bumpCacheVersion(), SECOND_BUMP_MS).unref();
}
