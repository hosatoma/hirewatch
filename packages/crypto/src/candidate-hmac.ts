// Candidate Key → HMAC-SHA256

import {
  createHmac,
} from "node:crypto";

import {
  assertKey32,
} from "./keys.js";


export type CreateCandidateHmacInput = {
  workspaceId: string;

  candidateKey: string;

  secretKey: Uint8Array;
};


export function createCandidateHmac(
  input: CreateCandidateHmacInput,
): string {
  const {
    secretKey,
  } = input;

  const workspaceId =
    input.workspaceId.trim();

  const candidateKey =
    input.candidateKey.trim();

  assertKey32(secretKey);

  if (workspaceId.length === 0) {
    throw new Error(
      "workspaceId must not be empty",
    );
  }

  if (candidateKey.length === 0) {
    throw new Error(
      "candidateKey must not be empty",
    );
  }

  /**
   * 単純な
   *
   * workspaceId + candidateKey
   *
   * にはしない。
   *
   * Version識別子を含むJSON配列にして、
   * 入力境界を明確にする。
   */
  const payload = JSON.stringify([
    "hirewatch-candidate-v1",
    workspaceId,
    candidateKey,
  ]);

  return createHmac(
    "sha256",
    Buffer.from(secretKey),
  )
    .update(payload, "utf8")
    .digest("hex");
}