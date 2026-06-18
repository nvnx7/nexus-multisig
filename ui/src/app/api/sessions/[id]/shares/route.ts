import { eq, sql } from "drizzle-orm";
import { getDb, sessions, shares } from "@/db";

// POST /api/sessions/:id/shares
// Body: { signer_index: number, z: string }
// Signers submit their round-2 signature share.
// Once `threshold` shares are collected the session advances to 'complete'.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/sessions/[id]/shares">,
) {
  const { id } = await ctx.params;
  const db = getDb();

  const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "collecting_shares") {
    return Response.json(
      { error: "Session is not accepting shares" },
      { status: 409 },
    );
  }

  const body = await request.json();
  const { signer_index, z } = body as { signer_index: number; z: string };

  db.insert(shares)
    .values({ session_id: id, signer_index, z })
    .onConflictDoUpdate({
      target: [shares.session_id, shares.signer_index],
      set: { z },
    });

  const { n } = db
    .select({ n: sql<number>`count(*)` })
    .from(shares)
    .where(eq(shares.session_id, id))
    .get()!;

  if (n >= session.threshold) {
    db.update(sessions).set({ status: "complete" }).where(eq(sessions.id, id));
  }

  return Response.json({ status: "ok", shares_received: n });
}

// GET /api/sessions/:id/shares
// Returns all shares once the session is complete.
// Any participant can fetch these and run frostAggregate locally.
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/sessions/[id]/shares">,
) {
  const { id } = await ctx.params;
  const db = getDb();

  const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });

  if (session.status !== "complete") {
    const { n } = db
      .select({ n: sql<number>`count(*)` })
      .from(shares)
      .where(eq(shares.session_id, id))
      .get()!;
    return Response.json({
      ready: false,
      shares_received: n,
      threshold: session.threshold,
    });
  }

  const rows = db
    .select({ signer_index: shares.signer_index, z: shares.z })
    .from(shares)
    .where(eq(shares.session_id, id))
    .orderBy(shares.signer_index)
    .all();

  return Response.json({
    ready: true,
    shares: rows.map((r) => ({ signer_index: r.signer_index, z: r.z })),
  });
}
