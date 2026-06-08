import type { Config, Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const requestUrl = new URL(req.url);
  const target = requestUrl.searchParams.get("url");

  if (!target) {
    return new Response("Missing url", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  if (parsed.protocol !== "https:" || parsed.hostname !== "api.chess.com" || !parsed.pathname.startsWith("/pub/")) {
    return new Response("Forbidden", { status: 403 });
  }

  const upstream = await fetch(parsed.toString(), {
    headers: {
      Accept: req.headers.get("Accept") || "application/json, text/plain;q=0.9, */*;q=0.8",
      "User-Agent": "FranChess.co Open Source Chess Trainer"
    }
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
};

export const config: Config = {
  path: "/api/chesscom"
};
