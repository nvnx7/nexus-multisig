import { eq } from "drizzle-orm";
import { getDb, sessions } from "@/db";

// GET /api/sessions/:id — get session status
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/sessions/[id]">,
) {
  const { id } = await ctx.params;
  const session = getDb()
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .get();

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  return Response.json({ session });
}
