import {
  describe,
  expect,
  it,
} from "vitest";

import {
  decodeBase64UrlKey32,
} from "./keys.js";


describe(
  "decodeBase64UrlKey32",
  () => {
    it("32byteのBase64URL keyをdecodeできる", () => {
      const original =
        new Uint8Array(32)
          .fill(0x44);

      const encoded =
        Buffer
          .from(original)
          .toString("base64url");

      const decoded =
        decodeBase64UrlKey32(
          encoded,
        );

      expect(
        Buffer.from(decoded),
      ).toEqual(
        Buffer.from(original),
      );
    });


    it("32byte以外を拒否する", () => {
      const encoded =
        Buffer
          .from(
            new Uint8Array(16),
          )
          .toString("base64url");

      expect(() =>
        decodeBase64UrlKey32(
          encoded,
        ),
      ).toThrow();
    });
  },
);