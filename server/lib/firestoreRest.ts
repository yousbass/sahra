// Minimal Firestore REST client. The server has no admin credentials, so it
// reads and writes documents *as the calling user* by forwarding their Firebase
// ID token — the project's Firestore security rules apply exactly as they do on
// the client. This lets recipients/records be derived server-side from booking
// documents without trusting client-supplied data.

type FirestoreValue = Record<string, unknown>;

function decodeValue(v: FirestoreValue): unknown {
  if ("stringValue" in v) return v["stringValue"];
  if ("integerValue" in v) return Number(v["integerValue"]);
  if ("doubleValue" in v) return Number(v["doubleValue"]);
  if ("booleanValue" in v) return v["booleanValue"];
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v["timestampValue"];
  if ("arrayValue" in v) {
    const values = (v["arrayValue"] as { values?: FirestoreValue[] }).values;
    return Array.isArray(values) ? values.map(decodeValue) : [];
  }
  if ("mapValue" in v) {
    const fields = (v["mapValue"] as { fields?: Record<string, FirestoreValue> })
      .fields;
    return fields ? decodeFields(fields) : {};
  }
  return undefined;
}

function decodeFields(
  fields: Record<string, FirestoreValue>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
  return out;
}

function encodeValue(v: unknown): FirestoreValue {
  if (v === null || v === undefined) return { nullValue: null } as FirestoreValue;
  if (typeof v === "boolean") return { booleanValue: v } as FirestoreValue;
  if (typeof v === "number") {
    return Number.isInteger(v)
      ? ({ integerValue: String(v) } as FirestoreValue)
      : ({ doubleValue: v } as FirestoreValue);
  }
  if (typeof v === "string") return { stringValue: v } as FirestoreValue;
  return { stringValue: String(v) } as FirestoreValue;
}

const firestoreBaseUrl = (projectId: string) =>
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

export async function getFirestoreDoc(
  collectionId: string,
  docId: string,
  idToken: string,
): Promise<Record<string, unknown> | null> {
  const projectId = process.env["VITE_FIREBASE_PROJECT_ID"];
  if (!projectId) throw new Error("VITE_FIREBASE_PROJECT_ID is not configured");
  const url = `${firestoreBaseUrl(projectId)}/${encodeURIComponent(collectionId)}/${encodeURIComponent(docId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (res.status === 404) return null;
  if (res.status === 403 || res.status === 401) {
    throw Object.assign(new Error("Permission denied"), { statusCode: 403 });
  }
  if (!res.ok) {
    throw new Error(`Firestore read failed (${res.status})`);
  }
  const doc = (await res.json()) as { fields?: Record<string, FirestoreValue> };
  return doc.fields ? decodeFields(doc.fields) : {};
}

/**
 * Patch specific fields on a Firestore document using the calling user's ID
 * token. Only the listed field paths are touched; all other fields are left
 * unchanged. Firestore security rules apply (the caller must own or have
 * permission to update this document).
 */
export async function patchFirestoreDoc(
  collectionId: string,
  docId: string,
  fields: Record<string, unknown>,
  idToken: string,
): Promise<void> {
  const projectId = process.env["VITE_FIREBASE_PROJECT_ID"];
  if (!projectId) throw new Error("VITE_FIREBASE_PROJECT_ID is not configured");

  const firestoreFields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(fields)) {
    firestoreFields[k] = encodeValue(v);
  }

  // Build field mask query params
  const maskParams = Object.keys(fields)
    .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join("&");
  const url = `${firestoreBaseUrl(projectId)}/${encodeURIComponent(collectionId)}/${encodeURIComponent(docId)}?${maskParams}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: firestoreFields }),
  });

  if (res.status === 403 || res.status === 401) {
    throw Object.assign(new Error("Permission denied"), { statusCode: 403 });
  }
  if (!res.ok) {
    throw new Error(`Firestore patch failed (${res.status})`);
  }
}
