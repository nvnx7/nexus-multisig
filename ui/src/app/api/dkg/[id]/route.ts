import { eq, sql } from "drizzle-orm";
import { dkgParticipants, dkgRound1Data, dkgRound2Shares, dkgSessions, getDb } from "@/db";

// GET /api/dkg/:id — full DKG session detail
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/dkg/[id]">,
) {
  const { id } = await ctx.params;
  const db = getDb();

  const session = db.select().from(dkgSessions).where(eq(dkgSessions.id, id)).get();
  if (!session) {
    return Response.json({ error: "DKG session not found" }, { status: 404 });
  }

  const participants = db
    .select({ address: dkgParticipants.address, participant_index: dkgParticipants.participant_index })
    .from(dkgParticipants)
    .where(eq(dkgParticipants.session_id, id))
    .orderBy(dkgParticipants.participant_index)
    .all();

  const { round1_count } = db
    .select({ round1_count: sql<number>`count(*)` })
    .from(dkgRound1Data)
    .where(eq(dkgRound1Data.session_id, id))
    .get()!;

  const { round2_count } = db
    .select({ round2_count: sql<number>`count(distinct ${dkgRound2Shares.sender_index})` })
    .from(dkgRound2Shares)
    .where(eq(dkgRound2Shares.session_id, id))
    .get()!;

  return Response.json({
    session: { ...session, participants, round1_count, round2_count },
  });
}
