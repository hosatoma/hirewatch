import {
  describe,
  expect,
  it,
} from "vitest";

import {
  decryptSecret,
  encryptSecret,
} from "./aes-gcm.js";


const TEST_KEY =
  new Uint8Array(32).fill(0x22);

const WRONG_KEY =
  new Uint8Array(32).fill(0x33);


describe("AES-256-GCM", () => {
  it("暗号化した値を復号できる", () => {
    const plaintext =
      "google-refresh-token-example";

    const aad =
      "workspace-123:google";

    const encrypted =
      encryptSecret({
        plaintext,
        key: TEST_KEY,
        aad,
      });

    const decrypted =
      decryptSecret({
        encrypted,
        key: TEST_KEY,
        aad,
      });

    expect(decrypted).toBe(
      plaintext,
    );
  });


  it("暗号文にplaintextが含まれない", () => {
    const plaintext =
      "super-secret-token";

    const encrypted =
      encryptSecret({
        plaintext,
        key: TEST_KEY,
      });

    expect(
      encrypted,
    ).not.toContain(
      plaintext,
    );
  });


  it("毎回異なるIVを使用する", () => {
    const first =
      encryptSecret({
        plaintext: "same-secret",
        key: TEST_KEY,
      });

    const second =
      encryptSecret({
        plaintext: "same-secret",
        key: TEST_KEY,
      });

    expect(first).not.toBe(
      second,
    );
  });


  it("異なるkeyでは復号できない", () => {
    const encrypted =
      encryptSecret({
        plaintext:
          "google-refresh-token",
        key: TEST_KEY,
      });

    expect(() =>
      decryptSecret({
        encrypted,
        key: WRONG_KEY,
      }),
    ).toThrow(
      "Failed to decrypt secret",
    );
  });


  it("異なるAADでは復号できない", () => {
    const encrypted =
      encryptSecret({
        plaintext:
          "google-refresh-token",

        key: TEST_KEY,

        aad:
          "workspace-a:google",
      });

    expect(() =>
      decryptSecret({
        encrypted,

        key: TEST_KEY,

        aad:
          "workspace-b:google",
      }),
    ).toThrow(
      "Failed to decrypt secret",
    );
  });


  it("32byte以外のkeyを拒否する", () => {
    expect(() =>
      encryptSecret({
        plaintext: "secret",

        key:
          new Uint8Array(16),
      }),
    ).toThrow();
  });
});