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

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/metronome/")) {
      const cors = { "access-control-allow-origin": "https://rexrockya.github.io", "access-control-allow-methods": "GET, PUT, OPTIONS", "access-control-allow-headers": "content-type" };
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
      const code = url.pathname.split("/").pop() ?? "";
      if (!/^\d{6}$/.test(code)) return Response.json({ error: "房间码应为 6 位数字" }, { status: 400 });
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS metronome_rooms (code TEXT PRIMARY KEY, bpm INTEGER NOT NULL DEFAULT 80, running INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)").run();
      if (request.method === "PUT") {
        const body = await request.json() as { bpm?: number; running?: boolean };
        const bpm = Math.max(30, Math.min(240, Math.round(Number(body.bpm) || 80)));
        const running = body.running ? 1 : 0, updatedAt = Date.now();
        await env.DB.prepare("INSERT INTO metronome_rooms (code, bpm, running, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET bpm=excluded.bpm, running=excluded.running, updated_at=excluded.updated_at")
          .bind(code, bpm, running, updatedAt).run();
        return Response.json({ code, bpm, running: Boolean(running), updatedAt }, { headers: cors });
      }
      const row = await env.DB.prepare("SELECT bpm, running, updated_at AS updatedAt FROM metronome_rooms WHERE code = ?").bind(code).first<{ bpm: number; running: number; updatedAt: number }>();
      return Response.json(row ? { ...row, running: Boolean(row.running) } : { bpm: 80, running: false, updatedAt: 0 }, { headers: cors });
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
