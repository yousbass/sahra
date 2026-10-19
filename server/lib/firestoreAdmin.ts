// Firestore Admin writes for server-side settlement (webhooks, etc.).
// Uses firebase-admin with a service account credential.
// Set FIREBASE_SERVICE_ACCOUNT_JSON to the full service account JSON string,
// or set GOOGLE_APPLICATION_CREDENTIALS to a file path for ADC.
// If neither is configured the webhook write will fail with a clear error.

import {
  initializeApp,
  getApp,
  getApps,
  cert,
  applicationDefault,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _initialized = false;

function ensureApp(): void {
  if (_initialized || getApps().length > 0) {
    _initialized = true;
    return;
  }

  // Prefer a server-only FIREBASE_PROJECT_ID; fall back to the VITE_ variable
  // (same value shipped to clients, so it is not a secret — but a server-only
  // name avoids accidental coupling to frontend config; Audit v4 H-7).
  const projectId =
    process.env["FIREBASE_PROJECT_ID"] || process.env["VITE_FIREBASE_PROJECT_ID"];
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID / VITE_FIREBASE_PROJECT_ID is not configured");

  const saJson = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
  if (saJson) {
    let parsed: ServiceAccount & { project_id?: string };
    try {
      parsed = JSON.parse(saJson) as ServiceAccount & { project_id?: string };
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
    }
    // Credential/project consistency check (Audit v4 H-7): a service account
    // for a DIFFERENT Firebase project would silently write settlement data
    // to the wrong project. Fail fast instead.
    const saProjectId = parsed.project_id ?? (parsed as ServiceAccount).projectId;
    if (saProjectId && saProjectId !== projectId) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_JSON project (${saProjectId}) does not match configured project ID (${projectId})`,
      );
    }
    initializeApp({ credential: cert(parsed), projectId });
  } else {
    // Fall back to Application Default Credentials (works on GCP / Cloud Run)
    initializeApp({ credential: applicationDefault(), projectId });
  }

  _initialized = true;
}

export function getAdminFirestore(): Firestore {
  ensureApp();
  return getFirestore(getApp());
}
