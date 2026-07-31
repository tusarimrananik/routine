import { createHmac } from "node:crypto";

type SsoUser = {
  email: string;
  name?: string | null;
  image?: string | null;
};

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function createLabHandoffToken(
  user: SsoUser,
  state: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
) {
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("SSO shared secret must be at least 32 bytes");
  }

  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    iss: "routine-attendance-tracker",
    aud: "ruet-lab-report-generator",
    iat: now,
    exp: now + 60,
    state,
    user: {
      email: user.email,
      name: user.name ?? null,
      image: user.image ?? null,
    },
  });
  const unsigned = `${header}.${payload}`;
  const signature = createHmac("sha256", secret)
    .update(unsigned)
    .digest("base64url");

  return `${unsigned}.${signature}`;
}
