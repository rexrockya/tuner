/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  createdAt: number;
};

const PUBLIC_ORIGIN = "https://rexrockya.github.io";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_ITERATIONS = 210_000;
const textEncoder = new TextEncoder();

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  const allowed = origin === PUBLIC_ORIGIN || origin === "http://127.0.0.1:4173" || origin === "http://localhost:4173";
  return {
    "access-control-allow-origin": allowed && origin ? origin : PUBLIC_ORIGIN,
    "access-control-allow-methods": "GET, POST, PUT, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-allow-credentials": "true",
    "cache-control": "no-store",
    "vary": "origin",
  };
}

function hasAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === PUBLIC_ORIGIN || origin === "http://127.0.0.1:4173" || origin === "http://localhost:4173";
}

function json(data: unknown, status: number, cors: Record<string, string>, headers: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { ...cors, ...headers } });
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function randomToken(byteLength: number): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));
  return encodeBase64Url(new Uint8Array(digest));
}

async function passwordHash(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS }, key, 256);
  return encodeBase64Url(new Uint8Array(bits));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function isLocalHost(url: URL): boolean {
  return url.hostname === "127.0.0.1" || url.hostname === "localhost";
}

async function ensureLocalSchema(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL, username TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS user_sessions (token_hash TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)"),
    db.prepare("CREATE TABLE IF NOT EXISTS lick_progress (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, lick_id TEXT NOT NULL, favorite INTEGER NOT NULL DEFAULT 0, mastered INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, PRIMARY KEY(user_id, lick_id))"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_lick_progress_user_id ON lick_progress(user_id)"),
    db.prepare("CREATE TABLE IF NOT EXISTS metronome_rooms (code TEXT PRIMARY KEY, bpm INTEGER NOT NULL DEFAULT 80, running INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)"),
  ]);
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function createSession(): Promise<{ token: string; tokenHash: string; expiresAt: number; createdAt: number }> {
  const token = randomToken(32);
  return { token, tokenHash: await sha256(token), expiresAt: Date.now() + SESSION_TTL_MS, createdAt: Date.now() };
}

function cookieValue(request: Request, name: string): string {
  const cookies = request.headers.get("cookie") ?? "";
  for (const part of cookies.split(";")) {
    const separator = part.indexOf("=");
    if (separator > 0 && part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return "";
}

function sessionCookie(url: URL, token: string, clear = false): string {
  const local = isLocalHost(url);
  const name = local ? "tuner_session" : "__Host-tuner_session";
  const security = local ? "SameSite=Lax" : "Secure; SameSite=None; Partitioned";
  const expiry = clear ? "; Max-Age=0" : "";
  return `${name}=${token}; HttpOnly; ${security}; Path=/${expiry}`;
}

async function sessionUser(request: Request, db: D1Database, url: URL): Promise<{ user: PublicUser; tokenHash: string } | null> {
  const token = cookieValue(request, isLocalHost(url) ? "tuner_session" : "__Host-tuner_session");
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await db.prepare("SELECT u.id, u.username, u.display_name AS displayName, u.created_at AS createdAt FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?")
    .bind(tokenHash, Date.now()).first<PublicUser>();
  return row ? { user: row, tokenHash } : null;
}

async function handleAuth(request: Request, env: Env, url: URL, cors: Record<string, string>): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (!hasAllowedOrigin(request)) return json({ error: "请求来源不受信任" }, 403, cors);
  if (isLocalHost(url)) await ensureLocalSchema(env.DB);

  if (url.pathname === "/api/auth/register" && request.method === "POST") {
    const body = await readJson(request);
    if (!body) return json({ error: "请求格式不正确" }, 400, cors);
    const username = String(body.username ?? "").trim().toLowerCase();
    const displayName = String(body.displayName ?? "").trim() || username;
    const password = String(body.password ?? "");
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return json({ error: "用户名应为 3 至 20 位字母、数字或下划线" }, 400, cors);
    if (displayName.length < 1 || displayName.length > 24) return json({ error: "显示名称应为 1 至 24 个字符" }, 400, cors);
    if (password.length < 6 || password.length > 72) return json({ error: "密码应为 6 至 72 位" }, 400, cors);
    const existing = await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(username).first();
    if (existing) return json({ error: "这个用户名已被使用" }, 409, cors);

    const id = crypto.randomUUID();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await passwordHash(password, salt);
    const session = await createSession();
    const createdAt = Date.now();
    try {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO users (id, username, display_name, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(id, username, displayName, hash, encodeBase64Url(salt), createdAt),
        env.DB.prepare("INSERT INTO user_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
          .bind(session.tokenHash, id, session.expiresAt, session.createdAt),
      ]);
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE")) return json({ error: "这个用户名已被使用" }, 409, cors);
      throw error;
    }
    return json({ user: { id, username, displayName, createdAt }, expiresAt: session.expiresAt }, 201, cors, { "set-cookie": sessionCookie(url, session.token) });
  }

  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    const body = await readJson(request);
    if (!body) return json({ error: "请求格式不正确" }, 400, cors);
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const row = await env.DB.prepare("SELECT id, username, display_name AS displayName, password_hash AS passwordHash, password_salt AS passwordSalt, created_at AS createdAt FROM users WHERE username = ?")
      .bind(username).first<PublicUser & { passwordHash: string; passwordSalt: string }>();
    if (!row) return json({ error: "用户名或密码不正确" }, 401, cors);
    const candidate = await passwordHash(password, decodeBase64Url(row.passwordSalt));
    if (!constantTimeEqual(candidate, row.passwordHash)) return json({ error: "用户名或密码不正确" }, 401, cors);
    const session = await createSession();
    await env.DB.prepare("INSERT INTO user_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .bind(session.tokenHash, row.id, session.expiresAt, session.createdAt).run();
    const user: PublicUser = { id: row.id, username: row.username, displayName: row.displayName, createdAt: row.createdAt };
    return json({ user, expiresAt: session.expiresAt }, 200, cors, { "set-cookie": sessionCookie(url, session.token) });
  }

  if (url.pathname === "/api/auth/me" && request.method === "GET") {
    const session = await sessionUser(request, env.DB, url);
    return session ? json({ user: session.user }, 200, cors) : json({ error: "登录已失效" }, 401, cors);
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    const session = await sessionUser(request, env.DB, url);
    if (session) await env.DB.prepare("DELETE FROM user_sessions WHERE token_hash = ?").bind(session.tokenHash).run();
    return json({ ok: true }, 200, cors, { "set-cookie": sessionCookie(url, "", true) });
  }

  return json({ error: "接口不存在" }, 404, cors);
}

async function handleLickProgress(request: Request, env: Env, url: URL, cors: Record<string, string>): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (!hasAllowedOrigin(request)) return json({ error: "请求来源不受信任" }, 403, cors);
  if (isLocalHost(url)) await ensureLocalSchema(env.DB);

  const session = await sessionUser(request, env.DB, url);
  if (!session) return json({ error: "请先登录" }, 401, cors);

  if (request.method === "GET") {
    const result = await env.DB.prepare("SELECT lick_id AS lickId, favorite, mastered, updated_at AS updatedAt FROM lick_progress WHERE user_id = ? ORDER BY updated_at DESC LIMIT 5000")
      .bind(session.user.id).all<{ lickId: string; favorite: number; mastered: number; updatedAt: number }>();
    return json({ items: result.results.map((item) => ({ ...item, favorite: Boolean(item.favorite), mastered: Boolean(item.mastered) })) }, 200, cors);
  }

  if (request.method === "PUT") {
    const body = await readJson(request);
    if (!body) return json({ error: "请求格式不正确" }, 400, cors);
    const lickId = String(body.lickId ?? "").trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(lickId)) return json({ error: "Lick 编号不正确" }, 400, cors);
    if (typeof body.favorite !== "boolean" || typeof body.mastered !== "boolean") {
      return json({ error: "收藏和掌握状态必须完整提交" }, 400, cors);
    }

    const favorite = body.favorite ? 1 : 0;
    const mastered = body.mastered ? 1 : 0;
    const updatedAt = Date.now();
    if (!favorite && !mastered) {
      await env.DB.prepare("DELETE FROM lick_progress WHERE user_id = ? AND lick_id = ?").bind(session.user.id, lickId).run();
    } else {
      await env.DB.prepare("INSERT INTO lick_progress (user_id, lick_id, favorite, mastered, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, lick_id) DO UPDATE SET favorite=excluded.favorite, mastered=excluded.mastered, updated_at=excluded.updated_at")
        .bind(session.user.id, lickId, favorite, mastered, updatedAt).run();
    }
    return json({ item: { lickId, favorite: Boolean(favorite), mastered: Boolean(mastered), updatedAt } }, 200, cors);
  }

  return json({ error: "接口不存在" }, 404, cors);
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/auth/")) {
      const cors = corsHeaders(request);
      try {
        return await handleAuth(request, env, url, cors);
      } catch (error) {
        console.error("auth request failed", error);
        return json({ error: "账号服务暂时不可用" }, 500, cors);
      }
    }

    if (url.pathname === "/api/progress/licks") {
      const cors = corsHeaders(request);
      try {
        return await handleLickProgress(request, env, url, cors);
      } catch (error) {
        console.error("lick progress request failed", error);
        return json({ error: "练习进度暂时无法同步" }, 500, cors);
      }
    }

    if (url.pathname.startsWith("/api/metronome/")) {
      const cors = corsHeaders(request);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
      const code = url.pathname.split("/").pop() ?? "";
      if (!/^\d{6}$/.test(code)) return json({ error: "房间码应为 6 位数字" }, 400, cors);
      if (isLocalHost(url)) await ensureLocalSchema(env.DB);
      if (request.method === "PUT") {
        const body = await request.json() as { bpm?: number; running?: boolean };
        const bpm = Math.max(30, Math.min(240, Math.round(Number(body.bpm) || 80)));
        const running = body.running ? 1 : 0, updatedAt = Date.now();
        await env.DB.prepare("INSERT INTO metronome_rooms (code, bpm, running, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET bpm=excluded.bpm, running=excluded.running, updated_at=excluded.updated_at")
          .bind(code, bpm, running, updatedAt).run();
        return json({ code, bpm, running: Boolean(running), updatedAt }, 200, cors);
      }
      const row = await env.DB.prepare("SELECT bpm, running, updated_at AS updatedAt FROM metronome_rooms WHERE code = ?").bind(code).first<{ bpm: number; running: number; updatedAt: number }>();
      return json(row ? { ...row, running: Boolean(row.running) } : { bpm: 80, running: false, updatedAt: 0 }, 200, cors);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
