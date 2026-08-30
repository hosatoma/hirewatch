import {
  createHash,
} from "node:crypto";


export type CandidateStateFingerprintInput = {
  stage: string;

  waitingOn?: string;

  dueDate?: string;

  recruiter?: string;
};


function normalizeRequiredText(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(
      `${fieldName} must not be empty`,
    );
  }

  return normalized;
}


function normalizeOptionalText(
  value: string | undefined,
): string | null {
  if (value === undefined) {
    return null;
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    return null;
  }

  return normalized;
}


export function createCandidateStateFingerprint(
  input: CandidateStateFingerprintInput,
): string {
  const stage =
    normalizeRequiredText(
      input.stage,
      "stage",
    );

  const waitingOn =
    normalizeOptionalText(
      input.waitingOn,
    );

  const dueDate =
    normalizeOptionalText(
      input.dueDate,
    );

  const recruiter =
    normalizeOptionalText(
      input.recruiter,
    );

  const payload = JSON.stringify([
    "hirewatch-candidate-state-v1",
    stage,
    waitingOn,
    dueDate,
    recruiter,
  ]);

  return createHash("sha256")
    .update(payload, "utf8")
    .digest("hex");
}