export function getAllowedSsoReturnOrigin(
  requestedReturnTo: string | null | undefined,
  configuredAppUrl: string,
) {
  if (!requestedReturnTo) return null;

  try {
    const requested = new URL(requestedReturnTo);
    const configured = new URL(configuredAppUrl);

    if (requested.origin !== configured.origin) return null;
    if (requested.pathname !== "/" || requested.search || requested.hash) return null;

    return requested.origin;
  } catch {
    return null;
  }
}

export function isStrongSsoSecret(
  secret: string | null | undefined,
): secret is string {
  return Boolean(secret && Buffer.byteLength(secret, "utf8") >= 32);
}

export function isValidSsoState(
  state: string | null | undefined,
): state is string {
  return Boolean(state && /^[A-Za-z0-9_-]{43,128}$/.test(state));
}

export function getSafeCallbackUrl(
  callbackUrl: string | null | undefined,
  fallback = "/",
) {
  if (!callbackUrl) return fallback;

  try {
    let decoded = callbackUrl;
    let fullyDecoded = false;
    for (let index = 0; index < 20; index += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        fullyDecoded = true;
        break;
      }
      decoded = next;
    }

    if (
      !fullyDecoded ||
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      /[\u0000-\u001f\u007f]/.test(decoded)
    ) {
      return fallback;
    }

    const base = new URL("https://local.invalid");
    const resolved = new URL(callbackUrl, base);
    if (resolved.origin !== base.origin || !callbackUrl.startsWith("/")) {
      return fallback;
    }

    return callbackUrl;
  } catch {
    return fallback;
  }
}
