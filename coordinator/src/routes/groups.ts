import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { desc, eq, or, sql } from "drizzle-orm";
import { dkgSessions, getDb, groups } from "../db";

type Member = { address: string; pubkey: [string, string] };
type ShareEntry = { R: [string, string] | null; ciphertext: string };

export const groupsRouter = new Hono();

groupsRouter.post("/", async (c) => {
  const { threshold, members, agg_pubkey, group_address, enc_pubkey, group_view_key, dkg_session_id } =
    await c.req.json<{
      threshold: number;
      members: Member[];
      agg_pubkey: [string, string];
      // Vault address = compressed aggregate public key (hex); supplied by the
      // client so a payer can recover the pubkey from it.
      group_address: string;
      enc_pubkey?: [string, string];
      group_view_key?: Record<string, string>;
      dkg_session_id?: string;
    }>();

  if (!threshold || !members?.length || !agg_pubkey?.[0] || !group_address)
    return c.json({ error: "threshold, members, agg_pubkey, and group_address are required" }, 400);
  if (threshold > members.length)
    return c.json({ error: "threshold must be <= number of members" }, 400);

  const db = getDb();

  if (dkg_session_id) {
    const dkgSession = db.select({ status: dkgSessions.status }).from(dkgSessions).where(eq(dkgSessions.id, dkg_session_id)).get();
    if (!dkgSession) return c.json({ error: "DKG session not found" }, 400);
    if (dkgSession.status !== "complete") return c.json({ error: "DKG session is not yet complete" }, 409);
  }

  const id = randomUUID();
  db.transaction((tx) => {
    tx.insert(groups).values({
      id,
      threshold,
      members: JSON.stringify(members),
      group_pubkey_x: agg_pubkey[0],
      group_pubkey_y: agg_pubkey[1],
      group_address,
      enc_pubkey_x: enc_pubkey?.[0] ?? null,
      enc_pubkey_y: enc_pubkey?.[1] ?? null,
      group_view_key: JSON.stringify(group_view_key ?? {}),
      dkg_session_id: dkg_session_id ?? null,
    }).run();
    if (dkg_session_id) {
      tx.update(dkgSessions).set({ group_id: id }).where(eq(dkgSessions.id, dkg_session_id)).run();
    }
  });

  return c.json({ id, group_address }, 201);
});

groupsRouter.get("/", (c) => {
  const address = c.req.query("address");
  const group_address = c.req.query("group_address");
  const db = getDb();

  const projection = {
    id: groups.id,
    threshold: groups.threshold,
    total: sql<number>`json_array_length(${groups.members})`,
    group_address: groups.group_address,
    created_at: groups.created_at,
  };

  let rows;
  if (address) {
    rows = db
      .select(projection)
      .from(groups)
      .where(sql`EXISTS (SELECT 1 FROM json_each(${groups.members}) WHERE json_extract(value, '$.address') = ${address})`)
      .orderBy(desc(groups.created_at))
      .all();
  } else if (group_address) {
    rows = db.select(projection).from(groups).where(eq(groups.group_address, group_address)).orderBy(desc(groups.created_at)).all();
  } else {
    rows = db.select(projection).from(groups).orderBy(desc(groups.created_at)).all();
  }

  return c.json({ groups: rows });
});

// :key may be the group id or its group_address (vaults are referenced by group_address in the UI).
groupsRouter.get("/:id", (c) => {
  const key = c.req.param("id");
  const group = getDb()
    .select()
    .from(groups)
    .where(or(eq(groups.id, key), eq(groups.group_address, key)))
    .get();
  if (!group) return c.json({ error: "Group not found" }, 404);

  const members: Member[] = JSON.parse(group.members);

  return c.json({
    group: {
      id: group.id,
      threshold: group.threshold,
      total: members.length,
      members,
      group_address: group.group_address,
      group_pubkey: [group.group_pubkey_x, group.group_pubkey_y] as [string, string],
      enc_pubkey: group.enc_pubkey_x ? ([group.enc_pubkey_x, group.enc_pubkey_y] as [string, string]) : null,
      group_view_key: JSON.parse(group.group_view_key) as Record<string, string>,
      dkg_session_id: group.dkg_session_id,
      created_at: group.created_at,
    },
  });
});

// ── Encrypted shares (signing key backup per member) ───────────────────────

groupsRouter.post("/:id/shares", async (c) => {
  const id = c.req.param("id");
  const db = getDb();

  const group = db.select({ members: groups.members }).from(groups).where(eq(groups.id, id)).get();
  if (!group) return c.json({ error: "Group not found" }, 404);

  const body = await c.req.json<{ address: string; R: [string, string] | null; ciphertext: string }[]>();
  const members: Member[] = JSON.parse(group.members);

  if (!Array.isArray(body) || body.length !== members.length)
    return c.json({ error: `Expected ${members.length} shares` }, 400);

  const memberSet = new Set(members.map((m) => m.address));
  for (const s of body) {
    if (!memberSet.has(s.address)) return c.json({ error: `${s.address} is not a member` }, 400);
  }

  const enc_shares: Record<string, ShareEntry> = Object.fromEntries(
    body.map((s) => [s.address, { R: s.R, ciphertext: s.ciphertext }]),
  );

  db.update(groups).set({ enc_shares: JSON.stringify(enc_shares) }).where(eq(groups.id, id)).run();

  return c.json({ status: "ok" });
});

groupsRouter.get("/:id/shares", (c) => {
  const id = c.req.param("id");
  const address = c.req.query("address");
  if (!address) return c.json({ error: "address query param required" }, 400);

  const group = getDb().select({ enc_shares: groups.enc_shares }).from(groups).where(eq(groups.id, id)).get();
  if (!group) return c.json({ error: "Group not found" }, 404);

  const enc_shares: Record<string, ShareEntry> = JSON.parse(group.enc_shares);
  const share = enc_shares[address];

  if (!share) return c.json({ ready: false });
  return c.json({ ready: true, R: share.R, ciphertext: share.ciphertext });
});
