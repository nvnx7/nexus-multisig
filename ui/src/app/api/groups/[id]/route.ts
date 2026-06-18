import { eq, sql } from "drizzle-orm";
import { encryptedShares, getDb, groupMembers, groups } from "@/db";

// GET /api/groups/:id — full group detail including members
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/groups/[id]">,
) {
  const { id } = await ctx.params;
  const db = getDb();

  const group = db.select().from(groups).where(eq(groups.id, id)).get();
  if (!group) return Response.json({ error: "Group not found" }, { status: 404 });

  const members = db
    .select({ address: groupMembers.address, pubkey_x: groupMembers.pubkey_x, pubkey_y: groupMembers.pubkey_y })
    .from(groupMembers)
    .where(eq(groupMembers.group_id, id))
    .all();

  const { shares_uploaded } = db
    .select({ shares_uploaded: sql<number>`count(*)` })
    .from(encryptedShares)
    .where(eq(encryptedShares.group_id, id))
    .get()!;

  return Response.json({ group: { ...group, members, shares_uploaded } });
}
