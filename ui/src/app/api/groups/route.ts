import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { dkgSessions, getDb, groupMembers, groups, users } from "@/db";
import { poseidonHash } from "@/lib/poseidon";

// POST /api/groups
// Called after DKG round 3 completes. Any participant that has computed the
// group public key creates the group record. All participants arrive at the
// same agg_pubkey deterministically, so any one of them can do this.
// Body: { threshold, members: [{address, pubkey}], agg_pubkey: [x,y], enc_pubkey?: [x,y], dkg_session_id? }
export async function POST(request: Request) {
  const body = (await request.json()) as {
    threshold: number;
    members: { address: string; pubkey: [string, string] }[];
    agg_pubkey: [string, string];
    enc_pubkey?: [string, string];
    dkg_session_id?: string;
  };

  const { threshold, members, agg_pubkey, enc_pubkey, dkg_session_id } = body;

  if (!threshold || !members?.length || !agg_pubkey?.[0]) {
    return Response.json(
      { error: "threshold, members, and agg_pubkey are required" },
      { status: 400 },
    );
  }
  if (threshold > members.length) {
    return Response.json(
      { error: "threshold must be <= number of members" },
      { status: 400 },
    );
  }

  const db = getDb();

  for (const m of members) {
    const user = db
      .select({ address: users.address })
      .from(users)
      .where(eq(users.address, m.address))
      .get();
    if (!user) {
      return Response.json(
        { error: `Member ${m.address} is not registered` },
        { status: 400 },
      );
    }
  }

  let agg_address: string;
  try {
    agg_address = poseidonHash([
      BigInt(agg_pubkey[0]),
      BigInt(agg_pubkey[1]),
    ]).toString();
  } catch {
    return Response.json({ error: "Invalid agg_pubkey" }, { status: 400 });
  }

  const id = randomUUID();

  if (dkg_session_id) {
    const dkgSession = db
      .select({ status: dkgSessions.status })
      .from(dkgSessions)
      .where(eq(dkgSessions.id, dkg_session_id))
      .get();
    if (!dkgSession) {
      return Response.json({ error: "DKG session not found" }, { status: 400 });
    }
    if (dkgSession.status !== "complete") {
      return Response.json(
        { error: "DKG session is not yet complete" },
        { status: 409 },
      );
    }
  }

  db.transaction((tx) => {
    tx.insert(groups).values({
      id,
      threshold,
      total: members.length,
      agg_pubkey_x: agg_pubkey[0],
      agg_pubkey_y: agg_pubkey[1],
      agg_address,
      enc_pubkey_x: enc_pubkey?.[0] ?? null,
      enc_pubkey_y: enc_pubkey?.[1] ?? null,
    });
    for (const m of members) {
      tx.insert(groupMembers).values({
        group_id: id,
        address: m.address,
        pubkey_x: m.pubkey[0],
        pubkey_y: m.pubkey[1],
      });
    }
    if (dkg_session_id) {
      tx.update(dkgSessions)
        .set({ group_id: id })
        .where(eq(dkgSessions.id, dkg_session_id));
    }
  });

  return Response.json({ id, agg_address }, { status: 201 });
}

// GET /api/groups?agg_address=<addr>|?member_address=<addr>
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const agg_address_filter = params.get("agg_address");
  const member_address = params.get("member_address");

  const db = getDb();
  const projection = {
    id: groups.id,
    threshold: groups.threshold,
    total: groups.total,
    agg_address: groups.agg_address,
    status: groups.status,
    created_at: groups.created_at,
  };

  let result;
  if (member_address) {
    result = db
      .select(projection)
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.group_id))
      .where(eq(groupMembers.address, member_address))
      .orderBy(desc(groups.created_at))
      .all();
  } else if (agg_address_filter) {
    result = db
      .select(projection)
      .from(groups)
      .where(eq(groups.agg_address, agg_address_filter))
      .orderBy(desc(groups.created_at))
      .all();
  } else {
    result = db
      .select(projection)
      .from(groups)
      .orderBy(desc(groups.created_at))
      .all();
  }

  return Response.json({ groups: result });
}
