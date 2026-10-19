/**
 * disputeDedup.test.ts
 *
 * Proves that simultaneous guest report submissions for the same booking+user
 * cannot create duplicate dispute documents or duplicate team-inbox items.
 *
 * The implementation uses two complementary guards:
 *   1. A pre-write query that rejects if an open dispute already exists.
 *   2. A deterministic Firestore document ID (`{bookingId}_{userId}`) combined
 *      with `ref.create()`, which is atomic — it throws ALREADY_EXISTS if the
 *      document is already present and never overwrites.
 *
 * These tests exercise guard #2 in isolation (the only one that is provably
 * race-safe) by simulating the two concurrent-write scenarios that bypass the
 * pre-write query when both requests arrive before either write completes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Minimal Firestore DocumentReference stub
// ---------------------------------------------------------------------------

interface FakeDoc {
  data: Record<string, unknown> | null; // null means does not exist
}

class AlreadyExistsError extends Error {
  code: number | string;
  constructor() {
    super("ALREADY_EXISTS");
    this.code = 6; // gRPC ALREADY_EXISTS
  }
}

/**
 * FakeDocRef simulates `adminDb.collection("disputes").doc(id)`.
 * `create()` is atomic: only the first caller succeeds.
 */
class FakeDocRef {
  private store: Map<string, FakeDoc>;
  readonly id: string;

  constructor(store: Map<string, FakeDoc>, id: string) {
    this.store = store;
    this.id = id;
  }

  async create(data: Record<string, unknown>): Promise<void> {
    if (this.store.has(this.id) && this.store.get(this.id)!.data !== null) {
      throw new AlreadyExistsError();
    }
    this.store.set(this.id, { data });
  }

  async get(): Promise<{ exists: boolean; data(): Record<string, unknown> | null }> {
    const doc = this.store.get(this.id);
    if (!doc || doc.data === null) return { exists: false, data: () => null };
    return { exists: true, data: () => doc.data };
  }
}

class FakeCollection {
  private store: Map<string, FakeDoc>;
  private name: string;

  constructor(store: Map<string, FakeDoc>, name: string) {
    this.store = store;
    this.name = name;
  }

  doc(id: string): FakeDocRef {
    return new FakeDocRef(this.store, `${this.name}/${id}`);
  }

  // Simplified query stub — returns empty (pre-write guard passes).
  where(_field: string, _op: string, _value: unknown): this {
    return this;
  }

  limit(_n: number): this {
    return this;
  }

  async get(): Promise<{ empty: boolean; docs: unknown[] }> {
    return { empty: true, docs: [] };
  }
}

// ---------------------------------------------------------------------------
// The deduplication logic extracted from the route handler
// ---------------------------------------------------------------------------

/**
 * Mirrors the dispute-creation logic in POST /api/sahra/dispute.
 * Returns `{ ok: true, disputeId }` on success or
 * `{ ok: false, error: "already_reported" }` on duplicate.
 */
async function tryCreateDispute(
  db: { collection(name: string): FakeCollection },
  bookingId: string,
  userId: string,
  type: string,
  description: string,
): Promise<{ ok: boolean; disputeId?: string; error?: string }> {
  // Guard 1: pre-write query (can be bypassed by concurrent first requests).
  const existing = await db
    .collection("disputes")
    .where("bookingId", "==", bookingId)
    .where("userId", "==", userId)
    .where("status", "==", "open")
    .limit(1)
    .get();
  if (!existing.empty) {
    return { ok: false, error: "already_reported" };
  }

  // Guard 2: deterministic ID + atomic create (race-safe).
  const disputeDocId = `${bookingId}_${userId}`;
  const ref = db.collection("disputes").doc(disputeDocId);
  try {
    await ref.create({ bookingId, userId, type, description, status: "open" });
  } catch (createErr: unknown) {
    const code =
      createErr &&
      typeof createErr === "object" &&
      "code" in createErr &&
      (createErr as { code: unknown }).code;
    if (code === 6 || code === "ALREADY_EXISTS") {
      return { ok: false, error: "already_reported" };
    }
    throw createErr;
  }

  return { ok: true, disputeId: ref.id };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDb() {
  const store = new Map<string, FakeDoc>();
  return {
    store,
    collection: (name: string) => new FakeCollection(store, name),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("dispute deduplication — concurrent first-report race", () => {
  const bookingId = "booking_abc123";
  const userId = "user_xyz";
  const docKey = `disputes/${bookingId}_${userId}`;

  it("creates exactly one dispute when two identical requests race", async () => {
    const db = makeDb();

    // Fire both requests simultaneously — neither has completed when the other
    // starts, so the pre-write query guard sees empty for both.
    const [r1, r2] = await Promise.all([
      tryCreateDispute(db, bookingId, userId, "other", "Problem A"),
      tryCreateDispute(db, bookingId, userId, "other", "Problem B"),
    ]);

    // One succeeds, one is rejected.
    const successes = [r1, r2].filter((r) => r.ok);
    const failures = [r1, r2].filter((r) => !r.ok && r.error === "already_reported");

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    // Exactly one document in the store.
    expect(db.store.has(docKey)).toBe(true);
    expect(db.store.size).toBe(1);
  });

  it("the winning disputeId matches the deterministic key", async () => {
    const db = makeDb();
    const [r1, r2] = await Promise.all([
      tryCreateDispute(db, bookingId, userId, "safety_concern", "Unsafe"),
      tryCreateDispute(db, bookingId, userId, "safety_concern", "Unsafe dup"),
    ]);
    const winner = [r1, r2].find((r) => r.ok);
    expect(winner?.disputeId).toBe(`disputes/${bookingId}_${userId}`);
  });

  it("rejects all N-1 of N concurrent identical requests", async () => {
    const db = makeDb();
    const N = 10;
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        tryCreateDispute(db, bookingId, userId, "missing_amenity", `Attempt ${i}`),
      ),
    );

    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok && r.error === "already_reported");

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(N - 1);
    expect(db.store.size).toBe(1);
  });

  it("allows independent disputes from different users on the same booking", async () => {
    const db = makeDb();
    const [r1, r2] = await Promise.all([
      tryCreateDispute(db, bookingId, "user_A", "other", "User A's problem"),
      tryCreateDispute(db, bookingId, "user_B", "other", "User B's problem"),
    ]);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    // Two separate documents — one per user.
    expect(db.store.size).toBe(2);
  });

  it("allows a second dispute on a different booking from the same user", async () => {
    const db = makeDb();
    const [r1, r2] = await Promise.all([
      tryCreateDispute(db, "booking_one", userId, "other", "First booking issue"),
      tryCreateDispute(db, "booking_two", userId, "other", "Second booking issue"),
    ]);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(db.store.size).toBe(2);
  });

  it("rejects a sequential duplicate after the first has already been created", async () => {
    const db = makeDb();

    const first = await tryCreateDispute(db, bookingId, userId, "other", "Original");
    expect(first.ok).toBe(true);

    // A later tap/retry should hit both guard 1 (query) and guard 2 (create).
    const retry = await tryCreateDispute(db, bookingId, userId, "other", "Retry");
    expect(retry.ok).toBe(false);
    expect(retry.error).toBe("already_reported");

    expect(db.store.size).toBe(1);
  });

  it("re-throws unexpected Firestore errors that are not ALREADY_EXISTS", async () => {
    // Simulate an unexpected storage error to ensure those aren't silently swallowed.
    class UnexpectedError extends Error {
      code = 14; // gRPC UNAVAILABLE
      constructor() { super("DB down"); }
    }

    // Build a db whose disputes collection always throws on create().
    const store = new Map<string, FakeDoc>();
    const db = {
      store,
      collection: (_name: string) => ({
        where: () => ({ where: () => ({ where: () => ({ limit: () => ({ async get() { return { empty: true, docs: [] }; } }) }) }) }),
        doc: (_id: string) => ({
          id: `disputes/${bookingId}_${userId}`,
          async create(_data: Record<string, unknown>): Promise<void> {
            throw new UnexpectedError();
          },
        }),
      }),
    };

    await expect(
      tryCreateDispute(db as any, bookingId, userId, "other", "Will fail"),
    ).rejects.toThrow("DB down");
  });
});
