import { and, eq, sql } from "drizzle-orm";
import {
  dkgEncKeyShares,
  dkgParticipants,
  dkgRound2Shares,
  dkgSessions,
  getDb,
} from "@/db";

// POST /api/dkg/:id/round2
// Each participant submits scalar shares for every other participant (encrypted)
// and their own self-share (plaintext, stored as ciphertext with R = null).
// Participant with index 1 also submits enc_key_shares — the group encryption
// secret (enc_sk) encrypted once per participant.  Other participants omit it.
//
// Body: {
//   sender_address: string,
//   shares: [{ recipient_index, R: [x,y]|null, ciphertext }],
//   enc_key_shares?: [{ recipient_index, R: [x,y]|null, ciphertext }]
// }
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/dkg/[id]/round2">,
) {
  const { id } = await ctx.params;
  const db = getDb();

  const session = db.select().from(dkgSessions).where(eq(dkgSessions.id, id)).get();
  if (!session) {
    return Response.json({ error: "DKG session not found" }, { status: 404 });
  }
  if (session.status !== "round2") {
    return Response.json({ error: "Session is not in round2" }, { status: 409 });
  }

  const body = (await request.json()) as {
    sender_address: string;
    shares: { recipient_index: number; R: [string, string] | null; ciphertext: string }[];
    enc_key_shares?: { recipient_index: number; R: [string, string] | null; ciphertext: string }[];
  };
  const { sender_address, shares, enc_key_shares } = body;

  const sender = db
    .select({ participant_index: dkgParticipants.participant_index })
    .from(dkgParticipants)
    .where(and(eq(dkgParticipants.session_id, id), eq(dkgParticipants.address, sender_address)))
    .get();
  if (!sender) {
    return Response.json(
      { error: "Sender is not a participant in this session" },
      { status: 400 },
    );
  }

  if (!Array.isArray(shares) || shares.length !== session.total) {
    return Response.json(
      { error: `Expected ${session.total} shares (one per participant including self)` },
      { status: 400 },
    );
  }

  if (sender.participant_index === 1) {
    if (!enc_key_shares || enc_key_shares.length !== session.total) {
      return Response.json(
        { error: "Participant 1 must supply enc_key_shares (one per participant)" },
        { status: 400 },
      );
    }
  }

  const validIndices = new Set(
    db
      .select({ participant_index: dkgParticipants.participant_index })
      .from(dkgParticipants)
      .where(eq(dkgParticipants.session_id, id))
      .all()
      .map((r) => r.participant_index),
  );
  for (const s of shares) {
    if (!validIndices.has(s.recipient_index)) {
      return Response.json(
        { error: `Invalid recipient_index: ${s.recipient_index}` },
        { status: 400 },
      );
    }
  }

  db.transaction((tx) => {
    for (const s of shares) {
      tx.insert(dkgRound2Shares)
        .values({
          session_id: id,
          sender_index: sender.participant_index,
          recipient_index: s.recipient_index,
          R_x: s.R?.[0] ?? null,
          R_y: s.R?.[1] ?? null,
          ciphertext: s.ciphertext,
        })
        .onConflictDoUpdate({
          target: [dkgRound2Shares.session_id, dkgRound2Shares.sender_index, dkgRound2Shares.recipient_index],
          set: { R_x: s.R?.[0] ?? null, R_y: s.R?.[1] ?? null, ciphertext: s.ciphertext },
        });
    }
    if (enc_key_shares) {
      for (const s of enc_key_shares) {
        tx.insert(dkgEncKeyShares)
          .values({
            session_id: id,
            recipient_index: s.recipient_index,
            R_x: s.R?.[0] ?? null,
            R_y: s.R?.[1] ?? null,
            ciphertext: s.ciphertext,
          })
          .onConflictDoUpdate({
            target: [dkgEncKeyShares.session_id, dkgEncKeyShares.recipient_index],
            set: { R_x: s.R?.[0] ?? null, R_y: s.R?.[1] ?? null, ciphertext: s.ciphertext },
          });
      }
    }
  });

  const { senders_done } = db
    .select({ senders_done: sql<number>`count(distinct ${dkgRound2Shares.sender_index})` })
    .from(dkgRound2Shares)
    .where(eq(dkgRound2Shares.session_id, id))
    .get()!;

  if (senders_done >= session.total) {
    db.update(dkgSessions).set({ status: "complete" }).where(eq(dkgSessions.id, id));
  }

  return Response.json({ status: "ok", senders_done, total: session.total });
}

// GET /api/dkg/:id/round2?address=<addr>
// Returns all encrypted shares and the enc_key_share for this participant.
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/dkg/[id]/round2">,
) {
  const { id } = await ctx.params;
  const address = new URL(request.url).searchParams.get("address");

  if (!address) {
    return Response.json({ error: "address query param required" }, { status: 400 });
  }

  const db = getDb();

  const session = db.select().from(dkgSessions).where(eq(dkgSessions.id, id)).get();
  if (!session) {
    return Response.json({ error: "DKG session not found" }, { status: 404 });
  }

  const participant = db
    .select({ participant_index: dkgParticipants.participant_index })
    .from(dkgParticipants)
    .where(and(eq(dkgParticipants.session_id, id), eq(dkgParticipants.address, address)))
    .get();
  if (!participant) {
    return Response.json(
      { error: "Address is not a participant in this session" },
      { status: 400 },
    );
  }

  if (session.status !== "complete") {
    const { n } = db
      .select({ n: sql<number>`count(distinct ${dkgRound2Shares.sender_index})` })
      .from(dkgRound2Shares)
      .where(eq(dkgRound2Shares.session_id, id))
      .get()!;
    return Response.json({ ready: false, senders_done: n, total: session.total });
  }

  const rows = db
    .select({
      sender_index: dkgRound2Shares.sender_index,
      R_x: dkgRound2Shares.R_x,
      R_y: dkgRound2Shares.R_y,
      ciphertext: dkgRound2Shares.ciphertext,
    })
    .from(dkgRound2Shares)
    .where(
      and(
        eq(dkgRound2Shares.session_id, id),
        eq(dkgRound2Shares.recipient_index, participant.participant_index),
      ),
    )
    .orderBy(dkgRound2Shares.sender_index)
    .all();

  const encRow = db
    .select({ R_x: dkgEncKeyShares.R_x, R_y: dkgEncKeyShares.R_y, ciphertext: dkgEncKeyShares.ciphertext })
    .from(dkgEncKeyShares)
    .where(
      and(
        eq(dkgEncKeyShares.session_id, id),
        eq(dkgEncKeyShares.recipient_index, participant.participant_index),
      ),
    )
    .get();

  return Response.json({
    ready: true,
    recipient_index: participant.participant_index,
    shares: rows.map((r) => ({
      sender_index: r.sender_index,
      R: r.R_x && r.R_y ? [r.R_x, r.R_y] : null,
      ciphertext: r.ciphertext,
    })),
    enc_key_share: encRow
      ? { R: encRow.R_x && encRow.R_y ? [encRow.R_x, encRow.R_y] : null, ciphertext: encRow.ciphertext }
      : null,
  });
}
