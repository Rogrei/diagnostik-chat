import { importPKCS8, SignJWT } from "jose";

/**
 * Skapar en JWT för Realtime-API.
 * I M1 är detta bara en stub – vi sätter upp nycklar i M2.
 */
export async function signRealtimeJwt(opts: {
  issuer: string;
  privateKeyBase64: string;
  subject?: string;
  audience?: string;
  expiresInSec?: number;
}) {
  const {
    issuer,
    privateKeyBase64,
    subject = "web",
    audience = "realtime",
    expiresInSec = 60 * 5
  } = opts;

  const pkcs8Pem = Buffer.from(privateKeyBase64, "base64").toString("utf8");
  const key = await importPKCS8(pkcs8Pem, "RS256");

  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(issuer)
    .setSubject(subject)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSec)
    .sign(key);
}
