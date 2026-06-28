import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDb, signSessions, groups } from "../db";

export const signSessionsRouter = new Hono();

type Row = typeof signSessions.$inferSelect;

function summary(r: Row) {
  return {
    id: r.id,
    group_address: r.group_address,
    proposer: r.proposer,
    tx_details: JSON.parse(r.tx_details),
    tx_hash: r.tx_hash,
    threshold: r.threshold,
    status: r.status,
    nonce_commitment_count: Object.keys(JSON.parse(r.nonce_commitments)).length,
    sig_share_count: Object.keys(JSON.parse(r.sig_shares)).length,
    created_at: r.created_at,
  };
}

// Propose a transaction: pins the witness (tx_details), the signed message
// (tx_hash), and records the proposer's commitment + encrypted nonces.
signSessionsRouter.post("/", async (c) => {
  const { group_address, proposer, tx_details, tx_hash, nonce_commitment, enc_nonces } =
    await c.req.json<{
      group_address: string;
      proposer: string;
      tx_details: unknown;
      tx_hash: string;
      nonce_commitment: unknown;
      enc_nonces?: string;
    }>();

  if (!group_address || !proposer || !tx_details || !tx_hash || !nonce_commitment)
    return c.json(
      { error: "group_address, proposer, tx_details, tx_hash, and nonce_commitment are required" },
      400,
    );

  const db = getDb();
  const group = db
    .select({ threshold: groups.threshold })
    .from(groups)
    .where(eq(groups.group_address, group_address))
    .get();
  if (!group) return c.json({ error: "Group not found for group_address" }, 404);

  const id = randomUUID();
  db.insert(signSessions)
    .values({
      id,
      group_address,
      proposer,
      tx_details: JSON.stringify(tx_details),
      tx_hash,
      threshold: group.threshold,
      nonce_commitments: JSON.stringify({ [proposer]: nonce_commitment }),
      enc_nonces: JSON.stringify(enc_nonces ? { [proposer]: enc_nonces } : {}),
      // A 1-of-n group is already past commit collection.
      status: group.threshold <= 1 ? "collecting_shares" : "collecting_commits",
    })
    .run();

  return c.json({ id }, 201);
});

// List a vault's proposals (by group_address).
signSessionsRouter.get("/", (c) => {
  const group_address = c.req.query("group_address");
  const db = getDb();
  const rows = group_address
    ? db.select().from(signSessions).where(eq(signSessions.group_address, group_address)).orderBy(desc(signSessions.created_at)).all()
    : db.select().from(signSessions).orderBy(desc(signSessions.created_at)).all();
  return c.json({ sessions: rows.map(summary) });
});

// Full session detail.
signSessionsRouter.get("/:id", (c) => {
  const r = getDb().select().from(signSessions).where(eq(signSessions.id, c.req.param("id"))).get();
  if (!r) return c.json({ error: "Sign session not found" }, 404);
  return c.json({
    session: {
      id: r.id,
      group_address: r.group_address,
      proposer: r.proposer,
      tx_details: JSON.parse(r.tx_details),
      tx_hash: r.tx_hash,
      threshold: r.threshold,
      status: r.status,
      nonce_commitments: JSON.parse(r.nonce_commitments),
      enc_nonces: JSON.parse(r.enc_nonces),
      sig_shares: JSON.parse(r.sig_shares),
      sig_s: r.sig_s,
      sig_e: r.sig_e,
      created_at: r.created_at,
    },
  });
});

// A co-signer joins the signing set (until threshold). Freezes at threshold.
signSessionsRouter.post("/:id/commits", async (c) => {
  const id = c.req.param("id");
  const db = getDb();
  const r = db.select().from(signSessions).where(eq(signSessions.id, id)).get();
  if (!r) return c.json({ error: "Sign session not found" }, 404);
  if (r.status !== "collecting_commits")
    return c.json({ error: "Session is no longer accepting commitments" }, 409);

  const { address, nonce_commitment, enc_nonces } = await c.req.json<{
    address: string;
    nonce_commitment: unknown;
    enc_nonces?: string;
  }>();
  if (!address || !nonce_commitment)
    return c.json({ error: "address and nonce_commitment are required" }, 400);

  const commits: Record<string, unknown> = JSON.parse(r.nonce_commitments);
  const nonces: Record<string, string> = JSON.parse(r.enc_nonces);
  commits[address] = nonce_commitment;
  if (enc_nonces) nonces[address] = enc_nonces;

  const count = Object.keys(commits).length;
  const status = count >= r.threshold ? "collecting_shares" : "collecting_commits";

  db.update(signSessions)
    .set({ nonce_commitments: JSON.stringify(commits), enc_nonces: JSON.stringify(nonces), status })
    .where(eq(signSessions.id, id))
    .run();

  return c.json({ status, nonce_commitment_count: count });
});

// A committer submits their signature share.
signSessionsRouter.post("/:id/sig-shares", async (c) => {
  const id = c.req.param("id");
  const db = getDb();
  const r = db.select().from(signSessions).where(eq(signSessions.id, id)).get();
  if (!r) return c.json({ error: "Sign session not found" }, 404);
  if (r.status !== "collecting_shares")
    return c.json({ error: "Session is not collecting signature shares" }, 409);

  const { address, sig_share } = await c.req.json<{ address: string; sig_share: string }>();
  if (!address || !sig_share)
    return c.json({ error: "address and sig_share are required" }, 400);

  const commits: Record<string, unknown> = JSON.parse(r.nonce_commitments);
  if (!(address in commits))
    return c.json({ error: "address is not part of the signing set" }, 403);

  const shares: Record<string, string> = JSON.parse(r.sig_shares);
  shares[address] = sig_share;

  const count = Object.keys(shares).length;
  const status = count >= r.threshold ? "complete" : "collecting_shares";

  db.update(signSessions)
    .set({ sig_shares: JSON.stringify(shares), status })
    .where(eq(signSessions.id, id))
    .run();

  return c.json({ status, sig_share_count: count });
});

// Store the aggregated signature.
signSessionsRouter.post("/:id/signature", async (c) => {
  const id = c.req.param("id");
  const db = getDb();
  const r = db.select().from(signSessions).where(eq(signSessions.id, id)).get();
  if (!r) return c.json({ error: "Sign session not found" }, 404);

  const { s, e } = await c.req.json<{ s: string; e: string }>();
  if (!s || !e) return c.json({ error: "s and e are required" }, 400);

  db.update(signSessions).set({ sig_s: s, sig_e: e }).where(eq(signSessions.id, id)).run();
  return c.json({ status: "ok" });
});
