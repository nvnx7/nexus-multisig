import { eq, sql } from "drizzle-orm";
import { commits, getDb, sessions } from "@/db";

// POST /api/sessions/:id/commits
// Body: { signer_index: number, D: [string, string], E: [string, string] }
// Signers submit their round-1 nonce commitments.
// Once `threshold` commits are collected the session advances to 'collecting_shares'.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/sessions/[id]/commits">,
) {
  const { id } = await ctx.params;
  const db = getDb();

  const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "collecting_commits") {
    return Response.json(
      { error: "Session is not accepting commits" },
      { status: 409 },
    );
  }

  const body = await request.json();
  const { signer_index, D, E } = body as {
    signer_index: number;
    D: [string, string];
    E: [string, string];
  };

  db.insert(commits)
    .values({ session_id: id, signer_index, D_x: D[0], D_y: D[1], E_x: E[0], E_y: E[1] })
    .onConflictDoUpdate({
      target: [commits.session_id, commits.signer_index],
      set: { D_x: D[0], D_y: D[1], E_x: E[0], E_y: E[1] },
    });

  const { n } = db
    .select({ n: sql<number>`count(*)` })
    .from(commits)
    .where(eq(commits.session_id, id))
    .get()!;

  if (n >= session.threshold) {
    db.update(sessions).set({ status: "collecting_shares" }).where(eq(sessions.id, id));
  }

  return Response.json({ status: "ok", commits_received: n });
}

// GET /api/sessions/:id/commits
// Returns all commits once the session has moved past 'collecting_commits'.
// Signers poll this to obtain the full commitment list before computing their round-2 share.
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/sessions/[id]/commits">,
) {
  const { id } = await ctx.params;
  const db = getDb();

  const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });

  if (session.status === "collecting_commits") {
    const { n } = db
      .select({ n: sql<number>`count(*)` })
      .from(commits)
      .where(eq(commits.session_id, id))
      .get()!;
    return Response.json({
      ready: false,
      commits_received: n,
      threshold: session.threshold,
    });
  }

  const rows = db
    .select()
    .from(commits)
    .where(eq(commits.session_id, id))
    .orderBy(commits.signer_index)
    .all();

  return Response.json({
    ready: true,
    commits: rows.map((r) => ({
      signer_index: r.signer_index,
      D: [r.D_x, r.D_y],
      E: [r.E_x, r.E_y],
    })),
  });
}
