import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

import {
  assertKey32,
} from "./keys.js";


const ALGORITHM =
  "aes-256-gcm";

const IV_LENGTH_BYTES = 12;

const AUTH_TAG_LENGTH_BYTES = 16;


type EncryptedSecretV1 = {
  v: 1;

  alg: "A256GCM";

  iv: string;

  ciphertext: string;

  tag: string;
};


export type EncryptSecretInput = {
  plaintext: string;

  key: Uint8Array;

  /**
   * Additional Authenticated Data.
   *
   * 例:
   *
   * workspaceId + ":google"
   */
  aad?: string;
};


export type DecryptSecretInput = {
  encrypted: string;

  key: Uint8Array;

  aad?: string;
};


function encodeBase64Url(
  value: Uint8Array,
): string {
  return Buffer
    .from(value)
    .toString("base64url");
}


function decodeBase64Url(
  value: string,
): Buffer {
  return Buffer.from(
    value,
    "base64url",
  );
}


function parseEncryptedSecret(
  encrypted: string,
): EncryptedSecretV1 {
  let parsed: unknown;

  try {
    parsed = JSON.parse(encrypted);
  } catch {
    throw new Error(
      "Invalid encrypted secret format",
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null
  ) {
    throw new Error(
      "Invalid encrypted secret format",
    );
  }

  const value =
    parsed as Record<string, unknown>;

  if (
    value.v !== 1 ||
    value.alg !== "A256GCM" ||
    typeof value.iv !== "string" ||
    typeof value.ciphertext !== "string" ||
    typeof value.tag !== "string"
  ) {
    throw new Error(
      "Invalid encrypted secret format",
    );
  }

  const iv =
    decodeBase64Url(value.iv);

  const tag =
    decodeBase64Url(value.tag);

  if (
    iv.byteLength !== IV_LENGTH_BYTES ||
    tag.byteLength !== AUTH_TAG_LENGTH_BYTES
  ) {
    throw new Error(
      "Invalid encrypted secret format",
    );
  }

  return {
    v: 1,
    alg: "A256GCM",
    iv: value.iv,
    ciphertext: value.ciphertext,
    tag: value.tag,
  };
}


export function encryptSecret(
  input: EncryptSecretInput,
): string {
  assertKey32(input.key);

  if (input.plaintext.length === 0) {
    throw new Error(
      "plaintext must not be empty",
    );
  }

  const iv =
    randomBytes(IV_LENGTH_BYTES);

  const cipher =
    createCipheriv(
      ALGORITHM,
      Buffer.from(input.key),
      iv,
      {
        authTagLength:
          AUTH_TAG_LENGTH_BYTES,
      },
    );

  if (input.aad !== undefined) {
    cipher.setAAD(
      Buffer.from(
        input.aad,
        "utf8",
      ),
    );
  }

  const ciphertext =
    Buffer.concat([
      cipher.update(
        input.plaintext,
        "utf8",
      ),
      cipher.final(),
    ]);

  const authTag =
    cipher.getAuthTag();

  const payload: EncryptedSecretV1 = {
    v: 1,

    alg: "A256GCM",

    iv:
      encodeBase64Url(iv),

    ciphertext:
      encodeBase64Url(ciphertext),

    tag:
      encodeBase64Url(authTag),
  };

  return JSON.stringify(payload);
}


export function decryptSecret(
  input: DecryptSecretInput,
): string {
  assertKey32(input.key);

  const payload =
    parseEncryptedSecret(
      input.encrypted,
    );

  try {
    const decipher =
      createDecipheriv(
        ALGORITHM,
        Buffer.from(input.key),
        decodeBase64Url(payload.iv),
        {
          authTagLength:
            AUTH_TAG_LENGTH_BYTES,
        },
      );

    if (input.aad !== undefined) {
      decipher.setAAD(
        Buffer.from(
          input.aad,
          "utf8",
        ),
      );
    }

    decipher.setAuthTag(
      decodeBase64Url(
        payload.tag,
      ),
    );

    const plaintext =
      Buffer.concat([
        decipher.update(
          decodeBase64Url(
            payload.ciphertext,
          ),
        ),

        decipher.final(),
      ]);

    return plaintext.toString(
      "utf8",
    );
  } catch {
    /**
     * Token内容・暗号鍵・AAD等を
     * Errorに含めない。
     */
    throw new Error(
      "Failed to decrypt secret",
    );
  }
}