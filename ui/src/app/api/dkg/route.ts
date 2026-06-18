import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { dkgParticipants, dkgSessions, getDb, users } from "@/db";

// POST /api/dkg — initiate a DKG session
// Any group member can create it once they know all participant addresses.
// Body: { threshold: number, participants: string[] }  // addresses, ordered (index = position + 1)
export async function POST(request: Request) {
  const body = (await request.json()) as {
    threshold: number;
    participants: string[];
  };

  const { threshold, participants } = body;

  if (!threshold || !participants?.length) {
    return Response.json(
      { error: "threshold and participants are required" },
      { status: 400 },
    );
  }
  if (threshold > participants.length) {
    return Response.json(
      { error: "threshold must be <= number of participants" },
      { status: 400 },
    );
  }
  if (new Set(participants).size !== participants.length) {
    return Response.json(
      { error: "duplicate participant addresses" },
      { status: 400 },
    );
  }

  const db = getDb();

  for (const address of participants) {
    const user = db
      .select({ address: users.address })
      .from(users)
      .where(eq(users.address, address))
      .get();
    if (!user) {
      return Response.json(
        { error: `Participant ${address} is not registered` },
        { status: 400 },
      );
    }
  }

  const id = randomUUID();

  db.transaction((tx) => {
    tx.insert(dkgSessions).values({ id, threshold, total: participants.length });
    for (let i = 0; i < participants.length; i++) {
      tx.insert(dkgParticipants).values({
        session_id: id,
        address: participants[i],
        participant_index: i + 1,
      });
    }
  });

  return Response.json(
    {
      id,
      participants: participants.map((address, i) => ({
        address,
        participant_index: i + 1,
      })),
    },
    { status: 201 },
  );
}

// GET /api/dkg — list DKG sessions
export async function GET() {
  const rows = getDb()
    .select({
      id: dkgSessions.id,
      threshold: dkgSessions.threshold,
      total: dkgSessions.total,
      status: dkgSessions.status,
      group_id: dkgSessions.group_id,
      created_at: dkgSessions.created_at,
    })
    .from(dkgSessions)
    .orderBy(desc(dkgSessions.created_at))
    .all();

  return Response.json({ sessions: rows });
}
