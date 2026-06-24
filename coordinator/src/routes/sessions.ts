import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { commits, getDb, sessions, shares } from "../db";
import { poseidonHash } from "../poseidon";

export const sessionsRouter = new Hono();

sessionsRouter.post("/", async (c) => {
  const { threshold, total, msg, agg_pubkey, group_id } = await c.req.json<{
    threshold: number;
    total: number;
    msg: string;
    agg_pubkey: [string, string];
    group_id?: string;
  }>();

  if (!threshold || !total || !msg || !agg_pubkey?.length) {
    return c.json({ error: "Missing required fields" }, 400);
  }
  if (threshold > total) {
    return c.json({ error: "threshold must be <= total" }, 400);
  }

  const agg_address = poseidonHash([BigInt(agg_pubkey[0]), BigInt(agg_pubkey[1])]).toString();
  const id = randomUUID();

  getDb().insert(sessions).values({
    id,
    group_id: group_id ?? null,
    threshold,
    total,
    msg,
    agg_pubkey_x: agg_pubkey[0],
    agg_pubkey_y: agg_pubkey[1],
    agg_address,
  });

  return c.json({ id }, 201);
});

sessionsRouter.get("/", (c) => {
  const agg_address = c.req.query("agg_address");
  const db = getDb();
  const projection = {
    id: sessions.id,
    group_id: sessions.group_id,
    threshold: sessions.threshold,
    total: sessions.total,
    agg_address: sessions.agg_address,
    status: sessions.status,
    created_at: sessions.created_at,
  };

  const rows = agg_address
    ? db.select(projection).from(sessions).where(eq(sessions.agg_address, agg_address)).orderBy(desc(sessions.created_at)).all()
    : db.select(projection).from(sessions).orderBy(desc(sessions.created_at)).all();

  return c.json({ sessions: rows });
});

sessionsRouter.get("/:id", (c) => {
  const id = c.req.param("id");
  const session = getDb().select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) return c.json({ error: "Session not found" }, 404);
  return c.json({ session });
});

// ── Commits ────────────────────────────────────────────────────────────────

sessionsRouter.post("/:id/commits", async (c) => {
  const id = c.req.param("id");
  const db = getDb();

  const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) return c.json({ error: "Session not found" }, 404);
  if (session.status !== "collecting_commits") return c.json({ error: "Session is not accepting commits" }, 409);

  const { signer_index, D, E } = await c.req.json<{
    signer_index: number;
    D: [string, string];
    E: [string, string];
  }>();

  db.insert(commits)
    .values({ session_id: id, signer_index, D_x: D[0], D_y: D[1], E_x: E[0], E_y: E[1] })
    .onConflictDoUpdate({
      target: [commits.session_id, commits.signer_index],
      set: { D_x: D[0], D_y: D[1], E_x: E[0], E_y: E[1] },
    });

  const { n } = db.select({ n: sql<number>`count(*)` }).from(commits).where(eq(commits.session_id, id)).get()!;

  if (n >= session.threshold) {
    db.update(sessions).set({ status: "collecting_shares" }).where(eq(sessions.id, id));
  }

  return c.json({ status: "ok", commits_received: n });
});

sessionsRouter.get("/:id/commits", (c) => {
  const id = c.req.param("id");
  const db = getDb();

  const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) return c.json({ error: "Session not found" }, 404);

  if (session.status === "collecting_commits") {
    const { n } = db.select({ n: sql<number>`count(*)` }).from(commits).where(eq(commits.session_id, id)).get()!;
    return c.json({ ready: false, commits_received: n, threshold: session.threshold });
  }

  const rows = db.select().from(commits).where(eq(commits.session_id, id)).orderBy(commits.signer_index).all();
  return c.json({
    ready: true,
    commits: rows.map((r) => ({ signer_index: r.signer_index, D: [r.D_x, r.D_y], E: [r.E_x, r.E_y] })),
  });
});

// ── Shares ─────────────────────────────────────────────────────────────────

sessionsRouter.post("/:id/shares", async (c) => {
  const id = c.req.param("id");
  const db = getDb();

  const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) return c.json({ error: "Session not found" }, 404);
  if (session.status !== "collecting_shares") return c.json({ error: "Session is not accepting shares" }, 409);

  const { signer_index, z } = await c.req.json<{ signer_index: number; z: string }>();

  db.insert(shares)
    .values({ session_id: id, signer_index, z })
    .onConflictDoUpdate({ target: [shares.session_id, shares.signer_index], set: { z } });

  const { n } = db.select({ n: sql<number>`count(*)` }).from(shares).where(eq(shares.session_id, id)).get()!;

  if (n >= session.threshold) {
    db.update(sessions).set({ status: "complete" }).where(eq(sessions.id, id));
  }

  return c.json({ status: "ok", shares_received: n });
});

sessionsRouter.get("/:id/shares", (c) => {
  const id = c.req.param("id");
  const db = getDb();

  const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) return c.json({ error: "Session not found" }, 404);

  if (session.status !== "complete") {
    const { n } = db.select({ n: sql<number>`count(*)` }).from(shares).where(eq(shares.session_id, id)).get()!;
    return c.json({ ready: false, shares_received: n, threshold: session.threshold });
  }

  const rows = db.select({ signer_index: shares.signer_index, z: shares.z }).from(shares).where(eq(shares.session_id, id)).orderBy(shares.signer_index).all();
  return c.json({ ready: true, shares: rows.map((r) => ({ signer_index: r.signer_index, z: r.z })) });
});

// ── Signature ──────────────────────────────────────────────────────────────

sessionsRouter.post("/:id/signature", async (c) => {
  const id = c.req.param("id");
  const db = getDb();

  const session = db.select({ status: sessions.status, sig_s: sessions.sig_s }).from(sessions).where(eq(sessions.id, id)).get();
  if (!session) return c.json({ error: "Session not found" }, 404);
  if (session.status !== "complete") return c.json({ error: "Session is not yet complete" }, 409);
  if (session.sig_s) return c.json({ error: "Signature already stored" }, 409);

  const { s, e } = await c.req.json<{ s: string; e: string }>();
  db.update(sessions).set({ sig_s: s, sig_e: e }).where(eq(sessions.id, id));

  return c.json({ status: "ok" });
});

sessionsRouter.get("/:id/signature", (c) => {
  const id = c.req.param("id");
  const session = getDb()
    .select({ status: sessions.status, sig_s: sessions.sig_s, sig_e: sessions.sig_e })
    .from(sessions)
    .where(eq(sessions.id, id))
    .get();

  if (!session) return c.json({ error: "Session not found" }, 404);
  if (!session.sig_s) return c.json({ ready: false });
  return c.json({ ready: true, s: session.sig_s, e: session.sig_e });
});
