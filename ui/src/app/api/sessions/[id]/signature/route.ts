import { eq } from "drizzle-orm";
import { getDb, sessions } from "@/db";

// POST /api/sessions/:id/signature
// Body: { s: string, e: string }
// After fetching all shares from GET /shares, any participant aggregates locally
// with frostAggregate() and POSTs the result here to store it for others.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/sessions/[id]/signature">,
) {
  const { id } = await ctx.params;
  const db = getDb();

  const session = db
    .select({ status: sessions.status, sig_s: sessions.sig_s })
    .from(sessions)
    .where(eq(sessions.id, id))
    .get();
  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "complete") {
    return Response.json({ error: "Session is not yet complete" }, { status: 409 });
  }
  if (session.sig_s) {
    return Response.json({ error: "Signature already stored" }, { status: 409 });
  }

  const { s, e } = (await request.json()) as { s: string; e: string };
  db.update(sessions).set({ sig_s: s, sig_e: e }).where(eq(sessions.id, id));

  return Response.json({ status: "ok" });
}

// GET /api/sessions/:id/signature
// Returns the final (s, e) once a participant has POSTed it.
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/sessions/[id]/signature">,
) {
  const { id } = await ctx.params;
  const session = getDb()
    .select({ status: sessions.status, sig_s: sessions.sig_s, sig_e: sessions.sig_e })
    .from(sessions)
    .where(eq(sessions.id, id))
    .get();

  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });
  if (!session.sig_s) return Response.json({ ready: false });

  return Response.json({ ready: true, s: session.sig_s, e: session.sig_e });
}
