import { and, eq, sql } from "drizzle-orm";
import { dkgParticipants, dkgRound1Data, dkgSessions, getDb } from "@/db";

// POST /api/dkg/:id/round1
// Each participant submits their Pedersen commitments (one per polynomial coefficient).
// Body: { address: string, commitments: [[x, y], ...] }  // length == threshold
// When all n participants have submitted → session advances to 'round2'.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/dkg/[id]/round1">,
) {
  const { id } = await ctx.params;
  const db = getDb();

  const session = db.select().from(dkgSessions).where(eq(dkgSessions.id, id)).get();
  if (!session) {
    return Response.json({ error: "DKG session not found" }, { status: 404 });
  }
  if (session.status !== "round1") {
    return Response.json({ error: "Session is not in round1" }, { status: 409 });
  }

  const body = (await request.json()) as {
    address: string;
    commitments: [string, string][];
  };
  const { address, commitments } = body;

  const participant = db
    .select({ participant_index: dkgParticipants.participant_index })
    .from(dkgParticipants)
    .where(and(eq(dkgParticipants.session_id, id), eq(dkgParticipants.address, address)))
    .get();
  if (!participant) {
    return Response.json(
      { error: "Address is not a participant in this session" },
      { status: 400 },
    );
  }

  if (!Array.isArray(commitments) || commitments.length !== session.threshold) {
    return Response.json(
      { error: `Expected ${session.threshold} commitments (one per polynomial coefficient)` },
      { status: 400 },
    );
  }

  db.insert(dkgRound1Data)
    .values({
      session_id: id,
      participant_index: participant.participant_index,
      commitments_json: JSON.stringify(commitments),
    })
    .onConflictDoUpdate({
      target: [dkgRound1Data.session_id, dkgRound1Data.participant_index],
      set: { commitments_json: JSON.stringify(commitments) },
    });

  const { n } = db
    .select({ n: sql<number>`count(*)` })
    .from(dkgRound1Data)
    .where(eq(dkgRound1Data.session_id, id))
    .get()!;

  if (n >= session.total) {
    db.update(dkgSessions).set({ status: "round2" }).where(eq(dkgSessions.id, id));
  }

  return Response.json({ status: "ok", round1_received: n, total: session.total });
}

// GET /api/dkg/:id/round1
// Returns all commitments once every participant has submitted.
// Participants poll this before computing their round2 shares.
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/dkg/[id]/round1">,
) {
  const { id } = await ctx.params;
  const db = getDb();

  const session = db.select().from(dkgSessions).where(eq(dkgSessions.id, id)).get();
  if (!session) {
    return Response.json({ error: "DKG session not found" }, { status: 404 });
  }

  if (session.status === "round1") {
    const { n } = db
      .select({ n: sql<number>`count(*)` })
      .from(dkgRound1Data)
      .where(eq(dkgRound1Data.session_id, id))
      .get()!;
    return Response.json({ ready: false, round1_received: n, total: session.total });
  }

  const rows = db
    .select({ participant_index: dkgRound1Data.participant_index, commitments_json: dkgRound1Data.commitments_json })
    .from(dkgRound1Data)
    .where(eq(dkgRound1Data.session_id, id))
    .orderBy(dkgRound1Data.participant_index)
    .all();

  return Response.json({
    ready: true,
    round1: rows.map((r) => ({
      participant_index: r.participant_index,
      commitments: JSON.parse(r.commitments_json) as [string, string][],
    })),
  });
}
