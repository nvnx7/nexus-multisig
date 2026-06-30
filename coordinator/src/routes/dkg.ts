import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { dkgSessions, getDb } from "../db";

export const dkgRouter = new Hono();

dkgRouter.get("/", async (c) => {
  const address = c.req.query("address");
  if (!address) return c.json({ error: "address query param is required" }, 400);

  const rows = await getDb()
    .select()
    .from(dkgSessions)
    .where(
      sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(${dkgSessions.participants}::jsonb) value WHERE value = ${address})`,
    )
    .orderBy(desc(dkgSessions.created_at));

  return c.json({ sessions: rows });
});

dkgRouter.get("/:id", async (c) => {
  const { id } = c.req.param();
  const [row] = await getDb().select().from(dkgSessions).where(eq(dkgSessions.id, id));

  if (!row) return c.json({ error: "Session not found" }, 404);

  const participants: string[] = JSON.parse(row.participants);
  const round1Data: Record<string, unknown> = JSON.parse(row.round1_data);
  const round2Data: Record<string, unknown> = JSON.parse(row.round2_data);

  return c.json({
    session: {
      id: row.id,
      threshold: row.threshold,
      creator_address: row.creator_address,
      status: row.status,
      group_id: row.group_id,
      created_at: row.created_at,
      participants: participants.map((address) => ({ address })),
      total: participants.length,
      round1_count: Object.keys(round1Data).length,
      round2_count: Object.keys(round2Data).length,
      round1_data: round1Data,
      round2_data: round2Data,
    },
  });
});

dkgRouter.post("/:id/round1", async (c) => {
  const { id } = c.req.param();
  const { address, round1_data } = await c.req.json<{
    address: string;
    round1_data: any;
  }>();

  if (!address || !round1_data) {
    return c.json({ error: "address and round1_data are required" }, 400);
  }

  const db = getDb();
  const [row] = await db.select().from(dkgSessions).where(eq(dkgSessions.id, id));

  if (!row) return c.json({ error: "Session not found" }, 404);

  const participants: string[] = JSON.parse(row.participants);
  if (!participants.includes(address)) {
    return c.json({ error: "Address is not a participant of this session" }, 403);
  }

  const round1Data: Record<string, any> = JSON.parse(row.round1_data);
  round1Data[address] = round1_data;

  const allSubmitted = Object.keys(round1Data).length === participants.length;
  const status = allSubmitted ? "round2" : "round1";

  await db
    .update(dkgSessions)
    .set({
      round1_data: JSON.stringify(round1Data),
      status,
    })
    .where(eq(dkgSessions.id, id));

  return c.json({ success: true, status });
});

dkgRouter.post("/:id/round2", async (c) => {
  const { id } = c.req.param();
  const { address, round2_data } = await c.req.json<{
    address: string;
    round2_data: any;
  }>();

  if (!address || !round2_data) {
    return c.json({ error: "address and round2_data are required" }, 400);
  }

  const db = getDb();
  const [row] = await db.select().from(dkgSessions).where(eq(dkgSessions.id, id));

  if (!row) return c.json({ error: "Session not found" }, 404);

  const participants: string[] = JSON.parse(row.participants);
  if (!participants.includes(address)) {
    return c.json({ error: "Address is not a participant of this session" }, 403);
  }

  const round2Data: Record<string, any> = JSON.parse(row.round2_data);
  round2Data[address] = round2_data;

  const allSubmitted = Object.keys(round2Data).length === participants.length;
  const status = allSubmitted ? "complete" : "round2";

  await db
    .update(dkgSessions)
    .set({
      round2_data: JSON.stringify(round2Data),
      status,
    })
    .where(eq(dkgSessions.id, id));

  return c.json({ success: true, status });
});

dkgRouter.post("/", async (c) => {
  const { threshold, participants } = await c.req.json<{
    threshold: number;
    participants: string[];
  }>();

  if (!threshold || !Array.isArray(participants) || !participants.length)
    return c.json({ error: "threshold and participants are required" }, 400);
  if (threshold > participants.length)
    return c.json({ error: "threshold must be <= number of participants" }, 400);
  if (new Set(participants).size !== participants.length)
    return c.json({ error: "duplicate participant addresses" }, 400);

  const id = randomUUID();
  await getDb()
    .insert(dkgSessions)
    .values({
      id,
      threshold,
      creator_address: participants[0]!,
      participants: JSON.stringify(participants),
    });

  return c.json({ id, participants: participants.map((address) => ({ address })) }, 201);
});
