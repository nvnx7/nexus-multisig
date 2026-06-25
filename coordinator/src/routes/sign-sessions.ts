import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDb, groups, signSessions } from "../db";

export const signSessionsRouter = new Hono();

type Row = typeof signSessions.$inferSelect;

function summary(r: Row) {
  return {
    id: r.id,
    group_address: r.group_address,
    proposer: r.proposer,
    tx: JSON.parse(r.tx),
    threshold: r.threshold,
    status: r.status,
    nonce_commitment_count: Object.keys(JSON.parse(r.nonce_commitments)).length,
    created_at: r.created_at,
  };
}

// Propose a transaction and record the proposer's commitment + encrypted nonces.
signSessionsRouter.post("/", async (c) => {
  const { group_address, proposer, tx, nonce_commitment, enc_nonces } = await c.req.json<{
    group_address: string;
    proposer: string;
    tx: unknown;
    nonce_commitment: unknown;
    enc_nonces?: string;
  }>();

  if (!group_address || !proposer || !tx || !nonce_commitment)
    return c.json({ error: "group_address, proposer, tx, and nonce_commitment are required" }, 400);

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
      tx: JSON.stringify(tx),
      threshold: group.threshold,
      nonce_commitments: JSON.stringify({ [proposer]: nonce_commitment }),
      enc_nonces: JSON.stringify(enc_nonces ? { [proposer]: enc_nonces } : {}),
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

// Full session detail (commitments + enc_nonces + shares).
signSessionsRouter.get("/:id", (c) => {
  const id = c.req.param("id");
  const r = getDb().select().from(signSessions).where(eq(signSessions.id, id)).get();
  if (!r) return c.json({ error: "Sign session not found" }, 404);
  return c.json({
    session: {
      id: r.id,
      group_address: r.group_address,
      proposer: r.proposer,
      tx: JSON.parse(r.tx),
      threshold: r.threshold,
      status: r.status,
      nonce_commitments: JSON.parse(r.nonce_commitments),
      enc_nonces: JSON.parse(r.enc_nonces),
      shares: JSON.parse(r.shares),
      sig_s: r.sig_s,
      sig_e: r.sig_e,
      created_at: r.created_at,
    },
  });
});
