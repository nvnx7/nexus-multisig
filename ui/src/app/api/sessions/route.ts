import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDb, sessions } from "@/db";
import { poseidonHash } from "@/lib/poseidon";

// POST /api/sessions — create a new signing session
// Body: { threshold, total, msg, agg_pubkey: [x, y], group_id? }
export async function POST(request: Request) {
  const body = await request.json();
  const { threshold, total, msg, agg_pubkey, group_id } = body as {
    threshold: number;
    total: number;
    msg: string;
    agg_pubkey: [string, string];
    group_id?: string;
  };

  if (!threshold || !total || !msg || !agg_pubkey?.length) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (threshold > total) {
    return Response.json(
      { error: "threshold must be <= total" },
      { status: 400 },
    );
  }

  const agg_address = poseidonHash([
    BigInt(agg_pubkey[0]),
    BigInt(agg_pubkey[1]),
  ]).toString();
  const id = randomUUID();

  getDb()
    .insert(sessions)
    .values({
      id,
      group_id: group_id ?? null,
      threshold,
      total,
      msg,
      agg_pubkey_x: agg_pubkey[0],
      agg_pubkey_y: agg_pubkey[1],
      agg_address,
    });

  return Response.json({ id }, { status: 201 });
}

// GET /api/sessions?agg_address=<addr> — list sessions, optionally filtered by group address
export async function GET(request: Request) {
  const agg_address = new URL(request.url).searchParams.get("agg_address");
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
    ? db.select(projection).from(sessions).where(eq(sessions.agg_address, agg_address)).orderBy(desc(sessions.created_at))
    : db.select(projection).from(sessions).orderBy(desc(sessions.created_at));

  return Response.json({ sessions: rows });
}
