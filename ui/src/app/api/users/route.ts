import { desc, eq } from "drizzle-orm";
import { getDb, users } from "@/db";

// POST /api/users
// Body: { stellar_address: string, spend_public_key: [x, y], view_public_key: string }
// Stores the Stellar address as the primary key, with the compressed BJJ spend-key
// coordinates and X25519 view-key from the on-chain pool.register() event.
export async function POST(request: Request) {
  const body = (await request.json()) as {
    stellar_address: string;
    spend_public_key: [string, string];
    view_public_key: string;
  };

  const { stellar_address, spend_public_key, view_public_key } = body;

  if (!stellar_address || !spend_public_key?.[0] || !spend_public_key?.[1] || !view_public_key) {
    return Response.json(
      { error: "stellar_address, spend_public_key [x, y], and view_public_key required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const existing = db
    .select({ address: users.address })
    .from(users)
    .where(eq(users.address, stellar_address))
    .get();

  if (existing) return Response.json({ address: stellar_address }, { status: 200 });

  db.insert(users)
    .values({
      address: stellar_address,
      pubkey_x: spend_public_key[0],
      pubkey_y: spend_public_key[1],
      enc_key: view_public_key,
    })
    .run();

  return Response.json({ address: stellar_address }, { status: 201 });
}

// GET /api/users — list all registered users
export async function GET() {
  const rows = getDb()
    .select({
      address: users.address,
      pubkey_x: users.pubkey_x,
      pubkey_y: users.pubkey_y,
      enc_key: users.enc_key,
    })
    .from(users)
    .orderBy(desc(users.created_at))
    .all();
  return Response.json({ users: rows });
}
