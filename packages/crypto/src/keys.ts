// 将来.env に生バイナリではなく
// CANDIDATE_HMAC_KEY_V1=xxxxxxxx
// TOKEN_ENCRYPTION_KEY_V1=yyyyyyyy
// のようにBase64URLで保存する
// 今回はHMACキーもAESキーも32 bytesに統一

const KEY_LENGTH_BYTES = 32;

export function decodeBase64UrlKey32(
  encoded: string,
): Uint8Array {
  const normalized = encoded.trim();

  if (normalized.length === 0) {
    throw new Error("Encryption key must not be empty");
  }

  const key = Buffer.from(
    normalized,
    "base64url",
  );

  if (key.byteLength !== KEY_LENGTH_BYTES) {
    throw new RangeError(
      `Key must be exactly ${KEY_LENGTH_BYTES} bytes`,
    );
  }

  return new Uint8Array(key);
}

export function assertKey32(
  key: Uint8Array,
): void {
  if (key.byteLength !== KEY_LENGTH_BYTES) {
    throw new RangeError(
      `Key must be exactly ${KEY_LENGTH_BYTES} bytes`,
    );
  }
}