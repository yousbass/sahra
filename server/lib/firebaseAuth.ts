import { createRemoteJWKSet, jwtVerify } from "jose";

// Verifies Firebase ID tokens without admin credentials by checking the
// signature against Google's public keys (the same validation firebase-admin
// performs). See https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

export interface VerifiedUser {
  uid: string;
  email?: string;
  idToken: string;
}

export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<VerifiedUser> {
  const projectId = process.env["VITE_FIREBASE_PROJECT_ID"];
  if (!projectId) {
    throw new Error("VITE_FIREBASE_PROJECT_ID is not configured");
  }
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  const uid = typeof payload.sub === "string" ? payload.sub : "";
  if (!uid) throw new Error("Token has no subject");
  // auth_time/iat sanity: must be in the past (with small clock skew)
  const now = Math.floor(Date.now() / 1000) + 300;
  if (typeof payload["auth_time"] === "number" && payload["auth_time"] > now) {
    throw new Error("Invalid auth_time");
  }
  return {
    uid,
    email: typeof payload["email"] === "string" ? payload["email"] : undefined,
    idToken,
  };
}
