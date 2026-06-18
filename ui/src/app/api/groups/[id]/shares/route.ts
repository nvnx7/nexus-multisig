import { and, eq } from "drizzle-orm";
import { encryptedShares, getDb, groupMembers, groups } from "@/db";

// POST /api/groups/:id/shares
// The initiator (trusted dealer) posts all encrypted shares at once after running
// frostTrustedSetup locally. Each share is encrypted to the recipient's BabyJubJub
// pubkey via ECDH: K = Poseidon(sk * R), ciphertext = share XOR K.
//
// Body: [{ address, R: [x, y], ciphertext }]
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/groups/[id]/shares">,
) {
  const { id } = await ctx.params;
  const db = getDb();

  const group = db.select().from(groups).where(eq(groups.id, id)).get();
  if (!group) return Response.json({ error: "Group not found" }, { status: 404 });
  if (group.status !== "pending") {
    return Response.json({ error: "Shares already uploaded" }, { status: 409 });
  }

  const body = (await request.json()) as {
    address: string;
    R: [string, string];
    ciphertext: string;
  }[];

  if (!Array.isArray(body) || body.length !== group.total) {
    return Response.json(
      { error: `Expected ${group.total} shares, got ${body?.length ?? 0}` },
      { status: 400 },
    );
  }

  const memberSet = new Set(
    db
      .select({ address: groupMembers.address })
      .from(groupMembers)
      .where(eq(groupMembers.group_id, id))
      .all()
      .map((r) => r.address),
  );
  for (const s of body) {
    if (!memberSet.has(s.address)) {
      return Response.json(
        { error: `${s.address} is not a member of this group` },
        { status: 400 },
      );
    }
  }

  db.transaction((tx) => {
    for (const s of body) {
      tx.insert(encryptedShares)
        .values({ group_id: id, address: s.address, R_x: s.R[0], R_y: s.R[1], ciphertext: s.ciphertext })
        .onConflictDoUpdate({
          target: [encryptedShares.group_id, encryptedShares.address],
          set: { R_x: s.R[0], R_y: s.R[1], ciphertext: s.ciphertext },
        });
    }
    tx.update(groups).set({ status: "active" }).where(eq(groups.id, id));
  });

  return Response.json({ status: "ok" });
}

// GET /api/groups/:id/shares?address=<addr>
// Each member fetches their own encrypted share to decrypt locally with their sk.
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/groups/[id]/shares">,
) {
  const { id } = await ctx.params;
  const address = new URL(request.url).searchParams.get("address");

  if (!address) {
    return Response.json({ error: "address query param required" }, { status: 400 });
  }

  const db = getDb();
  const group = db
    .select({ status: groups.status })
    .from(groups)
    .where(eq(groups.id, id))
    .get();
  if (!group) return Response.json({ error: "Group not found" }, { status: 404 });

  if (group.status === "pending") {
    return Response.json({ ready: false });
  }

  const share = db
    .select({ R_x: encryptedShares.R_x, R_y: encryptedShares.R_y, ciphertext: encryptedShares.ciphertext })
    .from(encryptedShares)
    .where(and(eq(encryptedShares.group_id, id), eq(encryptedShares.address, address)))
    .get();

  if (!share) {
    return Response.json(
      { error: "Share not found for this address" },
      { status: 404 },
    );
  }

  return Response.json({ ready: true, R: [share.R_x, share.R_y], ciphertext: share.ciphertext });
}
