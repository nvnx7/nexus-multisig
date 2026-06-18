import { eq } from "drizzle-orm";
import { getDb, users } from "@/db";

// GET /api/users/:address
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/users/[address]">,
) {
  const { address } = await ctx.params;
  const user = getDb()
    .select({ address: users.address, pubkey_x: users.pubkey_x, pubkey_y: users.pubkey_y, enc_key: users.enc_key })
    .from(users)
    .where(eq(users.address, address))
    .get();

  if (!user) return Response.json({ error: "User not found" }, { status: 404 });
  return Response.json({ user });
}
