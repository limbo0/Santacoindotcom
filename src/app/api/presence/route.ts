import { connection } from "next/server";
import { getPresenceStore, isValidTabId, visitorKey } from "@/lib/presence";

const NO_STORE = { "Cache-Control": "no-store" };

/** Current number of players. Cached briefly at the CDN so page viewers don't each hit Redis. */
export async function GET() {
  await connection(); // always run at request time, never prerender
  const store = getPresenceStore();
  if (!store) return Response.json({ count: null }, { status: 503, headers: NO_STORE });
  try {
    const count = await store.count(Date.now());
    return Response.json(
      { count },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=30" } },
    );
  } catch {
    return Response.json({ count: null }, { status: 503, headers: NO_STORE });
  }
}

/** Heartbeat from an open game tab: { id } to stay counted, { id, leave: true } to stop. */
export async function POST(request: Request) {
  const store = getPresenceStore();
  if (!store) return Response.json({ count: null }, { status: 503, headers: NO_STORE });

  let body: { id?: unknown; leave?: unknown };
  try {
    const text = await request.text();
    if (text.length > 200) throw new Error("too large");
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400, headers: NO_STORE });
  }
  if (!isValidTabId(body.id)) return Response.json({ error: "Invalid id" }, { status: 400, headers: NO_STORE });

  try {
    if (body.leave === true) {
      await store.leave(body.id);
      return Response.json({ ok: true }, { headers: NO_STORE });
    }
    const ip =
      request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const { count, limited } = await store.beat(body.id, visitorKey(ip), Date.now());
    return Response.json({ count }, { status: limited ? 429 : 200, headers: NO_STORE });
  } catch {
    return Response.json({ count: null }, { status: 503, headers: NO_STORE });
  }
}
