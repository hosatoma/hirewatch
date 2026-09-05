import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createCandidateHmac,
} from "./candidate-hmac.js";


const TEST_KEY =
  new Uint8Array(32).fill(0x11);


describe("createCandidateHmac", () => {
  it("同じ入力なら常に同じHMACになる", () => {
    const result = createCandidateHmac({
      workspaceId: "workspace-123",

      candidateKey:
        "candidate@example.com",

      secretKey: TEST_KEY,
    });

    expect(result).toBe(
      "8f38e685b4ea58c7d7360a865bb352ec9c30153c8d434984b52d0b58ead13426",
    );
  });


  it("workspaceが違えばHMACも変わる", () => {
    const first = createCandidateHmac({
      workspaceId: "workspace-1",
      candidateKey: "candidate@example.com",
      secretKey: TEST_KEY,
    });

    const second = createCandidateHmac({
      workspaceId: "workspace-2",
      candidateKey: "candidate@example.com",
      secretKey: TEST_KEY,
    });

    expect(first).not.toBe(second);
  });


  it("candidateKeyが違えばHMACも変わる", () => {
    const first = createCandidateHmac({
      workspaceId: "workspace-1",
      candidateKey: "candidate-a@example.com",
      secretKey: TEST_KEY,
    });

    const second = createCandidateHmac({
      workspaceId: "workspace-1",
      candidateKey: "candidate-b@example.com",
      secretKey: TEST_KEY,
    });

    expect(first).not.toBe(second);
  });


  it("32byte以外のkeyを拒否する", () => {
    expect(() =>
      createCandidateHmac({
        workspaceId: "workspace-1",
        candidateKey: "candidate@example.com",
        secretKey: new Uint8Array(31),
      }),
    ).toThrow();
  });
});